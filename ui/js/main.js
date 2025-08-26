import { initializeTabs } from './tabManager.js';
import { loadDropdownOptions, addState } from './botEditor.js';
import { renderStates } from './states.js';
import { refreshBotsList } from './botList.js';
import { addTransitionForm } from './transitions.js';
import { createNewBot } from './builder.js';

// -------------------- Initialize UI --------------------
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize tab functionality
    initializeTabs();
    
    // Add event listeners for buttons
    document.getElementById("add-transition-btn")?.addEventListener("click", addTransitionForm);
    document.getElementById("create-bot-btn")?.addEventListener("click", createNewBot);
    document.getElementById("add-state-btn")?.addEventListener("click", addState);

    await loadDropdownOptions();
    renderStates();
    refreshBotsList();
});
