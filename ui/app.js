/* =========================================================
   app.js  — merged from:
   main.js, api.js, botList.js, botEditor.js, states.js,
   transitions.js, builder.js, tabManager.js
   (validation.js remains separate)
   ========================================================= */

/* -------------------- Shared Bot State -------------------- */
/* (source: botEditor.js) */
let bot = {
    bot_name: '',
    start_url: '',
    states: [],
    file_name: null,
  };
  
  /* Allow other modules to read allowed lists (validation.js imports these) */
  let ALLOWED_ACTIONS = [];
  let ALLOWED_CONDITIONS = [];
  export function getAllowedActions() { return ALLOWED_ACTIONS; }
  export function getAllowedConditions() { return ALLOWED_CONDITIONS; }
  
  /* =========================================================
     API MODULE  (source: api.js)
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
    const res = await fetch(`/api/bots/${encodeURIComponent(file)}`, { method: 'DELETE' });
    return res.json();
  }
  
  async function startBotAPI(botName) {
    const res = await fetch(`/api/bots/${encodeURIComponent(botName)}/start`, { method: 'POST' });
    return res.json();
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
  
  /* =========================================================
     BOT EDITOR MODULE  (source: botEditor.js)
     ========================================================= */
  function loadBot(botData) {
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
  
  /* Dropdown population */
  async function loadDropdownOptions() {
    const actions = await fetchActions();
    const conditions = await fetchConditions();
  
    ALLOWED_ACTIONS = actions;
    ALLOWED_CONDITIONS = conditions;
  
    const actionSelects = document.querySelectorAll(".action-select");
    actionSelects.forEach(sel => {
      sel.innerHTML = "";
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
  
  /* Selector helpers */
  function getSelectorValues() {
    const inputs = document.querySelectorAll('.selector-input');
    return Array.from(inputs)
      .map(input => input.value.trim())
      .filter(value => value.length > 0);
  }
  
  function clearSelectorInputs() {
    const container = document.getElementById('selectors-container');
    if (!container) return;
    container.innerHTML = '<input type="text" class="selector-input input input-bordered w-full" placeholder="Enter CSS selector" />';
    setupSelectorInputListeners();
  }
  
  function setSelectorValues(selectors) {
    const container = document.getElementById('selectors-container');
    if (!container) return;
    container.innerHTML = '';
  
    if (!selectors || selectors.length === 0) selectors = [''];
  
    selectors.forEach(selector => {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'selector-input input input-bordered w-full';
      input.placeholder = 'Enter CSS selector';
      input.value = selector;
      container.appendChild(input);
    });
  
    if (selectors.every(s => (s || '').toString().trim())) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'selector-input input input-bordered w-full';
      input.placeholder = 'Enter CSS selector';
      container.appendChild(input);
    }
  
    setupSelectorInputListeners();
  }
  
  function setupSelectorInputListeners() {
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
  
    const emptyInputs = Array.from(inputs).filter(input => !input.value.trim());
    if (emptyInputs.length > 1) {
      for (let i = 0; i < emptyInputs.length - 1; i++) {
        emptyInputs[i].remove();
      }
    }
  }
  
  /* Auto-save */
  async function autoSaveBot() {
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
  
    // Lazy-load validator to avoid static circular imports
    const { validateBot } = await import('./validation.js');
  
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
  
  /* Add State */
  async function addState() {
    if (!bot) return;
  
    const { validateState, validateTransition, showValidationErrors, clearValidationErrors } =
      await import('./validation.js');
  
    clearValidationErrors();
  
    const action = document.getElementById('action')?.value || '';
    const selectors = getSelectorValues();
    const value = (document.getElementById('value')?.value || '').trim();
  
    const transitions = Array.from(document.querySelectorAll('#transitions-container .transition-item')).map(div => {
      const selectorInputs = div.querySelectorAll('.transition-selector-input');
      const selVals = Array.from(selectorInputs)
        .map(input => input.value.trim())
        .filter(v => v.length > 0);
  
      return {
        condition: div.querySelector('.transition-condition').value,
        next: (div.querySelector('.transition-next').value || '').trim() || "END",
        selectors: selVals.length ? selVals : undefined,
        text: div.querySelector('.transition-text')?.value || undefined,
        pattern: div.querySelector('.transition-pattern')?.value || undefined
      };
    });
    if (!transitions.length) transitions.push({ condition: "element_exists", next: "END" });
  
    const newState = { id: "state_" + Date.now(), action, selectors, transitions };
    if (action === 'fill') newState.value = value;
    if (action === 'extract') newState.store_as = value;
  
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
    const valEl = document.getElementById('value'); if (valEl) valEl.value = '';
    const transEl = document.getElementById('transitions-container'); if (transEl) transEl.innerHTML = '';
  
    renderStates();
    updatePreview();
  }
  
  /* Update Preview */
  function updatePreview() {
    const preview = document.getElementById('json-preview');
    if (preview) {
      preview.textContent = JSON.stringify(bot, null, 2);
    }
    // fire and forget
    autoSaveBot();
  }
  
  /* =========================================================
     STATES MODULE  (source: states.js)
     ========================================================= */
     function renderStates(containerId = 'states-container') {
      const container = document.getElementById(containerId);
      if (!container) return;
  
      if (!bot.states.length) {
          container.innerHTML = '<p class="text-gray-500 italic">No states added yet</p>';
          return;
      }
  
      container.innerHTML = bot.states.map((state, i) => `
        <div class="state-card card bg-base-300 text-base-content shadow-md mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center p-3" data-state-index="${i}">
  
          <div class="flex-1">
            <div class="flex items-center justify-between mb-2">
              <h3 class="card-title text-sm font-semibold">${state.id}</h3>
              <button 
                class="btn btn-xs btn-circle ${i === 0 ? 'btn-success' : 'btn-secondary'} first-state-btn" 
                title="Make this the first step" 
                data-state-id="${state.id}">
                ✓
              </button>
            </div>
            <p class="text-sm"><strong>Action:</strong> ${state.action}</p>
            <p class="text-sm"><strong>Selectors:</strong> ${Array.isArray(state.selectors) ? state.selectors.join(', ') : ''}</p>
            ${state.value ? `<p class="text-sm"><strong>Value:</strong> ${state.value}</p>` : ''}
            ${state.store_as ? `<p class="text-sm"><strong>Store As:</strong> ${state.store_as}</p>` : ''}
            <div class="state-id-error text-error text-sm mt-1"></div>
          </div>
  
          <div class="flex gap-2 mt-2 sm:mt-0">
            <button class="btn btn-sm btn-secondary" data-action="edit" data-index="${i}">✏️ Edit</button>
            <button class="btn btn-sm btn-error" data-action="delete" data-index="${i}">× Delete</button>
          </div>
  
        </div>
      `).join('');
  
      setupStateEventListeners(container);
  
      // Enable inline editing after rendering
      enableInlineStateIdEditing();
  }
  
  
  /* New State */
  function newState() {
    const stateBuilderCard = document.getElementById('state-builder-card');
    if (stateBuilderCard) {
      stateBuilderCard.classList.remove('hidden');
      stateBuilderCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  
    const actionEl = document.getElementById('action');
    if (actionEl) actionEl.selectedIndex = 0;
    const valEl = document.getElementById('value');
    if (valEl) valEl.value = '';
    const transEl = document.getElementById('transitions-container');
    if (transEl) transEl.innerHTML = '';
  
    clearSelectorInputs();
    bot.editingStateIndex = null;
  }
  
  /* State list events (delegated) */
  function setupStateEventListeners(container) {
    container.removeEventListener('click', handleStateButtonClick);
    container.addEventListener('click', handleStateButtonClick);
  
    function handleStateButtonClick(event) {
      const button = event.target.closest('button');
      if (!button) return;
  
      if (button.classList.contains('first-state-btn')) {
        const stateId = button.dataset.stateId;
        const idx = bot.states.findIndex(s => s.id === stateId);
        if (idx > 0) {
          const [s] = bot.states.splice(idx, 1);
          bot.states.unshift(s);
          autoSaveBot();
          renderStates();
        }
        return;
      }
  
      const action = button.dataset.action;
      const index = parseInt(button.dataset.index);
      if (action === 'delete') deleteState(index);
      else if (action === 'edit') loadState(index);
    }
  }
  
  function deleteState(index) {
    bot.states.splice(index, 1);
    autoSaveBot();
    renderStates();
  }
  
  function loadState(index) {
    const state = bot.states[index];
    if (!state) return;
  
    const stateBuilderCard = document.getElementById('state-builder-card');
    if (stateBuilderCard) stateBuilderCard.classList.remove('hidden');
  
    const actionEl = document.getElementById('action');
    if (actionEl) actionEl.value = state.action;
  
    setSelectorValues(state.selectors || []);
    const valEl = document.getElementById('value');
    if (valEl) valEl.value = state.value || state.store_as || '';
  
    bot.editingStateIndex = index;
  
    loadStateTransitions(state.transitions || []);
    console.log('Loading state for editing:', state);
  }
  
  async function loadStateTransitions(transitions) {
    const container = document.getElementById('transitions-container');
    if (!container) return;

    container.innerHTML = ''; // <<--- CLEAR previous transitions

    for (const transition of transitions) {
        await addTransitionForm(transition.condition, transition.next);
        const transitionDivs = container.querySelectorAll('.transition-item');
        const lastDiv = transitionDivs[transitionDivs.length - 1];
        populateTransitionForm(lastDiv, transition);
    }
}

  
  function populateTransitionForm(transitionDiv, transitionData) {
    if (!transitionDiv || !transitionData) return;
  
    if (transitionData.selectors && transitionData.selectors.length > 0) {
      const selectorContainer = transitionDiv.querySelector('.transition-selectors-container');
      if (selectorContainer) {
        selectorContainer.innerHTML = '';
        transitionData.selectors.forEach(selector => {
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'transition-selector-input input input-bordered input-sm w-full';
          input.placeholder = 'CSS selector (optional)';
          input.value = selector;
          selectorContainer.appendChild(input);
        });
        const emptyInput = document.createElement('input');
        emptyInput.type = 'text';
        emptyInput.className = 'transition-selector-input input input-bordered input-sm w-full';
        emptyInput.placeholder = 'CSS selector (optional)';
        selectorContainer.appendChild(emptyInput);
      }
    }
  
    if (transitionData.text) {
      const textInput = transitionDiv.querySelector('.transition-text');
      if (textInput) textInput.value = transitionData.text;
    }
  
    if (transitionData.pattern) {
      const patternInput = transitionDiv.querySelector('.transition-pattern');
      if (patternInput) patternInput.value = transitionData.pattern;
    }
  }
  
  // -------------------- Inline Editing for State IDs --------------------

  function enableInlineStateIdEditing() {
    const stateCards = document.querySelectorAll('.state-card');
    const existingIds = new Set(bot.states.map(s => slugifyId(s.id)));

    stateCards.forEach(card => {
        const h3 = card.querySelector('.card-title');
        if (!h3) return;

        h3.setAttribute('contenteditable', true);

        h3.addEventListener('focus', () => {
            h3.dataset.originalText = h3.textContent;
        });

        h3.addEventListener('blur', async () => {
          const userInput = h3.textContent.trim();
          const newId = slugifyId(userInput);
          const oldId = slugifyId(h3.dataset.originalText);
      
          const errorEl = card.querySelector('.state-id-error') || (() => {
              const el = document.createElement('div');
              el.className = 'state-id-error text-error text-sm mt-1';
              h3.parentNode.appendChild(el);
              return el;
          })();
      
          if (!newId || (existingIds.has(newId) && newId !== oldId)) {
              errorEl.textContent = !newId ? 'ID cannot be empty' : 'ID must be unique';
              h3.textContent = h3.dataset.originalText;
              return;
          }
      
          errorEl.textContent = '';
      
          // Update local bot state
          const stateIndex = parseInt(card.dataset.stateIndex);
          if (bot.states[stateIndex]) {
              bot.states[stateIndex].id = newId;
      
              // 🔹 Update transitions that point to old ID
              bot.states.forEach(s => {
                  s.transitions?.forEach(t => {
                      if (t.next === oldId) t.next = newId;
                  });
              });
      
              existingIds.delete(oldId);
              existingIds.add(newId);
      
              if (!bot.file_name && bot.bot_name) {
                  bot.file_name = `${bot.bot_name.toLowerCase().replace(/ /g,'_')}.json`;
              }
      
              try {
                  const res = await fetch('/api/bots/save', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(bot)
                  });
                  const data = await res.json();
                  if (!res.ok) errorEl.textContent = 'Failed to save ID to backend';
              } catch (err) {
                  errorEl.textContent = 'Error saving ID to backend';
              }
      
              // 🔹 Re-render states & transitions to reflect the change
              renderStates();
          }
      
          h3.dataset.originalText = userInput;
      });
      

        h3.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                h3.blur();
            }
        });
    });
}


// -------------------- Slugify Function --------------------
function slugifyId(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_{2,}/g, '_');
}

  /* =========================================================
     TRANSITIONS MODULE  (source: transitions.js)
     ========================================================= */
  async function addTransitionForm(condition = "element_exists", next = "") {
    const container = document.getElementById("transitions-container");
    if (!container) return;
  
    const conditions = await fetchConditions();
  
    const div = document.createElement("div");
    div.className = "transition-item bg-gray-700 p-3 rounded border-l-4 border-blue-500";
  
    div.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium mb-1">Condition</label>
          <select class="transition-condition select select-bordered select-sm w-full">
            ${conditions.map(c => `<option value="${c}" ${c === condition ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Next State</label>
          <input type="text" class="transition-next input input-bordered input-sm w-full" 
                 placeholder="Next state ID or END or PAUSE" value="${next}" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium mb-1">Selectors (for conditions)</label>
          <div class="transition-selectors-container space-y-1">
            <input type="text" class="transition-selector-input input input-bordered input-sm w-full" 
                   placeholder="CSS selector (optional)" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Text (for text conditions)</label>
          <input type="text" class="transition-text input input-bordered input-sm w-full" 
                 placeholder="Text to match (optional)" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Pattern (for regex conditions)</label>
          <input type="text" class="transition-pattern input input-bordered input-sm w-full" 
                 placeholder="Regex pattern (optional)" />
        </div>
      </div>
      <button type="button" class="remove-transition btn btn-sm btn-error mt-2">Remove</button>
    `;
  
    div.querySelector('.remove-transition').addEventListener('click', () => div.remove());
    setupTransitionSelectorInputs(div);
    container.appendChild(div);
  }
  
  function setupTransitionSelectorInputs(transitionDiv) {
    const container = transitionDiv.querySelector('.transition-selectors-container');
    if (!container) return;
  
    container.addEventListener('input', (event) => {
      if (!event.target.classList.contains('transition-selector-input')) return;
  
      const inputs = container.querySelectorAll('.transition-selector-input');
      const lastInput = inputs[inputs.length - 1];
  
      if (event.target === lastInput && event.target.value.trim()) {
        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.className = 'transition-selector-input input input-bordered input-sm w-full';
        newInput.placeholder = 'CSS selector (optional)';
        container.appendChild(newInput);
      }
  
      const emptyInputs = Array.from(inputs).filter(input => !input.value.trim());
      if (emptyInputs.length > 1) {
        for (let i = 0; i < emptyInputs.length - 1; i++) {
          emptyInputs[i].remove();
        }
      }
    });
  }
  
  function getTransitionSelectorValues(transitionDiv) {
    const inputs = transitionDiv.querySelectorAll('.transition-selector-input');
    return Array.from(inputs)
      .map(input => input.value.trim())
      .filter(value => value.length > 0);
  }
  
  /* =========================================================
     BUILDER MODULE  (source: builder.js)
     ========================================================= */
  function slugifyName(name) {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_{2,}/g, "_");
  }
  
  async function createNewBot() {
    const { validateBotName, validateStartUrl, showValidationErrors, clearValidationErrors } =
      await import('./validation.js');
  
    const rawName = (document.getElementById("bot-name")?.value || "").trim();
    const startUrl = (document.getElementById("start-url")?.value || "").trim();
  
    clearValidationErrors();
  
    const nameValidation = validateBotName(rawName);
    if (!nameValidation.isValid) {
      showValidationErrors(nameValidation.errors);
      return;
    }
  
    const urlValidation = validateStartUrl(startUrl);
    if (!urlValidation.isValid) {
      showValidationErrors(urlValidation.errors);
      return;
    }
  
    const slug = slugifyName(rawName);
    const fileName = `${slug}.json`;
  
    try {
      const listRes = await fetch("/api/bots");
      if (listRes.ok) {
        const bots = await listRes.json();
        const exists = bots.some(b => (b.file === fileName) || (b.name === rawName));
        if (exists) {
          const ok = confirm(
            `A bot with this name/file already exists:\n\n` +
            `Name: ${rawName}\nFile: ${fileName}\n\nOverwrite it?`
          );
          if (!ok) return;
        }
      }
    } catch {
      // continue; save endpoint will handle
    }
  
    const newBot = {
      bot_name: rawName,
      start_url: startUrl,
      states: [],
      file_name: fileName
    };
  
    try {
      const response = await fetch("/api/bots/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBot)
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        alert(`Failed to create bot: ${data.error || response.statusText}`);
        return;
      }
  
      bot = { ...newBot };
      loadBot(newBot);
  
      await refreshBotsList();
      alert(`Created bot: ${rawName} (${fileName})`);
    } catch (err) {
      console.error("Error creating bot:", err);
      alert("Error creating bot");
    }
  }

  
  /* =========================================================
     BOT LIST MODULE  (source: botList.js)
     ========================================================= */
 async function refreshBotsEditor() {
    const editorList = document.getElementById('editor-bots-list');
    if (!editorList) return;
    editorList.innerHTML = '<p>Loading bots...</p>';
  
    try {
      const bots = await fetchBots();
  
      if (!bots.length) {
        editorList.innerHTML = '<p class="text-gray-500 italic">No bots available.</p>';
        return;
      }
  
      editorList.innerHTML = bots.map(b => `
        <div class="card bg-base-200 shadow-md mb-4">
          <div class="card-body flex flex-row justify-between items-center">
            <div>
              <h3 class="card-title">${b.name || 'Unnamed Bot'}</h3>
              <p class="text-sm text-gray-600">
                <span class="badge badge-outline mr-2">States: ${b.states_count ?? 0}</span>
                <span class="badge badge-outline mr-2">URL: ${b.start_url || 'https://example.com'}</span>
                <span class="badge badge-outline">File: ${b.file || 'unknown'}</span>
              </p>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-primary" data-action="edit" data-bot-file="${b.file}">✏️ Edit</button>
              <button class="btn btn-sm btn-error" data-action="delete" data-bot-file="${b.file}">🗑️ Delete</button>
              <button class="btn btn-sm btn-success" data-action="start" data-bot-name="${b.name}">▶️ Start</button>
              <button class="btn btn-sm btn-warning" data-action="pause" data-bot-name="${b.name}">⏸️ Pause</button>
              <button class="btn btn-sm btn-success" data-action="resume" data-bot-name="${b.name}">▶️ Resume</button>
              <button class="btn btn-sm btn-warning" data-action="stop" data-bot-name="${b.name}">⏹️ Stop</button>
            </div>
          </div>
        </div>
      `).join('');
  
      setupEditorEventListeners(editorList);
  
    } catch (err) {
      editorList.innerHTML = '<p style="color:red;">Failed to load bots</p>';
      console.error(err);
    }
  }
  
  
  
  function setupEditorEventListeners(container) {
    container.removeEventListener('click', handleEditorButtonClick);
    container.addEventListener('click', handleEditorButtonClick);
  }
  
  async function handleEditorButtonClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
  
    const action = button.getAttribute('data-action');
    const botFile = button.getAttribute('data-bot-file');
    const botName = button.getAttribute('data-bot-name');
  
    if (action === 'edit') {
      await loadBotFromFile(botFile);
    } else if (action === 'delete') {
      if (confirm(`Are you sure you want to delete ${botFile}?`)) {
        await deleteBot(botFile);
        await refreshBotsEditor();
      }
    } else if (action === 'start') {
      await startBotAPI(botName);
      await refreshBotsEditor();
    } else if (action === 'stop') {
      await stopBotAPI(botName);
      await refreshBotsEditor();
    } else if (action === 'pause') {
      await pauseBotAPI(botName);
    } else if (action === 'resume') {
      await resumeBotAPI(botName);
    }
  }
  
  /* renamed to avoid clashing with editor's loadBot(botData) */
  async function loadBotFromFile(file) {
    try {
      const botData = await loadBotFile(file);
  
      const { validateBotName, validateStartUrl, showValidationErrors, clearValidationErrors } =
        await import('./validation.js');
  
      clearValidationErrors();
  
      const nameValidation = validateBotName(botData.bot_name || '');
      const urlValidation = validateStartUrl(botData.start_url || '');
      const validationErrors = [...nameValidation.errors, ...urlValidation.errors];
  
      if (validationErrors.length > 0) {
        showValidationErrors(validationErrors);
        console.warn('Bot validation failed on load:', validationErrors);
      }
  
      Object.assign(bot, botData);
      bot.file_name = file;
  
      const nameEl = document.getElementById('bot-name');
      const urlEl = document.getElementById('start-url');
      if (nameEl) nameEl.value = botData.bot_name || '';
      if (urlEl) urlEl.value = botData.start_url || '';
  
      renderStates();
  
      const stateBuilderCard = document.getElementById('state-builder-card');
      if (stateBuilderCard) stateBuilderCard.classList.remove('hidden');
  
      const newStateBtn = document.getElementById('new-state-btn');
      if (newStateBtn) newStateBtn.classList.remove('hidden');
  
      console.log('Bot loaded for editing:', file);
    } catch (error) {
      console.error('Failed to load bot:', error);
      alert('Failed to load bot for editing');
    }
  }
  
  /* Convenience wrapper (source: botList.js) */
  async function refreshBotsList() {
    await refreshBotsEditor();
  }
  
  /* =========================================================
     MAIN MODULE  (source: main.js)
     ========================================================= */
  document.addEventListener('DOMContentLoaded', async () => {
    // Tabs
  
    // Real-time validation (lazy import to avoid circular static import)
    const botNameField = document.getElementById('bot-name');
    const startUrlField = document.getElementById('start-url');
  
    if (botNameField) {
      botNameField.addEventListener('input', async () => {
        const { validateField, validateBotName } = await import('./validation.js');
        validateField('bot-name', validateBotName);
      });
    }
  
    if (startUrlField) {
      startUrlField.addEventListener('input', async () => {
        const { validateField, validateStartUrl } = await import('./validation.js');
        validateField('start-url', validateStartUrl);
      });
    }
  
    // Buttons
    document.getElementById("add-transition-btn")?.addEventListener("click", () => addTransitionForm());
    document.getElementById("create-bot-btn")?.addEventListener("click", createNewBot);
    document.getElementById("add-state-btn")?.addEventListener("click", () => { void addState(); });
    document.getElementById("new-state-btn")?.addEventListener("click", newState);
  
    // Data/Init
    await loadDropdownOptions();
    setupSelectorInputListeners();
    renderStates();
    refreshBotsList();
  });
  