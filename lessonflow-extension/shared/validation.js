/**
 * LessonFlow Chrome Extension — Shared Validation & Utility Functions
 */

const HTML_ENTITY_MAP = {
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
 * Normalizes and strips HTML, rich text, and irregular whitespaces.
 * Ensures the value transferred or copied is pristine plain text.
 */
export function cleanPlainText(input) {
  if (input === null || input === undefined) return '';
  let text = String(input);
  if (!text.trim()) return '';

  // 1. Remove script and style tags and contents
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // 2. Convert block tags
  text = text.replace(/<(?:br|\/p|\/div|\/li|\/tr|h[1-6]|\/h[1-6])\s*\/?>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '• ');

  // 3. Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 4. Decode common HTML entities
  for (const [entity, replacement] of Object.entries(HTML_ENTITY_MAP)) {
    text = text.replaceAll(entity, replacement);
  }

  // Handle numeric entities
  text = text.replace(/&#(\d+);/g, (_, dec) => {
    const code = parseInt(dec, 10);
    return isNaN(code) ? '' : String.fromCharCode(code);
  });
  text = text.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const code = parseInt(hex, 16);
    return isNaN(code) ? '' : String.fromCharCode(code);
  });

  // 5. Replace non-breaking spaces
  text = text.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g, ' ');

  // 6. Normalize carriage returns
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Collapse spaces per line
  const lines = text.split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim());

  // Remove excessive consecutive empty lines (max 2 consecutive newlines, i.e. 1 blank line between)
  const cleanedLines = [];
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

/**
 * Validates a CSS selector to ensure it is syntactically sound
 * and doesn't target dangerous or submit controls.
 */
export function validateSelector(selector) {
  if (!selector || typeof selector !== 'string' || !selector.trim()) {
    return { valid: false, error: 'Selector cannot be empty.' };
  }

  const s = selector.trim();

  // Safety check: Never target submit/publish buttons
  if (/type=["']?submit["']?/i.test(s) || /button:contains\(['"]submit['"]\)/i.test(s)) {
    return { valid: false, error: 'Targeting final submit buttons is strictly prohibited.' };
  }

  try {
    // If in DOM environment, test querySelector
    if (typeof document !== 'undefined' && document.createDocumentFragment) {
      document.createDocumentFragment().querySelector(s);
    }
    return { valid: true, selector: s };
  } catch (err) {
    return { valid: false, error: `Invalid CSS selector syntax: ${err.message}` };
  }
}

/**
 * Validates an individual Field Mapping entry.
 */
export function validateMapping(mapping) {
  if (!mapping || typeof mapping !== 'object') {
    return { valid: false, error: 'Mapping must be an object.' };
  }

  if (!mapping.id || !mapping.origin || !mapping.lessonFlowField) {
    return { valid: false, error: 'Mapping missing required metadata (id, origin, or field).' };
  }

  const selectorCheck = validateSelector(mapping.selector);
  if (!selectorCheck.valid) {
    return selectorCheck;
  }

  return { valid: true };
}

/**
 * Checks if a hostname or URL is suitable for extension operation.
 * Prevents running on chrome://, edge://, or extension gallery pages.
 */
export function isAllowedHost(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') return false;

    const host = parsed.hostname.toLowerCase();
    // Disallow browser webstores and internal domains
    if (host.includes('chromewebstore.google.com') || host.includes('chrome.google.com')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
