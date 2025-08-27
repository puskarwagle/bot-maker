import { saveBot, fetchActions, fetchConditions } from './api.js';
import { renderStates } from './states.js';
import {
    validateState,
    validateTransition,
    validateBot,
    showValidationErrors,
    clearValidationErrors
} from './validation.js';

export let bot = {
    bot_name: '',
    start_url: '',
    states: [],
    file_name: null,
};

// -------------------- Load Bot --------------------
export function loadBot(botData) {
    console.log("loadBot called");
    bot.bot_name = botData.bot_name || '';
    bot.start_url = botData.start_url || '';
    bot.states = botData.states || [];
    bot.file_name = botData.file_name || null;

    renderStates();
    updatePreview();
    console.log(`Loaded bot: ${bot.bot_name}`);
}

let autoSaveTimeout;

let ALLOWED_ACTIONS = [];
let ALLOWED_CONDITIONS = [];



// -------------------- Dropdowns --------------------
export async function loadDropdownOptions() {
    // Fetch both from backend
    const actions = await fetchActions();
    const conditions = await fetchConditions();

    // Update globals
    ALLOWED_ACTIONS = actions;
    ALLOWED_CONDITIONS = conditions;

    // Populate dropdowns
    const actionSelects = document.querySelectorAll(".action-select");
    actionSelects.forEach(sel => {
        sel.innerHTML = ""; // clear
        actions.forEach(a => {
            const opt = document.createElement("option");
            opt.value = a;
            opt.textContent = a;
            sel.appendChild(opt);
        });
    });

    const conditionSelects = document.querySelectorAll(".condition-select");
    conditionSelects.forEach(sel => {
        sel.innerHTML = "";
        conditions.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c;
            opt.textContent = c;
            sel.appendChild(opt);
        });
    });
}

export function getAllowedActions() { return ALLOWED_ACTIONS; }
export function getAllowedConditions() { return ALLOWED_CONDITIONS; }

// -------------------- Selector Inputs --------------------
export function getSelectorValues() {
    const inputs = document.querySelectorAll('.selector-input');
    return Array.from(inputs)
        .map(input => input.value.trim())
        .filter(value => value.length > 0);
}

export function clearSelectorInputs() {
    const container = document.getElementById('selectors-container');
    container.innerHTML = '<input type="text" class="selector-input input input-bordered w-full" placeholder="Enter CSS selector" />';
    setupSelectorInputListeners();
}

export function setSelectorValues(selectors) {
    const container = document.getElementById('selectors-container');
    container.innerHTML = '';

    if (selectors.length === 0) selectors = [''];

    selectors.forEach(selector => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'selector-input input input-bordered w-full';
        input.placeholder = 'Enter CSS selector';
        input.value = selector;
        container.appendChild(input);
    });

    // Add one empty input at the end if all are filled
    if (selectors.every(s => s.trim())) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'selector-input input input-bordered w-full';
        input.placeholder = 'Enter CSS selector';
        container.appendChild(input);
    }

    setupSelectorInputListeners();
}

export function setupSelectorInputListeners() {
    const container = document.getElementById('selectors-container');
    if (!container) return;

    container.removeEventListener('input', handleSelectorInput);
    container.addEventListener('input', handleSelectorInput);
}

function handleSelectorInput(event) {
    if (!event.target.classList.contains('selector-input')) return;

    const container = document.getElementById('selectors-container');
    const inputs = container.querySelectorAll('.selector-input');
    const lastInput = inputs[inputs.length - 1];

    if (event.target === lastInput && event.target.value.trim()) {
        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.className = 'selector-input input input-bordered w-full';
        newInput.placeholder = 'Enter CSS selector';
        container.appendChild(newInput);
    }

    const filledInputs = Array.from(inputs).filter(input => input.value.trim());
    const emptyInputs = Array.from(inputs).filter(input => !input.value.trim());

    if (emptyInputs.length > 1) {
        for (let i = 0; i < emptyInputs.length - 1; i++) {
            emptyInputs[i].remove();
        }
    }
}

// -------------------- Auto-save --------------------
export function autoSaveBot() {
    if (!bot.bot_name) {
        console.warn('Auto-save skipped: bot has no name');
        return;
    }

    // Allow saving if there are no states yet
    if (bot.states.length === 0) {
        const fileName = bot.file_name || `${bot.bot_name.toLowerCase().replace(/ /g,'_')}.json`;
        saveBot({ ...bot, file_name: fileName });
        console.log(`Auto-saved empty bot: ${fileName}`);
        return;
    }

    const botValidation = validateBot(bot);
    if (!botValidation.isValid) {
        console.warn('Auto-save skipped: bot is invalid', botValidation.errors);
        return;
    }

    clearTimeout(autoSaveTimeout);
    const delay = window.appConfig?.auto_save?.delay_ms || 500;
    autoSaveTimeout = setTimeout(() => {
        const fileName = bot.file_name || `${bot.bot_name.toLowerCase().replace(/ /g,'_')}.json`;
        saveBot({ ...bot, file_name: fileName });
        console.log(`Auto-saved bot: ${fileName}`);
    }, delay);
}

// -------------------- Add State --------------------
export function addState() {
    if (!bot) return;

    clearValidationErrors();

    const action = document.getElementById('action').value;
    const selectors = getSelectorValues();
    const value = document.getElementById('value').value.trim();

    const transitions = Array.from(document.querySelectorAll('#transitions-container .transition-item')).map(div => {
        const selectorInputs = div.querySelectorAll('.transition-selector-input');
        const selectors = Array.from(selectorInputs)
            .map(input => input.value.trim())
            .filter(v => v.length > 0);

        return {
            condition: div.querySelector('.transition-condition').value,
            next: div.querySelector('.transition-next').value.trim() || "END",
            selectors: selectors.length ? selectors : undefined,
            text: div.querySelector('.transition-text')?.value || undefined,
            pattern: div.querySelector('.transition-pattern')?.value || undefined
        };
    });
    if (!transitions.length) transitions.push({ condition: "element_exists", next: "END" });

    const newState = { id: "state_" + Date.now(), action, selectors, transitions };
    if (action === 'fill') newState.value = value;
    if (action === 'extract') newState.store_as = value;

    // -------------------- VALIDATE STATE & TRANSITIONS --------------------
    const stateValidation = validateState(newState);
    const transitionErrors = transitions.flatMap((t, i) => validateTransition(t, `Transition ${i + 1}`).errors);
    const allErrors = [...stateValidation.errors, ...transitionErrors];

    if (allErrors.length > 0) {
        showValidationErrors(allErrors);
        return;
    }

    if (bot.editingStateIndex != null) {
        bot.states[bot.editingStateIndex] = newState;
        bot.editingStateIndex = null;
    } else {
        bot.states.push(newState);
    }

    clearSelectorInputs();
    document.getElementById('value').value = '';
    document.getElementById('transitions-container').innerHTML = '';

    renderStates();
    updatePreview();
}

// -------------------- Update Preview --------------------
function updatePreview() {
    const preview = document.getElementById('json-preview');
    if (preview) {
        preview.textContent = JSON.stringify(bot, null, 2);
    }
    autoSaveBot();
}

