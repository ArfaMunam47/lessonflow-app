/**
 * LessonFlow Chrome Extension — Side Panel Controller
 * 
 * Handles:
 * - Connection to LessonFlow backend (weeks & lessons)
 * - Active tab status and website mapping management
 * - Field-by-field transfer and verification (Modes 1, 2, 3)
 * - Interactive element inspection wizard
 * - Stop / pause controls and transparent audit reports
 */

import {
  ConnectionStatus,
  FillMode,
  ExtensionMessage,
  DEFAULT_CONFIG,
} from '../shared/types.js';
import { cleanPlainText, validateMapping } from '../shared/validation.js';

// Application State
let config = { ...DEFAULT_CONFIG };
let activeTab = null;
let currentHostname = '';
let connectionStatus = ConnectionStatus.CONNECTING;
let weeks = [];
let lessons = [];
let selectedWeekId = '';
let selectedLessonId = '';
let activeLessonDTO = null;
let currentMode = FillMode.COPY_ONLY;
let activeMappings = []; // Mappings for current hostname
let pendingInspectionData = null;
let isOperationRunning = false;

// DOM Elements
const elConnPill = document.getElementById('conn-pill');
const elConnText = document.getElementById('conn-text');
const elHostname = document.getElementById('current-hostname');
const elSiteBadge = document.getElementById('site-status-badge');
const elMappingCount = document.getElementById('mapping-count');
const elSelectWeek = document.getElementById('select-week');
const elSelectLesson = document.getElementById('select-lesson');
const elSummaryBox = document.getElementById('lesson-summary-box');
const elSumClassDay = document.getElementById('sum-class-day');
const elSumStatusBadge = document.getElementById('sum-status-badge');
const elSumTarget = document.getElementById('sum-target');
const elSumBlocksCount = document.getElementById('sum-blocks-count');
const elTransferCard = document.getElementById('transfer-card');
const elFieldsList = document.getElementById('fields-list');
const elModeDesc = document.getElementById('mode-desc');
const elBtnFillAll = document.getElementById('btn-fill-all');
const elBtnAddBlock = document.getElementById('btn-add-block');
const elBtnStopOp = document.getElementById('btn-stop-op');
const elReportBox = document.getElementById('report-box');
const elReportMsg = document.getElementById('report-message');
const elInspectBar = document.getElementById('inspect-active-bar');

// Initialize Extension Sidepanel
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadConfiguration();
  await detectActiveTab();
  await connectToLessonFlow();
});

// -------------------------------------------------------------
// Setup Event Listeners
// -------------------------------------------------------------
function setupEventListeners() {
  // Settings modal
  document.getElementById('btn-open-settings').addEventListener('click', openSettingsModal);
  document.getElementById('btn-close-settings').addEventListener('click', closeSettingsModal);
  document.getElementById('btn-save-settings').addEventListener('click', saveSettings);

  // Refresh lessons
  document.getElementById('btn-refresh-lessons').addEventListener('click', () => {
    connectToLessonFlow();
  });

  // Week / Lesson selection
  elSelectWeek.addEventListener('change', e => onWeekChanged(e.target.value));
  elSelectLesson.addEventListener('change', e => onLessonChanged(e.target.value));

  // Mode Tabs
  document.querySelectorAll('.lf-tab').forEach(tab => {
    tab.addEventListener('click', e => {
      document.querySelectorAll('.lf-tab').forEach(t => t.classList.remove('lf-tab-active'));
      tab.classList.add('lf-tab-active');
      setMode(tab.dataset.mode);
    });
  });

  // Inspection
  document.getElementById('btn-inspect-page').addEventListener('click', startInspection);
  document.getElementById('btn-cancel-inspect').addEventListener('click', cancelInspection);

  // Mapping Modal
  document.getElementById('btn-close-map-modal').addEventListener('click', closeMappingModal);
  document.getElementById('btn-save-mapping').addEventListener('click', saveCurrentMapping);
  document.getElementById('btn-test-mapping-elem').addEventListener('click', testCurrentMappingElement);

  // Mappings Manager Modal
  document.getElementById('btn-view-mappings').addEventListener('click', openMappingsManager);
  document.getElementById('btn-close-manager-modal').addEventListener('click', closeMappingsManager);
  document.getElementById('btn-done-manager').addEventListener('click', closeMappingsManager);
  document.getElementById('btn-clear-all-mappings').addEventListener('click', clearAllMappingsForSite);

  // Global Operations
  elBtnFillAll.addEventListener('click', handleFillAllMapped);
  elBtnAddBlock.addEventListener('click', handleAddBlock);
  elBtnStopOp.addEventListener('click', handleStopOperation);

  // Listen for runtime messages from content script or background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return;

    if (message.action === 'LF_INSPECTION_RESULT') {
      onInspectionResult(message.data);
    } else if (message.action === 'LF_INSPECTION_CANCELLED') {
      elInspectBar.style.display = 'none';
      showToast('Inspection cancelled.');
    } else if (message.action === 'LF_PAGE_NAVIGATED') {
      detectActiveTab();
    }
  });
}

// -------------------------------------------------------------
// Load Configuration & Connect
// -------------------------------------------------------------
async function loadConfiguration() {
  const stored = await chrome.storage.local.get(['apiUrl', 'apiToken']);
  config.apiUrl = stored.apiUrl || DEFAULT_CONFIG.apiUrl;
  config.apiToken = stored.apiToken || DEFAULT_CONFIG.apiToken;

  document.getElementById('cfg-api-url').value = config.apiUrl;
  document.getElementById('cfg-api-token').value = config.apiToken;
}

async function detectActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) return;

    activeTab = tabs[0];
    if (activeTab.url) {
      try {
        const urlObj = new URL(activeTab.url);
        currentHostname = urlObj.hostname;
        elHostname.textContent = `${currentHostname}${urlObj.pathname.length > 1 ? urlObj.pathname : ''}`;
        
        // Ensure content script is ready
        chrome.runtime.sendMessage({
          action: 'LF_ENSURE_CONTENT_SCRIPT',
          tabId: activeTab.id,
        }).catch(() => {});

        // Fetch page info
        checkPageSupport();
        // Load mappings for this domain
        await loadMappingsForCurrentSite();
      } catch {
        elHostname.textContent = 'Special browser tab';
      }
    }
  } catch (err) {
    console.warn('[LessonFlow] Failed to query active tab:', err);
  }
}

async function checkPageSupport() {
  if (!activeTab || !activeTab.id) return;
  try {
    chrome.tabs.sendMessage(activeTab.id, { action: 'LF_GET_PAGE_INFO' }, resp => {
      if (chrome.runtime.lastError || !resp) {
        elSiteBadge.textContent = 'Page accessible';
        elSiteBadge.className = 'lf-badge lf-badge-neutral';
        return;
      }

      if (resp.hasForms) {
        elSiteBadge.textContent = 'Form Detected';
        elSiteBadge.className = 'lf-badge lf-badge-ready';
      } else {
        elSiteBadge.textContent = 'Active Tab';
        elSiteBadge.className = 'lf-badge lf-badge-neutral';
      }
    });
  } catch {
    // Ignore tab communication errors
  }
}

async function connectToLessonFlow() {
  setConnectionPill(ConnectionStatus.CONNECTING, 'Connecting...');

  try {
    const response = await fetch(`${config.apiUrl}/api/extension/lessons`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'x-api-token': config.apiToken,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401 || response.status === 403) {
      setConnectionPill(ConnectionStatus.AUTH_ERROR, 'Auth Error');
      showToast('Invalid API Token. Check LessonFlow Settings.', 'error');
      return;
    }

    if (!response.ok) {
      setConnectionPill(ConnectionStatus.SERVER_UNAVAILABLE, 'Offline');
      return;
    }

    const data = await response.json();
    weeks = data.weeks || [];
    lessons = data.lessons || [];

    setConnectionPill(ConnectionStatus.CONNECTED, 'Connected');
    populateWeeksDropdown();

    if (data.user?.name) {
      document.querySelector('.lf-subtitle').textContent = `Teacher: ${data.user.name}`;
    }
  } catch (err) {
    console.warn('[LessonFlow] Connection error:', err);
    setConnectionPill(ConnectionStatus.SERVER_UNAVAILABLE, 'Server Offline');
  }
}

function setConnectionPill(status, text) {
  connectionStatus = status;
  elConnText.textContent = text;
  elConnPill.className = 'lf-pill';

  if (status === ConnectionStatus.CONNECTED) {
    elConnPill.classList.add('lf-pill-connected');
  } else if (status === ConnectionStatus.CONNECTING) {
    elConnPill.classList.add('lf-pill-connecting');
  } else {
    elConnPill.classList.add('lf-pill-error');
  }
}

// -------------------------------------------------------------
// Dropdown Population & Selection
// -------------------------------------------------------------
function populateWeeksDropdown() {
  elSelectWeek.innerHTML = '<option value="">Select a week...</option>';

  if (weeks.length === 0) {
    elSelectWeek.innerHTML = '<option value="">No weeks found in LessonFlow</option>';
    elSelectLesson.disabled = true;
    return;
  }

  weeks.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id;
    opt.textContent = `${w.weekNumber}: ${w.title || 'Weekly Plan'}`;
    elSelectWeek.appendChild(opt);
  });

  // Auto-select first week
  if (weeks.length > 0) {
    elSelectWeek.value = weeks[0].id;
    onWeekChanged(weeks[0].id);
  }
}

function onWeekChanged(weekId) {
  selectedWeekId = weekId;
  elSelectLesson.innerHTML = '<option value="">Select a lesson plan...</option>';

  if (!weekId) {
    elSelectLesson.disabled = true;
    elSummaryBox.style.display = 'none';
    elTransferCard.style.display = 'none';
    return;
  }

  const weekLessons = lessons.filter(l => l.weekId === weekId);
  if (weekLessons.length === 0) {
    elSelectLesson.innerHTML = '<option value="">No lessons in this week</option>';
    elSelectLesson.disabled = true;
    return;
  }

  elSelectLesson.disabled = false;
  weekLessons.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = `${l.day} — ${l.className} ${l.section ? `(${l.section})` : ''} [${l.status.toUpperCase()}]`;
    elSelectLesson.appendChild(opt);
  });

  // Auto-select first lesson
  if (weekLessons.length > 0) {
    elSelectLesson.value = weekLessons[0].id;
    onLessonChanged(weekLessons[0].id);
  }
}

async function onLessonChanged(lessonId) {
  selectedLessonId = lessonId;
  if (!lessonId) {
    elSummaryBox.style.display = 'none';
    elTransferCard.style.display = 'none';
    return;
  }

  try {
    const resp = await fetch(`${config.apiUrl}/api/extension/records/${lessonId}`, {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'x-api-token': config.apiToken,
      },
    });

    if (!resp.ok) {
      showToast('Could not load lesson record.', 'error');
      return;
    }

    activeLessonDTO = await resp.json();
    renderLessonSummary(activeLessonDTO);
    renderTransferCard(activeLessonDTO);
  } catch (err) {
    console.error('[LessonFlow] Failed to load lesson record DTO:', err);
    showToast('Network error loading lesson.', 'error');
  }
}

function renderLessonSummary(dto) {
  elSummaryBox.style.display = 'flex';
  elSumClassDay.textContent = `${dto.day} — ${dto.className} ${dto.section ? `(${dto.section})` : ''}`;
  elSumTarget.textContent = dto.target || 'No target specified.';
  elSumBlocksCount.textContent = dto.totalBlocks || 0;
  elSumStatusBadge.textContent = 'Reviewed';
  elSumStatusBadge.className = 'lf-badge lf-badge-ready';
}

// -------------------------------------------------------------
// Transfer Card & Field-by-Field View
// -------------------------------------------------------------
function setMode(mode) {
  currentMode = mode;
  if (mode === FillMode.COPY_ONLY) {
    elModeDesc.textContent = '1-Click copy plain text. Paste directly into your school website.';
    elBtnFillAll.style.display = 'none';
  } else if (mode === FillMode.GUIDED_FILL) {
    elModeDesc.textContent = 'Fill and verify one field at a time. The extension highlights each field as it works.';
    elBtnFillAll.style.display = 'none';
  } else {
    elModeDesc.textContent = 'Fills all mapped fields sequentially. Stops before final submit so you can review.';
    elBtnFillAll.style.display = 'block';
  }
  if (activeLessonDTO) {
    renderFieldsList(activeLessonDTO);
  }
}

function renderTransferCard(dto) {
  elTransferCard.style.display = 'flex';
  renderFieldsList(dto);
}

function renderFieldsList(dto) {
  elFieldsList.innerHTML = '';

  // Core header fields
  const fields = [
    { key: 'className', label: 'Class Name', value: dto.className },
    { key: 'section', label: 'Section', value: dto.section },
    { key: 'day', label: 'Day of Week', value: dto.day },
    { key: 'target', label: 'Learning Target', value: dto.target },
    { key: 'activities', label: 'Activities & Procedures', value: dto.activities },
  ];

  // Dynamic block fields
  if (dto.blocks && Array.isArray(dto.blocks)) {
    dto.blocks.forEach(b => {
      if (b.fields && Array.isArray(b.fields)) {
        b.fields.forEach(f => {
          fields.push({
            key: `block_${b.blockNumber}_${f.key}`,
            label: `Block ${b.blockNumber} — ${f.label}`,
            value: f.value,
            blockNumber: b.blockNumber,
            fieldKey: f.key,
          });
        });
      }
    });
  }

  // Check if school website Add Block button is mapped
  const addBlockMapping = activeMappings.find(m => m.lessonFlowField === 'add_block_button');
  elBtnAddBlock.style.display = addBlockMapping ? 'block' : 'none';

  fields.forEach(f => {
    const row = document.createElement('div');
    row.className = 'lf-field-row';
    row.id = `row-field-${f.key}`;

    const mapping = activeMappings.find(m => m.lessonFlowField === f.key);

    const info = document.createElement('div');
    info.className = 'lf-field-info';
    info.innerHTML = `
      <div class="lf-field-label">
        ${escapeHtml(f.label)}
        ${mapping ? `<span class="lf-badge lf-badge-ready" style="font-size: 8px; margin-left: 4px;">Mapped</span>` : ''}
      </div>
      <div class="lf-field-val" title="${escapeHtml(f.value)}">${escapeHtml(f.value || '(empty)')}</div>
    `;

    const actions = document.createElement('div');
    actions.className = 'lf-field-actions';

    if (currentMode === FillMode.COPY_ONLY) {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'lf-btn lf-btn-subtle lf-btn-sm';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', () => {
        copyPlainTextToClipboard(f.value, f.label);
      });
      actions.appendChild(copyBtn);
    } else {
      // Guided Fill or Fill All Mapped
      if (mapping) {
        const fillBtn = document.createElement('button');
        fillBtn.className = 'lf-btn lf-btn-secondary lf-btn-sm';
        fillBtn.textContent = 'Fill';
        fillBtn.addEventListener('click', () => {
          fillSingleFieldOnPage(f, mapping, row);
        });
        actions.appendChild(fillBtn);
      } else {
        const unmappedLabel = document.createElement('button');
        unmappedLabel.className = 'lf-btn lf-btn-subtle lf-btn-sm';
        unmappedLabel.textContent = 'Map';
        unmappedLabel.title = 'Inspect and map website field';
        unmappedLabel.addEventListener('click', startInspection);
        actions.appendChild(unmappedLabel);

        // Also offer manual copy fallback
        const copyFallback = document.createElement('button');
        copyFallback.className = 'lf-btn lf-btn-subtle lf-btn-sm';
        copyFallback.textContent = 'Copy';
        copyFallback.addEventListener('click', () => {
          copyPlainTextToClipboard(f.value, f.label);
        });
        actions.appendChild(copyFallback);
      }
    }

    row.appendChild(info);
    row.appendChild(actions);
    elFieldsList.appendChild(row);
  });
}

// -------------------------------------------------------------
// Copy Plain Text Action
// -------------------------------------------------------------
async function copyPlainTextToClipboard(val, label) {
  const clean = cleanPlainText(val);
  try {
    await navigator.clipboard.writeText(clean);
    showToast(`Copied "${label}" text! Paste in school site.`);
  } catch {
    // Fallback execCommand
    const ta = document.createElement('textarea');
    ta.value = clean;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(`Copied "${label}" text!`);
  }
}

// -------------------------------------------------------------
// Guided Single Field Fill
// -------------------------------------------------------------
async function fillSingleFieldOnPage(fieldObj, mapping, rowEl) {
  if (!activeTab || !activeTab.id) {
    showToast('No active school website tab found.', 'error');
    return;
  }

  showToast(`Filling ${fieldObj.label}...`);

  chrome.tabs.sendMessage(
    activeTab.id,
    {
      action: ExtensionMessage.FILL_SINGLE_FIELD,
      selector: mapping.selector,
      expectedValue: fieldObj.value,
      fieldKey: fieldObj.key,
    },
    resp => {
      if (chrome.runtime.lastError || !resp) {
        showToast(chrome.runtime.lastError?.message || 'Error communicating with page.', 'error');
        return;
      }

      if (!resp.success) {
        showToast(resp.error || 'Failed to fill field.', 'error');
        return;
      }

      if (resp.verified) {
        rowEl.classList.add('lf-field-row-verified');
        showToast(`✓ Filled & verified ${fieldObj.label}!`, 'success');
      } else if (resp.needsManualSelection) {
        showToast(resp.error, 'warning');
      } else {
        showToast(`Filled ${fieldObj.label} (please verify visually)`, 'warning');
      }
    }
  );
}

// -------------------------------------------------------------
// Mode 3: Fill All Mapped Fields Sequentially
// -------------------------------------------------------------
async function handleFillAllMapped() {
  if (!activeLessonDTO || activeMappings.length === 0) {
    showToast('No mappings configured for this page.', 'warning');
    return;
  }

  isOperationRunning = true;
  elBtnFillAll.style.display = 'none';
  elBtnStopOp.style.display = 'block';
  elReportBox.style.display = 'none';

  let filledCount = 0;
  let alreadyMatchedCount = 0;
  let skippedCount = 0;
  const errors = [];

  const fields = [
    { key: 'className', label: 'Class Name', value: activeLessonDTO.className },
    { key: 'section', label: 'Section', value: activeLessonDTO.section },
    { key: 'day', label: 'Day of Week', value: activeLessonDTO.day },
    { key: 'target', label: 'Learning Target', value: activeLessonDTO.target },
    { key: 'activities', label: 'Activities & Procedures', value: activeLessonDTO.activities },
  ];

  if (activeLessonDTO.blocks) {
    activeLessonDTO.blocks.forEach(b => {
      b.fields.forEach(f => {
        fields.push({
          key: `block_${b.blockNumber}_${f.key}`,
          label: `Block ${b.blockNumber} — ${f.label}`,
          value: f.value,
        });
      });
    });
  }

  for (const f of fields) {
    if (!isOperationRunning) {
      showToast('Operation paused by user.', 'warning');
      break;
    }

    const mapping = activeMappings.find(m => m.lessonFlowField === f.key && m.enabled !== false);
    const rowEl = document.getElementById(`row-field-${f.key}`);

    if (!mapping) {
      skippedCount++;
      continue;
    }

    try {
      const resp = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(
          activeTab.id,
          {
            action: ExtensionMessage.FILL_SINGLE_FIELD,
            selector: mapping.selector,
            expectedValue: f.value,
            fieldKey: f.key,
          },
          res => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(res);
          }
        );
      });

      if (resp && resp.success) {
        if (resp.alreadyMatched) {
          alreadyMatchedCount++;
        } else {
          filledCount++;
        }
        if (rowEl) rowEl.classList.add('lf-field-row-verified');
      } else {
        errors.push(`${f.label}: ${resp?.error || 'Could not verify'}`);
      }
    } catch (err) {
      errors.push(`${f.label}: ${err.message}`);
    }

    // Short pause between fields for DOM stability
    await new Promise(r => setTimeout(r, 120));
  }

  isOperationRunning = false;
  elBtnFillAll.style.display = 'block';
  elBtnStopOp.style.display = 'none';

  // Display operation summary report
  elReportBox.style.display = 'flex';
  elReportMsg.innerHTML = `
    <div>✓ <strong>${filledCount}</strong> fields filled and verified</div>
    ${alreadyMatchedCount > 0 ? `<div>• <strong>${alreadyMatchedCount}</strong> fields already matched</div>` : ''}
    <div>• <strong>${skippedCount}</strong> unmapped fields skipped</div>
    ${errors.length > 0 ? `<div style="color: #9D174D; margin-top: 4px;">⚠️ ${errors.length} fields require attention</div>` : ''}
  `;
}

function handleStopOperation() {
  isOperationRunning = false;
  elBtnStopOp.style.display = 'none';
  elBtnFillAll.style.display = 'block';
  showToast('Stopped operation.');
}

// -------------------------------------------------------------
// Dynamic Block Add Handler
// -------------------------------------------------------------
async function handleAddBlock() {
  const addBlockMapping = activeMappings.find(m => m.lessonFlowField === 'add_block_button');
  if (!addBlockMapping || !activeTab) {
    showToast('No Add Block button mapping configured.', 'warning');
    return;
  }

  showToast('Clicking school website Add Block button...');

  chrome.tabs.sendMessage(
    activeTab.id,
    {
      action: ExtensionMessage.CLICK_ADD_BLOCK,
      selector: addBlockMapping.selector,
    },
    resp => {
      if (chrome.runtime.lastError || !resp) {
        showToast(chrome.runtime.lastError?.message || 'Error creating block.', 'error');
        return;
      }

      if (resp.success) {
        showToast(`✓ ${resp.message || 'New block added!'}`, 'success');
      } else {
        showToast(resp.error || 'Could not add new block.', 'error');
      }
    }
  );
}

// -------------------------------------------------------------
// Interactive Element Inspection Wizard
// -------------------------------------------------------------
function startInspection() {
  if (!activeTab || !activeTab.id) {
    showToast('Open your school website tab first.', 'error');
    return;
  }

  elInspectBar.style.display = 'flex';
  chrome.tabs.sendMessage(activeTab.id, { action: ExtensionMessage.START_INSPECTION });
}

function cancelInspection() {
  elInspectBar.style.display = 'none';
  if (activeTab && activeTab.id) {
    chrome.tabs.sendMessage(activeTab.id, { action: ExtensionMessage.STOP_INSPECTION });
  }
}

function onInspectionResult(data) {
  elInspectBar.style.display = 'none';
  pendingInspectionData = data;

  // Open Mapping Wizard Modal
  const modal = document.getElementById('mapping-modal');
  document.getElementById('map-elem-tag').textContent = `<${data.tagName}>`;
  document.getElementById('map-elem-label').textContent = data.label || data.placeholder || 'Unnamed Field';
  document.getElementById('map-elem-sel').textContent = data.selector;

  // Populate dynamic block options in modal select
  const blocksGroup = document.getElementById('map-blocks-group');
  blocksGroup.innerHTML = '';

  if (activeLessonDTO && activeLessonDTO.blocks) {
    activeLessonDTO.blocks.forEach(b => {
      b.fields.forEach(f => {
        const opt = document.createElement('option');
        opt.value = `block_${b.blockNumber}_${f.key}`;
        opt.textContent = `Block ${b.blockNumber} — ${f.label}`;
        blocksGroup.appendChild(opt);
      });
    });
  }

  // Pre-select button if tag is button
  const select = document.getElementById('map-field-select');
  if (data.isButton) {
    select.value = 'add_block_button';
  }

  updateSamplePreview();
  select.onchange = updateSamplePreview;

  modal.style.display = 'flex';
}

function updateSamplePreview() {
  const select = document.getElementById('map-field-select');
  const preview = document.getElementById('map-sample-val');
  const fieldKey = select.value;

  if (fieldKey === 'add_block_button') {
    preview.textContent = '(Action: triggers creation of next lesson block)';
    return;
  }

  if (!activeLessonDTO) {
    preview.textContent = '(Select a lesson to view sample values)';
    return;
  }

  if (fieldKey === 'className') preview.textContent = activeLessonDTO.className || '';
  else if (fieldKey === 'section') preview.textContent = activeLessonDTO.section || '';
  else if (fieldKey === 'day') preview.textContent = activeLessonDTO.day || '';
  else if (fieldKey === 'target') preview.textContent = activeLessonDTO.target || '';
  else if (fieldKey === 'activities') preview.textContent = activeLessonDTO.activities || '';
  else if (fieldKey.startsWith('block_')) {
    const parts = fieldKey.split('_');
    const bNum = parseInt(parts[1], 10);
    const fKey = parts.slice(2).join('_');
    const blk = activeLessonDTO.blocks?.find(b => b.blockNumber === bNum);
    const fld = blk?.fields?.find(f => f.key === fKey);
    preview.textContent = fld?.value || '';
  }
}

async function testCurrentMappingElement() {
  if (!pendingInspectionData || !activeTab) return;
  chrome.tabs.sendMessage(activeTab.id, {
    action: ExtensionMessage.TEST_SELECTOR,
    selector: pendingInspectionData.selector,
  }, resp => {
    if (resp && resp.valid) {
      showToast('Element highlighted on school website!', 'success');
    } else {
      showToast(resp?.error || 'Could not locate element.', 'error');
    }
  });
}

async function saveCurrentMapping() {
  if (!pendingInspectionData || !currentHostname) return;

  const select = document.getElementById('map-field-select');
  const lessonFlowField = select.value;

  const newMapping = {
    id: `map_${Date.now()}`,
    origin: currentHostname,
    lessonFlowField,
    selector: pendingInspectionData.selector,
    elementType: pendingInspectionData.elementType,
    label: pendingInspectionData.label,
    enabled: true,
    updatedAt: new Date().toISOString(),
  };

  // Remove existing mapping for this field if present
  activeMappings = activeMappings.filter(m => m.lessonFlowField !== lessonFlowField);
  activeMappings.push(newMapping);

  await saveMappingsForCurrentSite();
  closeMappingModal();
  showToast(`Mapped ${lessonFlowField} successfully!`, 'success');

  if (activeLessonDTO) {
    renderFieldsList(activeLessonDTO);
  }
}

function closeMappingModal() {
  document.getElementById('mapping-modal').style.display = 'none';
  pendingInspectionData = null;
}

// -------------------------------------------------------------
// Site Mappings Storage & Manager
// -------------------------------------------------------------
async function loadMappingsForCurrentSite() {
  if (!currentHostname) return;
  const storageKey = `mappings_${currentHostname}`;
  const stored = await chrome.storage.local.get([storageKey]);
  activeMappings = stored[storageKey] || [];
  elMappingCount.textContent = activeMappings.length;
}

async function saveMappingsForCurrentSite() {
  if (!currentHostname) return;
  const storageKey = `mappings_${currentHostname}`;
  await chrome.storage.local.set({ [storageKey]: activeMappings });
  elMappingCount.textContent = activeMappings.length;
}

function openMappingsManager() {
  const modal = document.getElementById('manager-modal');
  const container = document.getElementById('mappings-list-container');
  container.innerHTML = '';

  if (activeMappings.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #71717A; font-weight: 700;">
        No field mappings configured for ${escapeHtml(currentHostname)} yet.
        <br><br>Click "Inspect Website Fields" to map.
      </div>
    `;
  } else {
    activeMappings.forEach((m, idx) => {
      const item = document.createElement('div');
      item.className = 'lf-mapping-item';
      item.innerHTML = `
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 900; font-size: 11px;">${escapeHtml(m.lessonFlowField)}</div>
          <code style="font-size: 9px; color: #52525B;">${escapeHtml(m.selector)}</code>
        </div>
        <button class="lf-btn lf-btn-danger lf-btn-sm" style="padding: 3px 6px;">✕</button>
      `;

      item.querySelector('button').addEventListener('click', async () => {
        activeMappings.splice(idx, 1);
        await saveMappingsForCurrentSite();
        openMappingsManager();
        if (activeLessonDTO) renderFieldsList(activeLessonDTO);
      });

      container.appendChild(item);
    });
  }

  modal.style.display = 'flex';
}

function closeMappingsManager() {
  document.getElementById('manager-modal').style.display = 'none';
}

async function clearAllMappingsForSite() {
  if (confirm(`Clear all saved mappings for ${currentHostname}?`)) {
    activeMappings = [];
    await saveMappingsForCurrentSite();
    closeMappingsManager();
    if (activeLessonDTO) renderFieldsList(activeLessonDTO);
    showToast('All mappings cleared for this website.');
  }
}

// -------------------------------------------------------------
// Settings Modal
// -------------------------------------------------------------
function openSettingsModal() {
  document.getElementById('settings-modal').style.display = 'flex';
}

function closeSettingsModal() {
  document.getElementById('settings-modal').style.display = 'none';
}

async function saveSettings() {
  const url = document.getElementById('cfg-api-url').value.trim();
  const token = document.getElementById('cfg-api-token').value.trim();

  config.apiUrl = url || DEFAULT_CONFIG.apiUrl;
  config.apiToken = token || DEFAULT_CONFIG.apiToken;

  await chrome.storage.local.set({
    apiUrl: config.apiUrl,
    apiToken: config.apiToken,
  });

  closeSettingsModal();
  showToast('Settings saved. Reconnecting...');
  await connectToLessonFlow();
}

// -------------------------------------------------------------
// UI Utilities
// -------------------------------------------------------------
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.display = 'block';

  if (type === 'error') {
    toast.style.background = '#9D174D';
  } else if (type === 'warning') {
    toast.style.background = '#854D0E';
  } else if (type === 'success') {
    toast.style.background = '#065F46';
  } else {
    toast.style.background = '#18181B';
  }

  setTimeout(() => {
    toast.style.display = 'none';
  }, 2400);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
