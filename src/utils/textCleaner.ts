/**
 * Text Normalization Utility
 * 
 * Cleans copied text or HTML fragments from Word, Google Docs, PDFs, or websites
 * into clean plain text while stripping all HTML formatting, styles, scripts,
 * entity artifacts, and unwanted spacing.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&#160;': ' ',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '...',
  '&bull;': '•',
  '&lsquo;': "'",
  '&rsquo;': "'",
  '&ldquo;': '"',
  '&rdquo;': '"',
};

/**
 * Normalizes input text or HTML to clean plain text.
 * 
 * @param input Raw text or HTML string
 * @returns Clean plain text with normalized whitespace and no HTML tags
 */
export function cleanPlainText(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }

  let text = String(input);

  // If text is completely empty or just whitespace
  if (!text.trim()) {
    return '';
  }

  // 1. Remove script and style tags and their contents
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // 2. Convert block-level elements and break tags to appropriate line breaks
  text = text.replace(/<(?:br|\/p|\/div|\/li|\/tr|h[1-6]|\/h[1-6])\s*\/?>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '• ');

  // 3. Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 4. Decode common HTML entities
  for (const [entity, replacement] of Object.entries(HTML_ENTITY_MAP)) {
    text = text.replaceAll(entity, replacement);
  }

  // Handle numeric entities (e.g. &#65; or &#x41;)
  text = text.replace(/&#(\d+);/g, (_, dec) => {
    const code = parseInt(dec, 10);
    return isNaN(code) ? '' : String.fromCharCode(code);
  });
  text = text.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const code = parseInt(hex, 16);
    return isNaN(code) ? '' : String.fromCharCode(code);
  });

  // 5. Replace non-breaking spaces and irregular unicode spaces with standard space
  text = text.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g, ' ');

  // 6. Normalize carriage returns and multiple consecutive blank lines
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Collapse spaces per line without destroying indentation where meaningful
  const lines = text.split('\n').map((line) => {
    return line.replace(/[ \t]+/g, ' ').trim();
  });

  // Remove excessive consecutive empty lines (max 2 consecutive newlines)
  const cleanedLines: string[] = [];
  let prevBlank = false;

  for (const line of lines) {
    if (line === '') {
      if (!prevBlank && cleanedLines.length > 0) {
        cleanedLines.push('');
      }
      prevBlank = true;
    } else {
      cleanedLines.push(line);
      prevBlank = false;
    }
  }

  return cleanedLines.join('\n').trim();
}
