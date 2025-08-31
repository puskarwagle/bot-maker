/* =========================================================
   app.js - App Initialization & Bot Management
   DOMContentLoaded, bot list UI, utilities, shared state
   ========================================================= */

import {
  fetchBots,
  loadBotFile,
  deleteBot,
  startBotAPI,
  stopBotAPI,
  pauseBotAPI,
  resumeBotAPI,
  saveBot
} from './api.js';

import {
  loadBot,
  renderStates,
  newState,
  loadDropdownOptions,
  setupSelectorInputListeners
} from './editor.js';

/* =========================================================
   SHARED STATE & EXPORTS
   ========================================================= */

let bot = {
  bot_name: '',
  start_url: '',
  states: [],
  file_name: null,
};

let ALLOWED_ACTIONS = [];
let ALLOWED_CONDITIONS = [];

export function getAllowedActions() { return ALLOWED_ACTIONS; }
export function getAllowedConditions() { return ALLOWED_CONDITIONS; }
export { bot, ALLOWED_ACTIONS, ALLOWED_CONDITIONS };

/* =========================================================
   BOT MANAGEMENT UI
   ========================================================= */

async function refreshBotsEditor() {
  const editorList = document.getElementById('editor-bots-list');
  if (!editorList) return;
  editorList.innerHTML = '<p>Loading bots...</p>';

  try {
    const bots = await fetchBots();

    if (!bots.length) {
      editorList.innerHTML = '<p class="text-gray-500 italic">No bots available.</p>';
      return;
    }

    editorList.innerHTML = bots.map(b => `
          <div class="card bg-base-200 shadow-md mb-4">
            <div class="card-body flex flex-row justify-between items-center">
              <div>
                <h3 class="card-title">${b.name || 'Unnamed Bot'}</h3>
                <p class="text-sm text-gray-600">
                  <span class="badge badge-outline mr-2">States: ${b.states_count ?? 0}</span>
                  <span class="badge badge-outline mr-2">URL: ${b.start_url || 'https://example.com'}</span>
                  <span class="badge badge-outline">File: ${b.file || 'unknown'}</span>
                </p>
              </div>
              <div class="flex gap-2">
                <button class="btn btn-sm btn-primary" data-action="edit" data-bot-file="${b.file}">✏️ Edit</button>
                <button class="btn btn-sm btn-error" data-action="delete" data-bot-file="${b.file}">🗑️ Delete</button>
                <button class="btn btn-sm btn-success" data-action="start" data-bot-name="${b.name}">▶️ Start</button>
                <button class="btn btn-sm btn-warning" data-action="pause" data-bot-name="${b.name}">⏸️ Pause</button>
                <button class="btn btn-sm btn-success" data-action="resume" data-bot-name="${b.name}">▶️ Resume</button>
                <button class="btn btn-sm btn-warning" data-action="stop" data-bot-name="${b.name}">⏹️ Stop</button>
              </div>
            </div>
          </div>
        `).join('');

    setupEditorEventListeners(editorList);

  } catch (err) {
    editorList.innerHTML = '<p style="color:red;">Failed to load bots</p>';
    console.error(err);
  }
}

function setupEditorEventListeners(container) {
  container.removeEventListener('click', handleEditorButtonClick);
  container.addEventListener('click', handleEditorButtonClick);
}

async function handleEditorButtonClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.getAttribute('data-action');
  const botFile = button.getAttribute('data-bot-file');
  const botName = button.getAttribute('data-bot-name');

  // Disable button during operation to prevent multiple clicks
  if (button.disabled) return;
  button.disabled = true;

  try {
    if (action === 'edit') {
      await loadBotFromFile(botFile);
    } else if (action === 'delete') {
      await deleteBot(botFile);
      await refreshBotsEditor();
    } else if (action === 'start') {
      await startBotAPI(botName);
      await refreshBotsEditor();
    } else if (action === 'stop') {
      await stopBotAPI(botName);
      await refreshBotsEditor();
    } else if (action === 'pause') {
      await pauseBotAPI(botName);
    } else if (action === 'resume') {
      await resumeBotAPI(botName);
    }
  } finally {
    button.disabled = false;
  }
}

async function loadBotFromFile(file) {
  try {
    const botData = await loadBotFile(file);

    const { validateBotName, validateStartUrl, showValidationErrors, clearValidationErrors } =
      await import('./validation.js');

    clearValidationErrors();

    const nameValidation = validateBotName(botData.bot_name || '');
    const urlValidation = validateStartUrl(botData.start_url || '');
    const validationErrors = [...nameValidation.errors, ...urlValidation.errors];

    if (validationErrors.length > 0) {
      showValidationErrors(validationErrors);
      console.warn('Bot validation failed on load:', validationErrors);
    }

    Object.assign(bot, botData);
    bot.file_name = file;

    const nameEl = document.getElementById('bot-name');
    const urlEl = document.getElementById('start-url');
    if (nameEl) nameEl.value = botData.bot_name || '';
    if (urlEl) urlEl.value = botData.start_url || '';

    renderStates();

    const stateBuilderCard = document.getElementById('state-builder-card');
    // if (stateBuilderCard) stateBuilderCard.classList.remove('hidden');

    const newStateBtn = document.getElementById('new-state-btn');
    if (newStateBtn) newStateBtn.classList.remove('hidden');

    console.log('Bot loaded for editing:', file);
  } catch (error) {
    console.error('Failed to load bot:', error);
    alert('Failed to load bot for editing');
  }
}

async function refreshBotsList() {
  await refreshBotsEditor();
}



/* =========================================================
   NOTIFICATION SYSTEM
   ========================================================= */

function showNotification(type, title, message, autoHide = true) {
  const notification = document.getElementById('bot-notification');
  const icon = document.getElementById('notification-icon');
  const titleEl = document.getElementById('notification-title');
  const messageEl = document.getElementById('notification-message');
  const alertEl = notification.querySelector('.alert');

  if (!notification || !icon || !titleEl || !messageEl || !alertEl) return;

  // Reset classes
  alertEl.className = 'alert shadow-lg';

  // Set type-specific styling and icons
  switch (type) {
    case 'success':
      alertEl.classList.add('alert-success');
      icon.innerHTML = '✓';
      break;
    case 'error':
      alertEl.classList.add('alert-error');
      icon.innerHTML = '✗';
      break;
    case 'warning':
      alertEl.classList.add('alert-warning');
      icon.innerHTML = '⚠';
      break;
    case 'info':
    default:
      alertEl.classList.add('alert-info');
      icon.innerHTML = 'ℹ';
      break;
  }

  // Set content
  titleEl.textContent = title;
  messageEl.textContent = message;

  // Show notification
  notification.classList.remove('hidden');

  // Auto-hide after 5 seconds for success, 8 seconds for errors
  if (autoHide) {
    const delay = type === 'success' ? 5000 : 8000;
    setTimeout(() => hideNotification(), delay);
  }
}

function hideNotification() {
  const notification = document.getElementById('bot-notification');
  if (notification) {
    notification.classList.add('hidden');
  }
}

// Make hideNotification available globally for the HTML onclick
window.hideNotification = hideNotification;
/* =========================================================
 BOT CREATION
 ========================================================= */

function slugifyName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
}

async function createNewBot() {
  const { validateBotName, validateStartUrl, showValidationErrors, clearValidationErrors } =
    await import('./validation.js');

  const botNameField = document.getElementById("bot-name");
  const startUrlField = document.getElementById("start-url");

  const rawName = (botNameField?.value || "").trim();
  const startUrl = (startUrlField?.value || "").trim();

  clearValidationErrors();

  const nameValidation = validateBotName(rawName);
  if (!nameValidation.isValid) {
    showValidationErrors(nameValidation.errors);
    showNotification('error', 'Validation Failed', 'Please fix the bot name errors above.');
    return;
  }

  const urlValidation = validateStartUrl(startUrl);
  if (!urlValidation.isValid) {
    showValidationErrors(urlValidation.errors);
    showNotification('error', 'Validation Failed', 'Please fix the start URL errors above.');
    return;
  }

  const slug = slugifyName(rawName);
  const fileName = `${slug}.json`;

  try {
    const listRes = await fetch("/api/bots");
    if (listRes.ok) {
      const bots = await listRes.json();
      const exists = bots.some(b => (b.file === fileName) || (b.name === rawName));
      if (exists) {
        const ok = confirm(
          `A bot with this name/file already exists:\n\n` +
          `Name: ${rawName}\nFile: ${fileName}\n\nOverwrite it?`
        );
        if (!ok) {
          showNotification('info', 'Cancelled', 'Bot creation was cancelled.');
          return;
        }
      }
    }
  } catch {
    // continue; save endpoint will handle
  }

  const newBot = {
    bot_name: rawName,
    start_url: startUrl,
    states: [],
    file_name: fileName
  };

  try {
    const response = await fetch("/api/bots/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBot)
    });

    const data = await response.json();

    if (!response.ok) {
      showNotification('error', 'Creation Failed', data.error || response.statusText);
      return;
    }

    // SUCCESS: Clear inputs and show confirmation
    if (botNameField) botNameField.value = '';
    if (startUrlField) startUrlField.value = '';

    // Clear any field-specific validation errors
    ['bot-name', 'start-url'].forEach(fieldId => {
      const field = document.getElementById(fieldId);
      const errorElement = document.getElementById(`${fieldId}-error`);
      if (field) {
        field.classList.remove('input-error', 'input-success');
      }
      if (errorElement) {
        errorElement.remove();
      }
    });

    // Load the bot for editing
    Object.assign(bot, newBot);
    loadBot(newBot);

    await refreshBotsList();

    // Show success notification
    showNotification('success', 'Bot Created!', `${rawName} is ready. You can now add states to build your automation.`);

  } catch (err) {
    console.error("Error creating bot:", err);
    showNotification('error', 'Network Error', 'Failed to connect to server. Check your connection and try again.');
  }
}

/* =========================================================
   APP INITIALIZATION
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  // Real-time validation (lazy import to avoid circular static import)
  const botNameField = document.getElementById('bot-name');
  const startUrlField = document.getElementById('start-url');

  if (botNameField) {
    botNameField.addEventListener('input', async () => {
      const { validateField, validateBotName } = await import('./validation.js');
      validateField('bot-name', validateBotName);
    });
  }

  if (startUrlField) {
    startUrlField.addEventListener('input', async () => {
      const { validateField, validateStartUrl } = await import('./validation.js');
      validateField('start-url', validateStartUrl);
    });
  }

  // Buttons
  document.getElementById("create-bot-btn")?.addEventListener("click", createNewBot);
  document.getElementById("new-state-btn")?.addEventListener("click", newState);

  // Data/Init
  await loadDropdownOptions();
  setupSelectorInputListeners();
  renderStates();
  refreshBotsList();
});