/**
 * Server-Side Gemini AI Parser for Unstructured Lesson Plans
 * 
 * Takes messy lesson plan text, Word documents, copied tables, or syllabi,
 * and extracts structured lesson record and block data.
 * 
 * DEFENSIVE DESIGN:
 * - If a field is not present in the source text, it returns an empty string or null.
 * - Never fabricates or hallucinates content not mentioned in the source.
 * - Leaves final acceptance to the teacher in the UI.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { AiParsedLesson } from '../src/types/index.js';
import { cleanPlainText } from '../src/utils/textCleaner.js';

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

export async function parseUnstructuredLessonPlan(rawText: string): Promise<AiParsedLesson> {
  const cleaned = cleanPlainText(rawText);
  if (!cleaned.trim()) {
    throw new Error('Input text is empty.');
  }

  const ai = getAiClient();

  const prompt = `
You are a precise data extraction assistant for school lesson plans.
Extract the lesson plan components strictly from the provided text.

CRITICAL RULES:
1. Do NOT hallucinate, guess, or invent any content that is not present in the source text.
2. If class, section, day, target, or activities are not explicitly present, use null or empty string.
3. Extract each block with its blockNumber and key-value fields. Common fields include:
   - objective
   - teacher_activity
   - student_activity
   - resources
   - assessment
   Use other field keys if specified in the text (e.g., warmup, homework, differentiation).
4. If the text does not contain multiple blocks, extract at least 1 block from whatever activities/content exist.

Source text:
"""
${cleaned}
"""
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          className: { type: Type.STRING, description: 'Class name like 6A, Grade 7, etc.' },
          section: { type: Type.STRING, description: 'Section name like Blue, A, 1, etc.' },
          day: { type: Type.STRING, description: 'Day of week: Monday, Tuesday, etc.' },
          target: { type: Type.STRING, description: 'Weekly or daily learning target / standard' },
          activities: { type: Type.STRING, description: 'Overview of lesson activities or procedures' },
          blocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                blockNumber: { type: Type.INTEGER },
                fields: {
                  type: Type.OBJECT,
                  description: 'Key-value map of block field keys to values (e.g. objective, teacher_activity, student_activity, resources, assessment)',
                },
              },
              required: ['fields'],
            },
          },
        },
        required: ['blocks'],
      },
    },
  });

  const responseText = response.text?.trim() || '{}';
  try {
    const parsed = JSON.parse(responseText) as AiParsedLesson;
    
    // Ensure blocks is array and normalize
    return {
      className: parsed.className ? cleanPlainText(parsed.className) : undefined,
      section: parsed.section ? cleanPlainText(parsed.section) : undefined,
      day: parsed.day ? cleanPlainText(parsed.day) : undefined,
      target: parsed.target ? cleanPlainText(parsed.target) : undefined,
      activities: parsed.activities ? cleanPlainText(parsed.activities) : undefined,
      blocks: Array.isArray(parsed.blocks)
        ? parsed.blocks.map((b, idx) => {
            const cleanFields: Record<string, string> = {};
            if (b.fields && typeof b.fields === 'object') {
              for (const [k, v] of Object.entries(b.fields)) {
                cleanFields[k] = cleanPlainText(v);
              }
            }
            return {
              blockNumber: b.blockNumber || idx + 1,
              fields: cleanFields,
            };
          })
        : [],
    };
  } catch (err) {
    console.error('Error parsing AI response:', err, responseText);
    throw new Error('Failed to parse AI response into structured lesson format.');
  }
}
