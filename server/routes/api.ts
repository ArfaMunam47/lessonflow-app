/**
 * LessonFlow Express API Router
 * 
 * Provides all endpoints for:
 * - User and Teacher Profile management
 * - Weekly workspace management and week duplication
 * - Lesson record CRUD, fast navigation, and duplication
 * - Dynamic block builder (batch create N, duplicate, reorder, delete)
 * - Block template configuration
 * - Plain-text clipboard gallery, normalization, and copy queue
 * - AI unstructured text parsing service (Gemini)
 * - Chrome extension integration contracts & automation status
 */

import { Router } from 'express';
import { db } from '../db.js';
import { cleanPlainText } from '../../src/utils/textCleaner.js';
import { parseUnstructuredLessonPlan } from '../geminiParser.js';

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

apiRouter.get('/users', (_req, res) => {
  const users = db.listUsers().map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
  }));
  res.json(users);
});

apiRouter.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required.' });
      return;
    }
    const newUser = await db.createUser(name, email);
    res.status(201).json(newUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create user.' });
  }
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
// 2. Weeks Endpoints
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
 * Duplicate an entire week with all its records, blocks, and fields.
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
// 3. Lesson Records Endpoints
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

apiRouter.post('/weeks/:weekId/lesson-records', async (req, res) => {
  try {
    const user = req.user!;
    const { className, section, day, date, target, activities, blockCount, templateId } = req.body;

    if (!className || !day) {
      res.status(400).json({ error: 'Class name and Day are required.' });
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

/**
 * Fast Autosave & explicit Save endpoint for lesson records.
 */
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

/**
 * Duplicate a lesson record.
 */
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

/**
 * Update lesson status (draft, in_progress, ready, completed)
 */
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
// 4. Dynamic Block Builder Endpoints
// ==========================================

/**
 * Batch create N blocks for a lesson record at once (e.g. "Create 5 Blocks").
 */
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

/**
 * Duplicate a single block within a record.
 */
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

/**
 * Delete a block from a record.
 */
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

/**
 * Reorder blocks in a lesson record.
 */
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

/**
 * Apply template fields to an existing block without losing matched values.
 */
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
// 5. Block Templates Endpoints
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

apiRouter.get('/templates/:id', (req, res) => {
  const user = req.user!;
  const template = db.getTemplate(user.id, req.params.id);
  if (!template) {
    res.status(404).json({ error: 'Template not found.' });
    return;
  }
  res.json(template);
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
// 6. Plain-Text Clipboard Gallery Endpoints
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
      label: label || 'Clipboard Snippet',
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

apiRouter.put('/clipboard/:id', async (req, res) => {
  try {
    const user = req.user!;
    const updated = await db.updateClipboardItem(user.id, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Clipboard item not found.' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update clipboard item.' });
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

/**
 * Utility endpoint: Normalizes any text or HTML into clean plain text.
 */
apiRouter.post('/clipboard/clean', (req, res) => {
  const { rawText } = req.body;
  const clean = cleanPlainText(rawText);
  res.json({ cleanText: clean });
});

/**
 * Bulk extracts fields from an existing lesson record into the user's clipboard gallery.
 */
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
// 7. AI Unstructured Parser Service (Gemini)
// ==========================================

apiRouter.post('/ai/parse', async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
      res.status(400).json({ error: 'Lesson plan text is required for AI parsing.' });
      return;
    }

    const structured = await parseUnstructuredLessonPlan(rawText);
    res.json({
      success: true,
      parsed: structured,
    });
  } catch (err: any) {
    console.error('AI parse error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to parse lesson plan with AI.',
    });
  }
});

// ==========================================
// 8. Future Chrome Extension Integration API
// ==========================================

/**
 * Dedicated contract endpoint consumed by the future Chrome Extension.
 * Returns the exact JSON structure needed to automate school website entry:
 * Class, Section, Day, Target, Activities, Block fields, and Copy queue.
 */
apiRouter.get('/extension/records/:id', (req, res) => {
  const user = req.user!;
  const dto = db.getExtensionRecordDTO(user.id, req.params.id);
  if (!dto) {
    res.status(404).json({ error: 'Lesson record not found for extension.' });
    return;
  }
  res.json(dto);
});

/**
 * Chrome extension automation status update endpoint.
 * Reports automation progress: 'not_started', 'in_progress', 'completed', 'failed'.
 */
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

/**
 * Extension Schema Documentation endpoint (for extension developers).
 */
apiRouter.get('/extension/contract', (_req, res) => {
  res.json({
    description: 'LessonFlow Chrome Extension Data Contract',
    version: '1.0.0',
    authMethods: [
      'Authorization: Bearer <apiToken>',
      'x-api-token: <apiToken>',
    ],
    sampleEndpoint: '/api/extension/records/:id',
    statusEndpoint: '/api/extension/records/:id/status',
  });
});

// ==========================================
// 9. Demo Data Reset / Seed
// ==========================================

apiRouter.post('/demo/seed', async (req, res) => {
  try {
    const user = req.user!;
    db.seedDemoWeek(user.id);
    const weeks = db.listWeeks(user.id);
    res.json({ success: true, message: 'Demo data re-seeded.', weeks });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to seed demo data.' });
  }
});
