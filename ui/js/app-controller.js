// js/app-controller.js
import { StateManager } from './state-manager.js';
import { UIComponents } from './ui-components.js';

export class AppController {
    constructor(apiModule) {
        this.api = apiModule;
        this.stateManager = new StateManager();
        this.uiComponents = new UIComponents(this.stateManager);
        this.currentView = 'table';
        this.autoSaveTimeout = null;
        this.stateIndex = 0; // Global state index from original

        // Configuration
        this.actionTypes = [
            'do_nothing', 'fill', 'click', 'navigate_to', 'press_enter',
            'wait', 'scroll', 'hover', 'select', 'clear', 'type'
        ];
        
        this.conditionTypes = [
            'element_exists', 'url_matches', 'always', 'wait_for_element',
            'text_contains', 'element_visible', 'element_clickable', 'timeout'
        ];

        this.init();
    }

    async init() {
        await this.loadActionAndConditionTypes();
        this.setupEventHandlers();
        this.initializePage();
    }

    // Configuration loading
    async loadActionAndConditionTypes() {
        try {
            const [actions, conditions] = await Promise.all([
                this.api.fetchActions(),
                this.api.fetchConditions()
            ]);
            
            if (actions && actions.length > 0) {
                this.actionTypes = actions;
            }
            if (conditions && conditions.length > 0) {
                this.conditionTypes = conditions;
            }

            this.uiComponents.updateActionTypes(this.actionTypes);
            this.uiComponents.updateConditionTypes(this.conditionTypes);
        } catch (error) {
            console.log('Using default action and condition types');
        }
    }

    // Event handling setup
    setupEventHandlers() {
        // Modal handlers
        const createBtn = document.getElementById("create-bot-btn");
        const closeBtn = document.getElementById("close-modal");
        const modalOverlay = document.getElementById("modal-overlay");
        const botAliasInput = document.getElementById('botAlias');

        if (createBtn) createBtn.onclick = () => this.createNewBot();
        if (closeBtn) closeBtn.onclick = () => this.closeModal();
        
        if (modalOverlay) {
            modalOverlay.onclick = (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            };
        }

        if (botAliasInput) {
            // Remove the auto-save listener since bot name is now read-only
            // botAliasInput.addEventListener('input', () => this.autoSave());
        }

        // Global click handler
        document.addEventListener('click', () => {
            this.uiComponents.clearClickCounts();
        });

        // Custom events
        window.addEventListener('stateSelected', () => {
            this.renderCurrentView();
        });

        // Global functions for HTML onclick handlers
        window.addState = () => this.addState();
        window.switchView = (view, evt) => this.switchView(view, evt);
        window.loadBotFromList = () => this.loadBotFromList();
    }

    // Page initialization
    initializePage() {
        // Hide editor elements initially
        document.querySelector('.header').style.display = 'none';
        document.querySelector('.view-tabs').style.display = 'none';
        document.getElementById('tableView').style.display = 'none';
        document.getElementById('flowView').style.display = 'none';
        document.getElementById('status').style.display = 'none';
        
        this.loadBots();
    }

    // Bot management
    async loadBots() {
        const container = document.getElementById('bot-selection-container');
        container.innerHTML = ''; // Clear previous

        try {
            const bots = await this.api.fetchBots();
            this.uiComponents.renderBotSelection(
                bots,
                (fileName) => this.loadBotForEditing(fileName),
                () => this.showModal()
            );
        } catch (error) {
            console.error('Error loading bots:', error);
            this.updateStatus('Error loading bots');
        }
    }

    async loadBotFromList() {
        try {
            const bots = await this.api.fetchBots();
            const botSelect = document.getElementById('botSelect');
            botSelect.innerHTML = '';
            
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select a bot...';
            botSelect.appendChild(defaultOption);
            
            bots.forEach(bot => {
                const option = document.createElement('option');
                option.value = bot.file;
                option.textContent = `${bot.bot_name} (${bot.file})`;
                botSelect.appendChild(option);
            });
            
            botSelect.style.display = 'block';
            botSelect.onchange = async (e) => {
                if (e.target.value) {
                    await this.loadBotForEditing(e.target.value);
                    botSelect.style.display = 'none';
                }
            };
        } catch (error) {
            console.error('Error loading bot list:', error);
            this.updateStatus('Error loading bot list');
        }
    }

    async loadBotForEditing(fileName) {
        try {
            const bot = await this.api.loadBotFile(fileName);
            this.stateManager.setStateData(bot);
            
            // Set bot name as read-only display, not editable
            const botAliasElement = document.getElementById('botAlias');
            if (botAliasElement) {
                botAliasElement.value = bot.bot_name || '';
                botAliasElement.readOnly = true;
                botAliasElement.style.backgroundColor = '#333';
                botAliasElement.style.cursor = 'not-allowed';
            }
            
            this.stateManager.setEditingStateId(null);
            
            // Show editor and hide bot selection
            document.getElementById('bot-selection-container').style.display = 'none';
            document.querySelector('.header').style.display = 'flex';
            document.querySelector('.view-tabs').style.display = 'flex';
            document.getElementById('tableView').style.display = 'block';
            document.getElementById('status').style.display = 'block';
            
            this.renderCurrentView();
            this.updateStatus(`Loaded ${bot.states.length} states from ${fileName}`);
        } catch (error) {
            console.error('Error loading bot:', error);
            this.updateStatus(`Error loading bot: ${error.message}`);
        }
    }

    async createNewBot() {
        console.log("create new button");
        const botNameField = document.getElementById("bot-name");
        const startUrlField = document.getElementById("start-url");

        const rawName = (botNameField?.value || "").trim();
        const startUrl = (startUrlField?.value || "").trim();
        if (!rawName || !startUrl) return alert("Please enter bot name and start URL");

        const slug = this.stateManager.slugifyName(rawName);
        const fileName = `${slug}.json`;

        const newBot = {
            bot_name: rawName,
            start_url: startUrl,
            states: [],
            file_name: fileName
        };

        try {
            const result = await this.api.saveBot(newBot);
            if (result.error) return alert(result.error);

            botNameField.value = '';
            startUrlField.value = '';
            this.closeModal();

            await this.loadBots(); // Refresh the bot list

            alert(`${rawName} created! Click its card to start editing.`);
        } catch (err) {
            console.error("Error creating bot:", err);
            alert("Network error. Failed to create bot.");
        }
    }

    // Modal management
    showModal() {
        const modalOverlay = document.getElementById("modal-overlay");
        if (modalOverlay) {
            modalOverlay.style.display = "flex";
        } else {
            console.error("Modal overlay element not found");
            alert("Error: Modal not found. Please refresh the page.");
        }
    }

    closeModal() {
        document.getElementById("modal-overlay").style.display = "none";
        // Reset form
        document.getElementById("bot-name").value = '';
        document.getElementById("start-url").value = '';
    }

    // State management operations
    addState() {
        const newState = this.stateManager.addState();
        this.renderCurrentView();
        this.updateStatus('Added new state');
        
        this.autoSave();
        
        // Scroll to bottom
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
    }

    // Property update handlers
    handlePropertyUpdate(type, index, value) {
        switch (type) {
            case 'alias':
                this.stateManager.updateStateAlias(index, value);
                this.autoSave();
                this.renderCurrentView();
                break;
            case 'action':
            case 'value':
            case 'selectors':
                this.stateManager.updateStateProperty(index, type, value);
                this.autoSave();
                if (this.currentView !== 'json') {
                    this.renderCurrentView();
                }
                break;
            case 'delete':
                // Delete confirmation already handled in UI, just execute
                this.stateManager.removeState(index);
                this.updateStatus('State deleted');
                this.renderCurrentView();
                this.autoSave();
                break;
        }
    }

    handleTransitionUpdate(type, stateIndex, transitionIndex, value) {
        switch (type) {
            case 'add':
                this.stateManager.addTransition(stateIndex);
                break;
            case 'remove':
                this.stateManager.removeTransition(stateIndex, transitionIndex);
                break;
            case 'condition':
                this.stateManager.updateTransitionProperty(stateIndex, transitionIndex, 'condition', value);
                break;
            case 'next':
                this.stateManager.updateTransitionProperty(stateIndex, transitionIndex, 'next', value);
                break;
            case 'param':
                this.stateManager.updateTransitionProperty(stateIndex, transitionIndex, 'conditional_parameter', value);
                break;
        }
        
        this.renderCurrentView(); // Always re-render after transition updates
        this.autoSave();
    }

    // View management
    switchView(view, evt) {
        // Update tabs
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        if (evt) evt.target.classList.add('active');

        // Hide all views
        document.getElementById('tableView').style.display = 'none';
        document.getElementById('flowView').style.display = 'none';

        // Show selected view
        if (view === 'table') {
            document.getElementById('tableView').style.display = 'block';
        } else if (view === 'flow') {
            document.getElementById('flowView').style.display = 'flex';
        }
        
        this.currentView = view;
        this.renderCurrentView();
    }

    renderCurrentView() {
        const onPropertyUpdate = (type, index, value) => this.handlePropertyUpdate(type, index, value);
        const onTransitionUpdate = (type, stateIndex, transitionIndex, value) => 
            this.handleTransitionUpdate(type, stateIndex, transitionIndex, value);

        switch (this.currentView) {
            case 'table':
                this.uiComponents.renderTableView(onPropertyUpdate, onTransitionUpdate);
                break;
            case 'flow':
                this.uiComponents.renderFlowView(onPropertyUpdate, onTransitionUpdate);
                break;
        }
    }

    // Auto-save functionality
    async autoSave() {
        const stateData = this.stateManager.getStateData();
        if (!stateData.file_name) return; // Don't auto-save if no file loaded
        
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(async () => {
            try {
                stateData.bot_name = document.getElementById('botAlias').value || 'bot';
                const result = await this.api.saveBot(stateData);
                if (!result.error) {
                    this.updateStatus('Auto-saved ✓');
                }
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }, 100);
    }

    // Utility methods
    updateStatus(msg) {
        document.getElementById('status').textContent = msg;
    }
}