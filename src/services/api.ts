/**
 * LessonFlow Frontend API Client
 * 
 * Provides typed methods for all backend endpoints.
 * Automatically injects active user headers.
 */

import {
  User,
  TeacherProfile,
  Week,
  LessonRecord,
  BlockTemplate,
  ClipboardItem,
  WeeklyProgressDTO,
  ExtensionLessonRecordDTO,
  ParsedWeeklyImport,
  ImportRecord,
  ImportSourceType,
  RecordStatus,
  AutomationStatus,
} from '../types/index.js';

class ApiClient {
  private activeUserId: string = 'usr_default';

  public setActiveUserId(userId: string) {
    this.activeUserId = userId;
  }

  public getActiveUserId(): string {
    return this.activeUserId;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (this.activeUserId) {
      headers.set('x-user-id', this.activeUserId);
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `API Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
      } catch (_) {
        // use default error message
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  // --- Auth / User / Profile ---

  public async getMe(): Promise<{ user: User; profile?: TeacherProfile }> {
    return this.request('/api/me');
  }

  public async listUsers(): Promise<Array<{ id: string; name: string; email: string }>> {
    return this.request('/api/users');
  }

  public async createUser(name: string, email: string): Promise<User> {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    });
  }

  public async updateProfile(profile: Partial<TeacherProfile>): Promise<TeacherProfile> {
    return this.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  }

  // --- Weeks ---

  public async listWeeks(): Promise<Week[]> {
    return this.request('/api/weeks');
  }

  public async createWeek(data: { weekNumber: string; title: string; startDate?: string; endDate?: string }): Promise<Week> {
    return this.request('/api/weeks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async getWeek(id: string): Promise<Week> {
    return this.request(`/api/weeks/${id}`);
  }

  public async updateWeek(id: string, updates: Partial<Week>): Promise<Week> {
    return this.request(`/api/weeks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public async deleteWeek(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/weeks/${id}`, {
      method: 'DELETE',
    });
  }

  public async duplicateWeek(id: string, newWeekNumber?: string, newTitle?: string): Promise<Week> {
    return this.request(`/api/weeks/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ newWeekNumber, newTitle }),
    });
  }

  public async getWeeklyProgress(weekId: string): Promise<WeeklyProgressDTO> {
    return this.request(`/api/weeks/${weekId}/progress`);
  }

  // --- Lesson Records ---

  public async listLessonRecords(
    weekId: string,
    filters?: { day?: string; className?: string; status?: string }
  ): Promise<LessonRecord[]> {
    const params = new URLSearchParams();
    if (filters?.day && filters.day !== 'All') params.set('day', filters.day);
    if (filters?.className) params.set('className', filters.className);
    if (filters?.status && filters.status !== 'All') params.set('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/weeks/${weekId}/lesson-records${query}`);
  }

  public async getLessonRecord(id: string): Promise<LessonRecord> {
    return this.request(`/api/lesson-records/${id}`);
  }

  public async createLessonRecord(
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
    return this.request(`/api/weeks/${weekId}/lesson-records`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateLessonRecord(id: string, updates: Partial<LessonRecord>): Promise<LessonRecord> {
    return this.request(`/api/lesson-records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public async deleteLessonRecord(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/lesson-records/${id}`, {
      method: 'DELETE',
    });
  }

  public async duplicateLessonRecord(
    id: string,
    overrides?: { day?: string; className?: string; section?: string }
  ): Promise<LessonRecord> {
    return this.request(`/api/lesson-records/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify(overrides || {}),
    });
  }

  public async updateRecordStatus(id: string, status: RecordStatus, completed: boolean): Promise<LessonRecord> {
    return this.request(`/api/lesson-records/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, completed }),
    });
  }

  // --- Dynamic Block Builder ---

  public async createBlocks(recordId: string, count: number, templateId?: string): Promise<LessonRecord> {
    return this.request(`/api/lesson-records/${recordId}/blocks`, {
      method: 'POST',
      body: JSON.stringify({ count, templateId }),
    });
  }

  public async duplicateBlock(recordId: string, blockId: string): Promise<LessonRecord> {
    return this.request(`/api/lesson-records/${recordId}/blocks/${blockId}/duplicate`, {
      method: 'POST',
    });
  }

  public async deleteBlock(recordId: string, blockId: string): Promise<LessonRecord> {
    return this.request(`/api/lesson-records/${recordId}/blocks/${blockId}`, {
      method: 'DELETE',
    });
  }

  public async reorderBlocks(recordId: string, blockIds: string[]): Promise<LessonRecord> {
    return this.request(`/api/lesson-records/${recordId}/reorder-blocks`, {
      method: 'POST',
      body: JSON.stringify({ blockIds }),
    });
  }

  public async applyTemplateToBlock(recordId: string, blockId: string, templateId: string): Promise<LessonRecord> {
    return this.request(`/api/lesson-records/${recordId}/blocks/${blockId}/apply-template`, {
      method: 'POST',
      body: JSON.stringify({ templateId }),
    });
  }

  // --- Templates ---

  public async listTemplates(): Promise<BlockTemplate[]> {
    return this.request('/api/templates');
  }

  public async createTemplate(data: Omit<BlockTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<BlockTemplate> {
    return this.request('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateTemplate(id: string, updates: Partial<BlockTemplate>): Promise<BlockTemplate> {
    return this.request(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public async deleteTemplate(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/templates/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Clipboard Gallery ---

  public async listClipboard(filters?: { weekId?: string; lessonRecordId?: string; category?: string }): Promise<ClipboardItem[]> {
    const params = new URLSearchParams();
    if (filters?.weekId) params.set('weekId', filters.weekId);
    if (filters?.lessonRecordId) params.set('lessonRecordId', filters.lessonRecordId);
    if (filters?.category) params.set('category', filters.category);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/clipboard${query}`);
  }

  public async createClipboardItem(data: {
    plainText: string;
    label: string;
    category?: ClipboardItem['category'];
    weekId?: string;
    lessonRecordId?: string;
    className?: string;
    section?: string;
    day?: string;
  }): Promise<ClipboardItem> {
    return this.request('/api/clipboard', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateClipboardItem(id: string, updates: Partial<ClipboardItem>): Promise<ClipboardItem> {
    return this.request(`/api/clipboard/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public async deleteClipboardItem(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/clipboard/${id}`, {
      method: 'DELETE',
    });
  }

  public async cleanText(rawText: string): Promise<{ cleanText: string }> {
    return this.request('/api/clipboard/clean', {
      method: 'POST',
      body: JSON.stringify({ rawText }),
    });
  }

  public async extractRecordToClipboard(recordId: string): Promise<ClipboardItem[]> {
    return this.request(`/api/lesson-records/${recordId}/extract-clipboard`, {
      method: 'POST',
    });
  }

  // --- Document & Shared Link Import Workflow ---

  public async inspectUrl(url: string): Promise<{
    valid: boolean;
    sourceType: ImportSourceType | 'unknown';
    docId?: string;
    isPublished?: boolean;
    title?: string;
    accessible?: boolean;
    error?: string;
    hint?: string;
  }> {
    return this.request('/api/import/inspect-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  public async parseImport(params: {
    url?: string;
    sourceType?: ImportSourceType;
    pdfBase64?: string;
    rawText?: string;
    fileName?: string;
  }): Promise<{
    success: boolean;
    parsed: ParsedWeeklyImport;
    extractedDoc?: {
      title: string;
      sourceType: ImportSourceType;
      sourceUrl?: string;
      stats?: any;
    };
    error?: string;
    errorType?: string;
    hint?: string;
  }> {
    return this.request('/api/import/parse', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  public async commitImport(importData: ParsedWeeklyImport): Promise<{ success: boolean; week: Week; recordsCount: number }> {
    return this.request('/api/import/commit', {
      method: 'POST',
      body: JSON.stringify({ importData }),
    });
  }

  public async reimport(importId: string): Promise<{
    success: boolean;
    parsed: ParsedWeeklyImport;
    extractedDoc?: any;
    error?: string;
  }> {
    return this.request(`/api/import/reimport/${importId}`, {
      method: 'POST',
    });
  }

  public async listImportHistory(): Promise<ImportRecord[]> {
    return this.request('/api/import/history');
  }

  public async deleteImportHistory(importId: string): Promise<{ success: boolean }> {
    return this.request(`/api/import/history/${importId}`, {
      method: 'DELETE',
    });
  }

  // --- Chrome Extension Simulator ---

  public async getExtensionRecordDTO(recordId: string): Promise<ExtensionLessonRecordDTO> {
    return this.request(`/api/extension/records/${recordId}`);
  }

  public async updateExtensionStatus(recordId: string, automationStatus: AutomationStatus, automationError?: string): Promise<LessonRecord> {
    return this.request(`/api/extension/records/${recordId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ automationStatus, automationError }),
    });
  }

  // --- Demo Seeder ---

  public async seedDemoData(): Promise<{ success: boolean; weeks: Week[] }> {
    return this.request('/api/demo/seed', {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
