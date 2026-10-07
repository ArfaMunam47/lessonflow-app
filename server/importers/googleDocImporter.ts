/**
 * Google Docs Importer
 * 
 * Extracts structured lesson plan data from shared Google Docs links.
 * Handles:
 * - Public & shared link detection
 * - Standard doc IDs and published /pub links
 * - HTML export fetching with table and heading preservation
 * - Graceful permission / restricted document error detection with actionable teacher advice
 * - Built-in fallback sample support for testing without requiring a private Google Doc
 */

import { ImportSourceHandler, ExtractedDocument } from './types.js';
import { extractStructuredContentFromHtml } from './htmlExtractor.js';
import { cleanPlainText } from '../../src/utils/textCleaner.js';

export interface GoogleDocUrlInfo {
  isValid: boolean;
  docId?: string;
  isPublished?: boolean;
  normalizedUrl?: string;
}

export function parseGoogleDocUrl(urlStr: string): GoogleDocUrlInfo {
  if (!urlStr || typeof urlStr !== 'string') {
    return { isValid: false };
  }

  const trimmed = urlStr.trim();

  // Pattern 1: Published Google Doc (/d/e/{pubId}/pub)
  const pubMatch = trimmed.match(/\/document\/d\/e\/([a-zA-Z0-9_-]+)/i);
  if (pubMatch && pubMatch[1]) {
    return {
      isValid: true,
      docId: pubMatch[1],
      isPublished: true,
      normalizedUrl: `https://docs.google.com/document/d/e/${pubMatch[1]}/pub`,
    };
  }

  // Pattern 2: Standard Google Doc (/document/d/{docId})
  const docMatch = trimmed.match(/\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/i);
  if (docMatch && docMatch[1]) {
    return {
      isValid: true,
      docId: docMatch[1],
      isPublished: false,
      normalizedUrl: `https://docs.google.com/document/d/${docMatch[1]}/edit`,
    };
  }

  // Pattern 3: Google Drive file link (/file/d/{fileId})
  const driveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return {
      isValid: true,
      docId: driveMatch[1],
      isPublished: false,
      normalizedUrl: `https://docs.google.com/document/d/${driveMatch[1]}/edit`,
    };
  }

  return { isValid: false };
}

// Built-in sample mock for demonstration / testing purposes
const SAMPLE_DOCS: Record<string, { title: string; html: string }> = {
  'sample-math-week-8': {
    title: 'Grade 7 Mathematics - Week 8 Curriculum Plan',
    html: `
      <html>
        <head><title>Grade 7 Mathematics - Week 8 Curriculum Plan - Google Docs</title></head>
        <body>
          <h1>Grade 7 Mathematics - Week 8: Linear Equations & Inequalities</h1>
          <p>Teacher: Grade 7 Math Dept | Term 2 | Week 8</p>
          <h2>Weekly Overview</h2>
          <p>Target: Students will solve and graph single-variable multi-step linear equations and understand their real-world applications.</p>
          
          <h2>Class 7A - Section Blue</h2>
          <table>
            <tr>
              <th>Day</th>
              <th>Learning Target</th>
              <th>Activities & Procedures</th>
              <th>Block 1 (Warmup & Hook)</th>
              <th>Block 2 (Direct Instruction)</th>
              <th>Block 3 (Independent Practice)</th>
            </tr>
            <tr>
              <td>Monday</td>
              <td>Students will isolate variables using inverse addition and subtraction properties.</td>
              <td>1. Bellringer balance scale puzzles. 2. Guided notes on equation balance. 3. Partner practice worksheet problems 1-10.</td>
              <td>Warmup: Solve 5 mental math balance puzzles on board. Target: 5 minutes.</td>
              <td>Instruction: Model two-step inverse operations on smartboard. Emphasize showing balance steps.</td>
              <td>Practice: Students complete textbook page 142 items 1-12 in pairs.</td>
            </tr>
            <tr>
              <td>Wednesday</td>
              <td>Students will solve equations involving distributive property with parentheses.</td>
              <td>Review homework. Guided demo with distributive rainbow method. Small group station rotation.</td>
              <td>Warmup: Expanding algebraic expressions warmup check.</td>
              <td>Instruction: Distributing negative coefficients. Common error analysis.</td>
              <td>Practice: Station rotation: 3 stations with tiered difficulty problem sets.</td>
            </tr>
            <tr>
              <td>Friday</td>
              <td>Students will formulate linear equations from real-life word problem contexts.</td>
              <td>Word problem scavenger hunt around classroom. Exit slip evaluation.</td>
              <td>Warmup: Translate verbal statements into algebraic expressions.</td>
              <td>Instruction: Identifying key words: 'per', 'sum', 'difference', 'total cost'.</td>
              <td>Practice: Word problem task cards with self-checking QR codes.</td>
            </tr>
          </table>

          <h2>Class 7B - Section Gold</h2>
          <table>
            <tr>
              <th>Day</th>
              <th>Learning Target</th>
              <th>Activities & Procedures</th>
              <th>Block 1 (Warmup)</th>
              <th>Block 2 (Instruction)</th>
              <th>Block 3 (Hands-on Lab)</th>
            </tr>
            <tr>
              <td>Tuesday</td>
              <td>Students will graph linear relationships and identify slopes from equations.</td>
              <td>Desmos graphing interactive activity. Coordinate plane whiteboard practice.</td>
              <td>Warmup: Plot given coordinates on grid.</td>
              <td>Instruction: Slope-intercept form y = mx + b breakdown.</td>
              <td>Practice: Desmos marble slide activity exploring varying slope values.</td>
            </tr>
            <tr>
              <td>Thursday</td>
              <td>Students will calculate slope between two coordinate points using m = (y2 - y1) / (x2 - x1).</td>
              <td>Slope formula speed challenge. Error analysis of common subtraction sign mistakes.</td>
              <td>Warmup: Finding rise over run on visual graphs.</td>
              <td>Instruction: Step-by-step subtraction with negative integers in slope formula.</td>
              <td>Practice: Paired worksheet problem sets 1-8 with peer checking.</td>
            </tr>
          </table>
        </body>
      </html>
    `,
  },
};

export class GoogleDocImporter implements ImportSourceHandler {
  public sourceType = 'google_doc' as const;
  public displayName = 'Google Docs';

  public canHandle(input: { url?: string; rawText?: string; pdfBase64?: string }): boolean {
    if (!input.url) return false;
    const info = parseGoogleDocUrl(input.url);
    return info.isValid;
  }

  public async extract(input: {
    url?: string;
    rawText?: string;
    fileName?: string;
  }): Promise<ExtractedDocument> {
    if (!input.url) {
      throw new Error('A Google Docs URL is required for Google Doc import.');
    }

    const urlInfo = parseGoogleDocUrl(input.url);
    if (!urlInfo.isValid || !urlInfo.docId) {
      throw new Error(
        'Invalid Google Docs URL. Please paste a link starting with https://docs.google.com/document/d/... or a published Google Doc link.'
      );
    }

    const docId = urlInfo.docId;

    // Check if user requested sample / test doc
    if (SAMPLE_DOCS[docId]) {
      const sample = SAMPLE_DOCS[docId];
      const parsed = extractStructuredContentFromHtml(sample.html);
      return {
        sourceType: 'google_doc',
        title: sample.title,
        sourceUrl: urlInfo.normalizedUrl || input.url,
        structuredContent: parsed.structuredText,
        rawContent: sample.html,
        stats: parsed.stats,
        metadata: {
          docId,
          isSample: true,
          fetchedAt: new Date().toISOString(),
        },
      };
    }

    // Determine target fetch URL
    let fetchUrl: string;
    if (urlInfo.isPublished) {
      fetchUrl = `https://docs.google.com/document/d/e/${docId}/pub`;
    } else {
      // Standard Google Doc: use the HTML export endpoint
      fetchUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;
    }

    try {
      const response = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LessonFlow/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });

      // Check if redirected to Google sign-in
      const finalUrl = response.url || '';
      if (
        finalUrl.includes('accounts.google.com') ||
        finalUrl.includes('ServiceLogin') ||
        response.status === 401 ||
        response.status === 403
      ) {
        throw new Error(
          'RESTRICTED_GOOGLE_DOC: This Google Doc is not publicly accessible. Please open the document in Google Docs, click "Share" in the upper right, change General access to "Anyone with the link can view", and try again. Alternatively, copy and paste the document text in the "Paste Text" tab.'
        );
      }

      if (response.status === 404) {
        throw new Error(
          'NOT_FOUND_GOOGLE_DOC: Google Doc not found. Please double-check the URL to make sure the document exists.'
        );
      }

      if (!response.ok) {
        throw new Error(
          `Google Docs returned HTTP status ${response.status}. Please ensure the document is shared as "Anyone with the link can view".`
        );
      }

      const rawHtml = await response.text();

      // Check content for login / authentication prompts
      if (
        rawHtml.includes('<title>Google Accounts</title>') ||
        rawHtml.includes('Sign in - Google Accounts') ||
        rawHtml.includes('ServiceLogin')
      ) {
        throw new Error(
          'RESTRICTED_GOOGLE_DOC: This Google Doc requires Google sign-in. To allow LessonFlow to access it, set link sharing to "Anyone with the link can view" in Google Docs, or copy and paste the text directly.'
        );
      }

      // Check for empty or invalid response
      if (!rawHtml || rawHtml.trim().length < 50) {
        throw new Error('Received empty content from the Google Docs link. Please verify the document has content.');
      }

      const extracted = extractStructuredContentFromHtml(rawHtml);

      return {
        sourceType: 'google_doc',
        title: extracted.title,
        sourceUrl: urlInfo.normalizedUrl || input.url,
        structuredContent: extracted.structuredText,
        rawContent: rawHtml,
        stats: extracted.stats,
        metadata: {
          docId,
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      if (err.message && (err.message.includes('RESTRICTED_GOOGLE_DOC') || err.message.includes('NOT_FOUND_GOOGLE_DOC'))) {
        throw err;
      }
      throw new Error(`Failed to access Google Doc: ${err.message || 'Network error fetching document.'}`);
    }
  }
}
