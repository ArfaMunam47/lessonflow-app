/**
 * LessonFlow Express API Router
 * 
 * Provides clean, focused endpoints for:
 * - PDF / Document Upload and AI Multi-Lesson Structuring (Gemini)
 * - Review & Commit of Imported Weekly Lesson Plans
 * - Import History
 * - Weekly workspace and lesson record management
 * - Dynamic block builder and configurable templates
 * - Plain-text clipboard gallery
 * - Chrome extension data contract (GET /api/extension/records/:id)
 */

import { Router } from 'express';
import { db } from '../db.js';
import { cleanPlainText } from '../../src/utils/textCleaner.js';
import { parseWeeklyLessonPlan } from '../geminiParser.js';
import { ParsedWeeklyImport, ImportSourceType } from '../../src/types/index.js';
import { importerRegistry } from '../importers/importerRegistry.js';

export const apiRouter = Router();

// ==========================================
// 1. User & Profile Endpoints
// ==========================================

apiRouter.get('/me', (req, res) => {
  const user = req.user!;
  const profile = db.getProfile(user.id);
  res.json({
    user,
    profile,
  });
});

apiRouter.put('/profile', async (req, res) => {
  try {
    const user = req.user!;
    const updated = await db.updateProfile(user.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update profile.' });
  }
});

// ==========================================
// 2. Document & Shared Link Import Workflow
// ==========================================

/**
 * Pre-inspects a document URL (Google Docs, PDF, etc.)
 * Provides instant feedback on format and sharing instructions.
 */
apiRouter.post('/import/inspect-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ valid: false, error: 'Please provide a valid URL.' });
      return;
    }
    const inspection = await importerRegistry.inspectUrl(url);
    res.json(inspection);
  } catch (err: any) {
    res.status(500).json({ valid: false, error: err.message || 'Error inspecting URL.' });
  }
});

/**
 * Fetches, extracts, and parses a document (Google Docs URL, uploaded PDF, or pasted text).
 * Does NOT commit to database; returns structured draft for teacher review.
 */
apiRouter.post('/import/parse', async (req, res) => {
  try {
    const { url, sourceType, pdfBase64, rawText, fileName } = req.body;

    if (!url && !pdfBase64 && (!rawText || !rawText.trim())) {
      res.status(400).json({ error: 'Please provide a document URL, PDF file, or lesson plan text to import.' });
      return;
    }

    // Step 1: Extract structured document content via source-agnostic handler
    const extractedDoc = await importerRegistry.extractDocument({
      url,
      sourceType: sourceType as ImportSourceType,
      pdfBase64,
      rawText,
      fileName,
    });

    // Step 2: Pass extracted content to Gemini AI structured parser
    const parsedWeekly = await parseWeeklyLessonPlan({
      extractedDoc,
      pdfBase64,
      rawText,
      fileName: extractedDoc.title || fileName,
      sourceUrl: extractedDoc.sourceUrl,
      sourceType: extractedDoc.sourceType,
    });

    res.json({
      success: true,
      parsed: parsedWeekly,
      extractedDoc: {
        title: extractedDoc.title,
        sourceType: extractedDoc.sourceType,
        sourceUrl: extractedDoc.sourceUrl,
        stats: extractedDoc.stats,
      },
    });
  } catch (err: any) {
    console.error('Document parsing error:', err);

    const isRestricted = err.message && err.message.includes('RESTRICTED_GOOGLE_DOC');
    const isNotFound = err.message && err.message.includes('NOT_FOUND_GOOGLE_DOC');

    res.status(400).json({
      success: false,
      errorType: isRestricted ? 'RESTRICTED_GOOGLE_DOC' : isNotFound ? 'NOT_FOUND_GOOGLE_DOC' : 'EXTRACTION_ERROR',
      error: err.message || 'Failed to extract and parse lesson plans from document.',
      hint: isRestricted
        ? 'Open the Google Doc, click Share (top-right), change General Access to "Anyone with the link can view", or copy the text directly.'
        : undefined,
    });
  }
});

/**
 * Commits a teacher-reviewed weekly lesson plan into the database.
 */
apiRouter.post('/import/commit', async (req, res) => {
  try {
    const user = req.user!;
    const { importData } = req.body as { importData: ParsedWeeklyImport };

    if (!importData || !Array.isArray(importData.lessons) || importData.lessons.length === 0) {
      res.status(400).json({ error: 'Valid reviewed lesson plan data is required.' });
      return;
    }

    const result = await db.commitImportedWeek(user.id, importData);
    res.status(201).json({
      success: true,
      week: result.week,
      recordsCount: result.recordsCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save imported lesson plan.' });
  }
});

/**
 * Re-imports a past document using its stored source URL.
 */
apiRouter.post('/import/reimport/:importId', async (req, res) => {
  try {
    const user = req.user!;
    const { importId } = req.params;

    const record = db.getImportRecord(user.id, importId);
    if (!record) {
      res.status(404).json({ error: 'Import record not found.' });
      return;
    }

    if (!record.sourceUrl) {
      res.status(400).json({
        error: 'This import was not created from a shared document URL and cannot be automatically re-fetched.',
      });
      return;
    }

    // Extract and parse latest document state
    const extractedDoc = await importerRegistry.extractDocument({
      url: record.sourceUrl,
      sourceType: record.sourceType,
    });

    const parsedWeekly = await parseWeeklyLessonPlan({
      extractedDoc,
      sourceUrl: record.sourceUrl,
      sourceType: record.sourceType,
    });

    res.json({
      success: true,
      parsed: parsedWeekly,
      extractedDoc: {
        title: extractedDoc.title,
        sourceType: extractedDoc.sourceType,
        sourceUrl: extractedDoc.sourceUrl,
        stats: extractedDoc.stats,
      },
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to re-import document.',
    });
  }
});

/**
 * Retrieves the teacher's import history.
 */
apiRouter.get('/import/history', (req, res) => {
  const user = req.user!;
  const history = db.listImportRecords(user.id);
  res.json(history);
});

/**
 * Deletes an import record from history.
 */
apiRouter.delete('/import/history/:importId', async (req, res) => {
  try {
    const user = req.user!;
    const { importId } = req.params;
    const deleted = await db.deleteImportRecord(user.id, importId);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete import record.' });
  }
});

// ==========================================
// 3. Weeks Endpoints
// ==========================================

apiRouter.get('/weeks', (req, res) => {
  const user = req.user!;
  const weeks = db.listWeeks(user.id);
  res.json(weeks);
});

apiRouter.post('/weeks', async (req, res) => {
  try {
    const user = req.user!;
    const { weekNumber, title, startDate, endDate } = req.body;
    if (!weekNumber) {
      res.status(400).json({ error: 'Week number is required (e.g. "Week 8").' });
      return;
    }
    const newWeek = await db.createWeek(user.id, {
      weekNumber,
      title,
      startDate,
      endDate,
    });
    res.status(201).json(newWeek);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create week.' });
  }
});

apiRouter.get('/weeks/:id', (req, res) => {
  const user = req.user!;
  const week = db.getWeek(user.id, req.params.id);
  if (!week) {
    res.status(404).json({ error: 'Week not found.' });
    return;
  }
  res.json(week);
});

apiRouter.put('/weeks/:id', async (req, res) => {
  try {
    const user = req.user!;
    const updated = await db.updateWeek(user.id, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Week not found.' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update week.' });
  }
});

apiRouter.delete('/weeks/:id', async (req, res) => {
  try {
    const user = req.user!;
    const deleted = await db.deleteWeek(user.id, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Week not found.' });
      return;
    }
    res.json({ success: true, message: 'Week and associated records deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete week.' });
  }
});

/**
 * Duplicate Week
 */
apiRouter.post('/weeks/:id/duplicate', async (req, res) => {
  try {
    const user = req.user!;
    const { newWeekNumber, newTitle } = req.body;
    const duplicated = await db.duplicateWeek(user.id, req.params.id, newWeekNumber, newTitle);
    if (!duplicated) {
      res.status(404).json({ error: 'Source week not found.' });
      return;
    }
    res.status(201).json(duplicated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to duplicate week.' });
  }
});

apiRouter.get('/weeks/:id/progress', (req, res) => {
  const user = req.user!;
  const progress = db.getWeeklyProgress(user.id, req.params.id);
  res.json(progress);
});

// ==========================================
// 4. Lesson Records Endpoints
// ==========================================

apiRouter.get('/weeks/:weekId/lesson-records', (req, res) => {
  const user = req.user!;
  const { day, className, status } = req.query;
  const records = db.listLessonRecords(user.id, req.params.weekId, {
    day: day as string,
    className: className as string,
    status: status as string,
  });
  res.json(records);
});

apiRouter.get('/lesson-records', (req, res) => {
  const user = req.user!;
  const { weekId, day, className, status } = req.query;
  const records = db.listLessonRecords(user.id, weekId as string, {
    day: day as string,
    className: className as string,
    status: status as string,
  });
  res.json(records);
});

apiRouter.post('/weeks/:weekId/lesson-records', async (req, res) => {
  try {
    const user = req.user!;
    const { className, section, day, date, target, activities, blockCount, templateId } = req.body;

    if (!className || !day) {
      res.status(400).json({ error: 'Class and Day are required.' });
      return;
    }

    const record = await db.createLessonRecord(user.id, req.params.weekId, {
      className,
      section,
      day,
      date,
      target,
      activities,
      blockCount: blockCount !== undefined ? Number(blockCount) : 3,
      templateId,
    });

    res.status(201).json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create lesson record.' });
  }
});

apiRouter.get('/lesson-records/:id', (req, res) => {
  const user = req.user!;
  const record = db.getLessonRecord(user.id, req.params.id);
  if (!record) {
    res.status(404).json({ error: 'Lesson record not found.' });
    return;
  }
  res.json(record);
});

apiRouter.put('/lesson-records/:id', async (req, res) => {
  try {
    const user = req.user!;
    const updated = await db.updateLessonRecord(user.id, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Lesson record not found.' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update lesson record.' });
  }
});

apiRouter.delete('/lesson-records/:id', async (req, res) => {
  try {
    const user = req.user!;
    const deleted = await db.deleteLessonRecord(user.id, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Lesson record not found.' });
      return;
    }
    res.json({ success: true, message: 'Lesson record deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete lesson record.' });
  }
});

apiRouter.post('/lesson-records/:id/duplicate', async (req, res) => {
  try {
    const user = req.user!;
    const { day, className, section } = req.body;
    const duplicated = await db.duplicateLessonRecord(user.id, req.params.id, {
      day,
      className,
      section,
    });
    if (!duplicated) {
      res.status(404).json({ error: 'Source lesson record not found.' });
      return;
    }
    res.status(201).json(duplicated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to duplicate lesson record.' });
  }
});

apiRouter.patch('/lesson-records/:id/status', async (req, res) => {
  try {
    const user = req.user!;
    const { status, completed } = req.body;
    const updated = await db.updateLessonRecord(user.id, req.params.id, {
      status,
      completed,
    });
    if (!updated) {
      res.status(404).json({ error: 'Lesson record not found.' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update status.' });
  }
});

// ==========================================
// 5. Dynamic Block Operations
// ==========================================

apiRouter.post('/lesson-records/:id/blocks', async (req, res) => {
  try {
    const user = req.user!;
    const count = Math.max(1, Number(req.body.count || 1));
    const templateId = req.body.templateId;

    const record = await db.createBlocks(user.id, req.params.id, count, templateId);
    if (!record) {
      res.status(404).json({ error: 'Lesson record not found.' });
      return;
    }
    res.status(201).json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create blocks.' });
  }
});

apiRouter.post('/lesson-records/:id/blocks/:blockId/duplicate', async (req, res) => {
  try {
    const user = req.user!;
    const record = await db.duplicateBlock(user.id, req.params.id, req.params.blockId);
    if (!record) {
      res.status(404).json({ error: 'Lesson record or block not found.' });
      return;
    }
    res.status(201).json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to duplicate block.' });
  }
});

apiRouter.delete('/lesson-records/:id/blocks/:blockId', async (req, res) => {
  try {
    const user = req.user!;
    const record = await db.deleteBlock(user.id, req.params.id, req.params.blockId);
    if (!record) {
      res.status(404).json({ error: 'Lesson record or block not found.' });
      return;
    }
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete block.' });
  }
});

apiRouter.post('/lesson-records/:id/reorder-blocks', async (req, res) => {
  try {
    const user = req.user!;
    const { blockIds } = req.body;
    if (!Array.isArray(blockIds)) {
      res.status(400).json({ error: 'blockIds array is required.' });
      return;
    }
    const record = await db.reorderBlocks(user.id, req.params.id, blockIds);
    if (!record) {
      res.status(404).json({ error: 'Lesson record not found.' });
      return;
    }
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reorder blocks.' });
  }
});

apiRouter.post('/lesson-records/:id/blocks/:blockId/apply-template', async (req, res) => {
  try {
    const user = req.user!;
    const { templateId } = req.body;
    if (!templateId) {
      res.status(400).json({ error: 'templateId is required.' });
      return;
    }
    const record = await db.applyTemplateToBlock(user.id, req.params.id, req.params.blockId, templateId);
    if (!record) {
      res.status(404).json({ error: 'Record or template not found.' });
      return;
    }
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to apply template.' });
  }
});

// ==========================================
// 6. Block Templates Endpoints
// ==========================================

apiRouter.get('/templates', (req, res) => {
  const user = req.user!;
  const templates = db.listTemplates(user.id);
  res.json(templates);
});

apiRouter.post('/templates', async (req, res) => {
  try {
    const user = req.user!;
    const { name, description, fields, isDefault } = req.body;
    if (!name || !Array.isArray(fields) || fields.length === 0) {
      res.status(400).json({ error: 'Template name and at least one field are required.' });
      return;
    }
    const template = await db.createTemplate(user.id, {
      name,
      description,
      fields,
      isDefault,
    });
    res.status(201).json(template);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create template.' });
  }
});

apiRouter.put('/templates/:id', async (req, res) => {
  try {
    const user = req.user!;
    const updated = await db.updateTemplate(user.id, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Template not found.' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update template.' });
  }
});

apiRouter.delete('/templates/:id', async (req, res) => {
  try {
    const user = req.user!;
    const deleted = await db.deleteTemplate(user.id, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Template not found.' });
      return;
    }
    res.json({ success: true, message: 'Template deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete template.' });
  }
});

// ==========================================
// 7. Plain-Text Clipboard Endpoints
// ==========================================

apiRouter.get('/clipboard', (req, res) => {
  const user = req.user!;
  const { weekId, lessonRecordId, category } = req.query;
  const items = db.listClipboard(user.id, {
    weekId: weekId as string,
    lessonRecordId: lessonRecordId as string,
    category: category as string,
  });
  res.json(items);
});

apiRouter.post('/clipboard', async (req, res) => {
  try {
    const user = req.user!;
    const { plainText, label, category, weekId, lessonRecordId, className, section, day } = req.body;
    if (!plainText) {
      res.status(400).json({ error: 'plainText content is required.' });
      return;
    }

    const item = await db.createClipboardItem(user.id, {
      plainText,
      label: label || 'Snippet',
      category,
      weekId,
      lessonRecordId,
      className,
      section,
      day,
    });

    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create clipboard item.' });
  }
});

apiRouter.delete('/clipboard/:id', async (req, res) => {
  try {
    const user = req.user!;
    const deleted = await db.deleteClipboardItem(user.id, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Clipboard item not found.' });
      return;
    }
    res.json({ success: true, message: 'Clipboard item deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete clipboard item.' });
  }
});

apiRouter.post('/lesson-records/:id/extract-clipboard', async (req, res) => {
  try {
    const user = req.user!;
    const record = db.getLessonRecord(user.id, req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Lesson record not found.' });
      return;
    }
    db.createClipboardItemFromRecord(record, user.id);
    const items = db.listClipboard(user.id, { lessonRecordId: record.id });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to extract clipboard items.' });
  }
});

// ==========================================
// 8. Chrome Extension Integration API
// ==========================================

apiRouter.get('/extension/records/:id', (req, res) => {
  const user = req.user!;
  const dto = db.getExtensionRecordDTO(user.id, req.params.id);
  if (!dto) {
    res.status(404).json({ error: 'Lesson record not found for extension.' });
    return;
  }
  res.json(dto);
});

apiRouter.patch('/extension/records/:id/status', async (req, res) => {
  try {
    const user = req.user!;
    const { automationStatus, automationError } = req.body;

    const updates: any = {
      automationStatus,
      automationError,
    };

    if (automationStatus === 'in_progress') {
      updates.automationStartedAt = new Date().toISOString();
    } else if (automationStatus === 'completed') {
      updates.automationCompletedAt = new Date().toISOString();
      updates.completed = true;
      updates.status = 'completed';
    }

    const record = await db.updateLessonRecord(user.id, req.params.id, updates);
    if (!record) {
      res.status(404).json({ error: 'Lesson record not found.' });
      return;
    }
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update automation status.' });
  }
});

// ==========================================
// 9. Isolated Demo Data Seeder (Settings only)
// ==========================================

apiRouter.post('/demo/seed', async (req, res) => {
  try {
    const user = req.user!;
    const week = db.seedDemoWeek(user.id);
    const weeks = db.listWeeks(user.id);
    res.json({ success: true, message: 'Sample demo week loaded.', week, weeks });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to seed demo data.' });
  }
});
