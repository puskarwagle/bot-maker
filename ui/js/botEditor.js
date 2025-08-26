import { saveBot, fetchActions, fetchConditions } from './api.js';
import { renderStates } from './states.js';

export let bot = {
    bot_name: '',
    start_url: '',
    states: [],
    file_name: null,
};

let autoSaveTimeout;

// -------------------- Dynamic dropdowns --------------------
export async function loadDropdownOptions() {
    const actions = await fetchActions();
    const conditions = await fetchConditions();

    const actionSelect = document.getElementById('action');
    const conditionSelects = document.querySelectorAll('.transition-condition');

    // Populate Actions
    actionSelect.innerHTML = actions.map(a => `<option value="${a}">${a}</option>`).join('');

    // Populate Conditions in each transition select
    conditionSelects.forEach(sel => {
        sel.innerHTML = conditions.map(c => `<option value="${c}">${c}</option>`).join('');
    });
}

// -------------------- Auto-save --------------------
export function autoSaveBot() {
    clearTimeout(autoSaveTimeout);
    // Get auto-save delay from config (default 500ms)
    const delay = window.appConfig?.auto_save?.delay_ms || 500;
    autoSaveTimeout = setTimeout(() => {
        const fileName = bot.file_name || `${bot.bot_name.toLowerCase().replace(/ /g,'_')}.json`;
        saveBot({ ...bot, file_name: fileName });
        console.log(`Auto-saved bot: ${fileName}`);
    }, delay);
}

// -------------------- Add State --------------------
export function addState() {
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

// -------------------- Update Preview --------------------
function updatePreview() {
    const preview = document.getElementById('json-preview');
    if (preview) {
        preview.textContent = JSON.stringify(bot, null, 2);
    }
    autoSaveBot();
}
