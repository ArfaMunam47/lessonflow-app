/**
 * Pasted / Plain Text Importer
 * 
 * Handles pasted text, syllabus notes, curriculum outlines, or markdown text.
 */

import { ImportSourceHandler, ExtractedDocument } from './types.js';
import { cleanPlainText } from '../../src/utils/textCleaner.js';

export class TextImporter implements ImportSourceHandler {
  public sourceType = 'pasted_text' as const;
  public displayName = 'Pasted Text';

  public canHandle(input: { url?: string; rawText?: string; pdfBase64?: string }): boolean {
    return Boolean(input.rawText && input.rawText.trim().length > 0);
  }

  public async extract(input: {
    url?: string;
    rawText?: string;
    fileName?: string;
  }): Promise<ExtractedDocument> {
    const raw = input.rawText || '';
    const cleaned = cleanPlainText(raw);

    if (!cleaned.trim()) {
      throw new Error('Pasted text is empty.');
    }

    const lines = cleaned.split('\n').filter(l => l.trim().length > 0);
    const headings = lines.filter(l => l.startsWith('#') || /^[A-Z0-9\s-]{4,}:?$/.test(l));

    return {
      sourceType: 'pasted_text',
      title: input.fileName || 'Pasted Lesson Plan',
      structuredContent: cleaned,
      rawContent: raw,
      stats: {
        headingsCount: headings.length,
        tablesCount: cleaned.includes('|') ? 1 : 0,
        paragraphsCount: lines.length,
        textLength: cleaned.length,
      },
      metadata: {
        fetchedAt: new Date().toISOString(),
      },
    };
  }
}
