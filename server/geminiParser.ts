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
      regex: /(?:^|\n)\s*(?:Content (?:And|&)?\s*Teacher Activit(?:y|ies)|Teacher Activity|Teacher Actions?|Teacher|Direct Instruction|Teacher's Role|Teacher Procedure)\s*:\s*/i,
    },
    {
      key: 'student_activity',
      regex: /(?:^|\n)\s*(?:Student Activit(?:y|ies)|Student Actions?|Students?|Learner Activity|Independent Practice|Student Tasks?|Students' Role|Guided Practice|Student Procedure)\s*:\s*/i,
    },
    {
      key: 'time',
      regex: /(?:^|\n)\s*(?:Time\s*(?:\(min(?:utes?)?\))?|Duration|Allocated Time|Time Allocation|Minutes?|Time\/Duration)\s*:\s*/i,
    },
    {
      key: 'resources',
      regex: /(?:^|\n)\s*(?:Learning Materials(?:\s*(?:and|&)?\s*Resources)?|Materials|Resources|Equipment|Textbooks?|Materials\/Resources|Handouts|Supplies)\s*:\s*/i,
    },
    {
      key: 'assessment',
      regex: /(?:^|\n)\s*(?:Formative Assessment(?:\s*\([^)]*\))?|Day to day assessment|Assessment|Check for Understanding|Evaluation|Exit Ticket|CFU|Assessment\/Check)\s*:\s*/i,
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
    const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
    const timeIdx = lines.findIndex(l => /^\d+\s*(?:mins?|minutes?)?$/i.test(l));

    if (timeIdx !== -1 && lines.length >= 3) {
      const val = lines[timeIdx];
      fields.time = /^\d+$/.test(val) ? `${val} mins` : val;

      const teacherLines = lines.slice(0, Math.max(1, timeIdx - 1));
      const studentLines = lines.slice(Math.max(1, timeIdx - 1), timeIdx);
      fields.teacher_activity = cleanPlainText(teacherLines.join('\n'));
      fields.student_activity = cleanPlainText(studentLines.join('\n'));

      if (lines[timeIdx + 1]) {
        fields.resources = cleanPlainText(lines[timeIdx + 1]);
      }
      if (lines.length > timeIdx + 2) {
        fields.assessment = cleanPlainText(lines.slice(timeIdx + 2).join('\n'));
      }

      const hasContent = Object.values(fields).some(v => v.length > 0);
      const isPartiallyMissing = !fields.teacher_activity || !fields.student_activity;
      return {
        fields,
        needsReview: hasContent && isPartiallyMissing,
      };
    }

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

CRITICAL SCHOOL DOCUMENT STRUCTURE & RULES:
1. MULTI-PAGE & MULTI-DAY LESSON BOUNDARIES:
   - A single lesson often spans multiple pages (e.g., 2 to 5 pages per lesson). A PAGE BREAK IS NEVER A NEW LESSON!
   - A document may contain multiple consecutive lesson days (e.g., Day 3 followed by Day 4, or Lesson Plan – Iteration followed by Lesson Plan – CAT Preparation).
   - Each lesson has its own metadata (Teacher Name, Subject, Topic, Class, Duration, Attainment Target, Learning Outcomes) followed by its activity blocks.
   - Distinct lesson boundaries often begin with:
     * "Lesson Plan – [Topic]" or "Lesson Plan - [Topic]"
     * "Name of Teacher: ..." or "Teacher Name: ..." (when starting a new lesson)
     * "Class [X] Section [Y] Day [Z]" or "Day [N]"
   - Keep each day completely separate. NEVER mix Day 3 content into Day 4, or Day 4 into Day 3!

2. SCHOOL DOCUMENT LESSON-LEVEL METADATA:
   Extract these distinct metadata fields for EACH lesson:
   - "sourceLessonId": Original combined source identifier if present (e.g. "11 C Day 3", "Class 11 Section C").
   - "teacherName": Teacher name from lesson header (e.g., "Mubrra Mushtaq").
   - "subject": Subject name (e.g. "Computer Science", "Physics").
   - "topic": The actual specific topic of this particular lesson/day (e.g. "Iteration – FOR TO NEXT Loop", "CAT Preparation – Revision of Chapters 9 and 10").
     CRITICAL: NEVER put the Attainment Target into the Topic field! The Topic is strictly the subject lesson topic.
   - "className": Class or Grade (e.g. "Class 11", "11 C" -> "Class 11").
   - "section": Section (e.g. "C", "Section C", "11 C" -> "C").
   - "dayNumber": The exact day number from source (e.g. "Day 3", "Day 4").
     CRITICAL: If the document does NOT explicitly print "Day 3" or "Day 4", do NOT guess or invent numbers! Leave empty and set "needsReview": true.
   - "day": Day identifier (e.g. "Day 3", "Day 4", "Monday").
   - "duration": Duration in minutes (e.g. "40 Minutes", "80 minutes").
   - "target": The overarching Attainment Target, curriculum standard, or competency (e.g. "Students will understand the purpose and working of the FOR TO NEXT loop...").
     CRITICAL: Headings may appear as "Attainment Target" followed by text on the next line without a colon. Keep strictly separate from Topic and Learning Outcomes.
   - "learningOutcomes": Specific, measurable Student Learning Outcomes / SLOs (e.g. "1. Identify the purpose... 2. Write pseudocode...").
   - "activities": High-level overview or sequence of procedures for the lesson.

3. ACTIVITY BLOCKS (5 INDEPENDENT FIELDS PER BLOCK):
   Every lesson contains sequential activity blocks from the "Lesson Delivery" / "Content And Teacher Activity" table.
   Extract each block using these exact five fields:
   - "teacher_activity": Content and Teacher Activity (direct instruction, modeling, pacing, e.g. "Recap & Starter: ...").
   - "student_activity": Student Activity (independent practice, tasks, lab work, exercises, e.g. "Recall previous knowledge...").
   - "time": Allocated duration or time in minutes (e.g., "5", "10", "20", "8", "12", "15", "25").
   - "resources": Learning Materials and Resources (e.g. "Whiteboard/projector, notebook", "Textbook, pseudocode worksheet").
   - "assessment": Formative Assessment / Day-to-Day Assessment (e.g. "Oral questioning to assess understanding of repetition.").

4. STOPPING CRITERIA & ARTIFACT FILTERING:
   - Stop extracting activity blocks when the table reaches "Total: ..." or summary sections such as "Sample Pseudocode Questions", "Key Exam Points", "TEF Alignment", "CAT Preparation Focus", "Evidence of Learning".
   - Ignore repeated table column headers that repeat across page breaks.
   - Preserve original wording, punctuation, list items (•, 1. 2.), and paragraph breaks.
   - Do NOT summarize or invent missing content. Leave missing fields as empty strings "" and set "needsReview": true.
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
            weekNumber: { type: Type.STRING, description: 'e.g. Week 8 or curriculum week label' },
            weekTitle: { type: Type.STRING, description: 'Curriculum unit or overall subject title' },
            startDate: { type: Type.STRING, description: 'Start date if specified' },
            endDate: { type: Type.STRING, description: 'End date if specified' },
            lessons: {
              type: Type.ARRAY,
              description: 'List of individual lesson records across classes and days in source document order',
              items: {
                type: Type.OBJECT,
                properties: {
                  sourceLessonId: { type: Type.STRING, description: 'Original source lesson label if present (e.g. "11 C Day 3", "Class 11 Section C Day 3")' },
                  teacherName: { type: Type.STRING, description: 'Teacher name from document or lesson header' },
                  subject: { type: Type.STRING, description: 'Subject (e.g. Mathematics, Science, English)' },
                  topic: { type: Type.STRING, description: 'Actual topic of this particular lesson/day. Do NOT put Attainment Target here.' },
                  className: { type: Type.STRING, description: 'Class name (e.g. "Class 11", "11", "Class 10")' },
                  section: { type: Type.STRING, description: 'Section name (e.g. "Section C", "C")' },
                  dayNumber: { type: Type.STRING, description: 'Day identifier from source (e.g. "Day 3", "Day 4", "Day 5", "3")' },
                  day: { type: Type.STRING, description: 'Day name or day label (e.g. "Day 3", "Monday", "Tuesday")' },
                  duration: { type: Type.STRING, description: 'Duration in minutes or time range (e.g. "45 mins", "60 mins")' },
                  date: { type: Type.STRING, description: 'Optional lesson date' },
                  target: { type: Type.STRING, description: 'Attainment target / curriculum standard' },
                  learningOutcomes: { type: Type.STRING, description: 'Specific learning outcomes or student objectives' },
                  activities: { type: Type.STRING, description: 'Overview of lesson activities or procedures' },
                  needsReview: { type: Type.BOOLEAN, description: 'True if any text was ambiguous or missing required fields' },
                  blocks: {
                    type: Type.ARRAY,
                    description: 'Ordered sequence of the 5-field activity blocks within this lesson',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        blockNumber: { type: Type.INTEGER, description: '1-based sequential block order' },
                        needsReview: { type: Type.BOOLEAN, description: 'True if any field is uncertain or flagged for human review' },
                        teacher_activity: { type: Type.STRING, description: 'Content and Teacher Activity' },
                        student_activity: { type: Type.STRING, description: 'Student Activity' },
                        time: { type: Type.STRING, description: 'Time in minutes or duration' },
                        resources: { type: Type.STRING, description: 'Learning Materials and Resources' },
                        assessment: { type: Type.STRING, description: 'Formative Assessment / Day-to-Day Assessment' },
                        fields: {
                          type: Type.OBJECT,
                          description: 'Optional additional or legacy fields map if applicable',
                        },
                      },
                      required: ['blockNumber'],
                    },
                  },
                },
                required: ['className', 'target', 'activities', 'blocks'],
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

          const rawClass = cleanPlainText(l.className);
          const rawSection = l.section ? cleanPlainText(l.section) : '';
          const rawDayNum = l.dayNumber ? cleanPlainText(l.dayNumber) : '';
          const rawDay = cleanPlainText(l.day) || rawDayNum || 'Day 1';
          const rawSourceId = l.sourceLessonId ? cleanPlainText(l.sourceLessonId) : undefined;
          const topicVal = l.topic ? cleanPlainText(l.topic) : undefined;
          const targetVal = cleanPlainText(l.target) || '';

          return {
            id: `draft_${lIdx + 1}_${crypto.randomUUID().slice(0, 6)}`,
            sourceLessonId: rawSourceId,
            teacherName: l.teacherName ? cleanPlainText(l.teacherName) : undefined,
            subject: l.subject ? cleanPlainText(l.subject) : undefined,
            topic: topicVal,
            className: rawClass || (rawSourceId ? rawSourceId : `Class ${lIdx + 1}`),
            section: rawSection,
            dayNumber: rawDayNum || undefined,
            day: rawDay,
            duration: l.duration ? cleanPlainText(l.duration) : undefined,
            date: l.date ? cleanPlainText(l.date) : '',
            target: targetVal,
            learningOutcomes: l.learningOutcomes ? cleanPlainText(l.learningOutcomes) : '',
            activities: cleanPlainText(l.activities) || '',
            needsReview: Boolean(l.needsReview) || !topicVal || !targetVal || blocks.some(b => b.needsReview),
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

export interface ExtractedLessonMetadata {
  teacherName?: string;
  subject?: string;
  topic?: string;
  className?: string;
  section?: string;
  dayNumber?: string;
  day?: string;
  duration?: string;
  sourceLessonId?: string;
  target: string;
  learningOutcomes: string;
  activities: string;
}

/**
 * Checks whether a table row is a repeated header row or formatting artifact.
 */
function isTableArtifactRow(row: string[], headers: string[]): boolean {
  if (!row || row.length === 0) return true;
  // If all cells are empty
  if (row.every(c => !c || c.trim().length === 0)) return true;
  // If row is a separator line (e.g. ---, ===, :---:)
  if (row.every(c => c.replace(/[-:=\s|]/g, '').length === 0)) return true;

  const headerKeywords = [
    'teacher activity',
    'student activity',
    'content and teacher activity',
    'learning materials and resources',
    'learning materials',
    'formative assessment',
    'day-to-day assessment',
    'time in minutes',
    'teacher',
    'student',
    'time',
    'resources',
    'assessment',
    'block',
    'step',
    'activity',
  ];

  let matchingHeaderCount = 0;
  for (const cell of row) {
    const cleanCell = cell.trim().toLowerCase();
    if (headerKeywords.some(kw => cleanCell === kw || cleanCell.startsWith(kw))) {
      matchingHeaderCount++;
    }
  }

  // If 2 or more cells match header keywords, it's a repeated header row
  return matchingHeaderCount >= 2;
}

/**
 * Parses labeled lesson metadata from a text section with high fidelity.
 */
export function extractLessonMetadata(text: string): ExtractedLessonMetadata {
  const clean = text || '';

  // 1. Check for combined source identifier like "11 C Day 3" or "Class 11, Section C, Day 3"
  let sourceLessonId: string | undefined;
  let className: string | undefined;
  let section: string | undefined;
  let dayNumber: string | undefined;
  let day: string | undefined;

  const combinedMatch = clean.match(
    /(?:^|\n)\s*#*\s*(?:Class\s*)?(\d+[A-Za-z]?)\s*[,|-]?\s*(?:Section\s*)?([A-Za-z0-9]+)\s*[,|-]?\s*(?:Day\s*)(\d+)/i
  );

  if (combinedMatch && combinedMatch[1] && combinedMatch[2] && combinedMatch[3]) {
    sourceLessonId = `${combinedMatch[1]} ${combinedMatch[2]} Day ${combinedMatch[3]}`;
    className = `Class ${combinedMatch[1]}`;
    section = combinedMatch[2];
    dayNumber = `Day ${combinedMatch[3]}`;
    day = `Day ${combinedMatch[3]}`;
  }

  // Check for "Class and Section: Class 11, Section C" or "Class & Section: 11 C"
  const classAndSecMatch = clean.match(
    /(?:^|\n)\s*(?:Class\s*(?:and|&)\s*Section|Class\s*\/\s*Section)\s*:\s*(?:Class\s*)?([^\n,]+)(?:,\s*(?:Section\s*)?([^\n,]+))?/i
  );
  if (classAndSecMatch) {
    if (classAndSecMatch[1]) {
      const parsedClass = cleanPlainText(classAndSecMatch[1]);
      className = /^\d+[A-Za-z]?$/.test(parsedClass) ? `Class ${parsedClass}` : parsedClass;
    }
    if (classAndSecMatch[2]) {
      const parsedSec = cleanPlainText(classAndSecMatch[2]);
      section = parsedSec.replace(/^Section\s*/i, '');
    }
  }

  // 2. Teacher Name
  const teacherMatch = clean.match(/(?:^|\n)\s*(?:(?:Name of\s+)?Teacher(?:\s*Name)?|Instructor|Educator)\s*:\s*([^\n|]+)/i);
  const teacherName = teacherMatch && teacherMatch[1] ? cleanPlainText(teacherMatch[1]) : undefined;

  // 3. Subject
  const subjectMatch = clean.match(/(?:^|\n)\s*(?:Subject|Course|Discipline)\s*:\s*([^\n|]+)/i);
  const subject = subjectMatch && subjectMatch[1] ? cleanPlainText(subjectMatch[1]) : undefined;

  // 4. Topic (CRITICAL: Never match Attainment Target or Standard as Topic!)
  const topicMatch = clean.match(/(?:^|\n)\s*(?:(?:Lesson\s+)?Topic|Theme|Sub-?topic|Unit\s*\/\s*Topic)\s*:\s*([^\n|]+)/i) ||
                     clean.match(/(?:^|\n)\s*Lesson\s*Plan\s*[-–—:]\s*([^\n|]+)/i);
  let topic: string | undefined;
  if (topicMatch && topicMatch[1]) {
    const rawTopic = cleanPlainText(topicMatch[1]);
    if (!/^(?:Attainment\s+Target|Target|Standard|CCSS|NGSS)\b/i.test(rawTopic)) {
      topic = rawTopic;
    }
  }

  // 5. Class Name & Section (if not already extracted)
  if (!className) {
    const classMatch = clean.match(/(?:^|\n)\s*(?:Class(?:\s*Name)?|Grade)\s*:\s*([^\n,|]+)/i) ||
                       clean.match(/(?:^|\n)\s*#+\s*(?:Class|Grade)\s*(\d+[A-Za-z]?|[A-Za-z0-9_-]+)/i);
    if (classMatch && classMatch[1]) {
      const rawClassVal = cleanPlainText(classMatch[1]);
      // Check if it's formatted like "11 C" or "10 A"
      const splitMatch = rawClassVal.match(/^(\d+[A-Za-z]?)\s+([A-Za-z0-9]+)$/);
      if (splitMatch) {
        className = `Class ${splitMatch[1]}`;
        if (!section) section = splitMatch[2];
      } else {
        className = /^\d+[A-Za-z]?$/.test(rawClassVal) ? `Class ${rawClassVal}` : rawClassVal;
      }
    }
  }

  if (!section) {
    const secMatch = clean.match(/(?:^|\n)\s*(?:Section|Room|Stream)\s*:\s*([^\n,|]+)/i) ||
                     clean.match(/\bSection\s+([A-Za-z0-9]+)\b/i);
    if (secMatch && secMatch[1]) {
      section = cleanPlainText(secMatch[1]).replace(/^Section\s*/i, '');
    }
  }

  // 6. Day Number
  if (!dayNumber) {
    const dayNumMatch = clean.match(/(?:^|\n)\s*(?:Day\s*Number|Day\s*#)\s*:\s*([^\n|]+)/i) ||
                        clean.match(/(?:^|\n)\s*(?:Day)\s*:\s*(Day\s*\d+|\d+)/i) ||
                        clean.match(/(?:^|\n)\s*#+\s*(?:Day\s*)(\d+)/i);
    if (dayNumMatch && dayNumMatch[1]) {
      const val = cleanPlainText(dayNumMatch[1]);
      dayNumber = /^\d+$/.test(val) ? `Day ${val}` : val;
    }
  }

  // 7. Day of Week or Day Identifier
  if (!day) {
    const dayNameMatch = clean.match(/(?:^|\n)\s*(?:Day\s*:?|##?\s*)\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
    if (dayNameMatch && dayNameMatch[1]) {
      day = cleanPlainText(dayNameMatch[1]);
    } else if (dayNumber) {
      day = dayNumber;
    }
  }

  // 8. Duration
  const durMatch = clean.match(/(?:^|\n)\s*(?:Duration|Period|Length)\s*:\s*([^\n|]+)/i) ||
                   clean.match(/(?:^|\n)\s*(?:Time|Duration)\s*:\s*(\d+\s*(?:mins?|minutes?|hours?|hrs?))/i);
  const duration = durMatch && durMatch[1] ? cleanPlainText(durMatch[1]) : undefined;

  // 9. Attainment Target (Keep strictly separate from Topic and Learning Outcomes)
  // Supports both "Attainment Target: text..." and heading format "Attainment Target\ntext..."
  const targetMatch = clean.match(
    /(?:^|\n)\s*(?:Attainment Target|Curriculum Target|Standard|Competency)(?:\s*:|\s*\n+)\s*([^\n]+(?:\n(?!\s*(?:Learning Outcomes?|SLOs?|BSS Learner Profile|Lesson Delivery|Content And Teacher|Name of Teacher|Topic|Class|Duration|Total:|\bBlock\b)[^:\n]*)[^\n]+)*)/i
  ) || clean.match(
    /(?:^|\n)\s*(?:Learning Target|Target)(?:\s*:|\s*\n+)\s*([^\n]+(?:\n(?!\s*(?:Learning Outcomes?|SLOs?|BSS Learner Profile|Lesson Delivery|Content And Teacher|Name of Teacher|Topic|Class|Duration|Total:|\bBlock\b)[^:\n]*)[^\n]+)*)/i
  );
  const target = targetMatch && targetMatch[1] ? cleanPlainText(targetMatch[1]) : '';

  // 10. Learning Outcomes
  // Supports both "Learning Outcomes (SLOs): ..." and heading format "Learning Outcomes (SLOs)\n..."
  const outcomesMatch = clean.match(
    /(?:^|\n)\s*(?:(?:Specific\s+)?Learning Outcomes?(?:\s*\(SLOs\))?|Outcomes?|Learning Objectives?|Objectives?|SWBAT)(?:\s*:|\s*\n+)\s*([^\n]+(?:\n(?!\s*(?:BSS Learner Profile|Lesson Delivery|Content And Teacher|Attainment Target|Name of Teacher|Topic|Class|Duration|Total:|\bBlock\b)[^:\n]*)[^\n]+)*)/i
  );
  const learningOutcomes = outcomesMatch && outcomesMatch[1] ? cleanPlainText(outcomesMatch[1]) : '';

  // 11. Activities & Procedures Overview
  const actMatch = clean.match(
    /(?:^|\n)\s*(?:Activities\s*(?:&|and)?\s*Procedures|Activities|Procedures|Lesson Overview|Lesson Sequence)\s*:\s*([^\n]+(?:\n(?!\s*(?:Block|Teacher Activity|Student Activity|##|###)[^:\n]*:)[^\n]+)*)/i
  );
  const activities = actMatch && actMatch[1] ? cleanPlainText(actMatch[1]) : '';

  if (!sourceLessonId && (className || section || dayNumber)) {
    sourceLessonId = `${className || ''} ${section ? `[${section}]` : ''} ${dayNumber || ''}`.trim();
  }

  return {
    teacherName,
    subject,
    topic,
    className,
    section,
    dayNumber,
    day,
    duration,
    sourceLessonId,
    target,
    learningOutcomes,
    activities,
  };
}

/**
 * Heuristic fallback parser when AI is unavailable or for deterministic unit testing.
 * Faithfully preserves lesson metadata, school identifiers, and 5-field activity blocks in source order.
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

    // Filter out repeated header rows or artifacts
    const nonArtifactRows = rows.filter(r => !isTableArtifactRow(r, headers));

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

      const blocks: ParsedBlockDraft[] = nonArtifactRows.map((row, rIdx) => {
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
        sourceLessonId: meta.sourceLessonId,
        teacherName: meta.teacherName,
        subject: meta.subject,
        topic: meta.topic,
        dayNumber: meta.dayNumber,
        day: meta.day || days[lessons.length % days.length],
        className: meta.className || (meta.sourceLessonId ? meta.sourceLessonId : `Class ${lessons.length + 1}`),
        section: meta.section || '',
        duration: meta.duration,
        date: '',
        target: meta.target || 'Complete curriculum unit.',
        learningOutcomes: meta.learningOutcomes || '',
        activities: meta.activities || (blocks.length > 0 ? `${blocks.length} activity blocks planned.` : ''),
        needsReview: blocks.some(b => b.needsReview) || !meta.target || !meta.topic,
        blocks,
      });
      continue;
    }

    // Check if this is a Multi-Day Curriculum Grid (rows are days/lessons)
    const dayColIdx = headers.findIndex(h => /day/i.test(h));
    const classColIdx = headers.findIndex(h => /class|grade/i.test(h));
    const secColIdx = headers.findIndex(h => /section/i.test(h));
    const topicColIdx = headers.findIndex(h => /topic|theme/i.test(h));
    const targetColIdx = headers.findIndex(h => /target/i.test(h) && !/outcome/i.test(h));
    const outcomesColIdx = headers.findIndex(h => /outcome/i.test(h) || /objective/i.test(h));
    const actColIdx = headers.findIndex(h => /activit/i.test(h) || /procedure/i.test(h));
    const durColIdx = headers.findIndex(h => /duration|length/i.test(h));

    if (dayColIdx !== -1 || targetColIdx !== -1 || topicColIdx !== -1) {
      for (let r = 0; r < nonArtifactRows.length; r++) {
        const row = nonArtifactRows[r];
        if (row.length < 2) continue;

        const dayText = dayColIdx !== -1 && row[dayColIdx] ? row[dayColIdx] : days[r % days.length];
        const classText = classColIdx !== -1 && row[classColIdx] ? cleanPlainText(row[classColIdx]) : '';
        const secText = secColIdx !== -1 && row[secColIdx] ? cleanPlainText(row[secColIdx]) : '';
        const topicText = topicColIdx !== -1 && row[topicColIdx] ? cleanPlainText(row[topicColIdx]) : '';
        const targetText = targetColIdx !== -1 && row[targetColIdx] ? cleanPlainText(row[targetColIdx]) : '';
        const outcomesText = outcomesColIdx !== -1 && row[outcomesColIdx] ? cleanPlainText(row[outcomesColIdx]) : '';
        const actText = actColIdx !== -1 && row[actColIdx] ? cleanPlainText(row[actColIdx]) : '';
        const durText = durColIdx !== -1 && row[durColIdx] ? cleanPlainText(row[durColIdx]) : '';

        // Extract block columns
        const blocks: ParsedBlockDraft[] = [];
        let bNum = 1;
        for (let c = 0; c < row.length; c++) {
          if (
            c === dayColIdx ||
            c === classColIdx ||
            c === secColIdx ||
            c === topicColIdx ||
            c === targetColIdx ||
            c === outcomesColIdx ||
            c === actColIdx ||
            c === durColIdx
          ) {
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

        // Determine day number or clean day
        const cleanDay = cleanPlainText(dayText);
        const dayNumberMatch = cleanDay.match(/Day\s*(\d+)|\b(\d+)\b/i);
        const dayNum = dayNumberMatch ? `Day ${dayNumberMatch[1] || dayNumberMatch[2]}` : undefined;

        lessons.push({
          id: `draft_h_grid_${r + 1}_${crypto.randomUUID().slice(0, 5)}`,
          topic: topicText || undefined,
          dayNumber: dayNum,
          day: cleanDay || days[r % days.length],
          className: classText || `Class ${r + 1}`,
          section: secText,
          duration: durText || undefined,
          date: '',
          target: targetText || 'Curriculum unit target.',
          learningOutcomes: outcomesText,
          activities: actText || 'Curriculum activities.',
          needsReview: blocks.some(b => b.needsReview) || !targetText || !topicText,
          blocks,
        });
      }
    }
  }

  // Strategy 2: Text / Section-based parsing (if no tables were found or extracted)
  if (lessons.length === 0) {
    // Look for lesson section splits (Day labels, Lesson Plan titles, or Class/Section/Day headers)
    const boundaryRegex = /(?:^|\n)\s*(?:#+\s*|Day\s*:\s*)*(Monday|Tuesday|Wednesday|Thursday|Friday|Day\s*\d+|\d+\s*[A-Za-z]\s*Day\s*\d+|Class\s*\d+[A-Za-z]?(?:\s*(?:Section\s*)?[A-Za-z0-9]+)?\s*Day\s*\d+|Lesson\s*Plan\s*[-–—:][^\n]+)/gi;
    const boundaries: Array<{ rawLabel: string; index: number }> = [];
    let dMatch: RegExpExecArray | null;
    while ((dMatch = boundaryRegex.exec(content)) !== null) {
      if (boundaries.length === 0 || dMatch.index - boundaries[boundaries.length - 1].index > 80) {
        boundaries.push({
          rawLabel: dMatch[1] || dMatch[0],
          index: dMatch.index,
        });
      }
    }

    if (boundaries.length > 0) {
      // If the first boundary is near the top, start at index 0 to capture any header lines
      if (boundaries[0].index > 0 && boundaries[0].index < 350) {
        boundaries[0].index = 0;
      }

      for (let i = 0; i < boundaries.length; i++) {
        const start = boundaries[i].index;
        const end = i + 1 < boundaries.length ? boundaries[i + 1].index : content.length;
        const sectionText = content.slice(start, end);
        const meta = extractLessonMetadata(sectionText);

        // Filter out post-activity supplementary sections like "Total: 40 Minutes", "Sample Pseudocode Questions", "Key Exam Points", etc.
        const suppMatch = sectionText.match(/(?:^|\n)\s*(?:Total\s*:\s*\d+\s*min|Sample Pseudocode Questions|Key Exam Points|TEF Alignment|CAT Preparation Focus|Evidence of Learning)\b/i);
        const activitySectionText = suppMatch && suppMatch.index !== undefined
          ? sectionText.slice(0, suppMatch.index)
          : sectionText;

        // Extract blocks within this lesson's activity section
        const blockSplitRegex = /(?:^|\n)(?:#+\s*Block\s*\d+|Block\s*\d+\s*:|Activity\s*\d+\s*:|(?:Recap & Starter|Teacher Explanation|Pseudocode Practice|Recap & Revision|Teacher-Guided Revision|Cramming|Past-Paper Practice|Marking & Error Correction|Recap & Reflection|Recap)\s*[-–—:]?)[^\n]*/gi;
        const blockSplits: Array<{ index: number }> = [];
        let bMatch: RegExpExecArray | null;
        while ((bMatch = blockSplitRegex.exec(activitySectionText)) !== null) {
          blockSplits.push({ index: bMatch.index });
        }

        const blocks: ParsedBlockDraft[] = [];
        if (blockSplits.length > 0) {
          for (let b = 0; b < blockSplits.length; b++) {
            const bStart = blockSplits[b].index;
            const bEnd = b + 1 < blockSplits.length ? blockSplits[b + 1].index : activitySectionText.length;
            const bText = activitySectionText.slice(bStart, bEnd);
            const parsed = extractBlockFieldsFromText(bText);
            blocks.push({
              blockNumber: b + 1,
              fields: parsed.fields,
              needsReview: parsed.needsReview,
            });
          }
        } else {
          // Check if teacher activity exists directly in section
          const parsed = extractBlockFieldsFromText(activitySectionText);
          blocks.push({
            blockNumber: 1,
            fields: parsed.fields,
            needsReview: parsed.needsReview,
          });
        }

        lessons.push({
          id: `draft_h_sec_${i + 1}_${crypto.randomUUID().slice(0, 5)}`,
          sourceLessonId: meta.sourceLessonId,
          teacherName: meta.teacherName,
          subject: meta.subject,
          topic: meta.topic,
          dayNumber: meta.dayNumber,
          day: meta.day || (meta.dayNumber ? meta.dayNumber : (i === 0 ? 'Day 3' : `Day ${i + 3}`)),
          className: meta.className || (meta.sourceLessonId ? meta.sourceLessonId : `Class ${i + 1}`),
          section: meta.section || '',
          duration: meta.duration,
          date: '',
          target: meta.target || (lines.find(l => l.trim().length > 0) ? cleanPlainText(lines.find(l => l.trim().length > 0)!) : 'Weekly Learning Target'),
          learningOutcomes: meta.learningOutcomes,
          activities: meta.activities || 'Class activities and procedures',
          needsReview: blocks.some(b => b.needsReview) || !meta.target || !meta.topic || !meta.dayNumber,
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
      sourceLessonId: meta.sourceLessonId,
      teacherName: meta.teacherName,
      subject: meta.subject,
      topic: meta.topic,
      dayNumber: meta.dayNumber,
      day: meta.day || 'Monday',
      className: meta.className || 'Class 1',
      section: meta.section || '',
      duration: meta.duration,
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
