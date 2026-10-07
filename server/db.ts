/**
 * LessonFlow Data Persistence Layer
 * 
 * Provides clean, atomic, user-scoped persistence for:
 * - Users and Teacher Profiles (Neutral defaults, zero hardcoded teacher/class names)
 * - Weeks and Lesson Records
 * - Dynamic Blocks and Configurable Fields
 * - Block Templates
 * - Plain-Text Clipboard Gallery
 * - Import Records & History
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  TeacherProfile,
  Week,
  LessonRecord,
  Block,
  BlockField,
  BlockTemplate,
  ClipboardItem,
  ImportRecord,
  ParsedWeeklyImport,
  RecordStatus,
  WeeklyProgressDTO,
  ExtensionLessonRecordDTO,
} from '../src/types/index.js';
import { cleanPlainText } from '../src/utils/textCleaner.js';

interface DatabaseSchema {
  users: User[];
  profiles: TeacherProfile[];
  weeks: Week[];
  lessonRecords: LessonRecord[];
  templates: BlockTemplate[];
  clipboardItems: ClipboardItem[];
  importRecords: ImportRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'lessonflow.json');

const DEFAULT_TEMPLATES: Array<Omit<BlockTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'Standard 5-Field Lesson Block',
    description: 'Standard lesson-plan block: Objective, Teacher Activity, Student Activity, Resources, and Assessment.',
    isDefault: true,
    fields: [
      { key: 'objective', label: 'Objective', type: 'textarea', order: 1, isRequired: true, placeholder: 'Lesson objective...' },
      { key: 'teacher_activity', label: 'Teacher Activity', type: 'textarea', order: 2, isRequired: true, placeholder: 'Teacher direct instruction or modeling...' },
      { key: 'student_activity', label: 'Student Activity', type: 'textarea', order: 3, isRequired: true, placeholder: 'Student practice, group work, or paired activity...' },
      { key: 'resources', label: 'Resources / Materials', type: 'text', order: 4, isRequired: false, placeholder: 'Materials, links, or handouts...' },
      { key: 'assessment', label: 'Assessment / Check for Understanding', type: 'textarea', order: 5, isRequired: false, placeholder: 'Exit ticket, rubric, or check...' },
    ],
  },
  {
    name: 'Direct Instruction & Modeling',
    description: 'Focuses on the I Do, We Do, You Do instructional sequence.',
    isDefault: false,
    fields: [
      { key: 'hook_warmup', label: 'Hook / Warm-up', type: 'textarea', order: 1, isRequired: true, placeholder: 'Warm-up review...' },
      { key: 'modeling_i_do', label: 'Teacher Modeling (I Do)', type: 'textarea', order: 2, isRequired: true, placeholder: 'Demonstration and modeling...' },
      { key: 'guided_we_do', label: 'Guided Practice (We Do)', type: 'textarea', order: 3, isRequired: true, placeholder: 'Guided practice with feedback...' },
      { key: 'independent_you_do', label: 'Independent Practice (You Do)', type: 'textarea', order: 4, isRequired: true, placeholder: 'Independent student assignment...' },
    ],
  },
  {
    name: 'Station / Workshop Rotation',
    description: 'Structure for small group rotations and workshop stations.',
    isDefault: false,
    fields: [
      { key: 'station_goal', label: 'Station Focus', type: 'textarea', order: 1, isRequired: true, placeholder: 'Goal of this station...' },
      { key: 'materials_needed', label: 'Materials Needed', type: 'text', order: 2, isRequired: false, placeholder: 'Materials...' },
      { key: 'task_instructions', label: 'Task Instructions', type: 'textarea', order: 3, isRequired: true, placeholder: 'Student instructions...' },
      { key: 'differentiation', label: 'Differentiation / Support', type: 'text', order: 4, isRequired: false, placeholder: 'Scaffolding or extension notes...' },
    ],
  },
];

class Database {
  private data: DatabaseSchema = {
    users: [],
    profiles: [],
    weeks: [],
    lessonRecords: [],
    templates: [],
    clipboardItems: [],
    importRecords: [],
  };

  private writeQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.data.users = this.data.users || [];
        this.data.profiles = this.data.profiles || [];
        this.data.weeks = this.data.weeks || [];
        this.data.lessonRecords = this.data.lessonRecords || [];
        this.data.templates = this.data.templates || [];
        this.data.clipboardItems = this.data.clipboardItems || [];
        this.data.importRecords = this.data.importRecords || [];
      } catch (err) {
        console.error('Failed to parse database file, resetting:', err);
      }
    }

    // Ensure neutral primary user exists without dummy teacher names or fake classes
    this.ensureNeutralUser();
  }

  private async persist(): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const tempFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).substring(7)}.tmp`;
      const json = JSON.stringify(this.data, null, 2);
      await fs.promises.writeFile(tempFile, json, 'utf-8');
      await fs.promises.rename(tempFile, DB_FILE);
    });
    return this.writeQueue;
  }

  private ensureNeutralUser() {
    const now = new Date().toISOString();

    // Check if neutral default user exists
    let defaultUser = this.data.users.find(u => u.id === 'usr_default');
    if (!defaultUser) {
      // Remove any legacy invented "Sarah Parker" user
      this.data.users = this.data.users.filter(u => u.id !== 'usr_sarah_parker');
      this.data.profiles = this.data.profiles.filter(p => p.id !== 'prof_sarah_parker');

      defaultUser = {
        id: 'usr_default',
        name: 'Teacher',
        email: '',
        apiToken: `lf_tok_${crypto.randomBytes(16).toString('hex')}`,
        createdAt: now,
        updatedAt: now,
      };
      this.data.users.unshift(defaultUser);

      const defaultProfile: TeacherProfile = {
        id: 'prof_default',
        userId: defaultUser.id,
        teacherName: 'Teacher',
        defaultSection: '',
        defaultClass: '',
        schoolName: '',
        createdAt: now,
        updatedAt: now,
      };
      this.data.profiles.unshift(defaultProfile);
    }

    // Ensure default templates exist for the default user
    const hasTemplates = this.data.templates.some(t => t.userId === defaultUser!.id);
    if (!hasTemplates) {
      const seededTemplates: BlockTemplate[] = DEFAULT_TEMPLATES.map((tmpl, idx) => ({
        ...tmpl,
        id: `tmpl_default_${idx + 1}`,
        userId: defaultUser!.id,
        createdAt: now,
        updatedAt: now,
      }));
      this.data.templates.push(...seededTemplates);
      const prof = this.data.profiles.find(p => p.userId === defaultUser!.id);
      if (prof) prof.defaultTemplateId = seededTemplates[0].id;
    }

    // Clean up any old demo week from regular view so the app starts clean
    this.data.weeks = this.data.weeks.filter(w => w.id !== 'week_demo_8');
    this.data.lessonRecords = this.data.lessonRecords.filter(r => r.weekId !== 'week_demo_8');
    this.data.clipboardItems = this.data.clipboardItems.filter(c => c.weekId !== 'week_demo_8');

    this.persist();
  }

  // --- User & Profile Operations ---

  public getUser(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getUserByToken(token: string): User | undefined {
    if (!token) return undefined;
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    return this.data.users.find(u => u.apiToken === cleanToken);
  }

  public listUsers(): User[] {
    return this.data.users;
  }

  public async createUser(name: string, email: string): Promise<User> {
    const now = new Date().toISOString();
    const id = `usr_${crypto.randomUUID()}`;
    const user: User = {
      id,
      name: cleanPlainText(name) || 'Teacher',
      email: cleanPlainText(email),
      apiToken: `lf_tok_${crypto.randomBytes(16).toString('hex')}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.users.push(user);

    const profile: TeacherProfile = {
      id: `prof_${crypto.randomUUID()}`,
      userId: id,
      teacherName: user.name,
      createdAt: now,
      updatedAt: now,
    };
    this.data.profiles.push(profile);

    // Provide default templates for user
    for (const defTmpl of DEFAULT_TEMPLATES) {
      this.data.templates.push({
        ...defTmpl,
        id: `tmpl_${crypto.randomUUID()}`,
        userId: id,
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.persist();
    return user;
  }

  public getProfile(userId: string): TeacherProfile | undefined {
    return this.data.profiles.find(p => p.userId === userId);
  }

  public async updateProfile(userId: string, updates: Partial<TeacherProfile>): Promise<TeacherProfile> {
    let profile = this.data.profiles.find(p => p.userId === userId);
    const now = new Date().toISOString();
    if (!profile) {
      profile = {
        id: `prof_${crypto.randomUUID()}`,
        userId,
        teacherName: updates.teacherName || 'Teacher',
        createdAt: now,
        updatedAt: now,
      };
      this.data.profiles.push(profile);
    }

    if (updates.teacherName !== undefined) profile.teacherName = cleanPlainText(updates.teacherName);
    if (updates.defaultSection !== undefined) profile.defaultSection = cleanPlainText(updates.defaultSection);
    if (updates.defaultClass !== undefined) profile.defaultClass = cleanPlainText(updates.defaultClass);
    if (updates.schoolName !== undefined) profile.schoolName = cleanPlainText(updates.schoolName);
    if (updates.defaultTemplateId !== undefined) profile.defaultTemplateId = updates.defaultTemplateId;
    profile.updatedAt = now;

    // Also update User name if teacherName changed
    const user = this.getUser(userId);
    if (user && updates.teacherName) {
      user.name = cleanPlainText(updates.teacherName);
      user.updatedAt = now;
    }

    await this.persist();
    return profile;
  }

  // --- Weeks Operations ---

  public listWeeks(userId: string): Week[] {
    return this.data.weeks
      .filter(w => w.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public getWeek(userId: string, id: string): Week | undefined {
    return this.data.weeks.find(w => w.userId === userId && w.id === id);
  }

  public async createWeek(userId: string, weekData: Partial<Week>): Promise<Week> {
    const now = new Date().toISOString();
    const week: Week = {
      id: `week_${crypto.randomUUID()}`,
      userId,
      weekNumber: cleanPlainText(weekData.weekNumber) || 'New Week',
      title: cleanPlainText(weekData.title) || 'Weekly Lesson Plans',
      startDate: weekData.startDate || '',
      endDate: weekData.endDate || '',
      status: weekData.status || 'draft',
      createdAt: now,
      updatedAt: now,
    };

    this.data.weeks.push(week);
    await this.persist();
    return week;
  }

  public async updateWeek(userId: string, id: string, updates: Partial<Week>): Promise<Week | null> {
    const week = this.data.weeks.find(w => w.userId === userId && w.id === id);
    if (!week) return null;

    if (updates.weekNumber !== undefined) week.weekNumber = cleanPlainText(updates.weekNumber);
    if (updates.title !== undefined) week.title = cleanPlainText(updates.title);
    if (updates.startDate !== undefined) week.startDate = updates.startDate;
    if (updates.endDate !== undefined) week.endDate = updates.endDate;
    if (updates.status !== undefined) week.status = updates.status;
    week.updatedAt = new Date().toISOString();

    await this.persist();
    return week;
  }

  public async deleteWeek(userId: string, id: string): Promise<boolean> {
    const index = this.data.weeks.findIndex(w => w.userId === userId && w.id === id);
    if (index === -1) return false;

    this.data.weeks.splice(index, 1);
    this.data.lessonRecords = this.data.lessonRecords.filter(r => r.weekId !== id);
    this.data.clipboardItems = this.data.clipboardItems.filter(c => c.weekId !== id);

    await this.persist();
    return true;
  }

  public async duplicateWeek(userId: string, sourceWeekId: string, newWeekNumber?: string, newTitle?: string): Promise<Week | null> {
    const sourceWeek = this.getWeek(userId, sourceWeekId);
    if (!sourceWeek) return null;

    const now = new Date().toISOString();
    const newWeekId = `week_${crypto.randomUUID()}`;

    const duplicatedWeek: Week = {
      id: newWeekId,
      userId,
      weekNumber: newWeekNumber || `${sourceWeek.weekNumber} (Copy)`,
      title: newTitle || sourceWeek.title,
      startDate: '',
      endDate: '',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    this.data.weeks.push(duplicatedWeek);

    const recordsToCopy = this.data.lessonRecords.filter(r => r.userId === userId && r.weekId === sourceWeekId);

    for (const record of recordsToCopy) {
      const newRecordId = `rec_${crypto.randomUUID()}`;
      const duplicatedBlocks: Block[] = record.blocks.map(b => {
        const newBlockId = `blk_${crypto.randomUUID()}`;
        const newFields: BlockField[] = b.fields.map(f => ({
          ...f,
          id: `fld_${crypto.randomUUID()}`,
          blockId: newBlockId,
          createdAt: now,
          updatedAt: now,
        }));

        return {
          ...b,
          id: newBlockId,
          lessonRecordId: newRecordId,
          fields: newFields,
          createdAt: now,
          updatedAt: now,
        };
      });

      const duplicatedRecord: LessonRecord = {
        ...record,
        id: newRecordId,
        weekId: newWeekId,
        status: 'draft',
        completed: false,
        automationStatus: 'not_started',
        automationStartedAt: undefined,
        automationCompletedAt: undefined,
        automationError: undefined,
        blocks: duplicatedBlocks,
        createdAt: now,
        updatedAt: now,
      };

      this.data.lessonRecords.push(duplicatedRecord);
    }

    await this.persist();
    return duplicatedWeek;
  }

  // --- Lesson Records Operations ---

  public listLessonRecords(userId: string, weekId?: string, filters?: { day?: string; className?: string; status?: string }): LessonRecord[] {
    return this.data.lessonRecords
      .filter(r => {
        if (r.userId !== userId) return false;
        if (weekId && r.weekId !== weekId) return false;
        if (filters?.day && r.day.toLowerCase() !== filters.day.toLowerCase()) return false;
        if (filters?.className && !r.className.toLowerCase().includes(filters.className.toLowerCase())) return false;
        if (filters?.status && r.status !== filters.status) return false;
        return true;
      })
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getLessonRecord(userId: string, id: string): LessonRecord | undefined {
    return this.data.lessonRecords.find(r => r.userId === userId && r.id === id);
  }

  public async createLessonRecord(
    userId: string,
    weekId: string,
    data: {
      className: string;
      section?: string;
      day: string;
      date?: string;
      target?: string;
      activities?: string;
      blockCount?: number;
      templateId?: string;
    }
  ): Promise<LessonRecord> {
    const now = new Date().toISOString();
    const recordId = `rec_${crypto.randomUUID()}`;

    const existing = this.data.lessonRecords.filter(r => r.weekId === weekId);
    const orderIndex = existing.length > 0 ? Math.max(...existing.map(e => e.orderIndex)) + 1 : 1;

    let template = this.data.templates.find(t => t.id === data.templateId);
    if (!template) {
      template = this.data.templates.find(t => t.userId === userId && t.isDefault) || this.data.templates[0];
    }

    const blockCount = Math.max(0, data.blockCount ?? 3);
    const blocks: Block[] = [];

    for (let i = 1; i <= blockCount; i++) {
      const blockId = `blk_${crypto.randomUUID()}`;
      const fields: BlockField[] = (template ? template.fields : []).map(f => ({
        id: `fld_${crypto.randomUUID()}`,
        blockId,
        fieldKey: f.key,
        fieldLabel: f.label,
        fieldValue: '',
        fieldOrder: f.order,
        fieldType: f.type,
        isRequired: f.isRequired,
        placeholder: f.placeholder,
        createdAt: now,
        updatedAt: now,
      }));

      blocks.push({
        id: blockId,
        lessonRecordId: recordId,
        blockNumber: i,
        templateId: template?.id,
        orderIndex: i,
        fields,
        createdAt: now,
        updatedAt: now,
      });
    }

    const record: LessonRecord = {
      id: recordId,
      weekId,
      userId,
      className: cleanPlainText(data.className) || 'Class',
      section: cleanPlainText(data.section) || '',
      day: cleanPlainText(data.day) || 'Monday',
      date: data.date || '',
      target: cleanPlainText(data.target) || '',
      activities: cleanPlainText(data.activities) || '',
      status: 'draft',
      completed: false,
      orderIndex,
      blocks,
      automationStatus: 'not_started',
      createdAt: now,
      updatedAt: now,
    };

    this.data.lessonRecords.push(record);
    await this.persist();
    return record;
  }

  public async updateLessonRecord(
    userId: string,
    id: string,
    updates: Partial<Omit<LessonRecord, 'id' | 'userId' | 'weekId' | 'createdAt'>>
  ): Promise<LessonRecord | null> {
    const record = this.data.lessonRecords.find(r => r.userId === userId && r.id === id);
    if (!record) return null;

    if (updates.className !== undefined) record.className = cleanPlainText(updates.className);
    if (updates.section !== undefined) record.section = cleanPlainText(updates.section);
    if (updates.day !== undefined) record.day = cleanPlainText(updates.day);
    if (updates.date !== undefined) record.date = updates.date;
    if (updates.target !== undefined) record.target = cleanPlainText(updates.target);
    if (updates.activities !== undefined) record.activities = cleanPlainText(updates.activities);
    if (updates.status !== undefined) record.status = updates.status;
    if (updates.completed !== undefined) {
      record.completed = updates.completed;
      if (record.completed && record.status === 'draft') {
        record.status = 'completed';
      }
    }
    if (updates.orderIndex !== undefined) record.orderIndex = updates.orderIndex;
    if (updates.automationStatus !== undefined) record.automationStatus = updates.automationStatus;
    if (updates.automationStartedAt !== undefined) record.automationStartedAt = updates.automationStartedAt;
    if (updates.automationCompletedAt !== undefined) record.automationCompletedAt = updates.automationCompletedAt;
    if (updates.automationError !== undefined) record.automationError = updates.automationError;

    if (updates.blocks !== undefined) {
      record.blocks = updates.blocks.map(b => ({
        ...b,
        fields: b.fields.map(f => ({
          ...f,
          fieldValue: cleanPlainText(f.fieldValue),
        })),
      }));
    }

    record.updatedAt = new Date().toISOString();
    await this.persist();
    return record;
  }

  public async deleteLessonRecord(userId: string, id: string): Promise<boolean> {
    const index = this.data.lessonRecords.findIndex(r => r.userId === userId && r.id === id);
    if (index === -1) return false;

    this.data.lessonRecords.splice(index, 1);
    this.data.clipboardItems = this.data.clipboardItems.filter(c => c.lessonRecordId !== id);
    await this.persist();
    return true;
  }

  public async duplicateLessonRecord(
    userId: string,
    sourceId: string,
    overrides?: { day?: string; className?: string; section?: string }
  ): Promise<LessonRecord | null> {
    const source = this.getLessonRecord(userId, sourceId);
    if (!source) return null;

    const now = new Date().toISOString();
    const newRecordId = `rec_${crypto.randomUUID()}`;

    const existing = this.data.lessonRecords.filter(r => r.weekId === source.weekId);
    const orderIndex = existing.length > 0 ? Math.max(...existing.map(e => e.orderIndex)) + 1 : 1;

    const duplicatedBlocks: Block[] = source.blocks.map(b => {
      const newBlockId = `blk_${crypto.randomUUID()}`;
      const newFields: BlockField[] = b.fields.map(f => ({
        ...f,
        id: `fld_${crypto.randomUUID()}`,
        blockId: newBlockId,
        createdAt: now,
        updatedAt: now,
      }));

      return {
        ...b,
        id: newBlockId,
        lessonRecordId: newRecordId,
        fields: newFields,
        createdAt: now,
        updatedAt: now,
      };
    });

    const duplicatedRecord: LessonRecord = {
      ...source,
      id: newRecordId,
      day: overrides?.day || source.day,
      className: overrides?.className || source.className,
      section: overrides?.section !== undefined ? overrides.section : source.section,
      orderIndex,
      status: 'draft',
      completed: false,
      automationStatus: 'not_started',
      blocks: duplicatedBlocks,
      createdAt: now,
      updatedAt: now,
    };

    this.data.lessonRecords.push(duplicatedRecord);
    await this.persist();
    return duplicatedRecord;
  }

  // --- Dynamic Block Operations ---

  public async createBlocks(
    userId: string,
    lessonRecordId: string,
    count: number,
    templateId?: string
  ): Promise<LessonRecord | null> {
    const record = this.getLessonRecord(userId, lessonRecordId);
    if (!record) return null;

    const now = new Date().toISOString();
    let template = this.data.templates.find(t => t.id === templateId);
    if (!template) {
      template = this.data.templates.find(t => t.userId === userId && t.isDefault) || this.data.templates[0];
    }

    const startNumber = record.blocks.length + 1;

    for (let i = 0; i < count; i++) {
      const blockNumber = startNumber + i;
      const blockId = `blk_${crypto.randomUUID()}`;

      const fields: BlockField[] = (template ? template.fields : []).map(f => ({
        id: `fld_${crypto.randomUUID()}`,
        blockId,
        fieldKey: f.key,
        fieldLabel: f.label,
        fieldValue: '',
        fieldOrder: f.order,
        fieldType: f.type,
        isRequired: f.isRequired,
        placeholder: f.placeholder,
        createdAt: now,
        updatedAt: now,
      }));

      record.blocks.push({
        id: blockId,
        lessonRecordId,
        blockNumber,
        templateId: template?.id,
        orderIndex: blockNumber,
        fields,
        createdAt: now,
        updatedAt: now,
      });
    }

    record.updatedAt = now;
    await this.persist();
    return record;
  }

  public async duplicateBlock(userId: string, lessonRecordId: string, blockId: string): Promise<LessonRecord | null> {
    const record = this.getLessonRecord(userId, lessonRecordId);
    if (!record) return null;

    const sourceBlock = record.blocks.find(b => b.id === blockId);
    if (!sourceBlock) return null;

    const now = new Date().toISOString();
    const newBlockId = `blk_${crypto.randomUUID()}`;

    const newFields: BlockField[] = sourceBlock.fields.map(f => ({
      ...f,
      id: `fld_${crypto.randomUUID()}`,
      blockId: newBlockId,
      createdAt: now,
      updatedAt: now,
    }));

    const sourceIndex = record.blocks.findIndex(b => b.id === blockId);
    const newBlock: Block = {
      ...sourceBlock,
      id: newBlockId,
      blockNumber: record.blocks.length + 1,
      orderIndex: sourceBlock.orderIndex + 1,
      fields: newFields,
      createdAt: now,
      updatedAt: now,
    };

    record.blocks.splice(sourceIndex + 1, 0, newBlock);

    record.blocks.forEach((b, idx) => {
      b.blockNumber = idx + 1;
      b.orderIndex = idx + 1;
    });

    record.updatedAt = now;
    await this.persist();
    return record;
  }

  public async deleteBlock(userId: string, lessonRecordId: string, blockId: string): Promise<LessonRecord | null> {
    const record = this.getLessonRecord(userId, lessonRecordId);
    if (!record) return null;

    const initialLength = record.blocks.length;
    record.blocks = record.blocks.filter(b => b.id !== blockId);
    if (record.blocks.length === initialLength) return null;

    record.blocks.forEach((b, idx) => {
      b.blockNumber = idx + 1;
      b.orderIndex = idx + 1;
    });

    record.updatedAt = new Date().toISOString();
    await this.persist();
    return record;
  }

  public async reorderBlocks(userId: string, lessonRecordId: string, orderedBlockIds: string[]): Promise<LessonRecord | null> {
    const record = this.getLessonRecord(userId, lessonRecordId);
    if (!record) return null;

    const blockMap = new Map(record.blocks.map(b => [b.id, b]));
    const reordered: Block[] = [];

    orderedBlockIds.forEach((id, idx) => {
      const blk = blockMap.get(id);
      if (blk) {
        blk.orderIndex = idx + 1;
        blk.blockNumber = idx + 1;
        reordered.push(blk);
        blockMap.delete(id);
      }
    });

    blockMap.forEach(blk => {
      blk.orderIndex = reordered.length + 1;
      blk.blockNumber = reordered.length + 1;
      reordered.push(blk);
    });

    record.blocks = reordered;
    record.updatedAt = new Date().toISOString();
    await this.persist();
    return record;
  }

  public async applyTemplateToBlock(userId: string, lessonRecordId: string, blockId: string, templateId: string): Promise<LessonRecord | null> {
    const record = this.getLessonRecord(userId, lessonRecordId);
    if (!record) return null;

    const block = record.blocks.find(b => b.id === blockId);
    if (!block) return null;

    const template = this.data.templates.find(t => t.id === templateId);
    if (!template) return null;

    const now = new Date().toISOString();
    const existingFieldMap = new Map(block.fields.map(f => [f.fieldKey, f.fieldValue]));

    const newFields: BlockField[] = template.fields.map(f => ({
      id: `fld_${crypto.randomUUID()}`,
      blockId,
      fieldKey: f.key,
      fieldLabel: f.label,
      fieldValue: existingFieldMap.get(f.key) || '',
      fieldOrder: f.order,
      fieldType: f.type,
      isRequired: f.isRequired,
      placeholder: f.placeholder,
      createdAt: now,
      updatedAt: now,
    }));

    block.templateId = template.id;
    block.fields = newFields;
    block.updatedAt = now;
    record.updatedAt = now;

    await this.persist();
    return record;
  }

  // --- Templates Operations ---

  public listTemplates(userId: string): BlockTemplate[] {
    return this.data.templates.filter(t => t.userId === userId || t.userId === 'usr_default');
  }

  public getTemplate(userId: string, id: string): BlockTemplate | undefined {
    return this.data.templates.find(t => t.id === id && (t.userId === userId || t.userId === 'usr_default'));
  }

  public async createTemplate(userId: string, templateData: Omit<BlockTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<BlockTemplate> {
    const now = new Date().toISOString();
    const template: BlockTemplate = {
      id: `tmpl_${crypto.randomUUID()}`,
      userId,
      name: cleanPlainText(templateData.name) || 'New Block Template',
      description: cleanPlainText(templateData.description) || '',
      isDefault: Boolean(templateData.isDefault),
      fields: templateData.fields.map((f, idx) => ({
        key: f.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') || `field_${idx + 1}`,
        label: cleanPlainText(f.label) || `Field ${idx + 1}`,
        type: f.type || 'textarea',
        order: f.order || idx + 1,
        isRequired: Boolean(f.isRequired),
        placeholder: cleanPlainText(f.placeholder) || '',
      })),
      createdAt: now,
      updatedAt: now,
    };

    if (template.isDefault) {
      this.data.templates.filter(t => t.userId === userId).forEach(t => (t.isDefault = false));
    }

    this.data.templates.push(template);
    await this.persist();
    return template;
  }

  public async updateTemplate(userId: string, id: string, updates: Partial<BlockTemplate>): Promise<BlockTemplate | null> {
    const template = this.data.templates.find(t => t.userId === userId && t.id === id);
    if (!template) return null;

    if (updates.name !== undefined) template.name = cleanPlainText(updates.name);
    if (updates.description !== undefined) template.description = cleanPlainText(updates.description);
    if (updates.isDefault !== undefined) {
      template.isDefault = updates.isDefault;
      if (template.isDefault) {
        this.data.templates.filter(t => t.userId === userId && t.id !== id).forEach(t => (t.isDefault = false));
      }
    }
    if (updates.fields !== undefined) {
      template.fields = updates.fields.map((f, idx) => ({
        key: f.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') || `field_${idx + 1}`,
        label: cleanPlainText(f.label) || `Field ${idx + 1}`,
        type: f.type || 'textarea',
        order: f.order || idx + 1,
        isRequired: Boolean(f.isRequired),
        placeholder: cleanPlainText(f.placeholder) || '',
      }));
    }

    template.updatedAt = new Date().toISOString();
    await this.persist();
    return template;
  }

  public async deleteTemplate(userId: string, id: string): Promise<boolean> {
    const index = this.data.templates.findIndex(t => t.userId === userId && t.id === id);
    if (index === -1) return false;

    this.data.templates.splice(index, 1);
    await this.persist();
    return true;
  }

  // --- Clipboard Gallery Operations ---

  public listClipboard(userId: string, filters?: { weekId?: string; lessonRecordId?: string; category?: string }): ClipboardItem[] {
    return this.data.clipboardItems
      .filter(item => {
        if (item.userId !== userId) return false;
        if (filters?.weekId && item.weekId !== filters.weekId) return false;
        if (filters?.lessonRecordId && item.lessonRecordId !== filters.lessonRecordId) return false;
        if (filters?.category && item.category !== filters.category) return false;
        return true;
      })
      .sort((a, b) => a.orderIndex - b.orderIndex || b.createdAt.localeCompare(a.createdAt));
  }

  public async createClipboardItem(
    userId: string,
    data: {
      plainText: string;
      label: string;
      category?: ClipboardItem['category'];
      weekId?: string;
      lessonRecordId?: string;
      className?: string;
      section?: string;
      day?: string;
    }
  ): Promise<ClipboardItem> {
    const now = new Date().toISOString();
    const cleanText = cleanPlainText(data.plainText);

    const existing = this.data.clipboardItems.filter(c => c.userId === userId);
    const orderIndex = existing.length > 0 ? Math.max(...existing.map(e => e.orderIndex)) + 1 : 1;

    const item: ClipboardItem = {
      id: `clip_${crypto.randomUUID()}`,
      userId,
      label: cleanPlainText(data.label) || 'Clipboard Snippet',
      plainText: cleanText,
      category: data.category || 'general',
      weekId: data.weekId,
      lessonRecordId: data.lessonRecordId,
      className: data.className ? cleanPlainText(data.className) : undefined,
      section: data.section ? cleanPlainText(data.section) : undefined,
      day: data.day ? cleanPlainText(data.day) : undefined,
      orderIndex,
      createdAt: now,
      updatedAt: now,
    };

    this.data.clipboardItems.push(item);
    await this.persist();
    return item;
  }

  public async updateClipboardItem(userId: string, id: string, updates: Partial<ClipboardItem>): Promise<ClipboardItem | null> {
    const item = this.data.clipboardItems.find(c => c.userId === userId && c.id === id);
    if (!item) return null;

    if (updates.label !== undefined) item.label = cleanPlainText(updates.label);
    if (updates.plainText !== undefined) item.plainText = cleanPlainText(updates.plainText);
    if (updates.category !== undefined) item.category = updates.category;
    if (updates.orderIndex !== undefined) item.orderIndex = updates.orderIndex;

    item.updatedAt = new Date().toISOString();
    await this.persist();
    return item;
  }

  public async deleteClipboardItem(userId: string, id: string): Promise<boolean> {
    const index = this.data.clipboardItems.findIndex(c => c.userId === userId && c.id === id);
    if (index === -1) return false;

    this.data.clipboardItems.splice(index, 1);
    await this.persist();
    return true;
  }

  public createClipboardItemFromRecord(record: LessonRecord, userId: string) {
    const now = new Date().toISOString();
    let order = 1;

    if (record.target) {
      this.data.clipboardItems.push({
        id: `clip_${crypto.randomUUID()}`,
        userId,
        weekId: record.weekId,
        lessonRecordId: record.id,
        className: record.className,
        section: record.section,
        day: record.day,
        category: 'target',
        label: `${record.day} — ${record.className} Target`,
        plainText: cleanPlainText(record.target),
        orderIndex: order++,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (record.activities) {
      this.data.clipboardItems.push({
        id: `clip_${crypto.randomUUID()}`,
        userId,
        weekId: record.weekId,
        lessonRecordId: record.id,
        className: record.className,
        section: record.section,
        day: record.day,
        category: 'activities',
        label: `${record.day} — ${record.className} Activities`,
        plainText: cleanPlainText(record.activities),
        orderIndex: order++,
        createdAt: now,
        updatedAt: now,
      });
    }

    record.blocks.forEach(b => {
      b.fields.forEach(f => {
        if (f.fieldValue) {
          this.data.clipboardItems.push({
            id: `clip_${crypto.randomUUID()}`,
            userId,
            weekId: record.weekId,
            lessonRecordId: record.id,
            className: record.className,
            section: record.section,
            day: record.day,
            category: 'block_field',
            label: `${record.day} ${record.className} • Block ${b.blockNumber} — ${f.fieldLabel}`,
            plainText: cleanPlainText(f.fieldValue),
            orderIndex: order++,
            createdAt: now,
            updatedAt: now,
          });
        }
      });
    });
  }

  // --- Multi-Lesson PDF Import & History Operations (Requirements 7, 10, 24, 25, 26) ---

  public listImportRecords(userId: string): ImportRecord[] {
    return this.data.importRecords
      .filter(i => i.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public getImportRecord(userId: string, id: string): ImportRecord | null {
    return this.data.importRecords.find(i => i.userId === userId && i.id === id) || null;
  }

  public async deleteImportRecord(userId: string, id: string): Promise<boolean> {
    const index = this.data.importRecords.findIndex(i => i.userId === userId && i.id === id);
    if (index === -1) return false;
    this.data.importRecords.splice(index, 1);
    await this.persist();
    return true;
  }

  /**
   * Commits an AI-parsed and teacher-reviewed weekly lesson plan into the database.
   * Creates the Week and all structured LessonRecords and dynamic Blocks.
   */
  public async commitImportedWeek(userId: string, importData: ParsedWeeklyImport): Promise<{ week: Week; recordsCount: number }> {
    const now = new Date().toISOString();
    const importId = `imp_${crypto.randomUUID()}`;

    // 1. Create the Week
    const week: Week = {
      id: `week_${crypto.randomUUID()}`,
      userId,
      weekNumber: cleanPlainText(importData.weekNumber) || 'Imported Week',
      title: cleanPlainText(importData.weekTitle) || 'Weekly Lesson Plans',
      startDate: importData.startDate || '',
      endDate: importData.endDate || '',
      status: 'in_progress',
      createdAt: now,
      updatedAt: now,
    };
    this.data.weeks.unshift(week);

    // 2. Resolve default template for field schema
    const defaultTemplate = this.data.templates.find(t => t.userId === userId && t.isDefault) || this.data.templates[0];

    // 3. Create each individual lesson record
    let recordsCount = 0;
    for (const draft of importData.lessons) {
      recordsCount++;
      const recordId = `rec_${crypto.randomUUID()}`;

      const blocks: Block[] = draft.blocks.map(bDraft => {
        const blockId = `blk_${crypto.randomUUID()}`;

        // Build fields using draft fields or template definitions
        const fieldEntries = Object.entries(bDraft.fields);
        const fields: BlockField[] = [];

        if (fieldEntries.length > 0) {
          fieldEntries.forEach(([key, val], fIdx) => {
            const label = key
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');

            fields.push({
              id: `fld_${crypto.randomUUID()}`,
              blockId,
              fieldKey: key,
              fieldLabel: label,
              fieldValue: cleanPlainText(val),
              fieldOrder: fIdx + 1,
              fieldType: 'textarea',
              isRequired: false,
              createdAt: now,
              updatedAt: now,
            });
          });
        } else if (defaultTemplate) {
          defaultTemplate.fields.forEach(f => {
            fields.push({
              id: `fld_${crypto.randomUUID()}`,
              blockId,
              fieldKey: f.key,
              fieldLabel: f.label,
              fieldValue: '',
              fieldOrder: f.order,
              fieldType: f.type,
              isRequired: f.isRequired,
              placeholder: f.placeholder,
              createdAt: now,
              updatedAt: now,
            });
          });
        }

        return {
          id: blockId,
          lessonRecordId: recordId,
          blockNumber: bDraft.blockNumber,
          templateId: defaultTemplate?.id,
          orderIndex: bDraft.blockNumber,
          fields,
          createdAt: now,
          updatedAt: now,
        };
      });

      const lessonRecord: LessonRecord = {
        id: recordId,
        weekId: week.id,
        userId,
        className: cleanPlainText(draft.className) || 'Class',
        section: cleanPlainText(draft.section) || '',
        day: cleanPlainText(draft.day) || 'Monday',
        date: draft.date || '',
        target: cleanPlainText(draft.target) || '',
        activities: cleanPlainText(draft.activities) || '',
        status: draft.needsReview ? 'draft' : 'ready',
        completed: false,
        orderIndex: recordsCount,
        blocks,
        sourceImportId: importId,
        sourceFileName: importData.fileName,
        sourceUrl: importData.sourceUrl,
        sourceType: importData.sourceType,
        automationStatus: 'not_started',
        createdAt: now,
        updatedAt: now,
      };

      this.data.lessonRecords.push(lessonRecord);
    }

    // 4. Record the import history
    this.data.importRecords.unshift({
      id: importId,
      userId,
      fileName: importData.fileName || 'Lesson_Plan_Document',
      sourceType: importData.sourceType || 'plain_text',
      sourceUrl: importData.sourceUrl,
      sourceTitle: importData.sourceTitle,
      weekId: week.id,
      weekNumber: week.weekNumber,
      lessonCount: recordsCount,
      metadata: {
        sourceUrl: importData.sourceUrl,
        sourceTitle: importData.sourceTitle,
        extractedSummary: importData.extractedSummary,
      },
      createdAt: now,
    });

    await this.persist();
    return { week, recordsCount };
  }

  // --- Progress & Analytics ---

  public getWeeklyProgress(userId: string, weekId: string): WeeklyProgressDTO {
    const records = this.data.lessonRecords.filter(r => r.userId === userId && r.weekId === weekId);
    const totalRecords = records.length;
    const completedRecords = records.filter(r => r.completed || r.status === 'completed').length;
    const percentage = totalRecords > 0 ? Math.round((completedRecords / totalRecords) * 1000) / 10 : 0;

    const byDay: Record<string, { total: number; completed: number }> = {};
    const byStatus: Record<RecordStatus, number> = {
      draft: 0,
      in_progress: 0,
      ready: 0,
      completed: 0,
    };

    records.forEach(r => {
      if (!byDay[r.day]) {
        byDay[r.day] = { total: 0, completed: 0 };
      }
      byDay[r.day].total += 1;
      if (r.completed || r.status === 'completed') {
        byDay[r.day].completed += 1;
      }
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });

    return {
      weekId,
      totalRecords,
      completedRecords,
      percentage,
      byDay,
      byStatus,
    };
  }

  // --- Chrome Extension DTO Contract ---

  public getExtensionRecordDTO(userId: string, recordId: string): ExtensionLessonRecordDTO | null {
    const record = this.getLessonRecord(userId, recordId);
    if (!record) return null;

    const copyQueue = this.data.clipboardItems
      .filter(c => c.userId === userId && c.lessonRecordId === recordId)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(c => ({
        id: c.id,
        label: c.label,
        category: c.category,
        plainText: c.plainText,
        orderIndex: c.orderIndex,
      }));

    return {
      id: record.id,
      className: record.className,
      section: record.section,
      day: record.day,
      date: record.date,
      target: record.target,
      activities: record.activities,
      totalBlocks: record.blocks.length,
      blocks: record.blocks.map(b => ({
        id: b.id,
        blockNumber: b.blockNumber,
        orderIndex: b.orderIndex,
        fields: b.fields.map(f => ({
          key: f.fieldKey,
          label: f.fieldLabel,
          value: f.fieldValue,
          order: f.fieldOrder,
          type: f.fieldType,
          isRequired: f.isRequired,
        })),
      })),
      copyQueue,
    };
  }

  // --- Isolated Demo Seeder (Only called if user explicitly clicks "Load Demo Data" in Settings) ---

  public seedDemoWeek(userId: string) {
    const now = new Date().toISOString();
    const weekId = `week_sample_demo`;

    this.data.weeks = this.data.weeks.filter(w => w.id !== weekId);
    this.data.lessonRecords = this.data.lessonRecords.filter(r => r.weekId !== weekId);

    const week: Week = {
      id: weekId,
      userId,
      weekNumber: 'Sample Week 1',
      title: 'Introductory Fractions & Estimation',
      startDate: '2026-10-12',
      endDate: '2026-10-16',
      status: 'in_progress',
      createdAt: now,
      updatedAt: now,
    };
    this.data.weeks.unshift(week);

    const defaultTmpl = this.data.templates.find(t => t.userId === userId && t.isDefault) || this.data.templates[0];

    const recordsDef = [
      {
        day: 'Monday',
        className: 'Grade 6',
        section: 'Room 102',
        target: 'Convert proper fractions to decimals using long division.',
        activities: '1. Warmup drill 2. Direct modeling 3. Paired practice',
        blockCount: 3,
        blockData: [
          {
            objective: 'Divide numerator by denominator accurately.',
            teacher_activity: 'Direct instruction showing 3/4 = 0.75 and 1/2 = 0.5.',
            student_activity: 'Write decimal values on mini-whiteboards.',
            resources: 'Notebooks, whiteboards.',
            assessment: 'Exit ticket #1: Convert 5/8.',
          },
          {
            objective: 'Classify decimals as terminating or repeating.',
            teacher_activity: 'Demonstrate bar notation with 1/3 and 2/3.',
            student_activity: 'Sort 6 fractions into T-chart.',
            resources: 'Sorting handout.',
            assessment: 'Thumbs up/down check.',
          },
          {
            objective: 'Apply conversions in real-world recipe measurement.',
            teacher_activity: 'Guide recipe scaling scenario.',
            student_activity: 'Work in pairs on recipe calculations.',
            resources: 'Task cards.',
            assessment: 'Turn in group task solution.',
          },
        ],
      },
      {
        day: 'Tuesday',
        className: 'Grade 6',
        section: 'Room 102',
        target: 'Add and subtract decimals with unequal place values.',
        activities: 'Place-value grid alignment exercise.',
        blockCount: 3,
        blockData: [
          {
            objective: 'Line up decimal points vertically before adding or subtracting.',
            teacher_activity: 'Model vertical alignment with zeroes.',
            student_activity: 'Align 4 problems on grid paper.',
            resources: 'Grid sheets.',
            assessment: 'Notebook check.',
          },
          {
            objective: 'Perform regrouping across decimal places.',
            teacher_activity: 'Model regrouping from hundredths to tenths.',
            student_activity: 'Solve 3 practice problems.',
            resources: 'Practice book.',
            assessment: 'Problem 3 verification.',
          },
          {
            objective: 'Calculate remaining budget balance.',
            teacher_activity: 'Present $20 budget scenario.',
            student_activity: 'Calculate subtotal and change.',
            resources: 'Receipt simulation.',
            assessment: 'Change calculation exit slip.',
          },
        ],
      },
    ];

    recordsDef.forEach((def, rIdx) => {
      const recordId = `rec_sample_${rIdx + 1}`;
      const blocks: Block[] = [];

      for (let b = 1; b <= def.blockCount; b++) {
        const blockId = `blk_${recordId}_${b}`;
        const bData = def.blockData[b - 1] || {};
        const fields: BlockField[] = defaultTmpl.fields.map(f => ({
          id: `fld_${blockId}_${f.key}`,
          blockId,
          fieldKey: f.key,
          fieldLabel: f.label,
          fieldValue: (bData as Record<string, string>)[f.key] || '',
          fieldOrder: f.order,
          fieldType: f.type,
          isRequired: f.isRequired,
          placeholder: f.placeholder,
          createdAt: now,
          updatedAt: now,
        }));

        blocks.push({
          id: blockId,
          lessonRecordId: recordId,
          blockNumber: b,
          templateId: defaultTmpl.id,
          orderIndex: b,
          fields,
          createdAt: now,
          updatedAt: now,
        });
      }

      this.data.lessonRecords.push({
        id: recordId,
        weekId: week.id,
        userId,
        className: def.className,
        section: def.section,
        day: def.day,
        target: def.target,
        activities: def.activities,
        status: 'ready',
        completed: false,
        orderIndex: rIdx + 1,
        blocks,
        automationStatus: 'not_started',
        createdAt: now,
        updatedAt: now,
      });
    });

    this.persist();
    return week;
  }
}

export const db = new Database();
