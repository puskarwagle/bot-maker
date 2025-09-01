// js/run.js
// Add this to your app-controller.js or wherever you handle bot operations
import { startBotAPI, stopBotAPI } from './api.js';


export class BotController {
    constructor(apiModule) {
        this.api = apiModule;
        this.currentBot = null;
        this.botStatus = 'idle'; // 'idle', 'running', 'stopped'
        this.toggleButton = null;
        this.initToggleButton();
    }

    initToggleButton() {
        // Create the toggle button
        const controlsDiv = document.querySelector('.controls');
        
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = 'btn';
        this.toggleButton.textContent = '▶ START';
        this.toggleButton.onclick = () => this.toggleBot();
        this.toggleButton.disabled = true; // Disabled until bot is selected
        
        controlsDiv.appendChild(this.toggleButton);
    }

    setCurrentBot(botFile) {
        this.currentBot = botFile.replace('.json', '');
        this.botStatus = 'idle'; // Reset status when switching bots
        this.updateToggleButton();
        this.toggleButton.disabled = false;
    }

    async toggleBot() {
        if (!this.currentBot) return;

        try {
            if (this.botStatus === 'running') {
                // Stop the bot
                const result = await stopBotAPI(this.currentBot);
                console.log('Stop result:', result);
                this.botStatus = 'stopped';
            } else {
                // Start the bot (works for both 'idle' and 'stopped')
                const result = await startBotAPI(this.currentBot);
                console.log('Start result:', result);
                this.botStatus = 'running';
            }
            
            this.updateToggleButton();
            
        } catch (error) {
            console.error('Bot toggle error:', error);
            // You might want to show an error message to user here
        }
    }

    updateToggleButton() {
        if (!this.toggleButton) return;

        if (this.botStatus === 'running') {
            this.toggleButton.textContent = '⏹ STOP';
            this.toggleButton.style.background = 'linear-gradient(45deg, #aa0000, #ff0000)';
            this.toggleButton.style.color = '#fff';
        } else {
            this.toggleButton.textContent = '▶ START';
            this.toggleButton.style.background = 'linear-gradient(45deg, #00aa00, #00ff00)';
            this.toggleButton.style.color = '#000';
        }
    }
}

// Usage - add this to your main app initialization:
// const botController = new BotController(window.apiModule);
// 
// When a bot is selected, call:
// botController.setCurrentBot(botFileName);