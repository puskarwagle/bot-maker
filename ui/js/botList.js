import { fetchBots, startBotAPI, stopBotAPI, deleteBot, loadBotFile } from './api.js';
import { validateBotName, validateStartUrl, showValidationErrors, clearValidationErrors } from './validation.js';
import { bot } from './botEditor.js';
import { renderStates } from './states.js';


// -------------------- Refresh Editor List Only --------------------
export async function refreshBotsEditor() {
    const editorList = document.getElementById('editor-bots-list');
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
                        <h3 class="card-title">${b.name}</h3>
                        <p class="text-sm text-gray-600">
                            <span class="badge badge-outline mr-2">States: ${b.states_count}</span>
                            <span class="badge badge-outline mr-2">URL: ${b.start_url || 'https://example.com'}</span>
                            <span class="badge badge-outline">File: ${b.file.split('/').pop()}</span>
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

// -------------------- Event Listeners --------------------
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

    if (action === 'edit') {
        await loadBot(botFile);
    } else if (action === 'delete') {
        if (confirm(`Are you sure you want to delete ${botFile}?`)) {
            await deleteBot(botFile);
            await refreshBotsEditor();
        }
    } else if (action === 'start') {
        await startBotAPI(botName);
        await refreshBotsEditor();
    } else if (action === 'stop') {
        await stopBotAPI(botName);
        await refreshBotsEditor();
    } else if (action === 'pause') {
        await fetch(`/api/bots/${botName}/pause`, { method: 'POST' });
    } else if (action === 'resume') {
        await fetch(`/api/bots/${botName}/resume`, { method: 'POST' });
    }
}

// -------------------- Load Bot for Editing --------------------
async function loadBot(file) {
    try {
        const botData = await loadBotFile(file);
        clearValidationErrors();

        // Validate bot name & start URL before editing
        const nameValidation = validateBotName(botData.bot_name || '');
        const urlValidation = validateStartUrl(botData.start_url || '');
        const validationErrors = [...nameValidation.errors, ...urlValidation.errors];

        if (validationErrors.length > 0) {
            showValidationErrors(validationErrors);
            console.warn('Bot validation failed on load:', validationErrors);
        }

        Object.assign(bot, botData);
        bot.file_name = file;

        // Update editor UI fields
        document.getElementById('bot-name').value = botData.bot_name || '';
        document.getElementById('start-url').value = botData.start_url || '';

        // Re-render states in editor
        renderStates();

        // **SHOW FORM & NEW STATE BUTTON**
        const stateBuilderCard = document.getElementById('state-builder-card');
        if (stateBuilderCard) stateBuilderCard.classList.remove('hidden');

        const newStateBtn = document.getElementById('new-state-btn');
        if (newStateBtn) newStateBtn.classList.remove('hidden');

        console.log('Bot loaded for editing:', file);
    } catch (error) {
        console.error('Failed to load bot:', error);
        alert('Failed to load bot for editing');
    }
}


// -------------------- Convenience --------------------
export async function refreshBotsList() {
    await refreshBotsEditor();
}
