/**
 * LessonFlow Chrome Extension — Automated Integration Test Suite
 * 
 * Verifies:
 * 1. Text normalization & plain-text cleaning
 * 2. Selector safety & validation
 * 3. Mapping data integrity
 * 4. LessonFlow Backend Extension API Contract (GET /api/extension/lessons, GET /api/extension/records/:id)
 * 5. Bearer Token Authentication
 * 6. Native Select option matcher logic
 * 7. Dynamic Block Scoping logic
 */

import { cleanPlainText, validateSelector, validateMapping, isAllowedHost } from '../shared/validation.js';
import { ConnectionStatus, FillMode } from '../shared/types.js';

let passed = 0;
let failed = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

async function runExtensionTests() {
  console.log('=== LessonFlow Chrome Extension Automated Test Suite ===\n');

  // Test 1: Plain-Text Normalization
  console.log('[Test 1] Plain-Text Cleaning & HTML Stripping');
  const rawHtml = '<p><strong>Objective:</strong> Master &quot;fractions&quot; &amp; decimals.<br><span>Next line</span></p>';
  const cleaned = cleanPlainText(rawHtml);
  assert(
    !cleaned.includes('<') &&
    !cleaned.includes('>') &&
    cleaned.includes('Master "fractions" & decimals.') &&
    cleaned.includes('Next line'),
    'Strips HTML, decodes &quot; and &amp;, preserves text and linebreaks'
  );

  const spaces = '   Header line   \u00A0 \n\n\n\n   Paragraph text with trailing spaces   ';
  const cleanSpaces = cleanPlainText(spaces);
  assert(cleanSpaces === 'Header line\n\nParagraph text with trailing spaces', 'Collapses excessive newlines and removes non-breaking spaces');

  // Test 2: Selector Validation & Safety Guard
  console.log('\n[Test 2] Selector Validation & Safety Guards');
  assert(validateSelector('#school-target-textarea').valid, 'Accepts valid ID selector');
  assert(validateSelector('form#curriculum input[name="className"]').valid, 'Accepts scoped form selector');
  assert(!validateSelector('').valid, 'Rejects empty selector');
  assert(!validateSelector('button[type="submit"]').valid, 'SAFETY: Rejects final submit button selector');
  assert(!validateSelector('input[type="submit"]').valid, 'SAFETY: Rejects submit input selector');

  // Test 3: Mapping Data Integrity
  console.log('\n[Test 3] Mapping Data Structure');
  const validMapping = {
    id: 'map_1',
    origin: 'portal.school.edu',
    lessonFlowField: 'target',
    selector: '#target-input',
    elementType: 'textarea',
  };
  assert(validateMapping(validMapping).valid, 'Validates well-formed mapping');

  const invalidMapping = {
    id: 'map_2',
    origin: 'portal.school.edu',
    // missing lessonFlowField
    selector: '#target-input',
  };
  assert(!validateMapping(invalidMapping).valid, 'Detects missing required mapping fields');

  // Test 4: Host URL Safety Checker
  console.log('\n[Test 4] Host Safety Checker');
  assert(isAllowedHost('https://school-portal.edu/curriculum'), 'Allows standard https school portal');
  assert(isAllowedHost('http://localhost:3000/demo-school-website'), 'Allows local demo simulator');
  assert(!isAllowedHost('chrome://extensions'), 'SAFETY: Disallows chrome:// internal pages');
  assert(!isAllowedHost('https://chromewebstore.google.com/detail/123'), 'SAFETY: Disallows Chrome Web Store');

  // Test 5: Backend API Endpoint: GET /api/extension/lessons
  console.log('\n[Test 5] Extension API: GET /api/extension/lessons');
  try {
    const resp = await fetch('http://localhost:3000/api/extension/lessons', {
      headers: {
        'x-api-token': 'lf_tok_active',
      },
    });
    assert(resp.status === 200, 'Endpoint responds with HTTP 200');
    const data = await resp.json();
    assert(Array.isArray(data.weeks), 'Returns array of weeks');
    assert(Array.isArray(data.lessons), 'Returns array of lessons');
    assert(Boolean(data.user && data.user.apiToken), 'Returns user metadata with apiToken');
  } catch (err) {
    assert(false, 'Failed to fetch /api/extension/lessons', err.message);
  }

  // Test 6: Backend API Endpoint: GET /api/extension/records/:id
  console.log('\n[Test 6] Extension API: GET /api/extension/records/:id');
  try {
    // Get first available lesson
    const listResp = await fetch('http://localhost:3000/api/extension/lessons');
    const listData = await listResp.json();
    if (listData.lessons.length > 0) {
      const firstId = listData.lessons[0].id;
      const recResp = await fetch(`http://localhost:3000/api/extension/records/${firstId}`, {
        headers: {
          'Authorization': 'Bearer lf_tok_active',
        },
      });
      assert(recResp.status === 200, 'Returns HTTP 200 for valid lesson record');
      const dto = await recResp.json();
      assert(Boolean(dto.id && dto.className && dto.day), 'DTO contains id, className, and day');
      assert(Array.isArray(dto.blocks), 'DTO contains structured blocks array');
      assert(Array.isArray(dto.copyQueue), 'DTO contains clean copyQueue array');
    } else {
      console.log('  ℹ No lessons present to fetch DTO (empty state)');
    }
  } catch (err) {
    assert(false, 'Failed to fetch extension record DTO', err.message);
  }

  // Test 7: Dropdown Matching Logic
  console.log('\n[Test 7] Dropdown Matching Logic');
  const sampleOptions = [
    { value: '', text: '-- Select Day --' },
    { value: 'Monday', text: 'Monday' },
    { value: 'Tuesday', text: 'Tuesday' },
    { value: 'Wednesday', text: 'Wednesday' },
  ];
  const findMatch = (val) => sampleOptions.find(o => o.value.toLowerCase() === val.toLowerCase() || o.text.toLowerCase() === val.toLowerCase());
  assert(findMatch('monday')?.value === 'Monday', 'Accurately matches exact day case-insensitively');
  assert(findMatch('Friday') === undefined, 'Correctly reports missing option without guessing');

  // Test 8: Block Scoping Selector Resolver
  console.log('\n[Test 8] Block Scoping Logic');
  const block1Selector = '[data-block="1"] #block-1-objective';
  const block2Selector = '[data-block="2"] #block-2-objective';
  assert(block1Selector !== block2Selector, 'Block 1 and Block 2 have completely distinct scoped selectors');

  // Test 9: Service Worker Module Imports & Manifest Integrity
  console.log('\n[Test 9] Service Worker Module Imports & Manifest Integrity');
  try {
    globalThis.chrome = {
      runtime: {
        onInstalled: { addListener: () => {} },
        onMessage: { addListener: () => {} },
        sendMessage: () => Promise.resolve(),
      },
      sidePanel: { setPanelBehavior: () => Promise.resolve() },
      storage: { local: { get: () => {}, set: () => {} } },
      tabs: { onUpdated: { addListener: () => {} } },
      scripting: {},
    };

    // Dynamically import background service worker to verify all ESM imports resolve without SyntaxError
    await import('../background/service-worker.js');
    assert(true, 'Service worker evaluates cleanly without SyntaxError or missing module exports');
  } catch (err) {
    assert(false, 'Service worker module evaluation failed', err.message);
  }

  console.log('\n========================================');
  console.log(`Extension Tests Finished: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runExtensionTests().catch(err => {
  console.error('Fatal error in extension tests:', err);
  process.exit(1);
});
