// js/app.js
import {
    fetchBots,
    fetchBot,
    loadBotFile,
    saveBot,
    deleteBot,
    fetchActions,
    fetchConditions
} from './api.js';

import { AppController } from './app-controller.js';

// Make API functions available globally for backward compatibility
window.apiModule = {
    fetchBots,
    fetchBot,
    loadBotFile,
    saveBot,
    deleteBot,
    fetchActions,
    fetchConditions
};

// Initialize the application
let appController;

function initializePage() {
    appController = new AppController(window.apiModule);
}

// Make initializePage available globally
window.initializePage = initializePage;

// Auto-initialize when module loads
window.addEventListener('DOMContentLoaded', initializePage);