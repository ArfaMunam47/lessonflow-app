/**
 * LessonFlow Core Business Logic Test Suite
 * 
 * Verifies all 16 required test criteria:
 * 1. Text Normalization / Plain-Text Clipboard Cleaning
 * 2. Creating a Week
 * 3. Duplicating a Week (preserves structure, new stable IDs, no mutation)
 * 4. Creating a Lesson Record
 * 5. Duplicating a Lesson Record (deep clone blocks & fields)
 * 6. Creating 1 Block
 * 7. Creating 5 Blocks simultaneously in 1 click
 * 8. Creating Blocks from a Template
 * 9. Deleting a Block & Re-indexing
 * 10. Reordering Blocks
 * 11. Duplicating a Block (independent fields)
 * 12. Updating Block Fields
 * 13. Creating Clipboard Items with normalized plain text
 * 14. Calculating Weekly Progress & Percentage (e.g. 27/40 = 67.5%)
 * 15. Authorization & Multi-User Data Isolation
 * 16. Chrome Extension DTO Contract verification
 */

import { db } from '../server/db.js';
import { cleanPlainText } from '../src/utils/textCleaner.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

async function runTests() {
  console.log('--- Starting LessonFlow Automated Test Suite ---');

  // Test 1: Plain-Text Normalization / Cleaning
  console.log('\n[Test 1] Plain-text Clipboard Cleaning');
  const dirtyHtml = '<p><strong>Objective:</strong> Students will learn &quot;fractions&quot; &amp; decimals.<br><span>Next line</span></p>';
  const cleaned = cleanPlainText(dirtyHtml);
  assert(
    !cleaned.includes('<') && !cleaned.includes('>') && cleaned.includes('Students will learn "fractions" & decimals.') && cleaned.includes('Next line'),
    'Removes HTML tags, decodes entities (&quot;, &amp;), preserves text and linebreaks',
    `Got: ${cleaned}`
  );

  const whitespaceText = '   Line 1    \n\n\n\n   Line 2 with \u00A0 non-breaking space   ';
  const cleanWs = cleanPlainText(whitespaceText);
  assert(cleanWs === 'Line 1\n\nLine 2 with non-breaking space', 'Normalizes irregular whitespace and collapses excessive empty lines');

  // Test 2: User Creation & Isolation setup
  console.log('\n[Test 2] User Setup & Data Isolation');
  const teacherA = await db.createUser('Teacher Alice', 'alice@school.edu');
  const teacherB = await db.createUser('Teacher Bob', 'bob@school.edu');
  assert(Boolean(teacherA.id && teacherA.apiToken), 'Teacher A created with unique ID and API token');
  assert(Boolean(teacherB.id && teacherB.apiToken), 'Teacher B created with unique ID and API token');

  // Test 3: Week Creation
  console.log('\n[Test 3] Week Creation');
  const weekA = await db.createWeek(teacherA.id, {
    weekNumber: 'Week 8',
    title: 'Algebraic Equations',
    startDate: '2026-10-12',
    endDate: '2026-10-16',
  });
  assert(weekA.weekNumber === 'Week 8' && weekA.title === 'Algebraic Equations', 'Week created with correct attributes');
  
  // Verify User B cannot see User A's week
  const bobWeeks = db.listWeeks(teacherB.id);
  assert(!bobWeeks.some(w => w.id === weekA.id), 'Teacher B cannot view Teacher A week (Data Isolation)');

  // Test 4: Creating Lesson Record
  console.log('\n[Test 4] Lesson Record Creation');
  const recordA1 = await db.createLessonRecord(teacherA.id, weekA.id, {
    className: '7A',
    section: 'Blue',
    day: 'Monday',
    target: 'Understand one-step equations.',
    activities: 'Class discussion and textbook p.20.',
    blockCount: 0,
  });
  assert(recordA1.className === '7A' && recordA1.day === 'Monday' && recordA1.blocks.length === 0, 'Lesson record created with 0 initial blocks');

  // Test 5: Dynamic Block Builder - Creating 1 Block
  console.log('\n[Test 5] Dynamic Block Builder - 1 Block');
  const withOneBlock = await db.createBlocks(teacherA.id, recordA1.id, 1);
  assert(withOneBlock !== null && withOneBlock.blocks.length === 1, 'Successfully created exactly 1 block');

  // Test 6: Dynamic Block Builder - Creating 5 Blocks Simultaneously
  console.log('\n[Test 6] Dynamic Block Builder - 5 Blocks at once');
  const recordA2 = await db.createLessonRecord(teacherA.id, weekA.id, {
    className: '7B',
    section: 'Gold',
    day: 'Monday',
    target: 'Understand two-step equations.',
    activities: 'Paired activities.',
    blockCount: 0,
  });
  const with5Blocks = await db.createBlocks(teacherA.id, recordA2.id, 5);
  assert(with5Blocks !== null && with5Blocks.blocks.length === 5, 'Successfully created 5 blocks in a single operation');
  
  // Verify all 5 blocks have distinct stable IDs
  const blockIds = with5Blocks!.blocks.map(b => b.id);
  const uniqueBlockIds = new Set(blockIds);
  assert(uniqueBlockIds.size === 5, 'All 5 blocks have unique stable IDs');

  // Test 7: Block Templates
  console.log('\n[Test 7] Block Templates');
  const templates = db.listTemplates(teacherA.id);
  assert(templates.length >= 1, 'Default templates exist for teacher');
  const defaultTemplate = templates[0];
  assert(defaultTemplate.fields.length >= 4, `Template has ${defaultTemplate.fields.length} configured fields`);

  // Verify fields populated on created blocks
  const firstBlock = with5Blocks!.blocks[0];
  assert(firstBlock.fields.length === defaultTemplate.fields.length, 'Created block automatically populated with template fields');

  // Test 8: Updating Block Fields Independently
  console.log('\n[Test 8] Updating Block Fields Independently');
  firstBlock.fields[0].fieldValue = 'Master equation balance model.';
  await db.updateLessonRecord(teacherA.id, recordA2.id, { blocks: with5Blocks!.blocks });
  
  const reloadedA2 = db.getLessonRecord(teacherA.id, recordA2.id);
  assert(
    reloadedA2!.blocks[0].fields[0].fieldValue === 'Master equation balance model.' &&
    reloadedA2!.blocks[1].fields[0].fieldValue === '',
    'Editing Block 1 field did NOT alter Block 2 field (Independent fields)'
  );

  // Test 9: Duplicating a Block
  console.log('\n[Test 9] Duplicating a Block');
  const duplicatedBlockResult = await db.duplicateBlock(teacherA.id, recordA2.id, firstBlock.id);
  assert(duplicatedBlockResult !== null && duplicatedBlockResult.blocks.length === 6, 'Duplicating block increased total block count to 6');
  
  const newBlock = duplicatedBlockResult!.blocks[1]; // Duplicated immediately after
  assert(newBlock.id !== firstBlock.id, 'Duplicated block received a fresh stable ID');
  assert(newBlock.fields[0].fieldValue === 'Master equation balance model.', 'Duplicated block preserved field values');
  
  // Edit duplicated block to ensure no shared reference
  newBlock.fields[0].fieldValue = 'Different content for block 2';
  await db.updateLessonRecord(teacherA.id, recordA2.id, { blocks: duplicatedBlockResult!.blocks });
  const checkIsolation = db.getLessonRecord(teacherA.id, recordA2.id);
  assert(
    checkIsolation!.blocks[0].fields[0].fieldValue === 'Master equation balance model.' &&
    checkIsolation!.blocks[1].fields[0].fieldValue === 'Different content for block 2',
    'Original block was unaffected when duplicated block was modified'
  );

  // Test 10: Reordering Blocks
  console.log('\n[Test 10] Reordering Blocks');
  const initialOrder = checkIsolation!.blocks.map(b => b.id);
  const reversedOrder = [...initialOrder].reverse();
  const reordered = await db.reorderBlocks(teacherA.id, recordA2.id, reversedOrder);
  assert(reordered !== null && reordered.blocks[0].id === reversedOrder[0], 'Blocks successfully reordered');

  // Test 11: Deleting a Block
  console.log('\n[Test 11] Deleting a Block');
  const countBefore = reordered!.blocks.length;
  const afterDelete = await db.deleteBlock(teacherA.id, recordA2.id, reordered!.blocks[0].id);
  assert(afterDelete !== null && afterDelete.blocks.length === countBefore - 1, 'Block successfully deleted and count decreased by 1');
  assert(afterDelete!.blocks[0].blockNumber === 1, 'Remaining blocks properly re-indexed with blockNumber 1');

  // Test 12: Duplicating a Lesson Record
  console.log('\n[Test 12] Duplicating a Lesson Record');
  const duplicatedRecord = await db.duplicateLessonRecord(teacherA.id, recordA2.id, { day: 'Tuesday', className: '7B' });
  assert(duplicatedRecord !== null && duplicatedRecord.id !== recordA2.id, 'Duplicated record has a new ID');
  assert(duplicatedRecord!.day === 'Tuesday', 'Duplicated record applied overridden day');
  assert(duplicatedRecord!.blocks.length === afterDelete!.blocks.length, 'Duplicated record has matching block count');
  assert(duplicatedRecord!.blocks[0].id !== afterDelete!.blocks[0].id, 'Blocks within duplicated record have new stable IDs');

  // Test 13: Duplicating a Week
  console.log('\n[Test 13] Duplicating a Week');
  const duplicatedWeek = await db.duplicateWeek(teacherA.id, weekA.id, 'Week 9', 'Algebraic Equations Continued');
  assert(duplicatedWeek !== null && duplicatedWeek.id !== weekA.id, 'Duplicated week has new ID');
  assert(duplicatedWeek!.weekNumber === 'Week 9', 'Duplicated week has new week number');
  
  const week9Records = db.listLessonRecords(teacherA.id, duplicatedWeek!.id);
  assert(week9Records.length >= 2, `Week 9 has ${week9Records.length} duplicated lesson records`);
  assert(week9Records.every(r => r.weekId === duplicatedWeek!.id), 'All duplicated records point to the new week ID');

  // Test 14: Clipboard Item Creation & Extraction
  console.log('\n[Test 14] Plain-Text Clipboard Gallery');
  const clipItem = await db.createClipboardItem(teacherA.id, {
    plainText: '<b>Introduction:</b> Show decimal placement with 10 x 10 grid.',
    label: 'Monday Decimal Intro',
    category: 'target',
    weekId: weekA.id,
    lessonRecordId: recordA1.id,
  });
  assert(clipItem.plainText === 'Introduction: Show decimal placement with 10 x 10 grid.', 'Clipboard item stored with clean plain text');
  assert(!clipItem.plainText.includes('<b>'), 'Clipboard item stripped HTML bold tag');

  // Test 15: Progress Calculation (Requirement 41: 27/40 = 67.5%)
  console.log('\n[Test 15] Progress Calculation Formula');
  const progressWeek = await db.createWeek(teacherA.id, { weekNumber: 'Week Calc Test', title: 'Test 40 Records' });
  
  // Create 40 records, mark 27 as completed
  for (let i = 1; i <= 40; i++) {
    const isCompleted = i <= 27;
    const r = await db.createLessonRecord(teacherA.id, progressWeek.id, {
      className: `Class ${i}`,
      day: 'Monday',
      blockCount: 1,
    });
    if (isCompleted) {
      await db.updateLessonRecord(teacherA.id, r.id, { status: 'completed', completed: true });
    }
  }

  const progress = db.getWeeklyProgress(teacherA.id, progressWeek.id);
  assert(progress.totalRecords === 40, 'Total records equals 40');
  assert(progress.completedRecords === 27, 'Completed records equals 27');
  assert(progress.percentage === 67.5, `Percentage is exactly 67.5% (Got ${progress.percentage}%)`);

  // Test 16: Future Chrome Extension DTO Contract
  console.log('\n[Test 16] Chrome Extension DTO Contract');
  const extensionDTO = db.getExtensionRecordDTO(teacherA.id, recordA2.id);
  assert(extensionDTO !== null, 'Extension DTO returned successfully');
  assert(
    typeof extensionDTO!.className === 'string' &&
    typeof extensionDTO!.day === 'string' &&
    typeof extensionDTO!.totalBlocks === 'number' &&
    Array.isArray(extensionDTO!.blocks) &&
    Array.isArray(extensionDTO!.copyQueue),
    'Extension DTO strictly satisfies contract requirements for school website automation'
  );

  // Test 17: Multi-Lesson Import & History
  console.log('\n[Test 17] Multi-Lesson Import & History');
  const importResult = await db.commitImportedWeek(teacherA.id, {
    weekNumber: 'Week 10',
    weekTitle: 'Geometric Figures & Measurement',
    fileName: 'Curriculum_Week_10.pdf',
    sourceType: 'pdf',
    lessons: [
      {
        id: 'draft_1',
        day: 'Monday',
        className: 'Grade 6',
        section: 'Room 201',
        target: 'Calculate polygon perimeter.',
        activities: 'Ruler measurement exercise.',
        blocks: [
          {
            blockNumber: 1,
            fields: {
              objective: 'Measure sides of regular triangles.',
              teacher_activity: 'Direct instruction with digital board.',
              student_activity: 'Measure worksheet polygons.',
            },
          },
        ],
      },
      {
        id: 'draft_2',
        day: 'Tuesday',
        className: 'Grade 6',
        section: 'Room 201',
        target: 'Calculate rectangle area.',
        activities: 'Grid counting and multiplication.',
        blocks: [
          {
            blockNumber: 1,
            fields: {
              objective: 'Apply length times width formula.',
              teacher_activity: 'Demonstrate formula derivation.',
              student_activity: 'Calculate area of 5 figures.',
            },
          },
        ],
      },
    ],
  });
  assert(importResult.recordsCount === 2, 'Committed 2 lessons from imported document');
  const importHistory = db.listImportRecords(teacherA.id);
  assert(importHistory.some(i => i.fileName === 'Curriculum_Week_10.pdf'), 'Import record logged in history with original filename');

  // Test 18: Google Docs URL Parsing & Validation
  console.log('\n[Test 18] Google Docs URL Detection & Parsing');
  const { parseGoogleDocUrl } = await import('../server/importers/googleDocImporter.js');
  const standardDoc = parseGoogleDocUrl('https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing');
  assert(standardDoc.isValid && standardDoc.docId === '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', 'Accurately parses standard Google Docs URL and extracts Doc ID');

  const pubDoc = parseGoogleDocUrl('https://docs.google.com/document/d/e/2PACX-1vR_sample_published_id/pub');
  assert(pubDoc.isValid && pubDoc.isPublished === true && pubDoc.docId === '2PACX-1vR_sample_published_id', 'Accurately parses published Google Doc URL');

  const invalidDoc = parseGoogleDocUrl('https://example.com/not-a-google-doc');
  assert(!invalidDoc.isValid, 'Rejects non-Google-Doc URLs');

  // Test 19: HTML Structure Extractor (Preserving tables, headings, lists)
  console.log('\n[Test 19] HTML Structure Extractor for Google Docs Export');
  const { extractStructuredContentFromHtml } = await import('../server/importers/htmlExtractor.js');
  const sampleHtml = `
    <html>
      <head><title>Science Curriculum Plan - Google Docs</title></head>
      <body>
        <h1>Unit 4: Photosynthesis & Energy</h1>
        <p>Overview of weekly science labs.</p>
        <table>
          <tr><th>Day</th><th>Target</th><th>Block 1</th></tr>
          <tr><td>Monday</td><td>Students will identify chloroplast function.</td><td>Warmup slide 1-3</td></tr>
          <tr><td>Wednesday</td><td>Students will observe stomata under microscope.</td><td>Lab station 1</td></tr>
        </table>
        <ul>
          <li>Microscopes</li>
          <li>Plant leaf samples</li>
        </ul>
      </body>
    </html>
  `;
  const extracted = extractStructuredContentFromHtml(sampleHtml);
  assert(extracted.title === 'Science Curriculum Plan', 'Cleans document title');
  assert(extracted.stats.tablesCount === 1, 'Detects table in HTML');
  assert(extracted.stats.headingsCount === 1, 'Detects headings in HTML');
  assert(extracted.structuredText.includes('| Monday | Students will identify chloroplast function.') && extracted.structuredText.includes('| Warmup slide 1-3 |'), 'Preserves table rows and columns as structured table markdown');
  assert(extracted.structuredText.includes('# Unit 4: Photosynthesis & Energy'), 'Converts H1 to markdown header');
  assert(extracted.structuredText.includes('- Microscopes'), 'Converts list items to markdown bullets');

  // Test 20: Source-Agnostic Importer Registry
  console.log('\n[Test 20] Importer Registry & Source Auto-Detection');
  const { importerRegistry } = await import('../server/importers/importerRegistry.js');
  assert(importerRegistry.detectSourceType('https://docs.google.com/document/d/123/edit') === 'google_doc', 'Detects google_doc source type');
  assert(importerRegistry.detectSourceType('https://docs.google.com/spreadsheets/d/abc') === 'spreadsheet', 'Detects spreadsheet source type');
  assert(importerRegistry.detectSourceType('Curriculum_Plan.pdf') === 'pdf', 'Detects pdf source type');
  assert(importerRegistry.detectSourceType('Weekly notes pasted text') === 'pasted_text', 'Detects pasted_text source type');

  // Test 21: Extracting & Parsing Sample Google Doc
  console.log('\n[Test 21] Google Doc Fetch & Structured Extraction');
  const gDocResult = await importerRegistry.extractDocument({
    url: 'https://docs.google.com/document/d/sample-math-week-8/edit',
  });
  assert(gDocResult.sourceType === 'google_doc', 'Extracted document identified as google_doc');
  assert(gDocResult.title.includes('Grade 7 Mathematics'), 'Extracted title from sample Google Doc');
  assert(gDocResult.stats?.tablesCount! >= 2, 'Preserved multiple curriculum tables from Google Doc');

  // Test 22: Committing Google Doc Import & Verifying Source URL Traceability
  console.log('\n[Test 22] Committing Google Doc Import with Source URL Traceability');
  const gDocCommit = await db.commitImportedWeek(teacherA.id, {
    weekNumber: 'Week 8',
    weekTitle: 'Grade 7 Linear Equations (Google Doc)',
    sourceType: 'google_doc',
    sourceUrl: 'https://docs.google.com/document/d/sample-math-week-8/edit',
    sourceTitle: 'Grade 7 Mathematics - Week 8 Curriculum Plan',
    lessons: [
      {
        id: 'draft_gdoc_1',
        day: 'Monday',
        className: '7A',
        section: 'Blue',
        target: 'Solve one-step equations.',
        activities: 'Balance scale interactive.',
        blocks: [
          {
            blockNumber: 1,
            fields: {
              objective: 'Inverse operations warmup.',
              teacher_activity: 'Direct modeling.',
              student_activity: 'Pairs practice.',
            },
          },
        ],
      },
    ],
  });
  assert(gDocCommit.recordsCount === 1, 'Committed 1 lesson from Google Doc');
  const teacherARecords = db.listLessonRecords(teacherA.id, gDocCommit.week.id);
  assert(teacherARecords.length === 1, 'Lesson record created in week');
  assert(teacherARecords[0].sourceType === 'google_doc', 'Lesson record stores sourceType: google_doc');
  assert(teacherARecords[0].sourceUrl === 'https://docs.google.com/document/d/sample-math-week-8/edit', 'Lesson record stores original sourceUrl');

  const gDocHistory = db.listImportRecords(teacherA.id);
  const foundGDocImport = gDocHistory.find(i => i.sourceType === 'google_doc');
  assert(Boolean(foundGDocImport && foundGDocImport.sourceUrl), 'Import history contains record with sourceUrl for re-importing');

  console.log(`\n========================================`);
  console.log(`Tests Finished: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
