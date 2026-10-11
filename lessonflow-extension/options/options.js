// LessonFlow Chrome Extension — Options Page Controller

document.addEventListener('DOMContentLoaded', () => {
  const apiUrlInput = document.getElementById('apiUrl');
  const apiTokenInput = document.getElementById('apiToken');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');

  // Load stored settings
  chrome.storage.local.get(['apiUrl', 'apiToken'], result => {
    apiUrlInput.value = result.apiUrl || 'http://localhost:3000';
    apiTokenInput.value = result.apiToken || 'lf_tok_active';
  });

  saveBtn.addEventListener('click', () => {
    const apiUrl = apiUrlInput.value.trim() || 'http://localhost:3000';
    const apiToken = apiTokenInput.value.trim() || 'lf_tok_active';

    chrome.storage.local.set({ apiUrl, apiToken }, () => {
      statusEl.style.display = 'block';
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 2000);
    });
  });
});
