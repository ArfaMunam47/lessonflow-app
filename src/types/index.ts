/**
 * LessonFlow Type Definitions & Data Contracts
 * 
 * Provides types for Users, Teacher Profiles, Weeks, Lesson Records,
 * Dynamic Blocks, Configurable Fields, Templates, Clipboard items,
 * and Multi-Lesson PDF Import Records.
 */

export type FieldType = 'text' | 'textarea' | 'select' | 'checkbox';

export type ImportSourceType =
  | 'google_doc'
  | 'pdf'
  | 'plain_text'
  | 'pasted_text'
  | 'word'
  | 'spreadsheet';

export type RecordStatus = 'draft' | 'in_progress' | 'ready' | 'completed';

export type AutomationStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';

export interface User {
  id: string;
  name: string;
  email: string;
  apiToken: string; // Token for future Chrome Extension authentication
  createdAt: string;
  updatedAt: string;
}

export interface TeacherProfile {
  id: string;
  userId: string;
  teacherName: string;
  defaultSection?: string;
  defaultClass?: string;
  schoolName?: string;
  defaultTemplateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Week {
  id: string;
  userId: string;
  weekNumber: string; // e.g. "Week 8" or "8"
  title: string;       // e.g. "Fractions and Decimal Operations"
  startDate?: string;
  endDate?: string;
  status: 'draft' | 'in_progress' | 'ready' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface BlockFieldTemplate {
  key: string;
  label: string;
  type: FieldType;
  order: number;
  isRequired: boolean;
  placeholder?: string;
  options?: string[];
}

export interface BlockTemplate {
  id: string;
  userId: string;
  name: string;
  description: string;
  isDefault?: boolean;
  fields: BlockFieldTemplate[];
  createdAt: string;
  updatedAt: string;
}

export interface BlockField {
  id: string;
  blockId: string;
  fieldKey: string;
  fieldLabel: string;
  fieldValue: string;
  fieldOrder: number;
  fieldType: FieldType;
  isRequired: boolean;
  placeholder?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Block {
  id: string;
  lessonRecordId: string;
  blockNumber: number;
  templateId?: string;
  orderIndex: number;
  fields: BlockField[];
  createdAt: string;
  updatedAt: string;
}

export interface LessonRecord {
  id: string;
  weekId: string;
  userId: string;
  className: string;   // e.g. "6A"
  section: string;     // e.g. "Blue"
  day: string;         // e.g. "Monday"
  date?: string;
  target: string;      // e.g. "Students will understand..."
  activities: string;  // e.g. "Students will complete..."
  status: RecordStatus;
  completed: boolean;
  orderIndex: number;
  blocks: Block[];
  
  // Traceability metadata
  sourceImportId?: string;
  sourceFileName?: string;
  sourceUrl?: string;
  sourceType?: ImportSourceType;

  // Future Chrome extension automation tracking fields
  automationStatus?: AutomationStatus;
  automationStartedAt?: string;
  automationCompletedAt?: string;
  automationError?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ClipboardItem {
  id: string;
  userId: string;
  weekId?: string;
  lessonRecordId?: string;
  className?: string;
  section?: string;
  day?: string;
  category: 'target' | 'activities' | 'block_field' | 'general' | 'custom';
  label: string;
  plainText: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImportRecord {
  id: string;
  userId: string;
  fileName: string;
  sourceType: ImportSourceType;
  sourceUrl?: string;
  sourceTitle?: string;
  weekId?: string;
  weekNumber?: string;
  lessonCount: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ParsedBlockDraft {
  blockNumber: number;
  fields: Record<string, string>;
  needsReview?: boolean;
}

export interface ParsedLessonDraft {
  id: string; // temporary draft id for keying
  day: string;
  className: string;
  section?: string;
  date?: string;
  target: string;
  activities: string;
  needsReview?: boolean;
  blocks: ParsedBlockDraft[];
}

export interface ParsedWeeklyImport {
  weekNumber: string;
  weekTitle: string;
  startDate?: string;
  endDate?: string;
  fileName?: string;
  sourceType: ImportSourceType;
  sourceUrl?: string;
  sourceTitle?: string;
  extractedSummary?: {
    headingsCount?: number;
    tablesCount?: number;
    paragraphsCount?: number;
    textLength?: number;
  };
  lessons: ParsedLessonDraft[];
}

/**
 * Clean data contract for the future Chrome Extension.
 */
export interface ExtensionLessonRecordDTO {
  id: string;
  className: string;
  section: string;
  day: string;
  date?: string;
  target: string;
  activities: string;
  totalBlocks: number;
  blocks: Array<{
    id: string;
    blockNumber: number;
    orderIndex: number;
    fields: Array<{
      key: string;
      label: string;
      value: string;
      order: number;
      type: FieldType;
      isRequired: boolean;
    }>;
  }>;
  copyQueue: Array<{
    id: string;
    label: string;
    category: string;
    plainText: string;
    orderIndex: number;
  }>;
}

export interface WeeklyProgressDTO {
  weekId: string;
  totalRecords: number;
  completedRecords: number;
  percentage: number;
  byDay: Record<string, { total: number; completed: number }>;
  byStatus: Record<RecordStatus, number>;
}
