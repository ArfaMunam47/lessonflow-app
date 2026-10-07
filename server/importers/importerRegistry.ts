/**
 * Source-Agnostic Importer Registry
 * 
 * Coordinates all import sources (Google Docs, PDF, Pasted Text, and future Word/Sheets).
 * Provides source auto-detection, URL pre-inspection, and extraction dispatch.
 */

import { ImportSourceType, ExtractedDocument, ImportSourceHandler } from './types.js';
import { GoogleDocImporter, parseGoogleDocUrl } from './googleDocImporter.js';
import { PdfImporter } from './pdfImporter.js';
import { TextImporter } from './textImporter.js';

class ImporterRegistry {
  private handlers: Map<ImportSourceType, ImportSourceHandler> = new Map();

  constructor() {
    this.register(new GoogleDocImporter());
    this.register(new PdfImporter());
    this.register(new TextImporter());
  }

  public register(handler: ImportSourceHandler) {
    this.handlers.set(handler.sourceType, handler);
  }

  public getHandler(type: ImportSourceType): ImportSourceHandler | undefined {
    return this.handlers.get(type);
  }

  /**
   * Detects the probable source type from a URL, filename, or raw string.
   */
  public detectSourceType(inputStr: string): ImportSourceType {
    if (!inputStr) return 'plain_text';

    const trimmed = inputStr.trim();

    // Check Google Doc
    if (parseGoogleDocUrl(trimmed).isValid) {
      return 'google_doc';
    }

    // Check Google Sheets
    if (/docs\.google\.com\/spreadsheets/i.test(trimmed)) {
      return 'spreadsheet';
    }

    // Check PDF
    if (trimmed.toLowerCase().endsWith('.pdf') || /\.pdf(?:\?.*)?$/i.test(trimmed)) {
      return 'pdf';
    }

    // Check Word document
    if (trimmed.toLowerCase().endsWith('.docx') || trimmed.toLowerCase().endsWith('.doc')) {
      return 'word';
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return 'google_doc'; // Default web document presumption
    }

    return 'pasted_text';
  }

  /**
   * Quick inspection helper for live UI feedback when a teacher enters a link.
   */
  public async inspectUrl(url: string): Promise<{
    valid: boolean;
    sourceType: ImportSourceType | 'unknown';
    docId?: string;
    isPublished?: boolean;
    title?: string;
    accessible?: boolean;
    error?: string;
    hint?: string;
  }> {
    if (!url || typeof url !== 'string' || !url.trim()) {
      return { valid: false, sourceType: 'unknown', error: 'Please enter a document URL.' };
    }

    const trimmed = url.trim();

    // Check Google Docs
    const gDocInfo = parseGoogleDocUrl(trimmed);
    if (gDocInfo.isValid) {
      return {
        valid: true,
        sourceType: 'google_doc',
        docId: gDocInfo.docId,
        isPublished: gDocInfo.isPublished,
        hint: gDocInfo.isPublished
          ? 'Published Google Doc detected.'
          : 'Google Doc detected. Ensure link sharing is set to "Anyone with the link can view".',
      };
    }

    // Check Google Sheets
    if (/docs\.google\.com\/spreadsheets/i.test(trimmed)) {
      return {
        valid: true,
        sourceType: 'spreadsheet',
        hint: 'Google Sheet detected. To import, consider copying table content and pasting it directly.',
      };
    }

    // Check PDF URL
    if (/\.pdf(?:\?.*)?$/i.test(trimmed)) {
      return {
        valid: true,
        sourceType: 'pdf',
        hint: 'Direct PDF document link detected.',
      };
    }

    return {
      valid: false,
      sourceType: 'unknown',
      error: 'Unrecognized document link format. Please provide a Google Docs or PDF document link.',
      hint: 'Example: https://docs.google.com/document/d/your-doc-id/edit',
    };
  }

  /**
   * Dispatches extraction to the appropriate source handler.
   */
  public async extractDocument(input: {
    url?: string;
    sourceType?: ImportSourceType;
    rawText?: string;
    pdfBase64?: string;
    fileName?: string;
  }): Promise<ExtractedDocument> {
    let resolvedType = input.sourceType;

    if (!resolvedType) {
      if (input.pdfBase64) {
        resolvedType = 'pdf';
      } else if (input.url) {
        resolvedType = this.detectSourceType(input.url);
      } else if (input.rawText) {
        resolvedType = 'pasted_text';
      } else {
        throw new Error('No input provided for document extraction.');
      }
    }

    const handler = this.handlers.get(resolvedType);
    if (!handler) {
      throw new Error(`Unsupported document source type: ${resolvedType}`);
    }

    return handler.extract(input);
  }
}

export const importerRegistry = new ImporterRegistry();
