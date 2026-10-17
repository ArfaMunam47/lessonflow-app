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

  // Safety check: Never target submit/publish buttons or final submission controls
  if (
    /type=["']?submit["']?/i.test(s) ||
    /button:contains\(['"]submit['"]\)/i.test(s) ||
    /(?:^|[-_#.])(?:submit|publish)(?:[-_.]|$)/i.test(s) ||
    /submit[-_]?btn|btn[-_]?submit|submit[-_]?button/i.test(s)
  ) {
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
 * Allows teacher-authorized HTTP/HTTPS school websites, BEAMS, and local test portals.
 * Prevents running on chrome://, edge://, about:blank, chrome-error://, or extension gallery pages.
 */
export function isAllowedHost(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') return false;

    const host = parsed.hostname.toLowerCase();
    // Disallow browser webstores and internal extension galleries
    if (
      host === 'chromewebstore.google.com' ||
      host === 'chrome.google.com' ||
      host.endsWith('.chromewebstore.google.com') ||
      host.includes('microsoftedge.microsoft.com')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the match pattern origin for Chrome optional host permission requests.
 * E.g., 'https://beams.school.edu/app' -> 'https://beams.school.edu/*'
 */
export function getOriginPattern(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return `${parsed.protocol}//${parsed.hostname}/*`;
  } catch {
    return null;
  }
}

/**
 * Returns rich display and classification info for the active browser tab.
 */
export function getTabDisplayInfo(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') {
    return {
      isAllowed: false,
      hostname: '',
      origin: '',
      originPattern: null,
      friendlyName: 'No active tab',
      restricted: true,
      reason: 'No tab URL available.',
    };
  }

  try {
    const parsed = new URL(urlStr);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();

    // Browser internal pages
    if (protocol === 'chrome:' || protocol === 'edge:' || protocol === 'about:') {
      if (urlStr.includes('newtab') || urlStr === 'about:blank') {
        return {
          isAllowed: false,
          hostname: '',
          origin: '',
          originPattern: null,
          friendlyName: 'New Browser Tab',
          restricted: true,
          reason: 'Please navigate to your school website or portal.',
        };
      }
      if (urlStr.includes('extensions')) {
        return {
          isAllowed: false,
          hostname: '',
          origin: '',
          originPattern: null,
          friendlyName: 'Browser Extensions (Restricted)',
          restricted: true,
          reason: 'Browser extensions pages cannot be modified.',
        };
      }
      return {
        isAllowed: false,
        hostname: '',
        origin: '',
        originPattern: null,
        friendlyName: 'Browser Internal Page (Restricted)',
        restricted: true,
        reason: 'Extensions cannot run on browser system pages.',
      };
    }

    if (protocol === 'chrome-error:') {
      return {
        isAllowed: false,
        hostname: '',
        origin: '',
        originPattern: null,
        friendlyName: 'Browser Error Page',
        restricted: true,
        reason: 'Page failed to load. Check website address.',
      };
    }

    if (protocol !== 'http:' && protocol !== 'https:') {
      return {
        isAllowed: false,
        hostname: '',
        origin: '',
        originPattern: null,
        friendlyName: 'Restricted Tab',
        restricted: true,
        reason: `Unsupported URL protocol: ${protocol}`,
      };
    }

    // Web stores
    if (
      hostname === 'chromewebstore.google.com' ||
      hostname === 'chrome.google.com' ||
      hostname.endsWith('.chromewebstore.google.com') ||
      hostname.includes('microsoftedge.microsoft.com')
    ) {
      return {
        isAllowed: false,
        hostname: parsed.hostname,
        origin: parsed.origin,
        originPattern: null,
        friendlyName: 'Web Store (Restricted)',
        restricted: true,
        reason: 'Chrome extensions cannot run inside web store pages.',
      };
    }

    const originPattern = `${parsed.protocol}//${parsed.hostname}/*`;
    return {
      isAllowed: true,
      hostname: parsed.hostname,
      origin: parsed.origin,
      originPattern,
      friendlyName: parsed.hostname,
      restricted: false,
    };
  } catch {
    return {
      isAllowed: false,
      hostname: '',
      origin: '',
      originPattern: null,
      friendlyName: 'Special browser tab',
      restricted: true,
      reason: 'Could not parse tab URL.',
    };
  }
}
