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

  // Test 23: Stage 2 Step 1 - Dedicated learningOutcomes field & BEAMS 5-Field Block Alignment
  console.log('\n[Test 23] Dedicated learningOutcomes Field & 5-Field BEAMS Block Alignment');
  const beamsWeek = await db.createWeek(teacherA.id, {
    weekNumber: 'Week 12',
    title: 'Cell Biology & Mitosis',
  });
  const beamsRecord = await db.createLessonRecord(teacherA.id, beamsWeek.id, {
    className: 'Grade 9 Biology',
    section: 'Lab B',
    day: 'Wednesday',
    target: 'HS-LS1-4: Use a model to illustrate the role of cellular division and differentiation.',
    learningOutcomes: 'SWBAT describe the 4 phases of mitosis and calculate the mitotic index from sample tissue slides.',
    activities: '1. Bellringer on chromosome structure 2. Microscope slide station 3. Formative exit slip.',
    blockCount: 2,
  });

  assert(
    Boolean(
      beamsRecord.target.includes('HS-LS1-4') &&
      beamsRecord.learningOutcomes?.includes('SWBAT describe the 4 phases of mitosis') &&
      beamsRecord.activities.includes('Microscope slide station')
    ),
    'Lesson record preserves distinct Attainment Target, Learning Outcomes, and Activities'
  );

  // Verify the default 5 block fields: teacher_activity, student_activity, time, resources, assessment
  const defaultBlock1 = beamsRecord.blocks[0];
  const fieldKeys = defaultBlock1.fields.map(f => f.fieldKey);
  const expectedKeys = ['teacher_activity', 'student_activity', 'time', 'resources', 'assessment'];
  const all5KeysPresent = expectedKeys.every(k => fieldKeys.includes(k));
  assert(all5KeysPresent, 'Default activity block aligns with 5 fields: teacher_activity, student_activity, time, resources, assessment', `Got keys: ${fieldKeys.join(', ')}`);
  assert(defaultBlock1.fields.length === 5, 'Default activity block contains exactly 5 fields');

  // Populate block with 5 BEAMS fields and verify persistence
  defaultBlock1.fields.find(f => f.fieldKey === 'teacher_activity')!.fieldValue = 'Demonstrate stage focusing on 40x objective lens.';
  defaultBlock1.fields.find(f => f.fieldKey === 'student_activity')!.fieldValue = 'View onion root tip slide and count cells in anaphase.';
  defaultBlock1.fields.find(f => f.fieldKey === 'time')!.fieldValue = '15 mins';
  defaultBlock1.fields.find(f => f.fieldKey === 'resources')!.fieldValue = 'Compound light microscopes, prepared slides, lens paper.';
  defaultBlock1.fields.find(f => f.fieldKey === 'assessment')!.fieldValue = 'Check student cell count tally in lab notebook.';

  await db.updateLessonRecord(teacherA.id, beamsRecord.id, {
    blocks: beamsRecord.blocks,
  });

  const updatedBeamsRecord = db.getLessonRecord(teacherA.id, beamsRecord.id);
  const updatedBlock1 = updatedBeamsRecord!.blocks[0];
  const teacherVal = updatedBlock1.fields.find(f => f.fieldKey === 'teacher_activity')?.fieldValue;
  const timeVal = updatedBlock1.fields.find(f => f.fieldKey === 'time')?.fieldValue;
  const resVal = updatedBlock1.fields.find(f => f.fieldKey === 'resources')?.fieldValue;
  assert(
    teacherVal === 'Demonstrate stage focusing on 40x objective lens.' &&
    timeVal === '15 mins' &&
    resVal === 'Compound light microscopes, prepared slides, lens paper.',
    'Updated 5 BEAMS activity block fields persist accurately'
  );

  // Test 24: Backward Compatibility with Legacy Lesson Records and Older Field Keys
  console.log('\n[Test 24] Backward Compatibility with Legacy Records & Older Block Fields');
  // Create a record with legacy block fields (e.g. using older "objective" field key instead of losing it)
  const legacyRecord = await db.createLessonRecord(teacherA.id, beamsWeek.id, {
    className: 'Legacy Grade 8',
    day: 'Thursday',
    target: 'Old Target without explicit outcomes field',
    activities: 'Legacy procedure notes',
    blockCount: 0,
  });

  // Manually attach a block with legacy keys (e.g. objective, notes, homework)
  const legacyBlockId = `blk_legacy_compat`;
  const legacyFields = [
    {
      id: 'fld_legacy_obj',
      blockId: legacyBlockId,
      fieldKey: 'objective',
      fieldLabel: 'Objective',
      fieldValue: 'Legacy objective stored in previous versions',
      fieldOrder: 1,
      fieldType: 'textarea' as const,
      isRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'fld_legacy_teacher',
      blockId: legacyBlockId,
      fieldKey: 'teacher_activity',
      fieldLabel: 'Teacher Activity',
      fieldValue: 'Legacy teacher demo',
      fieldOrder: 2,
      fieldType: 'textarea' as const,
      isRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  await db.updateLessonRecord(teacherA.id, legacyRecord.id, {
    blocks: [
      {
        id: legacyBlockId,
        lessonRecordId: legacyRecord.id,
        blockNumber: 1,
        orderIndex: 1,
        fields: legacyFields,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  const reloadedLegacy = db.getLessonRecord(teacherA.id, legacyRecord.id);
  assert(reloadedLegacy !== null, 'Legacy lesson record exists');
  assert(reloadedLegacy!.learningOutcomes === undefined, 'Legacy lesson record without learningOutcomes safely retains undefined without throwing');
  assert(reloadedLegacy!.blocks[0].fields.some(f => f.fieldKey === 'objective' && f.fieldValue === 'Legacy objective stored in previous versions'), 'Legacy field "objective" is preserved and not silently discarded');

  // Verify Extension DTO contract produces valid output for both new and legacy records
  const beamsDTO = db.getExtensionRecordDTO(teacherA.id, beamsRecord.id);
  assert(beamsDTO !== null, 'Extension DTO generated for BEAMS record');
  assert(beamsDTO!.learningOutcomes === 'SWBAT describe the 4 phases of mitosis and calculate the mitotic index from sample tissue slides.', 'Extension DTO contains learningOutcomes field');
  assert(beamsDTO!.target.includes('HS-LS1-4'), 'Extension DTO contains attainment target');

  const legacyDTO = db.getExtensionRecordDTO(teacherA.id, legacyRecord.id);
  assert(legacyDTO !== null, 'Extension DTO generated for legacy record');
  assert(legacyDTO!.blocks[0].fields.some(f => f.key === 'objective'), 'Extension DTO preserves legacy block fields');

  // Test 25: Stage 2 Step 2 - Independent Lesson-Level Field Extraction & 5 BEAMS Activity Block Parsing
  console.log('\n[Test 25] Independent Lesson-Level Field Extraction & 5 BEAMS Activity Block Parsing');
  const { heuristicParseDocument, extractBlockFieldsFromText } = await import('../server/geminiParser.js');

  const multiBlockLessonContent = `
# Week 9 - Mathematics

## Monday: Grade 7 Math
Attainment Target: CCSS.MATH.CONTENT.7.EE.B.4: Use variables to represent quantities in a real-world or mathematical problem, and construct simple equations.
Learning Outcomes: SWBAT isolate the unknown variable in a two-step linear equation with integers with 90% accuracy.
Activities: 1. Inverse operations bellringer 2. Direct modeling on smartboard 3. Partner practice 4. Formative exit slip

### Block 1
Teacher Activity: Present balance scale simulation on projector and model inverse subtraction.
Student Activity: Complete mental math balance warmup on individual whiteboards.
Time: 10 mins
Resources: Interactive balance scale simulation, whiteboards, dry-erase markers
Assessment: Cold-call check for understanding on variable balance.

### Block 2
Teacher Activity: Model two-step equations: 3x + 5 = 20. Demonstrate subtracting constant then dividing coefficient.
Student Activity: Follow demonstration and complete guided Cornell notes page 1.
Time: 20 mins
Resources: Guided notes handout, doc camera
Assessment: Fist-to-five understanding check.

### Block 3
Teacher Activity: Circulate and provide targeted intervention to struggling pairs.
Student Activity: Work in assigned pairs to solve practice problems 1 through 8.
Time: 15 mins
Resources: Problem set worksheet, algebra tiles
Assessment: Circulate with checklist rubric and spot-check problem 4.
  `;

  const parsedMultiBlock = heuristicParseDocument({
    rawText: multiBlockLessonContent,
    effectiveTitle: 'Grade 7 Math Week 9',
    effectiveSourceType: 'plain_text',
  });

  assert(parsedMultiBlock.lessons.length >= 1, 'Extracted lesson from multi-block structured text');
  const lesson1 = parsedMultiBlock.lessons[0];

  assert(
    lesson1.target.includes('CCSS.MATH.CONTENT.7.EE.B.4') &&
    !lesson1.target.includes('SWBAT isolate the unknown variable'),
    'Attainment target is extracted independently without combining learning outcomes'
  );

  assert(
    Boolean(
      lesson1.learningOutcomes?.includes('SWBAT isolate the unknown variable') &&
      !lesson1.learningOutcomes?.includes('CCSS.MATH.CONTENT.7.EE.B.4')
    ),
    'Learning outcomes field is extracted independently without combining attainment target'
  );

  assert(
    lesson1.activities.includes('Inverse operations bellringer') &&
    lesson1.activities.includes('Partner practice'),
    'Lesson-level activities overview is preserved'
  );

  assert(lesson1.blocks.length === 3, `Extracted variable block count: expected 3 blocks, got ${lesson1.blocks.length}`);
  assert(lesson1.blocks[0].blockNumber === 1, 'Block 1 has blockNumber 1');
  assert(lesson1.blocks[1].blockNumber === 2, 'Block 2 has blockNumber 2');
  assert(lesson1.blocks[2].blockNumber === 3, 'Block 3 has blockNumber 3');

  // Verify all 5 BEAMS fields on Block 1
  const b1Fields = lesson1.blocks[0].fields;
  assert(b1Fields.teacher_activity.includes('Present balance scale simulation'), 'Block 1 teacher_activity extracted');
  assert(b1Fields.student_activity.includes('Complete mental math balance warmup'), 'Block 1 student_activity extracted');
  assert(b1Fields.time === '10 mins', 'Block 1 time extracted exactly');
  assert(b1Fields.resources.includes('Interactive balance scale simulation'), 'Block 1 resources extracted');
  assert(b1Fields.assessment.includes('Cold-call check for understanding'), 'Block 1 assessment extracted');

  // Verify Block 2 and Block 3 fields
  const b2Fields = lesson1.blocks[1].fields;
  assert(b2Fields.teacher_activity.includes('Model two-step equations: 3x + 5 = 20'), 'Block 2 teacher_activity extracted');
  assert(b2Fields.time === '20 mins', 'Block 2 time extracted');

  const b3Fields = lesson1.blocks[2].fields;
  assert(b3Fields.student_activity.includes('Work in assigned pairs'), 'Block 3 student_activity extracted');
  assert(b3Fields.resources.includes('algebra tiles'), 'Block 3 resources extracted');

  // Test 26: Preserving Bullet Points & Multiline Text
  console.log('\n[Test 26] Preserving Bullet Points & Multiline Text in Source Content');
  const bulletBlockText = `
Teacher Activity:
• Model example 1 on smartboard
• Emphasize isolating x by subtracting 4
• Check student thumb signals
Student Activity:
1. Copy example 1 into notebook
2. Solve example 2 independently
3. Discuss reasoning with elbow partner
Time: 15 mins
Resources: Smartboard, graph paper
Assessment: Thumbs up / down check
  `;

  const parsedBullet = extractBlockFieldsFromText(bulletBlockText);
  assert(
    parsedBullet.fields.teacher_activity.includes('• Model example 1 on smartboard') &&
    parsedBullet.fields.teacher_activity.includes('• Emphasize isolating x by subtracting 4') &&
    parsedBullet.fields.teacher_activity.includes('• Check student thumb signals'),
    'Multiline teacher_activity preserves exact bullet points and linebreaks'
  );
  assert(
    parsedBullet.fields.student_activity.includes('1. Copy example 1 into notebook') &&
    parsedBullet.fields.student_activity.includes('2. Solve example 2 independently') &&
    parsedBullet.fields.student_activity.includes('3. Discuss reasoning with elbow partner'),
    'Multiline student_activity preserves numbered steps and linebreaks'
  );

  // Test 27: Table-Based Activity Block Extraction
  console.log('\n[Test 27] Table-Based Activity Block Extraction');
  const tableLessonContent = `
# Chemistry - Unit 3
Day: Tuesday
Class: Grade 10 Chem
Attainment Target: NGSS HS-PS1-1: Use the periodic table as a model to predict the relative properties of elements.
Learning Outcomes: Students can identify valence electron configurations of alkali metals.
Activities: Valence electron lab investigation and flame test demonstration.

| Block | Teacher Activity | Student Activity | Time | Resources | Formative Assessment |
| 1 | Demonstrate sodium flame test in fume hood. | Record observed flame color in lab notebook. | 10 mins | Fume hood, sodium sample, cobalt glass | Observe lab safety compliance. |
| 2 | Guide students through electron dot diagrams. | Draw Lewis structures for elements 1-18. | 25 mins | Periodic table reference card, colored markers | Review student dot diagrams on whiteboard. |
| 3 | Administer 3-question exit ticket on valence electrons. | Complete exit ticket independently. | 10 mins | Half-sheet exit tickets | Collect and score exit slips. |
  `;

  const parsedTableDoc = heuristicParseDocument({
    rawText: tableLessonContent,
    effectiveTitle: 'Chem Unit 3',
    effectiveSourceType: 'plain_text',
  });

  assert(parsedTableDoc.lessons.length === 1, 'Extracted 1 lesson from table-based document');
  const chemLesson = parsedTableDoc.lessons[0];
  assert(chemLesson.day === 'Tuesday', 'Lesson day extracted as Tuesday');
  assert(chemLesson.target.includes('HS-PS1-1'), 'Lesson attainment target extracted from table document');
  assert(Boolean(chemLesson.learningOutcomes?.includes('valence electron configurations')), 'Lesson learning outcomes extracted from table document');
  assert(chemLesson.blocks.length === 3, 'All 3 table rows extracted as sequential activity blocks');
  assert(chemLesson.blocks[0].fields.teacher_activity.includes('Demonstrate sodium flame test'), 'Table row 1 teacher_activity extracted');
  assert(chemLesson.blocks[0].fields.resources.includes('Fume hood, sodium sample'), 'Table row 1 resources extracted');
  assert(chemLesson.blocks[1].fields.student_activity.includes('Draw Lewis structures'), 'Table row 2 student_activity extracted');
  assert(chemLesson.blocks[2].fields.assessment.includes('Collect and score exit slips'), 'Table row 3 assessment extracted');

  // Test 28: Missing Fields Handling & Uncertainty Flagging
  console.log('\n[Test 28] Missing Fields Handling & Uncertainty Flagging');
  const partialBlockContent = `
Teacher Activity: Explain cellular respiration concept using diagram slides.
Time: 15 mins
  `;

  const partialParsed = extractBlockFieldsFromText(partialBlockContent);
  assert(partialParsed.fields.teacher_activity.includes('Explain cellular respiration'), 'Teacher activity extracted');
  assert(partialParsed.fields.student_activity === '', 'Missing student_activity remains empty string without hallucination');
  assert(partialParsed.fields.resources === '', 'Missing resources remains empty string');
  assert(partialParsed.fields.assessment === '', 'Missing assessment remains empty string');
  assert(partialParsed.needsReview === true, 'Block with missing student_activity is flagged for teacher review');

  // Test 29: Backward Compatibility with Legacy Block Fields & Word Doc Error Guidance
  console.log('\n[Test 29] Legacy Parser Output Compatibility & Word Document Guidance');
  const legacyDraftWeek = {
    weekNumber: 'Week 15',
    weekTitle: 'Legacy Physics Review',
    sourceType: 'plain_text' as const,
    lessons: [
      {
        id: 'draft_legacy_1',
        day: 'Friday',
        className: 'Grade 11 Physics',
        target: 'Legacy target text',
        learningOutcomes: 'Legacy outcomes text',
        activities: 'Legacy procedure overview',
        blocks: [
          {
            blockNumber: 1,
            fields: {
              objective: 'Historical block objective',
              teacher_activity: 'Teacher lecture',
              student_activity: 'Student listening',
              time: '15 mins',
              resources: 'Slides',
              assessment: 'Oral question',
              custom_legacy_field: 'Legacy annotation data',
            },
          },
        ],
      },
    ],
  };

  const committedLegacy = await db.commitImportedWeek(teacherA.id, legacyDraftWeek);
  assert(committedLegacy.recordsCount === 1, 'Committed legacy parser draft');
  const savedLegacyRecord = db.listLessonRecords(teacherA.id, committedLegacy.week.id)[0];
  assert(savedLegacyRecord.blocks[0].fields.some(f => f.fieldKey === 'custom_legacy_field' && f.fieldValue === 'Legacy annotation data'), 'Preserves custom/legacy block fields without discarding them');
  assert(savedLegacyRecord.blocks[0].fields.some(f => f.fieldKey === 'objective' && f.fieldValue === 'Historical block objective'), 'Preserves legacy objective field');

  // Verify Word doc link guidance
  const wordInspect = await importerRegistry.inspectUrl('https://myschool.edu/curriculum/Week9_Math_Plan.docx');
  assert(wordInspect.sourceType === 'word', 'Detects .docx file link');
  assert(Boolean(wordInspect.hint?.includes('Direct binary Word parsing is not supported')), 'Provides explicit Word guidance to paste text or save as PDF');

  // Test 30: Stage 2 Step 3 - Review Screen Data Handling, 5-Field BEAMS Block Editing & Reordering
  console.log('\n[Test 30] Stage 2 Step 3 - Review Screen Data Handling, 5-Field BEAMS Block Editing & Reordering');
  
  // Simulate teacher reviewing and editing an extracted draft:
  // 1. Updating target, learningOutcomes, and activities independently
  // 2. Editing 5 BEAMS fields on blocks
  // 3. Adding an activity block
  // 4. Reordering blocks
  // 5. Preserving custom/legacy fields
  const reviewedDraft: any = {
    weekNumber: 'Week 10',
    weekTitle: 'Algebraic Expressions & Equations',
    sourceType: 'google_doc',
    sourceUrl: 'https://docs.google.com/document/d/sample-math-week-10/edit',
    fileName: 'Reviewed_Curriculum_Doc',
    lessons: [
      {
        id: 'draft_reviewed_1',
        day: 'Monday',
        className: 'Grade 7 Math',
        section: 'Period 1',
        target: 'CCSS.MATH.CONTENT.7.EE.B.4: Solve real-world algebraic equations',
        learningOutcomes: 'SWBAT solve two-step linear equations with integers',
        activities: '1. Warm-up 2. Guided Modeling 3. Partner Work 4. Formative Assessment',
        needsReview: false,
        blocks: [
          {
            blockNumber: 1,
            fields: {
              teacher_activity: 'Warmup review on projector',
              student_activity: 'Solve warmup on whiteboards',
              time: '10 mins',
              resources: 'Interactive whiteboard',
              assessment: 'Fist to five check',
            },
          },
          {
            blockNumber: 2,
            fields: {
              teacher_activity: 'Model two-step equation solving on board',
              student_activity: 'Take notes on graphic organizer',
              time: '20 mins',
              resources: 'Notes sheet',
              assessment: 'Cold call CFU',
            },
          },
        ],
      },
    ],
  };

  // Simulate teacher adding a 3rd block during review
  reviewedDraft.lessons[0].blocks.push({
    blockNumber: 3,
    fields: {
      teacher_activity: 'Circulate and support differentiated small groups',
      student_activity: 'Complete level 1-3 practice exercises',
      time: '15 mins',
      resources: 'Exercise card deck',
      assessment: 'Exit ticket collection',
    },
  });

  // Simulate teacher swapping Block 2 and Block 3 (reordering during review)
  const tempBlock = reviewedDraft.lessons[0].blocks[1];
  reviewedDraft.lessons[0].blocks[1] = reviewedDraft.lessons[0].blocks[2];
  reviewedDraft.lessons[0].blocks[2] = tempBlock;
  reviewedDraft.lessons[0].blocks[1].blockNumber = 2;
  reviewedDraft.lessons[0].blocks[2].blockNumber = 3;

  // Commit reviewed draft to database
  const commitRes = await db.commitImportedWeek(teacherA.id, reviewedDraft);
  assert(commitRes.recordsCount === 1, 'Committed teacher-reviewed lesson draft');
  const committedRecord = db.listLessonRecords(teacherA.id, commitRes.week.id)[0];

  // Verify independent lesson-level fields preserved and committed
  assert(committedRecord.target === 'CCSS.MATH.CONTENT.7.EE.B.4: Solve real-world algebraic equations', 'Review saved attainment target');
  assert(committedRecord.learningOutcomes === 'SWBAT solve two-step linear equations with integers', 'Review saved dedicated learning outcomes');
  assert(committedRecord.activities.includes('Guided Modeling'), 'Review saved activities overview');

  // Verify variable block count preserved (3 blocks after adding one in review)
  assert(committedRecord.blocks.length === 3, 'Review saved 3 activity blocks (including added block)');

  // Verify reordered blocks preserved: Block 2 is now small group circulation
  const block2Teacher = committedRecord.blocks[1].fields.find(f => f.fieldKey === 'teacher_activity')?.fieldValue;
  assert(block2Teacher === 'Circulate and support differentiated small groups', 'Reordered block positions saved accurately');

  // Verify each block contains all 5 BEAMS fields
  const block1Fields = committedRecord.blocks[0].fields;
  const canonicalFieldKeys = ['teacher_activity', 'student_activity', 'time', 'resources', 'assessment'];
  for (const k of canonicalFieldKeys) {
    assert(block1Fields.some(f => f.fieldKey === k), `Block 1 contains field key: ${k}`);
  }

  // Verify the saved record feeds directly into the Chrome Extension DTO
  const extDTO = db.getExtensionRecordDTO(teacherA.id, committedRecord.id);
  assert(extDTO !== null, 'Extension DTO generated from reviewed and saved record');
  assert(extDTO!.target === committedRecord.target, 'Extension DTO has reviewed target');
  assert(extDTO!.learningOutcomes === committedRecord.learningOutcomes, 'Extension DTO has reviewed learningOutcomes');
  assert(extDTO!.blocks.length === 3, 'Extension DTO has all 3 reviewed blocks in order');
  assert(extDTO!.blocks[0].fields.some(f => f.key === 'teacher_activity' && f.value === 'Warmup review on projector'), 'Extension DTO has edited teacher_activity');
  assert(extDTO!.blocks[1].fields.some(f => f.key === 'teacher_activity' && f.value === 'Circulate and support differentiated small groups'), 'Extension DTO has reordered block content');

  // Test 31: Faithful School Document Metadata Extraction & Lesson Sequence Preservation
  console.log('\n[Test 31] Faithful School Document Metadata Extraction & Lesson Sequence Preservation');

  const schoolDocumentText = `
# Weekly Curriculum - Science & Math

Teacher Name: Dr. Robert Vance
Subject: Physics
Class and Section: Class 11, Section C
Day Number: Day 3
Duration: 45 mins
Topic: Projectile Motion & Trajectory
Attainment Target: CCSS.MATH.HSA.CED.A.2: Create equations in two variables to represent relationships between quantities.
Learning Outcomes: SWBAT calculate the maximum projectile height and horizontal range using kinematic equations.
Activities: 1. Launch angle simulation warmup 2. Derivation of range formula 3. Laboratory calculations

| Block | Content and Teacher Activity | Student Activity | Time in minutes | Learning Materials and Resources | Formative Assessment |
| 1 | Model initial velocity vector decomposition (Vx, Vy) on smartboard. | Sketch velocity vector triangles in lab notebooks. | 10 mins | Interactive trajectory simulator, smartboard | Check vector decomposition sketches on desk. |
| 2 | Guide students through algebraic derivation of range R = (v^2 * sin(2θ)) / g. | Solve guided derivation steps on handout page 3. | 20 mins | Derivation handout, scientific calculator | Cold call CFU on trigonometric double-angle formula. |
| Content and Teacher Activity | Student Activity | Time in minutes | Learning Materials and Resources | Formative Assessment |
| 3 | Circulate and verify student calculations for 45-degree optimal angle test. | Calculate predicted range for projectile launcher lab test. | 15 mins | Spring launcher, carbon paper, meter sticks | Measure launch accuracy vs theoretical calculation. |

Teacher Name: Dr. Robert Vance
Subject: Physics
Class and Section: Class 11, Section C
Day Number: Day 4
Duration: 45 mins
Topic: Air Resistance & Terminal Velocity
Attainment Target: CCSS.MATH.HSA.CED.A.3: Represent constraints by equations or inequalities.
Learning Outcomes: SWBAT compare vacuum trajectories with drag-influenced trajectories.
Activities: Parachute drop experiment and drag coefficient analysis.

| Block | Content and Teacher Activity | Student Activity | Time in minutes | Learning Materials and Resources | Formative Assessment |
| 1 | Demonstrate coffee filter descent in air vs ball bearing in vacuum tube. | Record fall times with photogate timers. | 15 mins | Photogates, coffee filters, vacuum drop tube | Formative notebook checkpoint. |
| 2 | Lead discussion on terminal velocity equations. | Plot velocity-time curves on graph paper. | 20 mins | Graph paper, physics workbook page 54 | Exit ticket: calculate terminal velocity condition. |

Teacher Name: Dr. Robert Vance
Subject: Physics
Class and Section: Class 10, Section A
Day Number: Day 1
Duration: 50 mins
Topic: Introduction to Scalars and Vectors
Attainment Target: NGSS HS-PS2-1: Analyze data to support the claim that Newton's second law of motion is obeyed.
Learning Outcomes: SWBAT distinguish between scalar and vector quantities with real-world examples.
Activities: Direct lecture, classroom displacement walk, and card sorting activity.

| Block | Content and Teacher Activity | Student Activity | Time in minutes | Learning Materials and Resources | Formative Assessment |
| 1 | Introduce difference between distance and displacement with map walk. | Track displacement vs distance traveled across classroom floor. | 20 mins | Floor grid tape, measuring wheel | Whiteboard check: distance vs displacement. |
| 2 | Distribute vector classification cards. | Sort 12 physical quantities into scalar and vector columns. | 15 mins | Sorting card deck, T-chart handout | Check sorted cards against answer rubric. |
  `;

  const parsedSchoolDoc = heuristicParseDocument({
    rawText: schoolDocumentText,
    effectiveTitle: 'Physics Curriculum Week 11',
    effectiveSourceType: 'plain_text',
  });

  // Verify lesson count matches actual lesson structure (3 lessons, NOT 7 or 32!)
  assert(parsedSchoolDoc.lessons.length === 3, `Extracted exact lesson count: expected 3 lessons, got ${parsedSchoolDoc.lessons.length}`);

  // Verify Lesson 1 metadata
  const l1 = parsedSchoolDoc.lessons[0];
  assert(l1.className.includes('11'), `Lesson 1 class is Class 11 (Got ${l1.className})`);
  assert(l1.section === 'C' || l1.section === 'Section C', `Lesson 1 section is C (Got ${l1.section})`);
  assert(l1.dayNumber === 'Day 3', `Lesson 1 dayNumber is Day 3 (Got ${l1.dayNumber})`);
  assert(l1.topic === 'Projectile Motion & Trajectory', `Lesson 1 topic is "Projectile Motion & Trajectory" (Got "${l1.topic}")`);
  assert(
    Boolean(l1.topic && l1.topic !== l1.target && !l1.topic.includes('CCSS.MATH')),
    'Attainment Target is NEVER placed in Topic field'
  );
  assert(l1.target.includes('CCSS.MATH.HSA.CED.A.2'), 'Lesson 1 attainment target extracted faithfully');
  assert(Boolean(l1.learningOutcomes?.includes('calculate the maximum projectile height')), 'Lesson 1 learning outcomes extracted');
  assert(l1.teacherName === 'Dr. Robert Vance', 'Lesson 1 teacherName extracted');
  assert(l1.subject === 'Physics', 'Lesson 1 subject extracted');
  assert(l1.duration === '45 mins', 'Lesson 1 duration extracted');

  // Verify repeated table header was filtered out and NOT treated as a 4th block or new lesson
  assert(l1.blocks.length === 3, `Lesson 1 has exactly 3 activity blocks (Got ${l1.blocks.length})`);
  assert(l1.blocks[0].fields.teacher_activity.includes('Model initial velocity vector decomposition'), 'Block 1 teacher activity preserved');
  assert(l1.blocks[1].fields.teacher_activity.includes('Guide students through algebraic derivation'), 'Block 2 teacher activity preserved');
  assert(l1.blocks[2].fields.teacher_activity.includes('Circulate and verify student calculations'), 'Block 3 teacher activity preserved (repeated header ignored)');

  // Verify Lesson 2 metadata
  const l2 = parsedSchoolDoc.lessons[1];
  assert(l2.className.includes('11'), 'Lesson 2 class is Class 11');
  assert(l2.dayNumber === 'Day 4', 'Lesson 2 dayNumber is Day 4');
  assert(l2.topic === 'Air Resistance & Terminal Velocity', 'Lesson 2 topic is "Air Resistance & Terminal Velocity"');
  assert(l2.blocks.length === 2, 'Lesson 2 has exactly 2 activity blocks');

  // Verify Lesson 3 metadata (class changed to Class 10, dayNumber is Day 1)
  const l3 = parsedSchoolDoc.lessons[2];
  assert(l3.className.includes('10'), 'Lesson 3 class correctly identifies Class 10');
  assert(l3.dayNumber === 'Day 1', 'Lesson 3 dayNumber is Day 1 without resetting or corrupting prior lessons');
  assert(l3.topic === 'Introduction to Scalars and Vectors', 'Lesson 3 topic is "Introduction to Scalars and Vectors"');
  assert(l3.blocks.length === 2, 'Lesson 3 has 2 activity blocks');

  // Test 32: School Document Metadata Persistence & Chrome Extension DTO Delivery
  console.log('\n[Test 32] School Document Metadata Persistence & Chrome Extension DTO Delivery');

  // Commit the parsed school document to database
  const commitSchoolRes = await db.commitImportedWeek(teacherA.id, parsedSchoolDoc);
  assert(commitSchoolRes.recordsCount === 3, 'Committed all 3 school lessons to database');

  const savedLessons = db.listLessonRecords(teacherA.id, commitSchoolRes.week.id);
  assert(savedLessons.length === 3, 'Retrieved all 3 saved records from database');

  const savedL1 = savedLessons[0];
  assert(savedL1.topic === 'Projectile Motion & Trajectory', 'Saved record has topic: Projectile Motion & Trajectory');
  assert(savedL1.dayNumber === 'Day 3', 'Saved record has dayNumber: Day 3');
  assert(savedL1.teacherName === 'Dr. Robert Vance', 'Saved record has teacherName');
  assert(savedL1.subject === 'Physics', 'Saved record has subject');
  assert(savedL1.duration === '45 mins', 'Saved record has duration');

  // Verify update preserves metadata fields
  const updatedL1 = await db.updateLessonRecord(teacherA.id, savedL1.id, {
    topic: '2D Kinematics and Projectiles',
    duration: '50 mins',
  });
  assert(updatedL1 !== null, 'Updated lesson record');
  assert(updatedL1!.topic === '2D Kinematics and Projectiles', 'Updated topic persisted');
  assert(updatedL1!.duration === '50 mins', 'Updated duration persisted');
  assert(updatedL1!.dayNumber === 'Day 3', 'Preserved dayNumber on update');

  // Verify Chrome Extension DTO includes all school metadata
  const schoolExtDTO = db.getExtensionRecordDTO(teacherA.id, savedL1.id);
  assert(schoolExtDTO !== null, 'Generated Extension DTO for school lesson');
  assert(schoolExtDTO!.topic === '2D Kinematics and Projectiles', 'Extension DTO has topic');
  assert(schoolExtDTO!.dayNumber === 'Day 3', 'Extension DTO has dayNumber');
  assert(schoolExtDTO!.teacherName === 'Dr. Robert Vance', 'Extension DTO has teacherName');
  assert(schoolExtDTO!.subject === 'Physics', 'Extension DTO has subject');
  assert(schoolExtDTO!.duration === '50 mins', 'Extension DTO has duration');
  assert(schoolExtDTO!.blocks.length === 3, 'Extension DTO has all 3 activity blocks');
  assert(schoolExtDTO!.blocks[0].fields.some(f => f.key === 'teacher_activity' && f.value.includes('Model initial velocity')), 'Extension DTO has Block 1 teacher_activity');
  assert(schoolExtDTO!.blocks[0].fields.some(f => f.key === 'student_activity' && f.value.includes('Sketch velocity vector')), 'Extension DTO has Block 1 student_activity');
  assert(schoolExtDTO!.blocks[0].fields.some(f => f.key === 'time' && f.value === '10 mins'), 'Extension DTO has Block 1 time');
  assert(schoolExtDTO!.blocks[0].fields.some(f => f.key === 'resources' && f.value.includes('Interactive trajectory simulator')), 'Extension DTO has Block 1 resources');
  assert(schoolExtDTO!.blocks[0].fields.some(f => f.key === 'assessment' && f.value.includes('Check vector decomposition')), 'Extension DTO has Block 1 assessment');

  // Test 33: Multi-Page Real School Document Import (Day 3 & Day 4 Consecutive Lessons)
  console.log('\n[Test 33] Multi-Page Real School Document Import: Day 3 & Day 4 Consecutive Lessons');

  const realSchoolPdfText = `
Here is the revised 40-minute lesson plan with pseudocode question practice included in the student activity.

Lesson Plan – Iteration (FOR TO NEXT Loop)

Name of Teacher: Mubrra Mushtaq
Subject: Computer Science
Topic: Iteration – FOR TO NEXT Loop
Class: 11 C
Duration: 40 Minutes

Attainment Target

Students will understand the purpose and working of the FOR TO NEXT loop and apply it to write and trace pseudocode that repeats instructions a specified number of times.

Learning Outcomes (SLOs)

By the end of the lesson, students will be able to:
1. Identify the purpose and structure of a FOR TO NEXT loop.
2. Write pseudocode using a FOR TO NEXT loop to repeat instructions a specified number of times.
3. Trace FOR TO NEXT loops and determine their outputs accurately.

BSS Learner Profile: The lesson develops Analytical, Inquisitive, Collaborative, and Reflective learners.

Lesson Delivery

Content And Teacher Activity
Student Activity
Time (min)
Learning Materials and Resources
Formative assessment (Day to day assessment)

Recap & Starter: Ask students why a program may need to repeat instructions. Display a repeated-output example and ask how a loop could make the pseudocode shorter. Introduce iteration and the FOR TO NEXT loop.
Recall previous knowledge, suggest solutions, and identify situations where instructions need to be repeated.
5
Whiteboard/projector, notebook
Oral questioning to assess understanding of repetition.

Teacher Explanation – FOR TO NEXT Loop: Explain the purpose and syntax of the loop. Demonstrate FOR Count ← 1 TO 5, an indented instruction, and NEXT Count. Show how the loop variable changes and how the output is produced. Model one short pseudocode tracing question.
Observe the example, note the syntax, identify the loop variable and range, and predict the output.
10
Whiteboard/projector, textbook/notes
Ask how many times the loop executes and what values the loop variable takes.

Pseudocode Practice & Cramming – Self-Reading and Oral Recall: Ask students to read the relevant textbook section independently and learn the purpose, syntax, and working of the loop. Students then solve teacher-provided pseudocode questions individually, including predicting outputs, tracing loop variables, and completing a FOR TO NEXT loop. Listen to students explain their answers and correct errors. Extension for early finishers: Write a loop to display even numbers from 2 to 10, exchange it with a partner, and peer-check the range and output.
Read and learn key points, explain the loop orally, and solve pseudocode questions independently. Trace each iteration and write the final output. Early finishers create and peer-check an additional loop.
20
Textbook, pseudocode worksheet, notebook, whiteboard
Check syntax, tracing tables, predicted outputs, and students' explanations.

Recap: Ask students to write a FOR TO NEXT loop that displays numbers from 1 to 4. Ask them to state the output and number of iterations.
Complete the exit task independently and explain their answers.
5
Notebook, whiteboard
Check pseudocode structure, output, and understanding of iteration.

Total: 40 Minutes

Sample Pseudocode Questions
Question 1 – Predict the output
FOR Count ← 1 TO 4
OUTPUT Count
NEXT Count

Question 2 – Trace the loop
Total ← 0
FOR Number ← 1 TO 3
Total ← Total + Number
NEXT Number
OUTPUT Total

Question 3 – Complete the pseudocode
FOR Number ← ____ TO ____
OUTPUT Number
NEXT Number

Key Exam Points
● Iteration means repeating a set of instructions.
● A FOR TO NEXT loop is suitable when the number of repetitions is known.

TEF Alignment
● Dimension 3 – Multiple Sources of Information
● Dimension 4 – Self & Peer Reflection

Evidence of Learning
Completed pseudocode questions, tracing answers, oral recall, extension work, peer-checking, and exit responses.

Here is an 80-minute BEAMS lesson plan for CAT preparation, focusing on revision of Chapters 9 and 10, past-paper practice, and the self-reading and cramming approach suitable for Matric students.

Lesson Plan – CAT Preparation

Name of Teacher: Mubrra Mushtaq
Subject: Computer Science
Topic: CAT Preparation – Revision of Chapters 9 and 10
Class: 11 C
Duration: 80 minutes

Attainment Target

Students will revise key concepts from Chapters 9 and 10 and improve their ability to answer examination-style questions accurately.

Learning Outcomes (SLOs)

By the end of the lesson, students will be able to:
1. Recall important definitions, concepts, and key points from Chapters 9 and 10.
2. Solve past-paper questions related to the revised chapters.
3. Identify and correct mistakes to improve their CAT preparation.

BSS Learner Profile: The lesson develops Analytical, Independent, Inquisitive, and Reflective learners.

Content And Teacher Activity
Student Activity
Time (min)
Learning Materials and Resources
Formative assessment (Day to day assessment)

Recap & Revision Starter: Briefly introduce the CAT preparation session. Ask students to recall the main topics and important terms from Chapters 9 and 10. Write the chapter headings on the board and invite students to share key concepts.
Recall previous learning and identify important topics from both chapters.
8
Textbook, board/projector, notebooks
Oral questioning and checking prior knowledge.

Teacher-Guided Revision: Review the important definitions, concepts, rules, and examples from Chapters 9 and 10. Clarify difficult points and highlight commonly tested areas. Explain how to identify command words and structure answers according to the marks allocated.
Listen, revise important points, ask questions, and mark difficult concepts for further review.
12
Textbook, board/projector, revision notes
Targeted questioning and clarification of misconceptions.

Cramming – Self-Reading & Oral Recall: Give students time to read the relevant textbook sections independently and learn key definitions, facts, and concepts. Call students individually to recall answers without looking at the book. Correct incomplete or inaccurate responses and ask students to repeat the corrected points.
Read and learn independently, then recall important concepts orally when called by the teacher. Correct and repeat answers where necessary.
15
Textbook, notebooks
Individual oral recall, immediate feedback, and identification of learning gaps.

Past-Paper Practice – Individual Attempt: Distribute selected past-paper questions from Chapters 9 and 10. Guide students to read each question carefully, identify what is being asked, and answer according to the marks allocated. Allow students to attempt the questions independently before discussing answers.
Solve past-paper questions independently, apply revised concepts, and manage their time while writing answers.
25
Past-paper questions, notebooks, pens, marking scheme
Teacher circulates, checks progress, monitors answer quality, and supports students who need help.

Marking & Error Correction: Display or explain the correct answers using the marking scheme. Ask students to compare their responses, identify missing points, and correct mistakes in a different colour. Clarify common errors.
Check their answers against the marking scheme, correct mistakes, and note concepts that need further revision.
15
Past-paper questions, marking scheme, board/projector
Self-assessment, teacher questioning, and checking corrected responses.

Recap & Reflection: Ask students to name one concept they revised successfully and one area they need to practise more. Remind them to revise corrected answers before the CAT.
Reflect on their preparation and identify their next revision priority.
5
Notebook, board
Oral responses and individual reflection.

Total: 80 minutes

CAT Preparation Focus
● Revise key definitions and terminology from Chapters 9 and 10.
● Learn important concepts and rules.
● Practise past-paper questions independently.

Evidence of Learning
Students' oral recall, attempted past-paper questions, self-corrected answers, and reflections will provide evidence of revision and examination readiness.
  `;

  const parsedRealDoc = heuristicParseDocument({
    rawText: realSchoolPdfText,
    effectiveTitle: 'Computer Science Week 8 Plans.pdf',
    effectiveSourceType: 'pdf',
  });

  // Verify exactly 2 distinct lessons are preserved without page-break duplication or merging
  assert(parsedRealDoc.lessons.length === 2, `Extracted exactly 2 lessons from multi-page document (Got ${parsedRealDoc.lessons.length})`);

  // Verify Day 3 (Lesson 1)
  const d3 = parsedRealDoc.lessons[0];
  assert(d3.teacherName === 'Mubrra Mushtaq', `Day 3 teacherName is Mubrra Mushtaq (Got "${d3.teacherName}")`);
  assert(d3.subject === 'Computer Science', `Day 3 subject is Computer Science (Got "${d3.subject}")`);
  assert(d3.topic === 'Iteration – FOR TO NEXT Loop', `Day 3 topic is "Iteration – FOR TO NEXT Loop" (Got "${d3.topic}")`);
  assert(d3.topic !== d3.target, 'Day 3 Topic is strictly separate from Attainment Target');
  assert(d3.className === 'Class 11', `Day 3 className parsed as Class 11 (Got "${d3.className}")`);
  assert(d3.section === 'C', `Day 3 section parsed as C (Got "${d3.section}")`);
  assert(d3.duration === '40 Minutes', `Day 3 duration is 40 Minutes (Got "${d3.duration}")`);
  assert(d3.target.includes('understand the purpose and working of the FOR TO NEXT loop'), 'Day 3 Attainment Target extracted faithfully without colon');
  assert(Boolean(d3.learningOutcomes?.includes('Identify the purpose and structure of a FOR TO NEXT loop')), 'Day 3 Learning Outcomes (SLOs) extracted faithfully without colon');
  assert(d3.blocks.length === 4, `Day 3 has exactly 4 activity blocks (Got ${d3.blocks.length})`);
  assert(d3.blocks[0].fields.teacher_activity.includes('Recap & Starter'), 'Day 3 Block 1 teacher_activity preserved');
  assert(d3.blocks[0].fields.student_activity.includes('Recall previous knowledge'), 'Day 3 Block 1 student_activity preserved');
  assert(d3.blocks[0].fields.time === '5 mins' || d3.blocks[0].fields.time === '5', 'Day 3 Block 1 time is 5 min');
  assert(d3.blocks[0].fields.resources.includes('Whiteboard/projector'), 'Day 3 Block 1 resources preserved');
  assert(d3.blocks[0].fields.assessment.includes('Oral questioning'), 'Day 3 Block 1 assessment preserved');
  assert(d3.blocks[1].fields.teacher_activity.includes('Teacher Explanation'), 'Day 3 Block 2 teacher_activity preserved');
  assert(d3.blocks[2].fields.teacher_activity.includes('Pseudocode Practice'), 'Day 3 Block 3 teacher_activity preserved');
  assert(d3.blocks[3].fields.teacher_activity.includes('Recap'), 'Day 3 Block 4 teacher_activity preserved');

  // Verify Day 4 (Lesson 2)
  const d4 = parsedRealDoc.lessons[1];
  assert(d4.teacherName === 'Mubrra Mushtaq', `Day 4 teacherName is Mubrra Mushtaq (Got "${d4.teacherName}")`);
  assert(d4.subject === 'Computer Science', `Day 4 subject is Computer Science (Got "${d4.subject}")`);
  assert(d4.topic === 'CAT Preparation – Revision of Chapters 9 and 10', `Day 4 topic is "CAT Preparation – Revision of Chapters 9 and 10" (Got "${d4.topic}")`);
  assert(d4.topic !== d4.target, 'Day 4 Topic is strictly separate from Attainment Target');
  assert(d4.className === 'Class 11', `Day 4 className parsed as Class 11 (Got "${d4.className}")`);
  assert(d4.section === 'C', `Day 4 section parsed as C (Got "${d4.section}")`);
  assert(d4.duration === '80 minutes', `Day 4 duration is 80 minutes (Got "${d4.duration}")`);
  assert(d4.target.includes('revise key concepts from Chapters 9 and 10'), 'Day 4 Attainment Target extracted faithfully');
  assert(Boolean(d4.learningOutcomes?.includes('Recall important definitions, concepts')), 'Day 4 Learning Outcomes (SLOs) extracted faithfully');
  assert(d4.blocks.length === 6, `Day 4 has exactly 6 activity blocks (Got ${d4.blocks.length})`);
  assert(d4.blocks[0].fields.teacher_activity.includes('Recap & Revision Starter'), 'Day 4 Block 1 teacher_activity preserved');
  assert(d4.blocks[1].fields.teacher_activity.includes('Teacher-Guided Revision'), 'Day 4 Block 2 teacher_activity preserved');
  assert(d4.blocks[2].fields.teacher_activity.includes('Cramming'), 'Day 4 Block 3 teacher_activity preserved');
  assert(d4.blocks[3].fields.teacher_activity.includes('Past-Paper Practice'), 'Day 4 Block 4 teacher_activity preserved');
  assert(d4.blocks[4].fields.teacher_activity.includes('Marking & Error Correction'), 'Day 4 Block 5 teacher_activity preserved');
  assert(d4.blocks[5].fields.teacher_activity.includes('Recap & Reflection'), 'Day 4 Block 6 teacher_activity preserved');

  // Verify missing dayNumber flags for review without guessing
  assert(d3.needsReview === true, 'Day 3 flagged for teacher review because day number is unstated in source text');
  assert(d4.needsReview === true, 'Day 4 flagged for teacher review because day number is unstated in source text');

  // Verify persistence and Chrome Extension DTO delivery for real document lessons
  const realCommit = await db.commitImportedWeek(teacherA.id, {
    ...parsedRealDoc,
    lessons: [
      { ...d3, dayNumber: 'Day 3', day: 'Day 3', sourceLessonId: '11 C Day 3' },
      { ...d4, dayNumber: 'Day 4', day: 'Day 4', sourceLessonId: '11 C Day 4' },
    ],
  });
  assert(realCommit.recordsCount === 2, 'Committed both reviewed real lessons to database');

  const realSavedLessons = db.listLessonRecords(teacherA.id, realCommit.week.id);
  assert(realSavedLessons.length === 2, 'Retrieved 2 real school lessons from database');
  assert(realSavedLessons[0].topic === 'Iteration – FOR TO NEXT Loop', 'Saved Day 3 topic');
  assert(realSavedLessons[0].dayNumber === 'Day 3', 'Saved Day 3 dayNumber');
  assert(realSavedLessons[1].topic === 'CAT Preparation – Revision of Chapters 9 and 10', 'Saved Day 4 topic');
  assert(realSavedLessons[1].dayNumber === 'Day 4', 'Saved Day 4 dayNumber');

  const realDtoD3 = db.getExtensionRecordDTO(teacherA.id, realSavedLessons[0].id);
  assert(realDtoD3 !== null, 'Extension DTO generated for real Day 3');
  assert(realDtoD3!.topic === 'Iteration – FOR TO NEXT Loop', 'Extension DTO has Day 3 topic');
  assert(realDtoD3!.blocks.length === 4, 'Extension DTO has all 4 activity blocks for Day 3');

  const realDtoD4 = db.getExtensionRecordDTO(teacherA.id, realSavedLessons[1].id);
  assert(realDtoD4 !== null, 'Extension DTO generated for real Day 4');
  assert(realDtoD4!.topic === 'CAT Preparation – Revision of Chapters 9 and 10', 'Extension DTO has Day 4 topic');
  assert(realDtoD4!.blocks.length === 6, 'Extension DTO has all 6 activity blocks for Day 4');

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
