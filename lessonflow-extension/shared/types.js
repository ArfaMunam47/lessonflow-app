/**
 * LessonFlow Chrome Extension — Shared Types & Enums
 * 
 * Provides centralized contracts for:
 * - Connection states
 * - Operation modes (Copy Only, Guided Fill, Fill Mapped Fields)
 * - Website Field Mapping models
 * - Message Action contracts
 */

export const ConnectionStatus = {
  NOT_CONFIGURED: 'not_configured',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  AUTH_ERROR: 'auth_error',
  SERVER_UNAVAILABLE: 'server_unavailable',
};

export const FillMode = {
  COPY_ONLY: 'copy_only',
  GUIDED_FILL: 'guided_fill',
  FILL_ALL_MAPPED: 'fill_all_mapped',
};

export const FieldCategory = {
  CLASS: 'className',
  SECTION: 'section',
  DAY: 'day',
  DATE: 'date',
  TARGET: 'target',
  LEARNING_OUTCOMES: 'learningOutcomes',
  ACTIVITIES: 'activities',
  BLOCK_FIELD: 'block_field',
  ADD_BLOCK_BTN: 'add_block_button',
};

export const MappingElementType = {
  TEXT_INPUT: 'text',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  CHECKBOX: 'checkbox',
  CONTENTEDITABLE: 'contenteditable',
  BUTTON: 'button',
  CUSTOM: 'custom',
};

export const PageStatus = {
  DETECTING: 'detecting',
  READY: 'ready',
  FORM_DETECTED: 'form_detected',
  NO_FORMS: 'no_forms',
  RESTRICTED: 'restricted',
  PERMISSION_NEEDED: 'permission_needed',
  PERMISSION_DENIED: 'permission_denied',
  INJECTION_FAILED: 'injection_failed',
  NO_TAB: 'no_tab',
};

export const ExtensionMessage = {
  // Sidepanel -> Background / Content Script
  PING: 'LF_PING',
  CHECK_CONNECTION: 'LF_CHECK_CONNECTION',
  GET_PAGE_INFO: 'LF_GET_PAGE_INFO',
  START_INSPECTION: 'LF_START_INSPECTION',
  STOP_INSPECTION: 'LF_STOP_INSPECTION',
  TEST_SELECTOR: 'LF_TEST_SELECTOR',
  FILL_SINGLE_FIELD: 'LF_FILL_SINGLE_FIELD',
  CLICK_ADD_BLOCK: 'LF_CLICK_ADD_BLOCK',
  VERIFY_BLOCK_COUNT: 'LF_VERIFY_BLOCK_COUNT',
  ENSURE_CONTENT_SCRIPT: 'LF_ENSURE_CONTENT_SCRIPT',
  CHECK_HOST_PERMISSION: 'LF_CHECK_HOST_PERMISSION',
  
  // Content Script / Background -> Sidepanel
  INSPECTION_RESULT: 'LF_INSPECTION_RESULT',
  INSPECTION_CANCELLED: 'LF_INSPECTION_CANCELLED',
  FILL_RESULT: 'LF_FILL_RESULT',
  PAGE_NAVIGATED: 'LF_PAGE_NAVIGATED',
  TAB_ACTIVATED: 'LF_TAB_ACTIVATED',
};

export const DEFAULT_CONFIG = {
  apiUrl: 'http://localhost:3000',
  apiToken: 'lf_tok_active',
  autoHighlight: true,
  confirmBeforeOverwrite: true,
  skipUnmappedFields: true,
};
