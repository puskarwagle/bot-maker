import { initializeTabs } from './tabManager.js';
import { loadDropdownOptions, addState, setupSelectorInputListeners } from './botEditor.js';
import { renderStates } from './states.js';
import { refreshBotsList } from './botList.js';
import { addTransitionForm } from './transitions.js';
import { createNewBot } from './builder.js';
import { validateField, validateBotName, validateStartUrl } from './validation.js';

// -------------------- Initialize UI --------------------
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize tab functionality
    initializeTabs();

    // -------------------- Real-time Field Validation --------------------
    const botNameField = document.getElementById('bot-name');
    const startUrlField = document.getElementById('start-url');

    if (botNameField) {
        botNameField.addEventListener('input', () => validateField('bot-name', validateBotName));
    }

    if (startUrlField) {
        startUrlField.addEventListener('input', () => validateField('start-url', validateStartUrl));
    }

    // -------------------- Button Event Listeners --------------------
    document.getElementById("add-transition-btn")?.addEventListener("click", addTransitionForm);
    document.getElementById("create-bot-btn")?.addEventListener("click", createNewBot);
    document.getElementById("add-state-btn")?.addEventListener("click", addState);

    // -------------------- Load Dynamic Data --------------------
    await loadDropdownOptions();
    setupSelectorInputListeners();
    renderStates();
    refreshBotsList();
});
