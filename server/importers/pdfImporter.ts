/**
 * PDF Importer
 * 
 * Handles uploaded PDF documents (base64) or downloadable PDF URLs.
 */

import { ImportSourceHandler, ExtractedDocument } from './types.js';

export class PdfImporter implements ImportSourceHandler {
  public sourceType = 'pdf' as const;
  public displayName = 'PDF Document';

  public canHandle(input: { url?: string; rawText?: string; pdfBase64?: string; fileName?: string }): boolean {
    if (input.pdfBase64) return true;
    if (input.fileName && input.fileName.toLowerCase().endsWith('.pdf')) return true;
    if (input.url && input.url.toLowerCase().split('?')[0].endsWith('.pdf')) return true;
    return false;
  }

  public async extract(input: {
    url?: string;
    rawText?: string;
    pdfBase64?: string;
    fileName?: string;
  }): Promise<ExtractedDocument> {
    if (!input.pdfBase64 && !input.url) {
      throw new Error('A PDF file or downloadable PDF URL is required.');
    }

    let pdfBase64 = input.pdfBase64;
    let title = input.fileName || 'Curriculum_Lesson_Plan.pdf';

    // If a PDF URL was supplied, fetch the binary and convert to base64
    if (!pdfBase64 && input.url) {
      try {
        const resp = await fetch(input.url);
        if (!resp.ok) {
          throw new Error(`Failed to download PDF from URL (HTTP ${resp.status})`);
        }
        const arrayBuf = await resp.arrayBuffer();
        pdfBase64 = Buffer.from(arrayBuf).toString('base64');
        const urlParts = input.url.split('/');
        title = urlParts[urlParts.length - 1].split('?')[0] || title;
      } catch (err: any) {
        throw new Error(`Could not fetch PDF from URL: ${err.message}`);
      }
    }

    return {
      sourceType: 'pdf',
      title,
      sourceUrl: input.url,
      rawContent: pdfBase64,
      structuredContent: `[PDF Document: ${title}]`,
      stats: {
        headingsCount: 0,
        tablesCount: 0,
        paragraphsCount: 0,
        textLength: pdfBase64 ? pdfBase64.length : 0,
      },
      metadata: {
        fileName: title,
        fetchedAt: new Date().toISOString(),
      },
    };
  }
}
