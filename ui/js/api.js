/* =========================================================
   api.js - API Layer
   All server communication functions
   ========================================================= */

   async function fetchBots() {
    const res = await fetch('/api/bots');
    return res.json();
  }
  
  async function fetchBot(file) {
    const res = await fetch(`/api/bots/${encodeURIComponent(file)}`);
    return res.json();
  }
  
  async function loadBotFile(file) {
    const res = await fetch(`/api/bots/${encodeURIComponent(file)}`);
    if (!res.ok) {
      throw new Error(`Failed to load bot file: ${res.statusText}`);
    }
    return res.json();
  }
  
  async function saveBot(payload) {
    const res = await fetch('/api/bots/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
  
  async function deleteBot(file) {
    console.log("delete called");
    const res = await fetch(`/api/bots/${encodeURIComponent(file)}`, { method: 'DELETE' });
    if (!res.ok) {
      throw new Error(`Failed to delete bot: ${res.statusText}`);
    }
    return res.json();
  }
  
  async function startBotAPI(botName) {
    console.log('API: Starting bot with name:', botName);
    const res = await fetch(`/api/bots/${encodeURIComponent(botName)}/start`, { method: 'POST' });
    const result = await res.json();
    console.log('API: Start bot result:', result);
    return result;
  }
  
  async function stopBotAPI(botName) {
    const res = await fetch(`/api/bots/${encodeURIComponent(botName)}/stop`, { method: 'POST' });
    return res.json();
  }
  
  async function pauseBotAPI(botName) {
    const res = await fetch(`/api/bots/${encodeURIComponent(botName)}/pause`, { method: 'POST' });
    return res.json();
  }
  
  async function resumeBotAPI(botName) {
    const res = await fetch(`/api/bots/${encodeURIComponent(botName)}/resume`, { method: 'POST' });
    return res.json();
  }
  
  async function fetchActions() {
    const res = await fetch("/api/actions");
    if (!res.ok) return [];
    return res.json();
  }
  
  async function fetchConditions() {
    const res = await fetch("/api/conditions");
    if (!res.ok) return [];
    return res.json();
  }
  
  export {
    fetchBots,
    fetchBot,
    loadBotFile,
    saveBot,
    deleteBot,
    startBotAPI,
    stopBotAPI,
    pauseBotAPI,
    resumeBotAPI,
    fetchActions,
    fetchConditions
  };