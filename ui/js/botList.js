import { fetchBots, startBotAPI, stopBotAPI, deleteBot, loadBotFile } from './api.js';

export async function refreshBotsDashboard() {
    const botsList = document.getElementById('bots-list');
    botsList.innerHTML = '<p>Loading bots...</p>';

    try {
        const bots = await fetchBots();

        if (!bots.length) {
            botsList.innerHTML = '<p class="text-gray-500 italic">No bots found.</p>';
        } else {
            botsList.innerHTML = bots.map(bot => `
                <div class="card bg-base-200 shadow-md mb-4">
                    <div class="card-body flex justify-between items-center">
                        <div>
                            <h3 class="card-title">${bot.name}</h3>
                            <p>States: ${bot.states_count} | URL: ${bot.start_url || 'https://example.com'}</p>
                            <p class="text-sm text-gray-500">File: ${bot.file}</p>
                        </div>
                        <div class="flex gap-2">
                            <button class="btn btn-sm btn-primary" data-action="start" data-bot-name="${bot.name}">▶️ Start</button>
                            <button class="btn btn-sm btn-secondary" data-action="stop" data-bot-name="${bot.name}">⏹️ Stop</button>
                        </div>
                    </div>
                </div>
            `).join('');
            
            setupDashboardEventListeners(botsList);
        }
    } catch (err) {
        botsList.innerHTML = '<p style="color:red;">Failed to load bots</p>';
        console.error(err);
    }
}

export async function refreshBotsEditor() {
    const editorList = document.getElementById('editor-bots-list');
    editorList.innerHTML = '<p>Loading bots...</p>';

    try {
        const bots = await fetchBots();

        if (!bots.length) {
            editorList.innerHTML = '<p class="text-gray-500 italic">No bots available.</p>';
        } else {
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
                        </div>
                    </div>
                </div>
            `).join('');
            
            setupEditorEventListeners(editorList);
        }
    } catch (err) {
        editorList.innerHTML = '<p style="color:red;">Failed to load bots</p>';
        console.error(err);
    }
}

// -------------------- Event Listeners --------------------
function setupDashboardEventListeners(container) {
    container.removeEventListener('click', handleDashboardButtonClick);
    container.addEventListener('click', handleDashboardButtonClick);
}

function setupEditorEventListeners(container) {
    container.removeEventListener('click', handleEditorButtonClick);
    container.addEventListener('click', handleEditorButtonClick);
}

async function handleDashboardButtonClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    
    const action = button.getAttribute('data-action');
    const botName = button.getAttribute('data-bot-name');
    
    if (action === 'start') {
        await startBotAPI(botName);
        refreshBotsDashboard();
    } else if (action === 'stop') {
        await stopBotAPI(botName);
        refreshBotsDashboard();
    }
}

async function handleEditorButtonClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    
    const action = button.getAttribute('data-action');
    const botFile = button.getAttribute('data-bot-file');
    
    if (action === 'edit') {
        await loadBot(botFile);
    } else if (action === 'delete') {
        if (confirm(`Are you sure you want to delete ${botFile}?`)) {
            await deleteBot(botFile);
            refreshBotsEditor();
        }
    }
}

// -------------------- Load Bot for Editing --------------------
async function loadBot(file) {
    try {
        const botData = await loadBotFile(file);
        // Import bot editor and load the bot
        const { bot } = await import('./botEditor.js');
        Object.assign(bot, botData);
        bot.file_name = file;
        
        // Update UI with loaded bot data
        document.getElementById('bot-name').value = botData.bot_name || '';
        document.getElementById('start-url').value = botData.start_url || '';
        
        // Re-render states
        const { renderStates } = await import('./states.js');
        renderStates();
        
        console.log('Bot loaded for editing:', file);
    } catch (error) {
        console.error('Failed to load bot:', error);
        alert('Failed to load bot for editing');
    }
}

// Convenience function if you still want both updated together
export async function refreshBotsList() {
    await Promise.all([refreshBotsDashboard(), refreshBotsEditor()]);
}
