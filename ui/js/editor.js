/* =========================================================
   editor.js - Core Editor & State Management
   All bot editing, state CRUD, transitions, and form handling
   ========================================================= */

   import { fetchActions, fetchConditions, saveBot } from './api.js';
   import { bot, ALLOWED_ACTIONS, ALLOWED_CONDITIONS } from './app.js';
   
   let autoSaveTimeout;
   
   /* =========================================================
      BOT EDITOR FUNCTIONS
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
   
   async function autoSaveBot() {
     if (!bot.bot_name) {
       console.warn('Auto-save skipped: bot has no name');
       return;
     }
   
     // Allow saving if there are no states yet
     if (bot.states.length === 0) {
       const fileName = bot.file_name || `${bot.bot_name.toLowerCase().replace(/ /g, '_')}.json`;
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
       const fileName = bot.file_name || `${bot.bot_name.toLowerCase().replace(/ /g, '_')}.json`;
       saveBot({ ...bot, file_name: fileName });
       console.log(`Auto-saved bot: ${fileName}`);
     }, delay);
   }
   
   function updatePreview() {
     const preview = document.getElementById('json-preview');
     if (preview) {
       preview.textContent = JSON.stringify(bot, null, 2);
     }
     // fire and forget
     autoSaveBot();
   }
   
   /* =========================================================
      STATE MANAGEMENT
      ========================================================= */
   
   async function addState() {
     if (!bot) {
        console.log("there is no button how did u even click this button are u a hacker ???") 
        return;
     }
     console.log("addState() triggered");

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
   
   function renderStates(containerId = 'states-container') {
     const container = document.getElementById(containerId);
     if (!container) return;
   
     if (!bot.states.length) {
       container.innerHTML = '<p class="text-gray-500 italic">No states added yet</p>';
       return;
     }
   
     container.innerHTML = bot.states.map((state, i) => `
           <div class="state-card card bg-base-100 text-base-content shadow-md mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center p-3" data-state-index="${i}">
             <div class="flex-1">
               <div class="flex items-center justify-between mb-2">
                 <h3 class="card-title text-sm font-semibold text-primary">${state.id}</h3>
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
             </div>
   
             <div class="flex gap-2 mt-2 sm:mt-0">
               <button class="btn btn-sm btn-info" data-action="edit" data-index="${i}">✏️ Edit</button>
               <button class="btn btn-sm btn-error" data-action="delete" data-index="${i}">× Delete</button>
             </div>
           </div>
         `).join('');
   
     setupStateEventListeners(container);
   }
   
   function newState() {
    const stateBuilderCard = document.getElementById('state-builder-card');
    if (stateBuilderCard) {
      stateBuilderCard.classList.remove('hidden');
      stateBuilderCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  
    document.getElementById('add-state-btn').textContent = "Add State";
  
    const actionEl = document.getElementById('action');
    if (actionEl) actionEl.selectedIndex = 0;
    const valEl = document.getElementById('value');
    if (valEl) valEl.value = '';
    const transEl = document.getElementById('transitions-container');
    if (transEl) transEl.innerHTML = '';
  
    clearSelectorInputs();
    bot.editingStateIndex = null;
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
    stateBuilderCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    document.getElementById('add-state-btn').textContent = "Update State";
  
    const actionEl = document.getElementById('action');
    if (actionEl) actionEl.value = state.action;
  
    setSelectorValues(state.selectors || []);
    const valEl = document.getElementById('value');
    if (valEl) valEl.value = state.value || state.store_as || '';
  
    bot.editingStateIndex = index;
    loadStateTransitions(state.transitions || []);
    console.log('Loading state for editing:', state);
  }
  
   
   function setupStateEventListeners(container) {
     container.removeEventListener('click', handleStateButtonClick);
     container.addEventListener('click', handleStateButtonClick);
   }
   
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
   
   /* =========================================================
      TRANSITIONS MANAGEMENT
      ========================================================= */
   
   async function renderTransition(transition = {}) {
     const container = document.getElementById('transitions-container');
     if (!container) return;
   
     const conditions = await fetchConditions();
   
     const div = document.createElement('div');
     div.className = 'transition-item bg-gray-700 p-3 rounded border-l-4 border-blue-500';
   
     div.innerHTML = `
       <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
         <div>
           <label class="block text-sm font-medium mb-1 text-primary">Condition</label>
           <select class="transition-condition select select-bordered select-sm w-full">
             ${conditions.map(c => `<option value="${c}" ${c === (transition.condition || 'element_exists') ? 'selected' : ''}>${c}</option>`).join('')}
           </select>
         </div>
         <div>
           <label class="block text-sm font-medium mb-1 text-primary">Next State</label>
           <input type="text" class="transition-next input input-bordered input-sm w-full" 
                 placeholder="Next state ID or end or pause" value="${transition.next || ''}" />
         </div>
         <div class="md:col-span-2">
           <label class="block text-sm font-medium mb-1 text-primary">Selectors (for conditions)</label>
           <div class="transition-selectors-container space-y-1"></div>
         </div>
         <div>
           <label class="block text-sm font-medium mb-1 text-primary">Text (for text conditions)</label>
           <input type="text" class="transition-text input input-bordered input-sm w-full" 
                 placeholder="Text to match (optional)" value="${transition.text || ''}" />
         </div>
         <div>
           <label class="block text-sm font-medium mb-1 text-primary">Pattern (for regex conditions)</label>
           <input type="text" class="transition-pattern input input-bordered input-sm w-full" 
                 placeholder="Regex pattern (optional)" value="${transition.pattern || ''}" />
         </div>
       </div>
       <button type="button" class="remove-transition btn btn-sm btn-error mt-2">Remove</button>
     `;
   
     // Populate selectors
     const selectorContainer = div.querySelector('.transition-selectors-container');
     const selectors = transition.selectors || [''];
     selectors.forEach(sel => {
       const input = document.createElement('input');
       input.type = 'text';
       input.className = 'transition-selector-input input input-bordered input-sm w-full';
       input.placeholder = 'CSS selector (optional)';
       input.value = sel;
       selectorContainer.appendChild(input);
     });
     // always keep an empty input at the end
     const emptyInput = document.createElement('input');
     emptyInput.type = 'text';
     emptyInput.className = 'transition-selector-input input input-bordered input-sm w-full';
     emptyInput.placeholder = 'CSS selector (optional)';
     selectorContainer.appendChild(emptyInput);
   
     setupTransitionSelectorInputs(div);
     div.querySelector('.remove-transition').addEventListener('click', () => div.remove());
   
     container.appendChild(div);
   }
   
   async function loadStateTransitions(transitions) {
     const container = document.getElementById('transitions-container');
     if (!container) return;
   
     container.innerHTML = '';
   
     for (const t of transitions) {
       await renderTransition(t);
     }
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
      FORM HELPERS
      ========================================================= */
   
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
   
   /* =========================================================
      DROPDOWN POPULATION
      ========================================================= */
   
   async function loadDropdownOptions() {
     const actions = await fetchActions();
     const conditions = await fetchConditions();
   
     ALLOWED_ACTIONS.length = 0;
     ALLOWED_ACTIONS.push(...actions);
     ALLOWED_CONDITIONS.length = 0;
     ALLOWED_CONDITIONS.push(...conditions);
   
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
   
   /* =========================================================
      EXPORTS & INITIALIZATION
      ========================================================= */
   
   // Set up editor-specific event listeners
   function initializeEditor() {
    // document.getElementById("add-state-btn")?.addEventListener("click", () => { void addState(); });
    document.getElementById("add-state-btn")?.addEventListener("click", addState);
    document.getElementById("add-transition-btn")?.addEventListener("click", () => renderTransition({}));
  
    // Cancel button
    document.getElementById("cancel-state-btn")?.addEventListener("click", () => {
      const stateBuilderCard = document.getElementById('state-builder-card');
      if (stateBuilderCard) stateBuilderCard.classList.add('hidden');
  
      // Reset inputs
      const actionEl = document.getElementById('action');
      if (actionEl) actionEl.selectedIndex = 0;
      const valEl = document.getElementById('value');
      if (valEl) valEl.value = '';
      const transEl = document.getElementById('transitions-container');
      if (transEl) transEl.innerHTML = '';
  
      clearSelectorInputs();
      bot.editingStateIndex = null;
      document.getElementById('add-state-btn').textContent = "Add State";
    });
  }
  
   
   // Call initialization when DOM is ready
   document.addEventListener('DOMContentLoaded', initializeEditor);
   
   export {
     loadBot,
     autoSaveBot,
     updatePreview,
     addState,
     renderStates,
     newState,
     deleteState,
     loadState,
     setupStateEventListeners,
     handleStateButtonClick,
     renderTransition,
     loadStateTransitions,
     setupTransitionSelectorInputs,
     getTransitionSelectorValues,
     getSelectorValues,
     clearSelectorInputs,
     setSelectorValues,
     setupSelectorInputListeners,
     handleSelectorInput,
     loadDropdownOptions
   };