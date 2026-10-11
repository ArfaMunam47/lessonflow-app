/**
 * LessonFlow Chrome Extension — Content Script
 * 
 * Injected into the active school website / demo page to:
 * - Inspect and select form elements interactively
 * - Compute robust, stable CSS selectors
 * - Fill fields safely and verify resulting values
 * - Handle dynamic block creation ("Add Block")
 * - Provide live visual feedback without modifying website layout
 */

(() => {
  // Prevent duplicate initialization in the same window context
  if (window.__LESSONFLOW_CONTENT_SCRIPT_INITIALIZED__) return;
  window.__LESSONFLOW_CONTENT_SCRIPT_INITIALIZED__ = true;

  let isInspecting = false;
  let hoveredElement = null;
  let tooltipEl = null;

  // -------------------------------------------------------------
  // Tooltip Helper
  // -------------------------------------------------------------
  function getOrCreateTooltip() {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'lessonflow-inspect-tooltip';
      document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  function updateTooltip(target, selector) {
    const tip = getOrCreateTooltip();
    if (!target) {
      tip.style.display = 'none';
      return;
    }

    const tag = target.tagName.toLowerCase();
    const type = target.getAttribute('type') || '';
    const label = findAssociatedLabel(target) || target.getAttribute('placeholder') || target.getAttribute('aria-label') || '';

    tip.innerHTML = `
      <div><span class="lf-tag">&lt;${tag}${type ? ` type="${type}"` : ''}&gt;</span> ${label ? `<strong>"${label}"</strong>` : ''}</div>
      <span class="lf-sel">${escapeHtml(selector)}</span>
      <div class="lf-hint">Click element to map to LessonFlow</div>
    `;

    tip.style.display = 'block';

    // Position tooltip near cursor or element
    const rect = target.getBoundingClientRect();
    const top = Math.max(10, rect.top - 45);
    const left = Math.min(window.innerWidth - 320, Math.max(10, rect.left));

    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // -------------------------------------------------------------
  // Label and Metadata Resolvers
  // -------------------------------------------------------------
  function findAssociatedLabel(el) {
    if (!el) return '';

    // 1. Label with for="id"
    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label && label.textContent.trim()) {
        return label.textContent.trim();
      }
    }

    // 2. Parent label
    const parentLabel = el.closest('label');
    if (parentLabel && parentLabel.textContent.trim()) {
      return parentLabel.textContent.trim();
    }

    // 3. aria-label or placeholder
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
    if (el.getAttribute('placeholder')) return el.getAttribute('placeholder').trim();

    // 4. Preceding sibling label or text
    let prev = el.previousElementSibling;
    while (prev) {
      if (prev.tagName.toLowerCase() === 'label' || prev.classList.contains('label')) {
        return prev.textContent.trim();
      }
      prev = prev.previousElementSibling;
    }

    return '';
  }

  // -------------------------------------------------------------
  // Robust Selector Builder
  // -------------------------------------------------------------
  function buildRobustSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return '';

    // Safety: Never target submit buttons
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (type === 'submit') {
      return null;
    }

    // 1. Stable Unique ID (ignoring auto-generated numbers like :r0:)
    if (el.id && !el.id.startsWith(':') && !/^[0-9]+$/.test(el.id)) {
      const idSelector = `#${CSS.escape(el.id)}`;
      if (document.querySelectorAll(idSelector).length === 1) {
        return idSelector;
      }
    }

    // 2. Name attribute (very common in form fields)
    const name = el.getAttribute('name');
    if (name) {
      const nameSelector = `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
      if (document.querySelectorAll(nameSelector).length === 1) {
        return nameSelector;
      }
      // Scoped to form
      const form = el.closest('form');
      if (form && form.id) {
        const formScoped = `form#${CSS.escape(form.id)} ${nameSelector}`;
        if (document.querySelectorAll(formScoped).length === 1) {
          return formScoped;
        }
      }
    }

    // 3. Data-testid or custom data attribute
    const dataTestId = el.getAttribute('data-testid') || el.getAttribute('data-qa') || el.getAttribute('data-cy');
    if (dataTestId) {
      const testSelector = `[data-testid="${CSS.escape(dataTestId)}"]`;
      if (document.querySelectorAll(testSelector).length === 1) {
        return testSelector;
      }
    }

    // 4. Block Container Context (Crucial for repeated block fields!)
    const blockContainer = el.closest('[data-block], .lesson-block, .block-card, .block-row, fieldset');
    if (blockContainer) {
      let blockId = blockContainer.getAttribute('data-block') || blockContainer.getAttribute('data-block-number');
      const innerSelector = el.id ? `#${CSS.escape(el.id)}` : (name ? `[name="${CSS.escape(name)}"]` : el.tagName.toLowerCase());
      
      if (blockId) {
        return `[data-block="${CSS.escape(blockId)}"] ${innerSelector}`;
      }
    }

    // 5. Hierarchy fallback
    let path = [];
    let current = el;
    while (current && current !== document.body && path.length < 4) {
      let part = current.tagName.toLowerCase();
      if (current.id) {
        part += `#${CSS.escape(current.id)}`;
        path.unshift(part);
        break;
      } else if (current.className && typeof current.className === 'string') {
        const primaryClass = current.className.trim().split(/\s+/).find(c => !c.includes(':') && c.length > 2);
        if (primaryClass) {
          part += `.${CSS.escape(primaryClass)}`;
        }
      }
      path.unshift(part);
      current = current.parentElement;
    }

    const fallback = path.join(' > ');
    return fallback || el.tagName.toLowerCase();
  }

  // -------------------------------------------------------------
  // Inspection Event Handlers
  // -------------------------------------------------------------
  function handleMouseOver(e) {
    if (!isInspecting) return;
    const target = e.target;
    if (!target || target === tooltipEl || tooltipEl?.contains(target)) return;

    if (hoveredElement && hoveredElement !== target) {
      hoveredElement.classList.remove('lessonflow-inspect-highlight');
    }

    hoveredElement = target;
    hoveredElement.classList.add('lessonflow-inspect-highlight');

    const selector = buildRobustSelector(target);
    updateTooltip(target, selector || 'element');
  }

  function handleMouseOut(e) {
    if (!isInspecting) return;
    if (e.target && e.target === hoveredElement) {
      e.target.classList.remove('lessonflow-inspect-highlight');
    }
  }

  function handleClick(e) {
    if (!isInspecting) return;
    e.preventDefault();
    e.stopPropagation();

    const target = hoveredElement || e.target;
    if (!target) return;

    const selector = buildRobustSelector(target);
    if (!selector) {
      alert('Cannot map submit buttons or invalid controls. Please choose an editable field.');
      return;
    }

    const tag = target.tagName.toLowerCase();
    const type = (target.getAttribute('type') || '').toLowerCase();
    const label = findAssociatedLabel(target);
    const placeholder = target.getAttribute('placeholder') || '';
    const isContentEditable = target.isContentEditable;
    const isButton = tag === 'button' || type === 'button' || type === 'submit';

    let elementType = 'text';
    if (tag === 'textarea') elementType = 'textarea';
    else if (tag === 'select') elementType = 'select';
    else if (type === 'checkbox') elementType = 'checkbox';
    else if (isContentEditable) elementType = 'contenteditable';
    else if (isButton) elementType = 'button';

    // Collect options if select
    let options = [];
    if (tag === 'select') {
      options = Array.from(target.querySelectorAll('option')).map(opt => ({
        value: opt.value,
        text: opt.textContent.trim(),
      }));
    }

    // Stop inspection
    stopInspectionMode();

    // Send result back to side panel
    chrome.runtime.sendMessage({
      action: 'LF_INSPECTION_RESULT',
      data: {
        selector,
        tagName: tag,
        elementType,
        inputType: type,
        label,
        placeholder,
        currentValue: target.value || target.textContent.trim() || '',
        options,
        isButton,
        isEditable: !target.disabled && !target.readOnly,
      },
    });
  }

  function handleKeyDown(e) {
    if (isInspecting && e.key === 'Escape') {
      e.preventDefault();
      stopInspectionMode();
      chrome.runtime.sendMessage({ action: 'LF_INSPECTION_CANCELLED' });
    }
  }

  function startInspectionMode() {
    isInspecting = true;
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    getOrCreateTooltip();
  }

  function stopInspectionMode() {
    isInspecting = false;
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);

    if (hoveredElement) {
      hoveredElement.classList.remove('lessonflow-inspect-highlight');
      hoveredElement = null;
    }
    if (tooltipEl) {
      tooltipEl.style.display = 'none';
    }
  }

  // -------------------------------------------------------------
  // Safe React / Vue / Angular Compatible Value Setter
  // -------------------------------------------------------------
  function setNativeValue(element, value) {
    const isInput = element instanceof HTMLInputElement;
    const isTextArea = element instanceof HTMLTextAreaElement;

    if (isInput || isTextArea) {
      const prototype = isInput ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

      if (descriptor && descriptor.set) {
        descriptor.set.call(element, value);
      } else {
        element.value = value;
      }
    } else if (element.isContentEditable) {
      element.innerText = value;
    } else {
      element.value = value;
    }

    // Dispatch synthetic input and change events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  // -------------------------------------------------------------
  // Single Field Fill & Verification
  // -------------------------------------------------------------
  async function fillSingleField({ selector, expectedValue, fieldKey }) {
    if (!selector) {
      return { success: false, error: 'No selector provided for field.' };
    }

    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) {
      return {
        success: false,
        error: `Could not find field on page matching: "${selector}". The school website may have changed.`,
      };
    }

    if (elements.length > 1) {
      return {
        success: false,
        error: `Ambiguous selector: matches ${elements.length} elements. Please remap with a more specific block selector.`,
      };
    }

    const el = elements[0];

    // Check visibility and editability
    if (el.disabled || el.readOnly) {
      return { success: false, error: 'Field is disabled or read-only on the website.' };
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return { success: false, error: 'Field is currently hidden or collapsed on the website.' };
    }

    const targetVal = String(expectedValue || '').trim();

    // Native <select> handling
    if (el.tagName.toLowerCase() === 'select') {
      const options = Array.from(el.querySelectorAll('option'));
      const q = targetVal.toLowerCase();

      // Look for match
      const matchedOpt = options.find(
        o => o.value.toLowerCase() === q || o.textContent.trim().toLowerCase() === q
      );

      if (!matchedOpt) {
        return {
          success: false,
          needsManualSelection: true,
          error: `Could not confidently match option "${targetVal}" in dropdown. Available: [${options.map(o => o.textContent.trim()).slice(0, 5).join(', ')}]. Please select manually.`,
        };
      }

      el.value = matchedOpt.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.classList.add('lessonflow-field-verified');

      return {
        success: true,
        verified: true,
        resultingValue: matchedOpt.textContent.trim(),
        alreadyMatched: false,
      };
    }

    // Check if already matches
    const currentVal = (el.value || el.innerText || '').trim();
    if (currentVal === targetVal && targetVal.length > 0) {
      el.classList.add('lessonflow-field-verified');
      return {
        success: true,
        verified: true,
        resultingValue: currentVal,
        alreadyMatched: true,
      };
    }

    // Focus & Set Value
    el.focus();
    setNativeValue(el, targetVal);

    // Read back and verify
    await new Promise(r => setTimeout(r, 60));
    const resultingVal = (el.value || el.innerText || '').trim();
    const verified = resultingVal === targetVal;

    if (verified) {
      el.classList.add('lessonflow-field-verified');
      setTimeout(() => el.classList.remove('lessonflow-field-verified'), 1500);
    }

    return {
      success: true,
      verified,
      resultingValue: resultingVal,
      alreadyMatched: false,
      warning: !verified ? `Verification discrepancy: expected "${targetVal.slice(0, 30)}", website contains "${resultingVal.slice(0, 30)}"` : undefined,
    };
  }

  // -------------------------------------------------------------
  // Dynamic Block Creator ("Add Block")
  // -------------------------------------------------------------
  async function clickAddBlock({ selector, currentBlockCount }) {
    const btn = document.querySelector(selector);
    if (!btn) {
      return {
        success: false,
        error: `Could not find Add Block button matching: "${selector}".`,
      };
    }

    const initialBlocks = document.querySelectorAll('[data-block], .lesson-block, .block-card, .block-row').length;

    // Click button
    btn.click();

    // Wait for DOM to update with a new block
    const startTime = Date.now();
    const maxWaitMs = 4000;

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(r => setTimeout(r, 200));
      const newCount = document.querySelectorAll('[data-block], .lesson-block, .block-card, .block-row').length;
      if (newCount > initialBlocks) {
        return {
          success: true,
          newBlockCount: newCount,
          message: `Block ${newCount} created successfully.`,
        };
      }
    }

    return {
      success: false,
      error: 'Timeout waiting for new block to appear after clicking Add Block. Please check the school website form.',
    };
  }

  // -------------------------------------------------------------
  // Message Listener
  // -------------------------------------------------------------
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return false;

    if (message.action === 'LF_PING') {
      sendResponse({ pong: true });
      return false;
    }

    if (message.action === 'LF_GET_PAGE_INFO') {
      const forms = document.querySelectorAll('form');
      const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
      const addBlockBtns = Array.from(document.querySelectorAll('button, a')).filter(b =>
        /add\s*(lesson)?\s*block/i.test(b.textContent || '')
      );

      sendResponse({
        url: window.location.href,
        hostname: window.location.hostname,
        title: document.title,
        hasForms: forms.length > 0 || inputs.length > 2,
        inputCount: inputs.length,
        hasAddBlockBtn: addBlockBtns.length > 0,
      });
      return false;
    }

    if (message.action === 'LF_START_INSPECTION') {
      startInspectionMode();
      sendResponse({ inspecting: true });
      return false;
    }

    if (message.action === 'LF_STOP_INSPECTION') {
      stopInspectionMode();
      sendResponse({ inspecting: false });
      return false;
    }

    if (message.action === 'LF_TEST_SELECTOR') {
      const { selector } = message;
      if (!selector) {
        sendResponse({ valid: false, error: 'Selector is required.' });
        return false;
      }
      try {
        const matches = document.querySelectorAll(selector);
        if (matches.length === 1) {
          const el = matches[0];
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('lessonflow-inspect-highlight');
          setTimeout(() => el.classList.remove('lessonflow-inspect-highlight'), 1800);
          sendResponse({
            valid: true,
            count: 1,
            tagName: el.tagName.toLowerCase(),
            label: findAssociatedLabel(el),
          });
        } else {
          sendResponse({
            valid: false,
            count: matches.length,
            error: matches.length === 0 ? 'No element found.' : `Ambiguous: matches ${matches.length} elements.`,
          });
        }
      } catch (err) {
        sendResponse({ valid: false, error: err.message });
      }
      return false;
    }

    if (message.action === 'LF_FILL_SINGLE_FIELD') {
      fillSingleField(message)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true; // async
    }

    if (message.action === 'LF_CLICK_ADD_BLOCK') {
      clickAddBlock(message)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true; // async
    }

    return false;
  });
})();
