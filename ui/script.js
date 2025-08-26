// ------------------ Initialize bot ------------------
let bot = null; // No default bot
let autoSaveTimeout;

// ------------------ Predefined Conditions ------------------
const CONDITION_OPTIONS = [
    "always",
    "element_exists(['#selector'])",
    "element_not_exists(['#selector'])",
    "variable_equals('var', 'value')"
];

// ------------------ Action Field Logic ------------------
document.getElementById('action').addEventListener('change', function() {
    const action = this.value;
    const valueGroup = document.getElementById('value-group');
    const valueInput = document.getElementById('value');
    const valueLabel = valueGroup.querySelector('label');

    if (action === 'fill') {
        valueLabel.textContent = 'Value:';
        valueInput.placeholder = 'Text to fill';
        valueGroup.style.display = 'block';
    } else if (action === 'extract') {
        valueLabel.textContent = 'Store As:';
        valueInput.placeholder = 'Variable name';
        valueGroup.style.display = 'block';
    } else {
        valueGroup.style.display = 'none';
    }
});

// ------------------ Create New Bot ------------------
async function createNewBot() {
    const botNameInput = document.getElementById('bot-name').value.trim();
    botNameInput.toLowerCase().replace(/\s+/g, "_");
    if (!botNameInput) {
        alert("Enter a bot name first");
        return;
    }

    const fileName = botNameInput + ".json";

    const newBot = {
        bot_name: botNameInput,
        start_url: document.getElementById('start-url').value || '',
        states: [],
        file_name: fileName
    };

    try {
        const response = await fetch('/api/bots/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newBot)
        });

        if (!response.ok) {
            const data = await response.json();
            alert(`Failed to create bot: ${data.error || response.statusText}`);
            return;
        }

        bot = newBot; // set current bot in UI
        updatePreview();
        renderStates();
        refreshBotsListForEditor();
        alert(`Created bot: ${botNameInput}`);
    } catch (err) {
        console.error("Error creating bot:", err);
        alert("Error creating bot");
    }
}


// ------------------ Start Bot ------------------
async function startBot(botName) {
    if (!botName) return;

    try {
        const response = await fetch(`/api/bots/${encodeURIComponent(botName)}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (response.ok) {
            alert(`Started bot: ${botName}`);
            refreshBots(); // refresh the runner UI
        } else {
            alert(`Failed to start bot: ${data.error}`);
        }
    } catch (err) {
        console.error('Error starting bot:', err);
        alert('Error starting bot');
    }
}

// ------------------ Stop Bot ------------------
async function stopBot(botName) {
    if (!botName) return;

    try {
        const response = await fetch(`/api/bots/${encodeURIComponent(botName)}/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (response.ok) {
            alert(`Stopped bot: ${botName}`);
            refreshBots(); // refresh the runner UI
        } else {
            alert(`Failed to stop bot: ${data.error}`);
        }
    } catch (err) {
        console.error('Error stopping bot:', err);
        alert('Error stopping bot');
    }
}


// ------------------ Add State ------------------
function addState() {
    if (!bot) { alert('No bot loaded'); return; }

    const action = document.getElementById('action').value;
    const selectors = document.getElementById('selector').value.trim().split(',').map(s => s.trim()).filter(Boolean);
    const value = document.getElementById('value').value.trim();

    if (!selectors.length) { alert('Please enter at least one selector'); return; }

    const transitions = Array.from(document.querySelectorAll('#transitions-container .transition-item')).map(div => ({
        condition: div.querySelector('.transition-condition').value,
        next: div.querySelector('.transition-next').value.trim() || "END",
        selectors: div.querySelector('.transition-selectors')?.value.split(',').map(s=>s.trim()) || undefined,
        text: div.querySelector('.transition-text')?.value || undefined,
        pattern: div.querySelector('.transition-pattern')?.value || undefined
    }));
    if (!transitions.length) transitions.push({ condition: "always", next: "END" });

    const newState = { id: "state_" + Date.now(), action, selectors, transitions };
    if (action === 'fill') newState.value = value;
    if (action === 'extract') newState.store_as = value;

    if (bot.editingStateIndex != null) {
        bot.states[bot.editingStateIndex] = newState;
        bot.editingStateIndex = null;
    } else {
        bot.states.push(newState);
    }

    document.getElementById('selector').value = '';
    document.getElementById('value').value = '';
    document.getElementById('transitions-container').innerHTML = '';

    renderStates();
    updatePreview();  // auto-save triggered here
}

// ------------------ Delete State ------------------
function deleteState(index) {
    if (!bot) return;
    bot.states.splice(index, 1);
    autoSaveBot();
    renderStates();
    updatePreview();
}

// ------------------ Render States ------------------
function renderStates() {
    const container = document.getElementById('states-container');
    if (!bot || !bot.states.length) {
        container.innerHTML = '<p class="text-gray-500 italic">No states added yet</p>';
        return;
    }

    container.innerHTML = bot.states.map((state, index) => `
        <div class="card bg-base-200 shadow-md mb-4">
            <div class="card-body">
                <div class="flex justify-between items-center">
                    <h3 class="card-title">${state.id}</h3>
                    <div class="space-x-2">
                        <button class="btn btn-sm btn-secondary" onclick="loadState(${index})">✏️ Edit</button>
                        <button class="btn btn-sm btn-error" onclick="deleteState(${index})">× Delete</button>
                    </div>
                </div>
                <p><strong>Action:</strong> ${state.action}</p>
                <p><strong>Selectors:</strong> ${state.selectors.join(', ')}</p>
                ${state.value ? `<p><strong>Value:</strong> ${state.value}</p>` : ''}
                ${state.store_as ? `<p><strong>Store As:</strong> ${state.store_as}</p>` : ''}
                <div class="mt-2">
                    <h4 class="font-semibold">Transitions:</h4>
                    ${state.transitions.map(t => `
                        <span class="badge badge-outline mr-2 mb-1">
                            If: ${t.condition} → Go to: ${t.next}
                        </span>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

// ------------------ Add/Remove Transitions ------------------
function addTransitionForm(condition = "always", next = "") {
    const container = document.getElementById('transitions-container');
    const div = document.createElement('div');
    div.className = 'transition-item';
    div.innerHTML = `
        <select class="transition-condition">
            ${CONDITION_OPTIONS.map(c => `<option value="${c}" ${c===condition?'selected':''}>${c}</option>`).join('')}
        </select>
        → Next State: <input type="text" class="transition-next" value="${next}" placeholder="state_2">
        <button type="button" onclick="removeTransition(this)">×</button>
    `;
    container.appendChild(div);
    autoSaveBot();
}
function removeTransition(button) { button.parentElement.remove(); autoSaveBot(); }

// ------------------ Update Preview ------------------
function updatePreview() {
    if (!bot) return;
    bot.bot_name = document.getElementById('bot-name').value || 'NewBot';
    bot.start_url = document.getElementById('start-url').value || 'https://example.com';
    document.getElementById('json-preview').textContent = JSON.stringify(bot, null, 2);
    autoSaveBot();
}
document.getElementById('bot-name').addEventListener('input', updatePreview);
document.getElementById('start-url').addEventListener('input', updatePreview);

// ------------------ Load State ------------------
function loadState(index) {
    if (!bot) return;
    const state = bot.states[index];
    if (!state) return;

    document.getElementById('action').value = state.action;
    document.getElementById('selector').value = state.selectors.join(', ');

    const valueGroup = document.getElementById('value-group');
    const valueInput = document.getElementById('value');
    const valueLabel = valueGroup.querySelector('label');

    if (state.action === 'fill') {
        valueLabel.textContent = 'Value:';
        valueInput.placeholder = 'Text to fill';
        valueInput.value = state.value || '';
        valueGroup.style.display = 'block';
    } else if (state.action === 'extract') {
        valueLabel.textContent = 'Store As:';
        valueInput.placeholder = 'Variable name';
        valueInput.value = state.store_as || '';
        valueGroup.style.display = 'block';
    } else {
        valueGroup.style.display = 'none';
        valueInput.value = '';
    }

    const container = document.getElementById('transitions-container');
    container.innerHTML = '';
    (state.transitions || []).forEach(t => addTransitionForm(t.condition, t.next));

    bot.editingStateIndex = index;
}

// ------------------ Load Bot ------------------
async function loadBot(filePath) {
    try {
        const fileName = getBaseName(filePath);
        const response = await fetch(`/api/bots/${encodeURIComponent(fileName)}`);
        const loadedBot = await response.json();

        bot = loadedBot;
        bot.file_name = fileName;

        document.getElementById('bot-name').value = bot.bot_name || 'NewBot';
        document.getElementById('start-url').value = bot.start_url || 'https://example.com';
        renderStates();
        updatePreview();
        alert(`Loaded bot: ${bot.bot_name}`);
    } catch (e) {
        console.error('Error loading bot:', e);
        alert('Failed to load bot');
    }
}
function getBaseName(path) { return path ? path.split('/').pop() : path; }

// ------------------ Delete Bot ------------------
async function deleteBot(fileName) {
    if (!confirm(`Delete bot file ${fileName}? This cannot be undone.`)) return;
    try {
        await fetch(`/api/bots/${encodeURIComponent(fileName)}`, { method: 'DELETE' });
        refreshBotsListForEditor();
        refreshBots();
        if (bot?.file_name === fileName) bot = null;
        alert(`Deleted ${fileName}`);
    } catch (err) {
        console.error(err);
        alert('Failed to delete bot');
    }
}

// ------------------ Render Editor Bots List ------------------
async function refreshBotsListForEditor() {
    try {
        const response = await fetch('/api/bots');
        const bots = await response.json();
        renderEditorBotsList(bots);
    } catch(e) {
        console.error('Error fetching bots:', e);
        document.getElementById('editor-bots-list').innerHTML = '<p style="color:#e74c3c;">Error loading bots</p>';
    }
}
function renderEditorBotsList(bots) {
    const container = document.getElementById('editor-bots-list');
    if (!bots.length) {
        container.innerHTML = '<p class="text-gray-500 italic">No bots available.</p>';
        return;
    }

    container.innerHTML = bots.map(b => `
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
                    <button class="btn btn-sm btn-primary" onclick="loadBot('${b.file}')">✏️ Edit</button>
                    <button class="btn btn-sm btn-error" onclick="deleteBot('${b.file}')">🗑️ Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

// ------------------ Auto-save ------------------
function autoSaveBot() {
    if (!bot) return;
    const fileName = bot.file_name || `${bot.bot_name.toLowerCase().replace(/ /g,"_")}.json`;

    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(async () => {
        try {
            await fetch('/api/bots/save', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ ...bot, file_name: fileName })
            });
            console.log(`Auto-saved bot as ${fileName}`);
        } catch(err) { console.error('Failed to auto-save bot:', err); }
    }, 500);
}

// ------------------ Tab Switcher ------------------
function showTab(tabName, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('tab-active'));

    document.getElementById(tabName + '-tab').classList.remove('hidden');
    element.classList.add('tab-active');

    if (tabName === 'runner') refreshBots();
    if (tabName === 'bots') refreshBotsListForEditor();
}

// ------------------ Refresh Bot Runner ------------------
async function refreshBots() {
    const container = document.getElementById('bots-list');
    container.innerHTML = '<p>Loading bots...</p>';
    try {
        const response = await fetch('/api/bots');
        const bots = await response.json();
        renderBotsList(bots);
    } catch(error) {
        console.error(error);
        container.innerHTML = '<p style="color:#e74c3c;">Error loading bots</p>';
    }
}
function renderBotsList(bots) {
    const container = document.getElementById('bots-list');
    if (!bots.length) {
        container.innerHTML = '<p class="text-gray-500 italic">No bots found.</p>';
        return;
    }
    container.innerHTML = bots.map(bot => `
        <div class="card w-full bg-base-200 shadow-md mb-4">
            <div class="card-body flex flex-row justify-between items-center">
                <div>
                    <h3 class="card-title">${bot.name}</h3>
                    <p>States: ${bot.states_count} | URL: ${bot.start_url || 'https://example.com'}</p>
                    <p class="text-sm text-gray-500">File: ${bot.file}</p>
                </div>
                <div class="flex flex-row gap-2 items-center">
                    <span class="badge ${bot.is_running?'badge-success':'badge-error'}">
                        ${bot.is_running?'Running':'Stopped'}
                    </span>
                    <button class="btn btn-sm btn-primary" onclick="startBot('${bot.name}')" ${bot.is_running?'disabled':''}>▶️ Start</button>
                    <button class="btn btn-sm btn-secondary" onclick="stopBot('${bot.name}')" ${!bot.is_running?'disabled':''}>⏹️ Stop</button>
                </div>
            </div>
        </div>
    `).join('');
}

// ------------------ Initialize ------------------
renderStates();
updatePreview();
