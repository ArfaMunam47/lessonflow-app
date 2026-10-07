/**
 * Extensible Import Source Architecture & Types
 * 
 * Supports:
 * - Google Docs (via shared links, export endpoints, or published documents)
 * - PDF documents (via file upload or URL)
 * - Pasted text / Plain text
 * - Extensible for Word documents and Spreadsheets
 */

export type ImportSourceType =
  | 'google_doc'
  | 'pdf'
  | 'plain_text'
  | 'pasted_text'
  | 'word'
  | 'spreadsheet';

export interface ExtractedDocument {
  sourceType: ImportSourceType;
  title: string;
  sourceUrl?: string;
  structuredContent: string; // Markdown or semantically preserved text (headings, tables, lists)
  rawContent?: string;
  stats?: {
    headingsCount: number;
    tablesCount: number;
    paragraphsCount: number;
    textLength: number;
  };
  metadata?: Record<string, any>;
}

export interface ImportSourceHandler {
  sourceType: ImportSourceType;
  displayName: string;
  canHandle(input: { url?: string; rawText?: string; pdfBase64?: string; fileName?: string }): boolean;
  extract(input: {
    url?: string;
    rawText?: string;
    pdfBase64?: string;
    fileName?: string;
  }): Promise<ExtractedDocument>;
}
