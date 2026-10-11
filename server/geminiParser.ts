/**
 * Server-Side Gemini AI Parser & Extraction Engine for Lesson Plan Documents
 * 
 * Supports:
 * - Independent lesson-level extraction: Attainment Target, Learning Outcomes, and Activities/Procedures
 * - BEAMS 5-field activity block extraction: teacher_activity, student_activity, time, resources, assessment
 * - Variable block count per lesson preserving source sequence
 * - High-fidelity source preservation: exact wording, line breaks, bullet points, punctuation
 * - Uncertainty and missing field flagging (needsReview: true)
 * - Multi-day / multi-class curriculum table and section parsing
 * - Structured heuristic fallback for deterministic testing and offline operation
 * - Backward compatibility with legacy records and older field keys
 */

import { GoogleGenAI, Type } from '@google/genai';
import { ParsedWeeklyImport, ParsedLessonDraft, ParsedBlockDraft, ImportSourceType } from '../src/types/index.js';
import { cleanPlainText } from '../src/utils/textCleaner.js';
import { ExtractedDocument } from './importers/types.js';
import crypto from 'crypto';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Normalizes field keys to standard lowercase snake_case.
 */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

/**
 * Extracts the 5 BEAMS fields from a text segment containing labeled block content,
 * or safely assigns to teacher_activity if the block is unstructured.
 */
export function extractBlockFieldsFromText(text: string): {
  fields: Record<string, string>;
  needsReview: boolean;
} {
  const clean = (text || '').trim();
  if (!clean) {
    return {
      fields: {
        teacher_activity: '',
        student_activity: '',
        time: '',
        resources: '',
        assessment: '',
      },
      needsReview: true,
    };
  }

  // Known field label patterns mapped to standard 5 BEAMS keys + optional legacy keys
  const labelPatterns: Array<{
    key: string;
    regex: RegExp;
  }> = [
    {
      key: 'teacher_activity',
      regex: /(?:^|\n)\s*(?:Teacher Activity|Teacher Actions?|Teacher|Direct Instruction|Teacher's Role|Teacher Procedure)\s*:\s*/i,
    },
    {
      key: 'student_activity',
      regex: /(?:^|\n)\s*(?:Student Activity|Student Actions?|Students?|Learner Activity|Independent Practice|Student Tasks?|Students' Role|Guided Practice|Student Procedure)\s*:\s*/i,
    },
    {
      key: 'time',
      regex: /(?:^|\n)\s*(?:Time|Duration|Allocated Time|Time Allocation|Minutes?|Time\/Duration)\s*:\s*/i,
    },
    {
      key: 'resources',
      regex: /(?:^|\n)\s*(?:Learning Materials|Materials|Resources|Equipment|Textbooks?|Materials\/Resources|Handouts|Supplies)\s*:\s*/i,
    },
    {
      key: 'assessment',
      regex: /(?:^|\n)\s*(?:Formative Assessment|Assessment|Check for Understanding|Evaluation|Exit Ticket|CFU|Assessment\/Check)\s*:\s*/i,
    },
    {
      key: 'objective',
      regex: /(?:^|\n)\s*(?:Block Objective|Objective|Goal)\s*:\s*/i,
    },
  ];

  // Find all label matches with their positions
  const matches: Array<{ key: string; index: number; matchLength: number }> = [];
  for (const { key, regex } of labelPatterns) {
    const globalRegex = new RegExp(regex.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = globalRegex.exec(clean)) !== null) {
      const offset = m[0].startsWith('\n') ? 1 : 0;
      matches.push({
        key,
        index: m.index + offset,
        matchLength: m[0].length - offset,
      });
    }
  }

  const fields: Record<string, string> = {
    teacher_activity: '',
    student_activity: '',
    time: '',
    resources: '',
    assessment: '',
  };

  if (matches.length === 0) {
    // Check if the text has an inline time notation like "(15 mins)" or "[10 min]"
    const timeMatch = clean.match(/\((?:(\d+)\s*(?:mins?|minutes?|min))\)/i) ||
                       clean.match(/\[(?:(\d+)\s*(?:mins?|minutes?|min))\]/i);
    let remainingText = clean;
    if (timeMatch && timeMatch[0]) {
      fields.time = timeMatch[0].replace(/[()[\]]/g, '').trim();
      remainingText = clean.replace(timeMatch[0], '').trim();
    }

    fields.teacher_activity = cleanPlainText(remainingText);
    return {
      fields,
      needsReview: true,
    };
  }

  // Sort matches by appearance in text
  matches.sort((a, b) => a.index - b.index);

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const valStart = current.index + current.matchLength;
    const valEnd = i + 1 < matches.length ? matches[i + 1].index : clean.length;
    const rawVal = clean.slice(valStart, valEnd);
    fields[current.key] = cleanPlainText(rawVal);
  }

  // Flag review if critical activity fields are empty
  const hasContent = Object.values(fields).some(v => v.length > 0);
  const isPartiallyMissing = !fields.teacher_activity || !fields.student_activity;
  const needsReview = hasContent && isPartiallyMissing;

  return {
    fields,
    needsReview,
  };
}

/**
 * Extracts weekly lesson plans using Gemini AI or structured heuristic fallback.
 */
export async function parseWeeklyLessonPlan({
  extractedDoc,
  pdfBase64,
  rawText,
  fileName,
  sourceUrl,
  sourceType = 'plain_text',
}: {
  extractedDoc?: ExtractedDocument;
  pdfBase64?: string;
  rawText?: string;
  fileName?: string;
  sourceUrl?: string;
  sourceType?: ImportSourceType;
}): Promise<ParsedWeeklyImport> {
  const effectiveSourceType: ImportSourceType = extractedDoc?.sourceType || sourceType;
  const effectiveSourceUrl = extractedDoc?.sourceUrl || sourceUrl;
  const effectiveTitle = extractedDoc?.title || fileName || 'Weekly_Lesson_Plan';

  const prompt = `
You are a precise school curriculum data extraction assistant.
Extract all structured lesson plans strictly from the provided weekly lesson plan document.

SOURCE INFO:
- Source Type: ${effectiveSourceType}
- Document Title: ${effectiveTitle}
${effectiveSourceUrl ? `- Source URL: ${effectiveSourceUrl}` : ''}

CRITICAL EXTRACTION RULES:
1. SEPARATE LESSON-LEVEL CONCEPTS INDEPENDENTLY:
   - "target": The overarching Attainment Target, curriculum standard, or competency (e.g. "Students will understand...", CCSS/NGSS standard).
   - "learningOutcomes": Specific, measurable Student Learning Outcomes / Objectives / SWBAT (e.g. "By the end of the lesson students will be able to...").
   - "activities": High-level overview / sequence of activities and procedures for the lesson.
   CRITICAL: Do NOT merge or combine the Attainment Target with Learning Outcomes! Keep them strictly separate.
   Do NOT place the entire lesson plan into the activities field when individual activity blocks can be extracted.

2. EXTRACT THE FIVE FIELDS FOR EVERY ACTIVITY BLOCK:
   Every lesson can contain a variable number of sequential activity blocks (Block 1, Block 2, Block 3, ...).
   Preserve the source block order and block count. Do NOT assume a fixed number of blocks.
   Extract each block using these exact five fields:
   - "teacher_activity": What the teacher does (direct instruction, modeling, guided questions, facilitating, pacing).
   - "student_activity": What students do (independent/group tasks, discussions, exercises, note taking, lab work).
   - "time": Allocated duration or time range (e.g., "10 mins", "15 min", "08:30 - 08:45").
   - "resources": Learning materials, textbooks, handouts, links, slides, equipment.
   - "assessment": Formative assessment, checks for understanding, questioning techniques, exit tickets.

3. PRESERVE SOURCE CONTENT ACCURATELY:
   - Preserve original wording, important punctuation, list items (•, 1. 2.), and paragraph breaks.
   - Do NOT summarize, invent missing activities, or silently rewrite the source.
   - Do NOT shift content from one field or block into another merely to fill a missing field.
   - Leave genuinely missing fields as empty strings "".
   - If extraction is uncertain, ambiguous, or partially occluded, set "needsReview": true on that block and lesson.

4. MULTI-LESSON & TABLE STRUCTURES:
   - Separate lessons by (Day + Class).
   - Inspect tables carefully: rows may represent days or lessons, and columns may represent Target, Learning Outcomes, Activities, or individual Blocks.
`;

  const contents: any[] = [];

  if (pdfBase64) {
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    contents.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: cleanBase64,
      },
    });
    contents.push({ text: prompt });
  } else {
    const textToParse = extractedDoc?.structuredContent || rawText || '';
    const cleanedText = cleanPlainText(textToParse);
    if (!cleanedText.trim()) {
      throw new Error('Provided document text is empty.');
    }
    contents.push({
      text: `${prompt}\n\nDocument Content:\n"""\n${cleanedText}\n"""`,
    });
  }

  // Attempt Gemini parsing with safe fallback
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weekNumber: { type: Type.STRING, description: 'e.g. Week 8' },
            weekTitle: { type: Type.STRING, description: 'Curriculum unit, topic, or subject title' },
            startDate: { type: Type.STRING, description: 'Start date if specified' },
            endDate: { type: Type.STRING, description: 'End date if specified' },
            lessons: {
              type: Type.ARRAY,
              description: 'List of individual lesson records across days and classes',
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING, description: 'Day of week: Monday, Tuesday, Wednesday, Thursday, Friday' },
                  className: { type: Type.STRING, description: 'Class name (e.g. 6A, Grade 7, Math 6)' },
                  section: { type: Type.STRING, description: 'Section name (e.g. Blue, Red, 1)' },
                  date: { type: Type.STRING, description: 'Optional lesson date' },
                  target: { type: Type.STRING, description: 'Attainment target / curriculum standard' },
                  learningOutcomes: { type: Type.STRING, description: 'Specific learning outcomes or student objectives' },
                  activities: { type: Type.STRING, description: 'Overview of lesson activities or procedures' },
                  needsReview: { type: Type.BOOLEAN, description: 'True if any text was ambiguous or partially cut off' },
                  blocks: {
                    type: Type.ARRAY,
                    description: 'Ordered sequence of activity blocks within this lesson',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        blockNumber: { type: Type.INTEGER, description: '1-based sequential block order' },
                        needsReview: { type: Type.BOOLEAN, description: 'True if any field is uncertain or flagged for human review' },
                        teacher_activity: { type: Type.STRING, description: 'Teacher activity / direct instruction / modeling' },
                        student_activity: { type: Type.STRING, description: 'Student activity / tasks / practice' },
                        time: { type: Type.STRING, description: 'Duration or time allocation' },
                        resources: { type: Type.STRING, description: 'Learning materials and resources' },
                        assessment: { type: Type.STRING, description: 'Formative assessment or check for understanding' },
                        fields: {
                          type: Type.OBJECT,
                          description: 'Optional additional or legacy fields map if applicable',
                        },
                      },
                      required: ['blockNumber'],
                    },
                  },
                },
                required: ['day', 'className', 'target', 'activities', 'blocks'],
              },
            },
          },
          required: ['lessons'],
        },
      },
    });

    const responseText = response.text?.trim() || '{}';
    const rawParsed = JSON.parse(responseText);

    const weekNumber = cleanPlainText(rawParsed.weekNumber) || 'New Week';
    const weekTitle = cleanPlainText(rawParsed.weekTitle) || effectiveTitle;

    const lessons: ParsedLessonDraft[] = Array.isArray(rawParsed.lessons)
      ? rawParsed.lessons.map((l: any, lIdx: number) => {
          const blocks: ParsedBlockDraft[] = Array.isArray(l.blocks)
            ? l.blocks.map((b: any, bIdx: number) => {
                const cleanFields: Record<string, string> = {
                  teacher_activity: cleanPlainText(b.teacher_activity || b.fields?.teacher_activity || ''),
                  student_activity: cleanPlainText(b.student_activity || b.fields?.student_activity || ''),
                  time: cleanPlainText(b.time || b.fields?.time || ''),
                  resources: cleanPlainText(b.resources || b.fields?.resources || ''),
                  assessment: cleanPlainText(b.assessment || b.fields?.assessment || ''),
                };

                // Preserve any legacy or custom fields that might have been provided in b.fields
                if (b.fields && typeof b.fields === 'object') {
                  for (const [k, v] of Object.entries(b.fields)) {
                    const normalizedKey = normalizeKey(k);
                    if (!(normalizedKey in cleanFields)) {
                      cleanFields[normalizedKey] = cleanPlainText(v);
                    }
                  }
                }

                const hasContent = Object.values(cleanFields).some(val => val.length > 0);
                const isPartiallyMissing = !cleanFields.teacher_activity || !cleanFields.student_activity;
                const needsReview = Boolean(b.needsReview) || (hasContent && isPartiallyMissing);

                return {
                  blockNumber: b.blockNumber || bIdx + 1,
                  fields: cleanFields,
                  needsReview,
                };
              })
            : [];

          if (blocks.length === 0) {
            blocks.push({
              blockNumber: 1,
              fields: {
                teacher_activity: '',
                student_activity: '',
                time: '',
                resources: '',
                assessment: '',
              },
              needsReview: true,
            });
          }

          return {
            id: `draft_${lIdx + 1}_${crypto.randomUUID().slice(0, 6)}`,
            day: cleanPlainText(l.day) || 'Monday',
            className: cleanPlainText(l.className) || `Class ${lIdx + 1}`,
            section: l.section ? cleanPlainText(l.section) : '',
            date: l.date ? cleanPlainText(l.date) : '',
            target: cleanPlainText(l.target) || '',
            learningOutcomes: l.learningOutcomes ? cleanPlainText(l.learningOutcomes) : '',
            activities: cleanPlainText(l.activities) || '',
            needsReview: Boolean(l.needsReview) || blocks.some(b => b.needsReview),
            blocks,
          };
        })
      : [];

    return {
      weekNumber,
      weekTitle,
      startDate: rawParsed.startDate ? cleanPlainText(rawParsed.startDate) : '',
      endDate: rawParsed.endDate ? cleanPlainText(rawParsed.endDate) : '',
      fileName: effectiveTitle,
      sourceType: effectiveSourceType,
      sourceUrl: effectiveSourceUrl,
      sourceTitle: effectiveTitle,
      extractedSummary: extractedDoc?.stats,
      lessons,
    };
  } catch (err: any) {
    console.warn('Gemini extraction error or API key missing, attempting structured heuristic parser:', err?.message);

    return heuristicParseDocument({
      extractedDoc,
      rawText,
      effectiveTitle,
      effectiveSourceType,
      effectiveSourceUrl,
    });
  }
}

/**
 * Parses labeled lesson metadata from a text section.
 */
function extractLessonMetadata(text: string): {
  day?: string;
  className?: string;
  section?: string;
  target: string;
  learningOutcomes: string;
  activities: string;
} {
  // 1. Attainment Target
  const targetMatch = text.match(/(?:^|\n)\s*(?:Attainment Target|Learning Target|Target|Curriculum Target|Standard)\s*:\s*([^\n]+(?:\n(?!\s*(?:Learning Outcomes?|Outcomes?|Objectives?|Activities|Procedures|Block|##|###|Day|Class)\s*[:#])[^\n]+)*)/i);
  const target = targetMatch && targetMatch[1] ? cleanPlainText(targetMatch[1]) : '';

  // 2. Learning Outcomes
  const outcomesMatch = text.match(/(?:^|\n)\s*(?:Learning Outcomes?|Specific Learning Outcomes?|Outcomes?|Learning Objectives?|Objectives?|SWBAT)\s*:\s*([^\n]+(?:\n(?!\s*(?:Attainment Target|Target|Activities|Procedures|Block|##|###|Day|Class)\s*[:#])[^\n]+)*)/i);
  const learningOutcomes = outcomesMatch && outcomesMatch[1] ? cleanPlainText(outcomesMatch[1]) : '';

  // 3. Activities / Procedures overview
  const actMatch = text.match(/(?:^|\n)\s*(?:Activities & Procedures|Activities|Procedures|Lesson Overview|Lesson Sequence)\s*:\s*([^\n]+(?:\n(?!\s*(?:Block|##|###|Day|Class|Teacher Activity)\s*[:#])[^\n]+)*)/i);
  const activities = actMatch && actMatch[1] ? cleanPlainText(actMatch[1]) : '';

  // 4. Day & Class
  const dayMatch = text.match(/(?:^|\n)\s*(?:Day\s*:?|##?\s*)\s*(Monday|Tuesday|Wednesday|Thursday|Friday)/i);
  const day = dayMatch && dayMatch[1] ? cleanPlainText(dayMatch[1]) : undefined;

  const classMatch = text.match(/(?:^|\n)\s*(?:Class|Grade)\s*:\s*([^\n]+)/i);
  const className = classMatch && classMatch[1] ? cleanPlainText(classMatch[1]) : undefined;

  return {
    day,
    className,
    target,
    learningOutcomes,
    activities,
  };
}

/**
 * Heuristic fallback parser when AI is unavailable or for deterministic unit testing.
 * Parses markdown tables and heading structures directly into LessonDrafts with high fidelity.
 */
export function heuristicParseDocument({
  extractedDoc,
  rawText,
  effectiveTitle,
  effectiveSourceType,
  effectiveSourceUrl,
}: {
  extractedDoc?: ExtractedDocument;
  rawText?: string;
  effectiveTitle: string;
  effectiveSourceType: ImportSourceType;
  effectiveSourceUrl?: string;
}): ParsedWeeklyImport {
  const content = extractedDoc?.structuredContent || rawText || '';
  const lines = content.split('\n');

  // Detect week label
  let weekNumber = 'Week 1';
  const weekMatch = content.match(/Week\s*(\d+[A-Za-z]?)/i);
  if (weekMatch && weekMatch[1]) {
    weekNumber = `Week ${weekMatch[1]}`;
  }

  const lessons: ParsedLessonDraft[] = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Identify all markdown tables in content
  const tableBlocks: Array<{
    headers: string[];
    rows: string[][];
    precedingText: string;
  }> = [];

  let currentTableLines: string[] = [];
  let precedingLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      currentTableLines.push(line);
    } else {
      if (currentTableLines.length > 0) {
        // Process accumulated table
        const validRows = currentTableLines
          .map(l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()))
          .filter(r => !r.every(c => c.replace(/[-:\s]/g, '').length === 0));

        if (validRows.length > 1) {
          tableBlocks.push({
            headers: validRows[0].map(c => c.toLowerCase()),
            rows: validRows.slice(1),
            precedingText: precedingLines.join('\n'),
          });
        }
        currentTableLines = [];
        precedingLines = [];
      }
      precedingLines.push(line);
    }
  }

  if (currentTableLines.length > 0) {
    const validRows = currentTableLines
      .map(l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()))
      .filter(r => !r.every(c => c.replace(/[-:\s]/g, '').length === 0));

    if (validRows.length > 1) {
      tableBlocks.push({
        headers: validRows[0].map(c => c.toLowerCase()),
        rows: validRows.slice(1),
        precedingText: precedingLines.join('\n'),
      });
    }
  }

  // Strategy 1: Process Table Blocks
  for (let tIdx = 0; tIdx < tableBlocks.length; tIdx++) {
    const { headers, rows, precedingText } = tableBlocks[tIdx];

    // Check if this is an Activity Block Table (rows are blocks)
    const isActivityBlockTable =
      headers.some(h => /teacher/i.test(h)) ||
      headers.some(h => /student/i.test(h)) ||
      (headers.some(h => /block|step|activity/i.test(h)) &&
       headers.some(h => /time|duration|resource|material|assess/i.test(h)));

    if (isActivityBlockTable) {
      const meta = extractLessonMetadata(precedingText);
      const teacherIdx = headers.findIndex(h => /teacher/i.test(h) || /direct instruction/i.test(h));
      const studentIdx = headers.findIndex(h => /student/i.test(h) || /independent practice/i.test(h));
      const timeIdx = headers.findIndex(h => /time|duration|min/i.test(h));
      const resIdx = headers.findIndex(h => /resource|material|textbook/i.test(h));
      const assessIdx = headers.findIndex(h => /assess|evaluation|exit|check/i.test(h));
      const blockIdx = headers.findIndex(h => /^block|^step|^activity\s*#/i.test(h));

      const blocks: ParsedBlockDraft[] = rows.map((row, rIdx) => {
        let blockNumber = rIdx + 1;
        if (blockIdx !== -1 && row[blockIdx] && /^\d+$/.test(row[blockIdx].trim())) {
          blockNumber = parseInt(row[blockIdx].trim(), 10);
        }

        const bFields: Record<string, string> = {
          teacher_activity: teacherIdx !== -1 && row[teacherIdx] ? cleanPlainText(row[teacherIdx]) : '',
          student_activity: studentIdx !== -1 && row[studentIdx] ? cleanPlainText(row[studentIdx]) : '',
          time: timeIdx !== -1 && row[timeIdx] ? cleanPlainText(row[timeIdx]) : '',
          resources: resIdx !== -1 && row[resIdx] ? cleanPlainText(row[resIdx]) : '',
          assessment: assessIdx !== -1 && row[assessIdx] ? cleanPlainText(row[assessIdx]) : '',
        };

        // Preserve any custom or legacy columns
        headers.forEach((h, cIdx) => {
          if (
            cIdx !== teacherIdx &&
            cIdx !== studentIdx &&
            cIdx !== timeIdx &&
            cIdx !== resIdx &&
            cIdx !== assessIdx &&
            cIdx !== blockIdx &&
            row[cIdx] &&
            row[cIdx].trim().length > 0
          ) {
            const key = normalizeKey(h);
            if (key && !(key in bFields)) {
              bFields[key] = cleanPlainText(row[cIdx]);
            }
          }
        });

        const hasContent = Object.values(bFields).some(v => v.length > 0);
        const isPartiallyMissing = !bFields.teacher_activity || !bFields.student_activity;
        const needsReview = hasContent && isPartiallyMissing;

        return {
          blockNumber,
          fields: bFields,
          needsReview,
        };
      });

      lessons.push({
        id: `draft_h_tbl_${tIdx + 1}_${crypto.randomUUID().slice(0, 5)}`,
        day: meta.day || days[lessons.length % days.length],
        className: meta.className || `Class ${lessons.length + 1}`,
        section: meta.section || '',
        date: '',
        target: meta.target || 'Complete curriculum unit.',
        learningOutcomes: meta.learningOutcomes || '',
        activities: meta.activities || (blocks.length > 0 ? `${blocks.length} activity blocks planned.` : ''),
        needsReview: blocks.some(b => b.needsReview) || !meta.target,
        blocks,
      });
      continue;
    }

    // Check if this is a Multi-Day Curriculum Grid (rows are days/lessons)
    const dayColIdx = headers.findIndex(h => /day/i.test(h));
    const targetColIdx = headers.findIndex(h => /target/i.test(h) && !/outcome/i.test(h));
    const outcomesColIdx = headers.findIndex(h => /outcome/i.test(h) || /objective/i.test(h));
    const actColIdx = headers.findIndex(h => /activit/i.test(h) || /procedure/i.test(h));

    if (dayColIdx !== -1 || targetColIdx !== -1) {
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (row.length < 2) continue;

        const dayText = dayColIdx !== -1 && row[dayColIdx] ? row[dayColIdx] : days[r % days.length];
        const targetText = targetColIdx !== -1 && row[targetColIdx] ? cleanPlainText(row[targetColIdx]) : '';
        const outcomesText = outcomesColIdx !== -1 && row[outcomesColIdx] ? cleanPlainText(row[outcomesColIdx]) : '';
        const actText = actColIdx !== -1 && row[actColIdx] ? cleanPlainText(row[actColIdx]) : '';

        // Extract block columns
        const blocks: ParsedBlockDraft[] = [];
        let bNum = 1;
        for (let c = 0; c < row.length; c++) {
          if (c === dayColIdx || c === targetColIdx || c === outcomesColIdx || c === actColIdx) {
            continue;
          }
          const colHeader = headers[c] || '';
          if (colHeader.includes('block') || c > 3) {
            const val = row[c];
            if (val && val.length > 0) {
              const parsed = extractBlockFieldsFromText(val);
              blocks.push({
                blockNumber: bNum++,
                fields: parsed.fields,
                needsReview: parsed.needsReview,
              });
            }
          }
        }

        if (blocks.length === 0) {
          const parsed = extractBlockFieldsFromText(actText || targetText);
          blocks.push({
            blockNumber: 1,
            fields: parsed.fields,
            needsReview: parsed.needsReview || !actText,
          });
        }

        lessons.push({
          id: `draft_h_grid_${r + 1}_${crypto.randomUUID().slice(0, 5)}`,
          day: cleanPlainText(dayText) || days[r % days.length],
          className: 'Class 1',
          section: '',
          date: '',
          target: targetText || 'Curriculum unit target.',
          learningOutcomes: outcomesText,
          activities: actText || 'Curriculum activities.',
          needsReview: blocks.some(b => b.needsReview) || !targetText,
          blocks,
        });
      }
    }
  }

  // Strategy 2: Text / Section-based parsing (if no tables were found or extracted)
  if (lessons.length === 0) {
    // Look for day section splits (e.g. "# Monday", "## Monday", "Day: Monday")
    const dayRegex = /(?:^|\n)(?:#+\s*|Day\s*:\s*)(Monday|Tuesday|Wednesday|Thursday|Friday)[^\n]*/gi;
    const dayMatches: Array<{ day: string; index: number }> = [];
    let dMatch: RegExpExecArray | null;
    while ((dMatch = dayRegex.exec(content)) !== null) {
      dayMatches.push({
        day: dMatch[1],
        index: dMatch.index,
      });
    }

    if (dayMatches.length > 0) {
      for (let i = 0; i < dayMatches.length; i++) {
        const start = dayMatches[i].index;
        const end = i + 1 < dayMatches.length ? dayMatches[i + 1].index : content.length;
        const sectionText = content.slice(start, end);
        const meta = extractLessonMetadata(sectionText);

        // Extract blocks within this day section
        const blockSplitRegex = /(?:^|\n)(?:#+\s*Block\s*\d+|Block\s*\d+\s*:|Activity\s*\d+\s*:)[^\n]*/gi;
        const blockSplits: Array<{ index: number }> = [];
        let bMatch: RegExpExecArray | null;
        while ((bMatch = blockSplitRegex.exec(sectionText)) !== null) {
          blockSplits.push({ index: bMatch.index });
        }

        const blocks: ParsedBlockDraft[] = [];
        if (blockSplits.length > 0) {
          for (let b = 0; b < blockSplits.length; b++) {
            const bStart = blockSplits[b].index;
            const bEnd = b + 1 < blockSplits.length ? blockSplits[b + 1].index : sectionText.length;
            const bText = sectionText.slice(bStart, bEnd);
            const parsed = extractBlockFieldsFromText(bText);
            blocks.push({
              blockNumber: b + 1,
              fields: parsed.fields,
              needsReview: parsed.needsReview,
            });
          }
        } else {
          // Check if teacher activity exists directly in section
          const parsed = extractBlockFieldsFromText(sectionText);
          blocks.push({
            blockNumber: 1,
            fields: parsed.fields,
            needsReview: parsed.needsReview,
          });
        }

        lessons.push({
          id: `draft_h_sec_${i + 1}_${crypto.randomUUID().slice(0, 5)}`,
          day: dayMatches[i].day,
          className: meta.className || `Class ${i + 1}`,
          section: meta.section || '',
          date: '',
          target: meta.target || (lines.find(l => l.trim().length > 0) ? cleanPlainText(lines.find(l => l.trim().length > 0)!) : 'Weekly Learning Target'),
          learningOutcomes: meta.learningOutcomes,
          activities: meta.activities || 'Class activities and procedures',
          needsReview: blocks.some(b => b.needsReview) || !meta.target,
          blocks,
        });
      }
    }
  }

  // Strategy 3: Single lesson fallback for unstructured documents
  if (lessons.length === 0) {
    const meta = extractLessonMetadata(content);

    // Look for block blocks in entire content
    const blockSplitRegex = /(?:^|\n)(?:#+\s*Block\s*\d+|Block\s*\d+\s*:|Activity\s*\d+\s*:)[^\n]*/gi;
    const blockSplits: Array<{ index: number }> = [];
    let bMatch: RegExpExecArray | null;
    while ((bMatch = blockSplitRegex.exec(content)) !== null) {
      blockSplits.push({ index: bMatch.index });
    }

    const blocks: ParsedBlockDraft[] = [];
    if (blockSplits.length > 0) {
      for (let b = 0; b < blockSplits.length; b++) {
        const bStart = blockSplits[b].index;
        const bEnd = b + 1 < blockSplits.length ? blockSplits[b + 1].index : content.length;
        const bText = content.slice(bStart, bEnd);
        const parsed = extractBlockFieldsFromText(bText);
        blocks.push({
          blockNumber: b + 1,
          fields: parsed.fields,
          needsReview: parsed.needsReview,
        });
      }
    } else {
      const parsed = extractBlockFieldsFromText(meta.activities || content);
      blocks.push({
        blockNumber: 1,
        fields: parsed.fields,
        needsReview: true,
      });
    }

    lessons.push({
      id: `draft_h_single_${crypto.randomUUID().slice(0, 5)}`,
      day: meta.day || 'Monday',
      className: meta.className || 'Class 1',
      section: '',
      date: '',
      target: meta.target || (lines[0] ? cleanPlainText(lines[0]) : 'Weekly Learning Target'),
      learningOutcomes: meta.learningOutcomes,
      activities: meta.activities || lines.slice(1, 4).join(' ').trim() || 'Class activities and procedures',
      needsReview: true,
      blocks,
    });
  }

  return {
    weekNumber,
    weekTitle: effectiveTitle,
    fileName: effectiveTitle,
    sourceType: effectiveSourceType,
    sourceUrl: effectiveSourceUrl,
    sourceTitle: effectiveTitle,
    extractedSummary: extractedDoc?.stats,
    lessons,
  };
}
