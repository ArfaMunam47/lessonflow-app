/**
 * LessonFlow Data Persistence Layer
 * 
 * Provides atomic, user-scoped persistence for all entities:
 * Users, Teacher Profiles, Weeks, Lesson Records, Blocks, Fields,
 * Templates, and Clipboard items.
 * 
 * Uses atomic file write (write to temp file then rename) to prevent
 * corruption, with in-memory caching for sub-millisecond query performance.
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
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'lessonflow.json');

const DEFAULT_TEMPLATES: Array<Omit<BlockTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'Standard 5-Field Lesson Block',
    description: 'The standard school lesson-plan block: Objective, Teacher Activity, Student Activity, Resources, and Assessment.',
    isDefault: true,
    fields: [
      { key: 'objective', label: 'Objective', type: 'textarea', order: 1, isRequired: true, placeholder: 'e.g., Students will be able to convert mixed fractions to decimals.' },
      { key: 'teacher_activity', label: 'Teacher Activity', type: 'textarea', order: 2, isRequired: true, placeholder: 'e.g., Direct instruction on dividing numerator by denominator.' },
      { key: 'student_activity', label: 'Student Activity', type: 'textarea', order: 3, isRequired: true, placeholder: 'e.g., Solve 5 paired problems on whiteboards.' },
      { key: 'resources', label: 'Resources / Materials', type: 'text', order: 4, isRequired: false, placeholder: 'e.g., Math Workbook p.42, dry-erase markers.' },
      { key: 'assessment', label: 'Assessment / Check for Understanding', type: 'textarea', order: 5, isRequired: false, placeholder: 'e.g., Exit ticket problem #3.' },
    ],
  },
  {
    name: 'Direct Instruction & Modeling',
    description: 'Focuses on the I Do, We Do, You Do teaching sequence.',
    isDefault: false,
    fields: [
      { key: 'hook_warmup', label: 'Hook / Warm-up', type: 'textarea', order: 1, isRequired: true, placeholder: 'e.g., Quick 3-minute review question.' },
      { key: 'modeling_i_do', label: 'Teacher Modeling (I Do)', type: 'textarea', order: 2, isRequired: true, placeholder: 'e.g., Step-by-step example on the smartboard.' },
      { key: 'guided_we_do', label: 'Guided Practice (We Do)', type: 'textarea', order: 3, isRequired: true, placeholder: 'e.g., Class works together on example #2.' },
      { key: 'independent_you_do', label: 'Independent Practice (You Do)', type: 'textarea', order: 4, isRequired: true, placeholder: 'e.g., Complete worksheet exercises 1-8.' },
    ],
  },
  {
    name: 'Station / Workshop Rotation',
    description: 'Structure for small group rotations and lab stations.',
    isDefault: false,
    fields: [
      { key: 'station_goal', label: 'Station Goal', type: 'textarea', order: 1, isRequired: true, placeholder: 'e.g., Hands-on measurement verification.' },
      { key: 'materials_needed', label: 'Materials Needed', type: 'text', order: 2, isRequired: false, placeholder: 'e.g., Rulers, weights, graduated cylinders.' },
      { key: 'task_instructions', label: 'Task Instructions', type: 'textarea', order: 3, isRequired: true, placeholder: 'e.g., Measure 3 sample objects and record mass.' },
      { key: 'differentiation', label: 'Differentiation / Support', type: 'text', order: 4, isRequired: false, placeholder: 'e.g., Scaffold sheet for Tier 2 students.' },
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
        // Ensure all arrays exist
        this.data.users = this.data.users || [];
        this.data.profiles = this.data.profiles || [];
        this.data.weeks = this.data.weeks || [];
        this.data.lessonRecords = this.data.lessonRecords || [];
        this.data.templates = this.data.templates || [];
        this.data.clipboardItems = this.data.clipboardItems || [];
      } catch (err) {
        console.error('Failed to parse database file, resetting to empty:', err);
      }
    }

    // Ensure default primary user exists
    if (this.data.users.length === 0) {
      this.seedInitialUserAndTemplates();
    }
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

  private seedInitialUserAndTemplates() {
    const now = new Date().toISOString();
    const defaultUser: User = {
      id: 'usr_sarah_parker',
      name: 'Sarah Parker',
      email: 'sarah.parker@school.edu',
      apiToken: 'lf_tok_sarah_7f8a9b2c3d4e5f6',
      createdAt: now,
      updatedAt: now,
    };

    const defaultProfile: TeacherProfile = {
      id: 'prof_sarah_parker',
      userId: defaultUser.id,
      teacherName: 'Sarah Parker',
      defaultSection: 'Blue',
      defaultClass: '6A',
      schoolName: 'Lincoln Middle School',
      createdAt: now,
      updatedAt: now,
    };

    const seededTemplates: BlockTemplate[] = DEFAULT_TEMPLATES.map((tmpl, idx) => ({
      ...tmpl,
      id: `tmpl_default_${idx + 1}`,
      userId: defaultUser.id,
      createdAt: now,
      updatedAt: now,
    }));

    defaultProfile.defaultTemplateId = seededTemplates[0].id;

    this.data.users.push(defaultUser);
    this.data.profiles.push(defaultProfile);
    this.data.templates.push(...seededTemplates);

    this.seedDemoWeek(defaultUser.id, seededTemplates[0].id);
    this.persist();
  }

  public seedDemoWeek(userId: string, templateId?: string) {
    const now = new Date().toISOString();
    const weekId = `week_demo_8`;

    // Remove any existing demo week
    this.data.weeks = this.data.weeks.filter(w => w.id !== weekId);
    this.data.lessonRecords = this.data.lessonRecords.filter(r => r.weekId !== weekId);
    this.data.clipboardItems = this.data.clipboardItems.filter(c => c.weekId !== weekId);

    const week: Week = {
      id: weekId,
      userId,
      weekNumber: 'Week 8',
      title: 'Fractions, Decimals & Geometry Fundamentals',
      startDate: '2026-10-12',
      endDate: '2026-10-16',
      status: 'in_progress',
      createdAt: now,
      updatedAt: now,
    };

    this.data.weeks.push(week);

    const tmpl = this.data.templates.find(t => t.id === templateId) || this.data.templates[0];

    const recordsDef = [
      {
        day: 'Monday',
        className: '6A',
        section: 'Blue',
        target: 'Students will understand how to convert proper fractions to decimals using long division.',
        activities: '1. Warm-up fractions drill\n2. Teacher demonstration of numerator divided by denominator\n3. Paired whiteboard calculations\n4. Exit slip evaluation',
        status: 'completed' as RecordStatus,
        completed: true,
        blockCount: 3,
        blockData: [
          {
            objective: 'Master dividing numerator by denominator with no remainder.',
            teacher_activity: 'Direct instruction showing 3/4 = 0.75 and 1/2 = 0.5 on interactive board.',
            student_activity: 'Write decimal equivalents on individual mini-whiteboards with partner confirmation.',
            resources: 'Math Notebooks, dry-erase whiteboards, grid paper.',
            assessment: 'Exit ticket #1: Convert 5/8 to a decimal.',
          },
          {
            objective: 'Recognize terminating versus repeating decimals.',
            teacher_activity: 'Introduce repeating notation (bar notation) with 1/3 and 2/3 examples.',
            student_activity: 'Categorize 6 decimal fractions as terminating or repeating.',
            resources: 'Classification T-Chart handout.',
            assessment: 'Thumbs up/down check for understanding.',
          },
          {
            objective: 'Apply fraction-to-decimal conversion in real-world recipe problems.',
            teacher_activity: 'Guide recipe scaling scenario requiring 3/4 cup converted to decimal measurement.',
            student_activity: 'Calculate ingredient measurements in teams.',
            resources: 'Recipe Task Cards.',
            assessment: 'Turn in group task card solution.',
          },
        ],
      },
      {
        day: 'Monday',
        className: '6B',
        section: 'Red',
        target: 'Students will convert fractions to decimals and compare decimal magnitudes on a number line.',
        activities: 'Group line-up activity with decimal cards, workbook exercises 4A through 4D.',
        status: 'ready' as RecordStatus,
        completed: true,
        blockCount: 3,
        blockData: [
          {
            objective: 'Plot 0.25, 0.5, 0.75 accurately on an open number line.',
            teacher_activity: 'Demonstrate benchmark fractions on floor number line.',
            student_activity: 'Place student index cards in correct sequential positions.',
            resources: 'Number Line tape, student index cards.',
            assessment: 'Observation checklist during placement.',
          },
          {
            objective: 'Compare decimals using greater than, less than, and equal signs.',
            teacher_activity: 'Review place-value comparison method (tenths vs hundredths).',
            student_activity: 'Complete paired inequality worksheet p. 34.',
            resources: 'Workbook Chapter 4.',
            assessment: 'Score 4-question warm down.',
          },
          {
            objective: 'Independent practice converting mixed numbers to decimals.',
            teacher_activity: 'Circulate to provide Tier 2 scaffolding.',
            student_activity: 'Work through problem set 10 to 18 independently.',
            resources: 'Math practice booklet.',
            assessment: 'Teacher stamp on notebook check.',
          },
        ],
      },
      {
        day: 'Tuesday',
        className: '6A',
        section: 'Blue',
        target: 'Students will add and subtract decimals with unequal decimal places.',
        activities: 'Place-value grid alignment exercise, grocery receipt budgeting simulation.',
        status: 'in_progress' as RecordStatus,
        completed: false,
        blockCount: 4,
        blockData: [
          {
            objective: 'Line up decimal points vertically before adding or subtracting.',
            teacher_activity: 'Emphasize place value zero placeholders for trailing digits.',
            student_activity: 'Rewrite 5 horizontal addition problems into vertical grid format.',
            resources: 'Grid paper sheets.',
            assessment: 'Visual check of student notebooks.',
          },
          {
            objective: 'Add multi-digit decimals including regrouping across place values.',
            teacher_activity: 'Model regrouping from hundredths to tenths with color-coded markers.',
            student_activity: 'Solve 4 guided calculation problems in pairs.',
            resources: 'Color dry-erase markers.',
            assessment: 'Partner check protocol.',
          },
          {
            objective: 'Calculate total cost and change from grocery receipt simulation.',
            teacher_activity: 'Provide receipt scenario: $20 budget, 4 items with decimal pricing.',
            student_activity: 'Calculate subtotal and change remaining from $20.00.',
            resources: 'Sample grocery store receipts.',
            assessment: 'Accurate change calculation submission.',
          },
          {
            objective: 'Identify and correct common misconceptions in decimal subtraction.',
            teacher_activity: 'Present error analysis slide with misaligned decimal point.',
            student_activity: 'Write brief explanation of the error and provide corrected answer.',
            resources: 'Slide projection.',
            assessment: 'Exit slip explanation.',
          },
        ],
      },
      {
        day: 'Wednesday',
        className: '7A',
        section: 'Green',
        target: 'Students will solve two-step linear equations using inverse operations.',
        activities: 'Balance scale visualization, step-by-step inverse operation practice, group relay.',
        status: 'draft' as RecordStatus,
        completed: false,
        blockCount: 3,
        blockData: [
          {
            objective: 'Isolate variable terms by applying addition or subtraction property of equality.',
            teacher_activity: 'Show pan balance interactive applet with 2x + 3 = 11.',
            student_activity: 'Draw balance models and subtract 3 from both sides.',
            resources: 'Digital balance scale simulator.',
            assessment: 'Immediate response via student response cards.',
          },
          {
            objective: 'Apply multiplication or division to isolate single variable.',
            teacher_activity: 'Demonstrate dividing both sides by coefficient of x.',
            student_activity: 'Solve step 2 of equation and check by substitution.',
            resources: 'Equation solver guide.',
            assessment: 'Notebook verification check.',
          },
          {
            objective: 'Collaborative equation solving relay in teams of four.',
            teacher_activity: 'Moderate team relay and monitor pacing.',
            student_activity: 'Each student executes one step and passes paper to next teammate.',
            resources: 'Relay problem sheets.',
            assessment: 'Final equation correctness score.',
          },
        ],
      },
    ];

    recordsDef.forEach((def, rIdx) => {
      const recordId = `rec_demo_${rIdx + 1}`;
      const blocks: Block[] = [];

      for (let b = 1; b <= def.blockCount; b++) {
        const blockId = `blk_${recordId}_${b}`;
        const bData = def.blockData[b - 1] || {};
        const fields: BlockField[] = (tmpl ? tmpl.fields : []).map(f => ({
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
          templateId: tmpl?.id,
          orderIndex: b,
          fields,
          createdAt: now,
          updatedAt: now,
        });
      }

      const record: LessonRecord = {
        id: recordId,
        weekId,
        userId,
        className: def.className,
        section: def.section,
        day: def.day,
        target: def.target,
        activities: def.activities,
        status: def.status,
        completed: def.completed,
        orderIndex: rIdx + 1,
        blocks,
        automationStatus: def.completed ? 'completed' : 'not_started',
        createdAt: now,
        updatedAt: now,
      };

      this.data.lessonRecords.push(record);

      // Create initial clipboard items from this record for demonstration
      this.createClipboardItemFromRecord(record, userId);
    });
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
      name,
      email,
      apiToken: `lf_tok_${crypto.randomBytes(16).toString('hex')}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.users.push(user);

    const profile: TeacherProfile = {
      id: `prof_${crypto.randomUUID()}`,
      userId: id,
      teacherName: name,
      defaultSection: 'A',
      defaultClass: 'Grade 6',
      createdAt: now,
      updatedAt: now,
    };
    this.data.profiles.push(profile);

    // Copy default templates for the user
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
        defaultSection: updates.defaultSection || 'A',
        createdAt: now,
        updatedAt: now,
      };
      this.data.profiles.push(profile);
    }

    Object.assign(profile, updates, { updatedAt: now });
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
      title: cleanPlainText(weekData.title) || 'Lesson Plans',
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
    // Delete associated lesson records and clipboard items
    this.data.lessonRecords = this.data.lessonRecords.filter(r => r.weekId !== id);
    this.data.clipboardItems = this.data.clipboardItems.filter(c => c.weekId !== id);

    await this.persist();
    return true;
  }

  /**
   * Duplicates an entire week along with all lesson records, blocks, and fields.
   * Generates new stable IDs for everything, ensuring zero mutation of original.
   */
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

    // Duplicate all lesson records belonging to this week
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

  public listLessonRecords(userId: string, weekId: string, filters?: { day?: string; className?: string; status?: string }): LessonRecord[] {
    return this.data.lessonRecords
      .filter(r => {
        if (r.userId !== userId || r.weekId !== weekId) return false;
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

    // Get highest orderIndex in the week
    const existing = this.data.lessonRecords.filter(r => r.weekId === weekId);
    const orderIndex = existing.length > 0 ? Math.max(...existing.map(e => e.orderIndex)) + 1 : 1;

    // Resolve template
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
      className: cleanPlainText(data.className) || 'New Class',
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
      // Clean and sanitize any field values inside incoming blocks
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

  /**
   * Duplicates a lesson record, copying all blocks and fields with new stable IDs.
   * Can optionally override target day or class.
   */
  public async duplicateLessonRecord(
    userId: string,
    sourceId: string,
    overrides?: { day?: string; className?: string; section?: string }
  ): Promise<LessonRecord | null> {
    const source = this.getLessonRecord(userId, sourceId);
    if (!source) return null;

    const now = new Date().toISOString();
    const newRecordId = `rec_${crypto.randomUUID()}`;

    // Calculate orderIndex
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

  /**
   * Batch creates N blocks on a lesson record in one operation.
   * Uses template fields or creates empty fields.
   */
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

  /**
   * Duplicates a single block inside a lesson record, copying all its fields with new IDs.
   */
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

    // Re-index block numbers & order indices
    record.blocks.forEach((b, idx) => {
      b.blockNumber = idx + 1;
      b.orderIndex = idx + 1;
    });

    record.updatedAt = now;
    await this.persist();
    return record;
  }

  /**
   * Deletes a single block and re-indexes remaining blocks.
   */
  public async deleteBlock(userId: string, lessonRecordId: string, blockId: string): Promise<LessonRecord | null> {
    const record = this.getLessonRecord(userId, lessonRecordId);
    if (!record) return null;

    const initialLength = record.blocks.length;
    record.blocks = record.blocks.filter(b => b.id !== blockId);
    if (record.blocks.length === initialLength) return null;

    // Re-index remaining blocks
    record.blocks.forEach((b, idx) => {
      b.blockNumber = idx + 1;
      b.orderIndex = idx + 1;
    });

    record.updatedAt = new Date().toISOString();
    await this.persist();
    return record;
  }

  /**
   * Reorders blocks in a lesson record according to a list of block IDs.
   */
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

    // Append any remaining blocks not in the input list
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

  /**
   * Applies a template structure to an existing block without destroying existing field values if keys match.
   */
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
    return this.data.templates.filter(t => t.userId === userId || t.userId === 'usr_sarah_parker');
  }

  public getTemplate(userId: string, id: string): BlockTemplate | undefined {
    return this.data.templates.find(t => t.id === id && (t.userId === userId || t.userId === 'usr_sarah_parker'));
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
      // Unmark other defaults for this user
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
    if (updates.className !== undefined) item.className = updates.className ? cleanPlainText(updates.className) : undefined;
    if (updates.section !== undefined) item.section = updates.section ? cleanPlainText(updates.section) : undefined;
    if (updates.day !== undefined) item.day = updates.day ? cleanPlainText(updates.day) : undefined;

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

  /**
   * Helper that extracts structured fields from a LessonRecord into the clipboard gallery.
   */
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
      // Day grouping
      if (!byDay[r.day]) {
        byDay[r.day] = { total: 0, completed: 0 };
      }
      byDay[r.day].total += 1;
      if (r.completed || r.status === 'completed') {
        byDay[r.day].completed += 1;
      }

      // Status grouping
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

  /**
   * Builds the clean structured DTO that the Chrome Extension will consume
   * to automatically fill the school website.
   */
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
}

export const db = new Database();
