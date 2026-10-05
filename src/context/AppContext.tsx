/**
 * LessonFlow Global Application Context
 * 
 * Manages state for:
 * - Active teacher & profile
 * - Selected week & weekly progress
 * - Selected lesson record & dynamic blocks
 * - Debounced autosave with visual status
 * - Clipboard gallery with 1-click clean copy
 * - Reusable block templates
 * - Toast notifications
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  TeacherProfile,
  Week,
  LessonRecord,
  BlockTemplate,
  ClipboardItem,
  WeeklyProgressDTO,
  RecordStatus,
} from '../types/index.js';
import { api } from '../services/api.js';
import { cleanPlainText } from '../utils/textCleaner.js';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  text: string;
}

interface AppContextType {
  currentUser: User | null;
  teacherProfile: TeacherProfile | null;
  allUsers: Array<{ id: string; name: string; email: string }>;
  weeks: Week[];
  selectedWeekId: string | null;
  selectedWeek: Week | null;
  records: LessonRecord[];
  selectedRecordId: string | null;
  selectedRecord: LessonRecord | null;
  templates: BlockTemplate[];
  clipboardItems: ClipboardItem[];
  progress: WeeklyProgressDTO | null;
  activeView: 'workspace' | 'templates' | 'clipboard' | 'extension-api';
  filterDay: string;
  searchQuery: string;
  saveStatus: 'saved' | 'saving' | 'error';
  loading: boolean;
  toasts: ToastMessage[];

  // Navigation & View Setters
  setActiveView: (view: 'workspace' | 'templates' | 'clipboard' | 'extension-api') => void;
  setFilterDay: (day: string) => void;
  setSearchQuery: (query: string) => void;
  selectWeek: (weekId: string) => Promise<void>;
  selectRecord: (recordId: string | null) => void;
  nextRecord: () => void;
  prevRecord: () => void;

  // Week Actions
  createWeek: (weekNumber: string, title: string, startDate?: string, endDate?: string) => Promise<Week>;
  duplicateWeek: (weekId: string, newWeekNumber?: string, newTitle?: string) => Promise<void>;
  updateWeekDetails: (weekId: string, updates: Partial<Week>) => Promise<void>;
  deleteWeek: (weekId: string) => Promise<void>;

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

  // User & Demo
  switchUser: (userId: string) => Promise<void>;
  createUser: (name: string, email: string) => Promise<void>;
  updateTeacherProfile: (profile: Partial<TeacherProfile>) => Promise<void>;
  resetDemoData: () => Promise<void>;
  dismissToast: (id: string) => void;
  showToast: (text: string, type?: ToastMessage['type']) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [records, setRecords] = useState<LessonRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<BlockTemplate[]>([]);
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);
  const [progress, setProgress] = useState<WeeklyProgressDTO | null>(null);

  const [activeView, setActiveView] = useState<'workspace' | 'templates' | 'clipboard' | 'extension-api'>('workspace');
  const [filterDay, setFilterDay] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Ref to track autosave debounce timer
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

  // Fetch initial profile, weeks, templates, clipboard
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, userList, weekList, tmplList, clipList] = await Promise.all([
        api.getMe(),
        api.listUsers(),
        api.listWeeks(),
        api.listTemplates(),
        api.listClipboard(),
      ]);

      setCurrentUser(meRes.user);
      setTeacherProfile(meRes.profile || null);
      setAllUsers(userList);
      setWeeks(weekList);
      setTemplates(tmplList);
      setClipboardItems(clipList);

      if (weekList.length > 0) {
        const defaultWeek = weekList[0];
        setSelectedWeekId(defaultWeek.id);
        const [recList, prog] = await Promise.all([
          api.listLessonRecords(defaultWeek.id),
          api.getWeeklyProgress(defaultWeek.id),
        ]);
        setRecords(recList);
        setProgress(prog);
        if (recList.length > 0) {
          setSelectedRecordId(recList[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      showToast('Error loading lesson plan data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load records and progress when selectedWeekId changes
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
      showToast('Failed to load week records: ' + err.message, 'error');
    }
  }, [showToast]);

  const selectedWeek = weeks.find(w => w.id === selectedWeekId) || null;
  const selectedRecord = records.find(r => r.id === selectedRecordId) || null;

  // --- Record Navigation ---

  const filteredRecords = records.filter(r => {
    if (filterDay !== 'All' && r.day.toLowerCase() !== filterDay.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMeta = r.className.toLowerCase().includes(q) ||
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
    showToast(`Created ${newWeek.weekNumber}: ${newWeek.title}`, 'success');
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
    if (!selectedWeekId) throw new Error('No week selected.');
    const newRecord = await api.createLessonRecord(selectedWeekId, data);
    setRecords(prev => [...prev, newRecord]);
    setSelectedRecordId(newRecord.id);
    
    // Update progress
    api.getWeeklyProgress(selectedWeekId).then(setProgress).catch(console.error);
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

  // Debounced Autosave for current selected record
  const updateRecord = useCallback((updates: Partial<LessonRecord>, immediate: boolean = false) => {
    if (!selectedRecordId) return;

    // Optimistically update local state immediately so UI feels instant
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
      showToast(newCompleted ? 'Marked complete' : 'Marked incomplete', 'info');
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
      showToast('Block removed', 'info');
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
      showToast('Template fields applied to block', 'success');
    } catch (err: any) {
      setSaveStatus('error');
      showToast('Failed to apply template: ' + err.message, 'error');
    }
  }, [selectedRecordId, showToast]);

  // --- Clipboard System Actions ---

  /**
   * 1-Click Copy ONLY clean plain text to the system clipboard
   */
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
        // Fallback for older browsers
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
      showToast(label ? `Copied: "${label}"` : 'Copied clean plain text to clipboard!', 'success');
    } catch (err: any) {
      showToast('Clipboard permission denied or unavailable', 'error');
    }
  }, [showToast]);

  const addClipboardItem = useCallback(async (text: string, label: string, category: ClipboardItem['category'] = 'general') => {
    const clean = cleanPlainText(text);
    if (!clean) {
      showToast('Cannot add empty text to clipboard', 'info');
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
      showToast(`Saved to Clipboard Gallery: ${label}`, 'success');
    } catch (err: any) {
      showToast('Failed to save clipboard item: ' + err.message, 'error');
    }
  }, [selectedWeekId, selectedRecordId, selectedRecord, showToast]);

  const deleteClipboardItem = useCallback(async (id: string) => {
    try {
      await api.deleteClipboardItem(id);
      setClipboardItems(prev => prev.filter(c => c.id !== id));
      showToast('Removed from clipboard gallery', 'info');
    } catch (err: any) {
      showToast('Failed to delete clipboard item: ' + err.message, 'error');
    }
  }, [showToast]);

  const extractRecordToClipboard = useCallback(async (recordId: string) => {
    try {
      const items = await api.extractRecordToClipboard(recordId);
      setClipboardItems(prev => [...items, ...prev]);
      showToast(`Extracted ${items.length} clean items to clipboard gallery`, 'success');
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

  // --- User & Profile Actions ---

  const switchUser = useCallback(async (userId: string) => {
    api.setActiveUserId(userId);
    await loadInitialData();
    showToast('Switched user', 'info');
  }, [loadInitialData, showToast]);

  const createUser = useCallback(async (name: string, email: string) => {
    try {
      const user = await api.createUser(name, email);
      setAllUsers(prev => [...prev, { id: user.id, name: user.name, email: user.email }]);
      await switchUser(user.id);
      showToast(`Created and switched to teacher: ${name}`, 'success');
    } catch (err: any) {
      showToast('Failed to create user: ' + err.message, 'error');
    }
  }, [switchUser, showToast]);

  const updateTeacherProfile = useCallback(async (profile: Partial<TeacherProfile>) => {
    try {
      const updated = await api.updateProfile(profile);
      setTeacherProfile(updated);
      showToast('Profile defaults updated', 'success');
    } catch (err: any) {
      showToast('Failed to update profile: ' + err.message, 'error');
    }
  }, [showToast]);

  const resetDemoData = useCallback(async () => {
    try {
      setLoading(true);
      await api.seedDemoData();
      await loadInitialData();
      showToast('Reset sample Week 8 demo data', 'success');
    } catch (err: any) {
      showToast('Failed to reset demo data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [loadInitialData, showToast]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        teacherProfile,
        allUsers,
        weeks,
        selectedWeekId,
        selectedWeek,
        records,
        selectedRecordId,
        selectedRecord,
        templates,
        clipboardItems,
        progress,
        activeView,
        filterDay,
        searchQuery,
        saveStatus,
        loading,
        toasts,
        setActiveView,
        setFilterDay,
        setSearchQuery,
        selectWeek,
        selectRecord: setSelectedRecordId,
        nextRecord,
        prevRecord,
        createWeek,
        duplicateWeek,
        updateWeekDetails,
        deleteWeek,
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
        switchUser,
        createUser,
        updateTeacherProfile,
        resetDemoData,
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
