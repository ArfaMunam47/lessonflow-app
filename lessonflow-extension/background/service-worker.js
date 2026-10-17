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
 * Respects Chrome optional host permissions and detects restricted pages.
 */
export async function ensureContentScriptInjected(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab || !tab.url) {
      return { success: false, error: 'Tab not found or no URL available.' };
    }
    if (!isAllowedHost(tab.url)) {
      return {
        success: false,
        error: 'Cannot inject into restricted page (internal browser or web store page).',
        restricted: true,
      };
    }

    // 1. Send a quick ping to see if already responding
    const pingResp = await new Promise(resolve => {
      chrome.tabs.sendMessage(tabId, { action: ExtensionMessage.PING }, resp => {
        if (chrome.runtime.lastError || !resp || !resp.pong) {
          resolve(null);
        } else {
          resolve(resp);
        }
      });
    });

    if (pingResp && pingResp.pong) {
      return { success: true, alreadyInjected: true };
    }

    // 2. Not yet loaded: inject CSS and JS files programmatically using chrome.scripting
    try {
      if (chrome.scripting && chrome.scripting.insertCSS) {
        await chrome.scripting.insertCSS({
          target: { tabId },
          files: ['content/content-script.css'],
        });
      }

      if (chrome.scripting && chrome.scripting.executeScript) {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content/content-script.js'],
        });
      }
    } catch (injErr) {
      const msg = injErr?.message || '';
      const isPermissionDenied = /permission|must request permission|cannot access|host permission/i.test(msg);
      const isRestricted = /cannot access a chrome:|restricted|cannot be scripted/i.test(msg);

      return {
        success: false,
        error: isPermissionDenied ? 'Host permission required for this website.' : msg,
        needsPermission: isPermissionDenied,
        restricted: isRestricted,
      };
    }

    // 3. Verify newly injected content script responds
    const verifyResp = await new Promise(resolve => {
      chrome.tabs.sendMessage(tabId, { action: ExtensionMessage.PING }, resp => {
        if (chrome.runtime.lastError || !resp || !resp.pong) {
          resolve(null);
        } else {
          resolve(resp);
        }
      });
    });

    if (!verifyResp || !verifyResp.pong) {
      return {
        success: false,
        error: 'Content script was injected but did not respond to ping.',
        missingResponse: true,
      };
    }

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
  if (
    message.action === 'LF_ENSURE_CONTENT_SCRIPT' ||
    message.action === ExtensionMessage.ENSURE_CONTENT_SCRIPT
  ) {
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
        sendResponse({
          success: false,
          error: `Could not connect to active page: ${injectRes.error}`,
          needsPermission: injectRes.needsPermission,
          restricted: injectRes.restricted,
        });
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

// Guard: monitor tab updates and notify sidepanel
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab && tab.url && (changeInfo.status === 'complete' || changeInfo.url)) {
    chrome.runtime.sendMessage({
      action: ExtensionMessage.PAGE_NAVIGATED,
      tabId,
      url: tab.url,
      hostname: isAllowedHost(tab.url) ? new URL(tab.url).hostname : '',
      restricted: !isAllowedHost(tab.url),
    }).catch(() => {
      // Side panel may be closed, ignore
    });
  }
});

// Guard: monitor tab switches (activation) and notify sidepanel
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.runtime.sendMessage({
    action: ExtensionMessage.TAB_ACTIVATED,
    tabId: activeInfo.tabId,
  }).catch(() => {
    // Side panel may be closed, ignore
  });
});
