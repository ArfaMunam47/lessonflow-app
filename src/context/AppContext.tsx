/**
 * LessonFlow Global Application Context
 * 
 * Simplified, teacher-focused state management for:
 * - Active view navigation (Dashboard, Lesson Plans, Import, Clipboard, Templates, Settings)
 * - Weekly lesson plans & lesson records
 * - Multi-lesson PDF / Document import with review workflow
 * - Dynamic block builder & configurable templates
 * - Plain-text clipboard gallery
 * - Debounced autosave with subtle indicator
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  TeacherProfile,
  Week,
  LessonRecord,
  BlockTemplate,
  ClipboardItem,
  ImportRecord,
  ParsedWeeklyImport,
  WeeklyProgressDTO,
  RecordStatus,
} from '../types/index.js';
import { api } from '../services/api.js';
import { cleanPlainText } from '../utils/textCleaner.js';

export type ActiveNavView = 'dashboard' | 'lessons' | 'import' | 'clipboard' | 'templates' | 'history' | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  text: string;
}

interface AppContextType {
  currentUser: User | null;
  teacherProfile: TeacherProfile | null;
  weeks: Week[];
  selectedWeekId: string | null;
  selectedWeek: Week | null;
  records: LessonRecord[];
  selectedRecordId: string | null;
  selectedRecord: LessonRecord | null;
  templates: BlockTemplate[];
  clipboardItems: ClipboardItem[];
  importHistory: ImportRecord[];
  importDraft: ParsedWeeklyImport | null;
  progress: WeeklyProgressDTO | null;
  activeView: ActiveNavView;
  pendingImportUrl: string | null;
  filterDay: string;
  searchQuery: string;
  saveStatus: 'saved' | 'saving' | 'error';
  loading: boolean;
  toasts: ToastMessage[];

  // Navigation & View Setters
  setActiveView: (view: ActiveNavView) => void;
  initiateImportFromUrl: (url: string) => void;
  clearPendingImportUrl: () => void;
  setFilterDay: (day: string) => void;
  setSearchQuery: (query: string) => void;
  setImportDraft: (draft: ParsedWeeklyImport | null) => void;
  selectWeek: (weekId: string) => Promise<void>;
  selectRecord: (recordId: string | null) => void;
  openLessonEditor: (weekId: string, recordId: string) => Promise<void>;
  nextRecord: () => void;
  prevRecord: () => void;

  // Week Actions
  createWeek: (weekNumber: string, title: string, startDate?: string, endDate?: string) => Promise<Week>;
  duplicateWeek: (weekId: string, newWeekNumber?: string, newTitle?: string) => Promise<void>;
  updateWeekDetails: (weekId: string, updates: Partial<Week>) => Promise<void>;
  deleteWeek: (weekId: string) => Promise<void>;

  // Import Actions
  commitImportDraft: (draft: ParsedWeeklyImport) => Promise<Week>;
  refreshImportHistory: () => Promise<void>;
  deleteImportHistoryItem: (importId: string) => Promise<void>;

  // Lesson Record Actions
  createRecord: (data: {
    className: string;
    section?: string;
    day: string;
    target?: string;
    activities?: string;
    blockCount?: number;
    templateId?: string;
  }) => Promise<LessonRecord>;
  duplicateRecord: (recordId: string, overrides?: { day?: string; className?: string; section?: string }) => Promise<void>;
  updateRecord: (updates: Partial<LessonRecord>, immediate?: boolean) => void;
  deleteRecord: (recordId: string) => Promise<void>;
  toggleRecordCompleted: (recordId: string) => Promise<void>;
  setRecordStatus: (recordId: string, status: RecordStatus) => Promise<void>;

  // Block Actions
  createBlocks: (count: number, templateId?: string) => Promise<void>;
  duplicateBlock: (blockId: string) => Promise<void>;
  deleteBlock: (blockId: string) => Promise<void>;
  reorderBlocks: (orderedBlockIds: string[]) => Promise<void>;
  applyTemplateToBlock: (blockId: string, templateId: string) => Promise<void>;

  // Clipboard Actions
  copyToSystemClipboard: (text: string, label?: string) => Promise<void>;
  addClipboardItem: (text: string, label: string, category?: ClipboardItem['category']) => Promise<void>;
  deleteClipboardItem: (id: string) => Promise<void>;
  extractRecordToClipboard: (recordId: string) => Promise<void>;

  // Template Actions
  createTemplate: (data: Omit<BlockTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTemplate: (id: string, updates: Partial<BlockTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  // Profile & Testing Demo
  updateTeacherProfile: (profile: Partial<TeacherProfile>) => Promise<void>;
  loadDemoData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  dismissToast: (id: string) => void;
  showToast: (text: string, type?: ToastMessage['type']) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [records, setRecords] = useState<LessonRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<BlockTemplate[]>([]);
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [importDraft, setImportDraft] = useState<ParsedWeeklyImport | null>(null);
  const [progress, setProgress] = useState<WeeklyProgressDTO | null>(null);

  const [activeView, setActiveView] = useState<ActiveNavView>('dashboard');
  const [pendingImportUrl, setPendingImportUrl] = useState<string | null>(null);
  const [filterDay, setFilterDay] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Partial<LessonRecord> | null>(null);

  const showToast = useCallback((text: string, type: ToastMessage['type'] = 'success') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const initiateImportFromUrl = useCallback((url: string) => {
    setPendingImportUrl(url);
    setActiveView('import');
  }, []);

  const clearPendingImportUrl = useCallback(() => {
    setPendingImportUrl(null);
  }, []);

  // Fetch initial profile, weeks, templates, clipboard, and import history
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, weekList, tmplList, clipList, history] = await Promise.all([
        api.getMe(),
        api.listWeeks(),
        api.listTemplates(),
        api.listClipboard(),
        api.listImportHistory(),
      ]);

      setCurrentUser(meRes.user);
      setTeacherProfile(meRes.profile || null);
      setWeeks(weekList);
      setTemplates(tmplList);
      setClipboardItems(clipList);
      setImportHistory(history);

      if (weekList.length > 0) {
        const initialWeek = weekList[0];
        setSelectedWeekId(initialWeek.id);
        const [recList, prog] = await Promise.all([
          api.listLessonRecords(initialWeek.id),
          api.getWeeklyProgress(initialWeek.id),
        ]);
        setRecords(recList);
        setProgress(prog);
        if (recList.length > 0) {
          setSelectedRecordId(recList[0].id);
        }
      } else {
        setSelectedWeekId(null);
        setRecords([]);
        setSelectedRecordId(null);
        setProgress(null);
      }
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      showToast('Error loading lesson workspace: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const selectWeek = useCallback(async (weekId: string) => {
    try {
      setSelectedWeekId(weekId);
      const [recList, prog] = await Promise.all([
        api.listLessonRecords(weekId),
        api.getWeeklyProgress(weekId),
      ]);
      setRecords(recList);
      setProgress(prog);
      setSelectedRecordId(recList.length > 0 ? recList[0].id : null);
    } catch (err: any) {
      showToast('Failed to load week: ' + err.message, 'error');
    }
  }, [showToast]);

  const openLessonEditor = useCallback(async (weekId: string, recordId: string) => {
    await selectWeek(weekId);
    setSelectedRecordId(recordId);
    setActiveView('lessons');
  }, [selectWeek]);

  const selectedWeek = weeks.find(w => w.id === selectedWeekId) || null;
  const selectedRecord = records.find(r => r.id === selectedRecordId) || null;

  // --- Record Navigation ---

  const filteredRecords = records.filter(r => {
    if (filterDay !== 'All' && r.day.toLowerCase() !== filterDay.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMeta =
        r.className.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q) ||
        r.day.toLowerCase().includes(q) ||
        r.target.toLowerCase().includes(q) ||
        r.activities.toLowerCase().includes(q);
      const matchBlock = r.blocks.some(b =>
        b.fields.some(f => f.fieldValue.toLowerCase().includes(q))
      );
      if (!matchMeta && !matchBlock) return false;
    }
    return true;
  });

  const nextRecord = useCallback(() => {
    if (!selectedRecordId || filteredRecords.length === 0) return;
    const currentIndex = filteredRecords.findIndex(r => r.id === selectedRecordId);
    if (currentIndex !== -1 && currentIndex < filteredRecords.length - 1) {
      setSelectedRecordId(filteredRecords[currentIndex + 1].id);
    }
  }, [selectedRecordId, filteredRecords]);

  const prevRecord = useCallback(() => {
    if (!selectedRecordId || filteredRecords.length === 0) return;
    const currentIndex = filteredRecords.findIndex(r => r.id === selectedRecordId);
    if (currentIndex > 0) {
      setSelectedRecordId(filteredRecords[currentIndex - 1].id);
    }
  }, [selectedRecordId, filteredRecords]);

  // --- Week Operations ---

  const createWeek = useCallback(async (weekNumber: string, title: string, startDate?: string, endDate?: string) => {
    const newWeek = await api.createWeek({ weekNumber, title, startDate, endDate });
    setWeeks(prev => [newWeek, ...prev]);
    await selectWeek(newWeek.id);
    showToast(`Created ${newWeek.weekNumber}`, 'success');
    return newWeek;
  }, [selectWeek, showToast]);

  const duplicateWeek = useCallback(async (weekId: string, newWeekNumber?: string, newTitle?: string) => {
    try {
      setLoading(true);
      const duplicated = await api.duplicateWeek(weekId, newWeekNumber, newTitle);
      const updatedWeeks = await api.listWeeks();
      setWeeks(updatedWeeks);
      await selectWeek(duplicated.id);
      showToast(`Duplicated into ${duplicated.weekNumber}`, 'success');
    } catch (err: any) {
      showToast('Failed to duplicate week: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectWeek, showToast]);

  const updateWeekDetails = useCallback(async (weekId: string, updates: Partial<Week>) => {
    try {
      const updated = await api.updateWeek(weekId, updates);
      setWeeks(prev => prev.map(w => (w.id === weekId ? updated : w)));
      showToast('Week updated', 'success');
    } catch (err: any) {
      showToast('Failed to update week: ' + err.message, 'error');
    }
  }, [showToast]);

  const deleteWeek = useCallback(async (weekId: string) => {
    try {
      await api.deleteWeek(weekId);
      const remaining = weeks.filter(w => w.id !== weekId);
      setWeeks(remaining);
      if (selectedWeekId === weekId) {
        if (remaining.length > 0) {
          await selectWeek(remaining[0].id);
        } else {
          setSelectedWeekId(null);
          setRecords([]);
          setSelectedRecordId(null);
          setProgress(null);
        }
      }
      showToast('Week deleted', 'info');
    } catch (err: any) {
      showToast('Failed to delete week: ' + err.message, 'error');
    }
  }, [weeks, selectedWeekId, selectWeek, showToast]);

  // --- Import Actions ---

  const commitImportDraft = useCallback(async (draft: ParsedWeeklyImport): Promise<Week> => {
    setLoading(true);
    try {
      const res = await api.commitImport(draft);
      const updatedWeeks = await api.listWeeks();
      const updatedHistory = await api.listImportHistory();
      setWeeks(updatedWeeks);
      setImportHistory(updatedHistory);
      setImportDraft(null);

      await selectWeek(res.week.id);
      setActiveView('lessons');
      showToast(`Imported ${res.recordsCount} lessons into ${res.week.weekNumber}!`, 'success');
      return res.week;
    } catch (err: any) {
      showToast('Failed to commit imported lesson plan: ' + err.message, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectWeek, showToast]);

  const refreshImportHistory = useCallback(async () => {
    try {
      const history = await api.listImportHistory();
      setImportHistory(history);
    } catch (err: any) {
      console.error('Failed to load import history:', err);
    }
  }, []);

  const deleteImportHistoryItem = useCallback(async (importId: string) => {
    try {
      await api.deleteImportHistory(importId);
      setImportHistory(prev => prev.filter(i => i.id !== importId));
      showToast('Import history entry removed', 'info');
    } catch (err: any) {
      showToast('Failed to delete history item: ' + err.message, 'error');
    }
  }, [showToast]);

  // --- Lesson Record Operations & Autosave ---

  const createRecord = useCallback(async (data: {
    className: string;
    section?: string;
    day: string;
    target?: string;
    activities?: string;
    blockCount?: number;
    templateId?: string;
  }) => {
    let weekId = selectedWeekId;
    if (!weekId) {
      const newWeek = await api.createWeek({ weekNumber: 'Week 1', title: 'Lesson Plans' });
      setWeeks(prev => [newWeek, ...prev]);
      weekId = newWeek.id;
      setSelectedWeekId(newWeek.id);
    }

    const newRecord = await api.createLessonRecord(weekId, data);
    setRecords(prev => [...prev, newRecord]);
    setSelectedRecordId(newRecord.id);

    api.getWeeklyProgress(weekId).then(setProgress).catch(console.error);
    showToast(`Created record for ${newRecord.day} (${newRecord.className})`, 'success');
    return newRecord;
  }, [selectedWeekId, showToast]);

  const duplicateRecord = useCallback(async (recordId: string, overrides?: { day?: string; className?: string; section?: string }) => {
    try {
      const duplicated = await api.duplicateLessonRecord(recordId, overrides);
      setRecords(prev => [...prev, duplicated]);
      setSelectedRecordId(duplicated.id);
      if (selectedWeekId) {
        api.getWeeklyProgress(selectedWeekId).then(setProgress).catch(console.error);
      }
      showToast(`Duplicated record to ${duplicated.day} (${duplicated.className})`, 'success');
    } catch (err: any) {
      showToast('Failed to duplicate record: ' + err.message, 'error');
    }
  }, [selectedWeekId, showToast]);

  const deleteRecord = useCallback(async (recordId: string) => {
    try {
      await api.deleteLessonRecord(recordId);
      setRecords(prev => {
        const remaining = prev.filter(r => r.id !== recordId);
        if (selectedRecordId === recordId) {
          setSelectedRecordId(remaining.length > 0 ? remaining[0].id : null);
        }
        return remaining;
      });
      if (selectedWeekId) {
        api.getWeeklyProgress(selectedWeekId).then(setProgress).catch(console.error);
      }
      showToast('Lesson record deleted', 'info');
    } catch (err: any) {
      showToast('Failed to delete record: ' + err.message, 'error');
    }
  }, [selectedRecordId, selectedWeekId, showToast]);

  const updateRecord = useCallback((updates: Partial<LessonRecord>, immediate: boolean = false) => {
    if (!selectedRecordId) return;

    setRecords(prev =>
      prev.map(r => (r.id === selectedRecordId ? { ...r, ...updates } : r))
    );

    pendingUpdatesRef.current = {
      ...(pendingUpdatesRef.current || {}),
      ...updates,
    };

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const saveChanges = async () => {
      const changesToSave = pendingUpdatesRef.current;
      if (!changesToSave || !selectedRecordId) return;
      pendingUpdatesRef.current = null;
      setSaveStatus('saving');

      try {
        const updated = await api.updateLessonRecord(selectedRecordId, changesToSave);
        setRecords(prev => prev.map(r => (r.id === selectedRecordId ? updated : r)));
        setSaveStatus('saved');
        if (selectedWeekId) {
          api.getWeeklyProgress(selectedWeekId).then(setProgress).catch(console.error);
        }
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveStatus('error');
      }
    };

    if (immediate) {
      saveChanges();
    } else {
      setSaveStatus('saving');
      autosaveTimerRef.current = setTimeout(saveChanges, 800);
    }
  }, [selectedRecordId, selectedWeekId]);

  const toggleRecordCompleted = useCallback(async (recordId: string) => {
    const target = records.find(r => r.id === recordId);
    if (!target) return;
    const newCompleted = !target.completed;
    const newStatus: RecordStatus = newCompleted ? 'completed' : 'draft';

    try {
      const updated = await api.updateRecordStatus(recordId, newStatus, newCompleted);
      setRecords(prev => prev.map(r => (r.id === recordId ? updated : r)));
      if (selectedWeekId) {
        const prog = await api.getWeeklyProgress(selectedWeekId);
        setProgress(prog);
      }
      showToast(newCompleted ? 'Marked complete' : 'Marked draft', 'info');
    } catch (err: any) {
      showToast('Failed to update status: ' + err.message, 'error');
    }
  }, [records, selectedWeekId, showToast]);

  const setRecordStatus = useCallback(async (recordId: string, status: RecordStatus) => {
    const completed = status === 'completed';
    try {
      const updated = await api.updateRecordStatus(recordId, status, completed);
      setRecords(prev => prev.map(r => (r.id === recordId ? updated : r)));
      if (selectedWeekId) {
        const prog = await api.getWeeklyProgress(selectedWeekId);
        setProgress(prog);
      }
    } catch (err: any) {
      showToast('Failed to update status: ' + err.message, 'error');
    }
  }, [selectedWeekId, showToast]);

  // --- Dynamic Block Builder Actions ---

  const createBlocks = useCallback(async (count: number, templateId?: string) => {
    if (!selectedRecordId) return;
    try {
      setSaveStatus('saving');
      const updated = await api.createBlocks(selectedRecordId, count, templateId);
      setRecords(prev => prev.map(r => (r.id === selectedRecordId ? updated : r)));
      setSaveStatus('saved');
      showToast(`Added ${count} block${count > 1 ? 's' : ''}`, 'success');
    } catch (err: any) {
      setSaveStatus('error');
      showToast('Failed to add blocks: ' + err.message, 'error');
    }
  }, [selectedRecordId, showToast]);

  const duplicateBlock = useCallback(async (blockId: string) => {
    if (!selectedRecordId) return;
    try {
      setSaveStatus('saving');
      const updated = await api.duplicateBlock(selectedRecordId, blockId);
      setRecords(prev => prev.map(r => (r.id === selectedRecordId ? updated : r)));
      setSaveStatus('saved');
      showToast('Block duplicated', 'success');
    } catch (err: any) {
      setSaveStatus('error');
      showToast('Failed to duplicate block: ' + err.message, 'error');
    }
  }, [selectedRecordId, showToast]);

  const deleteBlock = useCallback(async (blockId: string) => {
    if (!selectedRecordId) return;
    try {
      setSaveStatus('saving');
      const updated = await api.deleteBlock(selectedRecordId, blockId);
      setRecords(prev => prev.map(r => (r.id === selectedRecordId ? updated : r)));
      setSaveStatus('saved');
      showToast('Block deleted', 'info');
    } catch (err: any) {
      setSaveStatus('error');
      showToast('Failed to delete block: ' + err.message, 'error');
    }
  }, [selectedRecordId, showToast]);

  const reorderBlocks = useCallback(async (orderedBlockIds: string[]) => {
    if (!selectedRecordId) return;
    try {
      const updated = await api.reorderBlocks(selectedRecordId, orderedBlockIds);
      setRecords(prev => prev.map(r => (r.id === selectedRecordId ? updated : r)));
    } catch (err: any) {
      showToast('Failed to reorder blocks: ' + err.message, 'error');
    }
  }, [selectedRecordId, showToast]);

  const applyTemplateToBlock = useCallback(async (blockId: string, templateId: string) => {
    if (!selectedRecordId) return;
    try {
      setSaveStatus('saving');
      const updated = await api.applyTemplateToBlock(selectedRecordId, blockId, templateId);
      setRecords(prev => prev.map(r => (r.id === selectedRecordId ? updated : r)));
      setSaveStatus('saved');
      showToast('Applied template fields to block', 'success');
    } catch (err: any) {
      setSaveStatus('error');
      showToast('Failed to apply template: ' + err.message, 'error');
    }
  }, [selectedRecordId, showToast]);

  // --- Clipboard Actions ---

  const copyToSystemClipboard = useCallback(async (text: string, label?: string) => {
    const cleanText = cleanPlainText(text);
    if (!cleanText) {
      showToast('Nothing to copy (empty content)', 'info');
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cleanText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = cleanText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast(label ? `Copied: "${label}"` : 'Copied plain text to clipboard', 'success');
    } catch (err: any) {
      showToast('Clipboard permission denied', 'error');
    }
  }, [showToast]);

  const addClipboardItem = useCallback(async (text: string, label: string, category: ClipboardItem['category'] = 'general') => {
    const clean = cleanPlainText(text);
    if (!clean) {
      showToast('Cannot add empty text', 'info');
      return;
    }
    try {
      const item = await api.createClipboardItem({
        plainText: clean,
        label,
        category,
        weekId: selectedWeekId || undefined,
        lessonRecordId: selectedRecordId || undefined,
        className: selectedRecord?.className,
        section: selectedRecord?.section,
        day: selectedRecord?.day,
      });
      setClipboardItems(prev => [item, ...prev]);
      showToast(`Added to clipboard: ${label}`, 'success');
    } catch (err: any) {
      showToast('Failed to save clipboard item: ' + err.message, 'error');
    }
  }, [selectedWeekId, selectedRecordId, selectedRecord, showToast]);

  const deleteClipboardItem = useCallback(async (id: string) => {
    try {
      await api.deleteClipboardItem(id);
      setClipboardItems(prev => prev.filter(c => c.id !== id));
      showToast('Removed from clipboard', 'info');
    } catch (err: any) {
      showToast('Failed to delete clipboard item: ' + err.message, 'error');
    }
  }, [showToast]);

  const extractRecordToClipboard = useCallback(async (recordId: string) => {
    try {
      const items = await api.extractRecordToClipboard(recordId);
      setClipboardItems(prev => [...items, ...prev]);
      showToast(`Extracted ${items.length} items to clipboard gallery`, 'success');
    } catch (err: any) {
      showToast('Failed to extract items: ' + err.message, 'error');
    }
  }, [showToast]);

  // --- Templates Management Actions ---

  const createTemplate = useCallback(async (data: Omit<BlockTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      const created = await api.createTemplate(data);
      setTemplates(prev => [...prev, created]);
      showToast(`Created template: ${created.name}`, 'success');
    } catch (err: any) {
      showToast('Failed to create template: ' + err.message, 'error');
    }
  }, [showToast]);

  const updateTemplate = useCallback(async (id: string, updates: Partial<BlockTemplate>) => {
    try {
      const updated = await api.updateTemplate(id, updates);
      setTemplates(prev => prev.map(t => (t.id === id ? updated : t)));
      showToast('Template updated', 'success');
    } catch (err: any) {
      showToast('Failed to update template: ' + err.message, 'error');
    }
  }, [showToast]);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      await api.deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      showToast('Template deleted', 'info');
    } catch (err: any) {
      showToast('Failed to delete template: ' + err.message, 'error');
    }
  }, [showToast]);

  // --- Profile & Testing Demo ---

  const updateTeacherProfile = useCallback(async (profile: Partial<TeacherProfile>) => {
    try {
      const updated = await api.updateProfile(profile);
      setTeacherProfile(updated);
      showToast('Preferences updated', 'success');
    } catch (err: any) {
      showToast('Failed to update preferences: ' + err.message, 'error');
    }
  }, [showToast]);

  const loadDemoData = useCallback(async () => {
    try {
      setLoading(true);
      await api.seedDemoData();
      await loadInitialData();
      setActiveView('dashboard');
      showToast('Loaded sample demo lesson week', 'success');
    } catch (err: any) {
      showToast('Failed to load demo data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [loadInitialData, showToast]);

  const clearAllData = useCallback(async () => {
    try {
      setLoading(true);
      // Delete all existing weeks for clean slate
      const currentWeeks = await api.listWeeks();
      for (const w of currentWeeks) {
        await api.deleteWeek(w.id);
      }
      await loadInitialData();
      setActiveView('dashboard');
      showToast('Cleared all lesson plans', 'info');
    } catch (err: any) {
      showToast('Failed to clear data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [loadInitialData, showToast]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        teacherProfile,
        weeks,
        selectedWeekId,
        selectedWeek,
        records,
        selectedRecordId,
        selectedRecord,
        templates,
        clipboardItems,
        importHistory,
        importDraft,
        progress,
        activeView,
        pendingImportUrl,
        filterDay,
        searchQuery,
        saveStatus,
        loading,
        toasts,
        setActiveView,
        initiateImportFromUrl,
        clearPendingImportUrl,
        setFilterDay,
        setSearchQuery,
        setImportDraft,
        selectWeek,
        selectRecord: setSelectedRecordId,
        openLessonEditor,
        nextRecord,
        prevRecord,
        createWeek,
        duplicateWeek,
        updateWeekDetails,
        deleteWeek,
        commitImportDraft,
        refreshImportHistory,
        deleteImportHistoryItem,
        createRecord,
        duplicateRecord,
        updateRecord,
        deleteRecord,
        toggleRecordCompleted,
        setRecordStatus,
        createBlocks,
        duplicateBlock,
        deleteBlock,
        reorderBlocks,
        applyTemplateToBlock,
        copyToSystemClipboard,
        addClipboardItem,
        deleteClipboardItem,
        extractRecordToClipboard,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        updateTeacherProfile,
        loadDemoData,
        clearAllData,
        dismissToast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
