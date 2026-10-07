/**
 * HTML Structure Extractor for Google Docs & Rich Documents
 * 
 * Preserves semantic hierarchy:
 * - Headings (h1, h2, h3, h4)
 * - Tables (converts table rows and columns cleanly)
 * - Lists (bulleted ul and numbered ol)
 * - Paragraphs and line breaks
 * Strips styles, scripts, tracking pixels, and empty markup.
 */

import * as cheerio from 'cheerio';
import { cleanPlainText } from '../../src/utils/textCleaner.js';

export interface ExtractedHtmlResult {
  title: string;
  structuredText: string;
  stats: {
    headingsCount: number;
    tablesCount: number;
    paragraphsCount: number;
    textLength: number;
  };
}

export function extractStructuredContentFromHtml(html: string): ExtractedHtmlResult {
  const $ = cheerio.load(html);

  // 1. Remove unwanted elements
  $('script, style, link, meta, noscript, svg, img').remove();

  // 2. Extract title
  let docTitle = $('title').text().trim();
  if (docTitle.endsWith(' - Google Docs')) {
    docTitle = docTitle.replace(/ - Google Docs$/, '').trim();
  }
  if (!docTitle) {
    const firstHeading = $('h1, h2, h3').first().text().trim();
    if (firstHeading) {
      docTitle = firstHeading;
    } else {
      docTitle = 'Google Docs Lesson Plan';
    }
  }

  let headingsCount = 0;
  let tablesCount = 0;
  let paragraphsCount = 0;

  // Count elements
  headingsCount = $('h1, h2, h3, h4, h5, h6').length;
  tablesCount = $('table').length;
  paragraphsCount = $('p').length;

  // 3. Process tables into clean markdown tables or structured table blocks
  $('table').each((_, tableElem) => {
    const tableRows: string[] = [];
    const $table = $(tableElem);

    $table.find('tr').each((rIdx, rowElem) => {
      const cells: string[] = [];
      $(rowElem).find('th, td').each((_, cellElem) => {
        const cellText = cleanPlainText($(cellElem).text());
        // Clean inner newlines for tabular layout
        cells.push(cellText.replace(/\n+/g, ' '));
      });

      if (cells.some(c => c.length > 0)) {
        tableRows.push(`| ${cells.join(' | ')} |`);

        // If this is the header row, add markdown separator
        if (rIdx === 0) {
          const separator = cells.map(() => '---').join(' | ');
          tableRows.push(`| ${separator} |`);
        }
      }
    });

    if (tableRows.length > 0) {
      const markdownTable = `\n\n${tableRows.join('\n')}\n\n`;
      $table.replaceWith(markdownTable);
    } else {
      $table.remove();
    }
  });

  // 4. Transform headings
  $('h1').each((_, el) => {
    const text = cleanPlainText($(el).text());
    if (text) $(el).replaceWith(`\n\n# ${text}\n\n`);
  });
  $('h2').each((_, el) => {
    const text = cleanPlainText($(el).text());
    if (text) $(el).replaceWith(`\n\n## ${text}\n\n`);
  });
  $('h3').each((_, el) => {
    const text = cleanPlainText($(el).text());
    if (text) $(el).replaceWith(`\n\n### ${text}\n\n`);
  });
  $('h4, h5, h6').each((_, el) => {
    const text = cleanPlainText($(el).text());
    if (text) $(el).replaceWith(`\n\n#### ${text}\n\n`);
  });

  // 5. Transform list items
  $('li').each((_, el) => {
    const text = cleanPlainText($(el).text());
    if (text) $(el).replaceWith(`\n- ${text}`);
  });

  // 6. Transform line breaks
  $('br').replaceWith('\n');

  // 7. Transform paragraphs
  $('p').each((_, el) => {
    const text = cleanPlainText($(el).text());
    if (text) $(el).replaceWith(`\n${text}\n`);
  });

  // 8. Extract all remaining text and normalize
  const rawExtracted = $.root().text();
  const normalized = cleanPlainText(rawExtracted);

  return {
    title: cleanPlainText(docTitle) || 'Lesson Plan Document',
    structuredText: normalized,
    stats: {
      headingsCount,
      tablesCount,
      paragraphsCount,
      textLength: normalized.length,
    },
  };
}
