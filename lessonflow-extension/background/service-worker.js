/**
 * LessonFlow Chrome Extension — Background Service Worker (Manifest V3)
 * 
 * Responsibilities:
 * 1. Enables side panel on action icon click
 * 2. Coordinates message passing between side panel and content scripts
 * 3. Injects content scripts on demand when activeTab is authorized
 * 4. Tracks active tab url changes to guard against cross-origin accidental fills
 * 5. Proxies API health check requests to LessonFlow server
 */

import { ExtensionMessage, DEFAULT_CONFIG } from '../shared/types.js';
import { isAllowedHost } from '../shared/validation.js';

// Open side panel when user clicks the extension toolbar icon
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(err => {
      console.warn('[LessonFlow] Failed to set side panel behavior:', err);
    });
  }

  // Initialize default configuration in storage if empty
  chrome.storage.local.get(['apiUrl', 'apiToken'], result => {
    const updates = {};
    if (!result.apiUrl) updates.apiUrl = DEFAULT_CONFIG.apiUrl;
    if (!result.apiToken) updates.apiToken = DEFAULT_CONFIG.apiToken;
    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates);
    }
  });

  console.log('[LessonFlow] Extension installed & service worker active.');
});

/**
 * Ensures the content script and styles are injected into the specified tab.
 */
async function ensureContentScriptInjected(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (tab && tab.url && !isAllowedHost(tab.url)) {
      return { success: false, error: 'Cannot inject into restricted page.' };
    }

    // Send a quick ping to see if already responding
    const pingResp = await chrome.tabs.sendMessage(tabId, { action: ExtensionMessage.PING }).catch(() => null);
    if (pingResp && pingResp.pong) {
      return { success: true };
    }

    // Not yet loaded, inject CSS and JS files programmatically using chrome.scripting
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content/content-script.css'],
    });

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content-script.js'],
    });

    return { success: true };
  } catch (err) {
    console.warn('[LessonFlow] Script injection error:', err);
    return { success: false, error: err.message };
  }
}

// Handle runtime messages from side panel or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return false;

  // 1. Health check / ping
  if (message.action === ExtensionMessage.PING) {
    sendResponse({ pong: true, timestamp: Date.now() });
    return false;
  }

  // 2. Ensure content script is ready in active tab
  if (message.action === 'LF_ENSURE_CONTENT_SCRIPT') {
    ensureContentScriptInjected(message.tabId)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }

  // 3. Forward inspection or fill messages directly to active tab
  if (
    message.action === ExtensionMessage.START_INSPECTION ||
    message.action === ExtensionMessage.STOP_INSPECTION ||
    message.action === ExtensionMessage.TEST_SELECTOR ||
    message.action === ExtensionMessage.FILL_SINGLE_FIELD ||
    message.action === ExtensionMessage.CLICK_ADD_BLOCK ||
    message.action === ExtensionMessage.VERIFY_BLOCK_COUNT ||
    message.action === ExtensionMessage.GET_PAGE_INFO
  ) {
    const tabId = message.tabId;
    if (!tabId) {
      sendResponse({ success: false, error: 'No target tab specified.' });
      return false;
    }

    ensureContentScriptInjected(tabId).then(injectRes => {
      if (!injectRes.success) {
        sendResponse({ success: false, error: `Could not connect to active page: ${injectRes.error}` });
        return;
      }

      chrome.tabs.sendMessage(tabId, message, resp => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message || 'Error communicating with page.',
          });
        } else {
          sendResponse(resp);
        }
      });
    });

    return true; // async response
  }

  return false;
});

// Guard: monitor tab updates and notify sidepanel if the user navigates away
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && isAllowedHost(tab.url)) {
    chrome.runtime.sendMessage({
      action: ExtensionMessage.PAGE_NAVIGATED,
      tabId,
      url: tab.url,
      hostname: new URL(tab.url).hostname,
    }).catch(() => {
      // Side panel may be closed, ignore
    });
  }
});
