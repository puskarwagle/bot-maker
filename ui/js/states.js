import { autoSaveBot, bot } from './botEditor.js';
import { addTransitionForm } from './transitions.js';

// -------------------- Render States --------------------
export function renderStates(containerId = 'states-container') {
    const container = document.getElementById(containerId);
    if (!bot.states.length) {
        container.innerHTML = '<p class="text-gray-500 italic">No states added yet</p>';
        return;
    }
    container.innerHTML = bot.states.map((state, i) => `
        <div class="card bg-base-200 shadow-md mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center p-3">
        
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
            <p class="text-sm"><strong>Selectors:</strong> ${state.selectors.join(', ')}</p>
            ${state.value ? `<p class="text-sm"><strong>Value:</strong> ${state.value}</p>` : ''}
            ${state.store_as ? `<p class="text-sm"><strong>Store As:</strong> ${state.store_as}</p>` : ''}
        </div>
    
        <div class="flex gap-2 mt-2 sm:mt-0">
            <button class="btn btn-sm btn-secondary" data-action="edit" data-index="${i}">✏️ Edit</button>
            <button class="btn btn-sm btn-error" data-action="delete" data-index="${i}">× Delete</button>
        </div>
    
        </div>
    `).join('');
  

    // Add event delegation for state buttons
    setupStateEventListeners(container);
}
document.querySelectorAll('.first-state-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const stateId = btn.dataset.stateId;
        const idx = bot.states.findIndex(s => s.id === stateId);
        if (idx > 0) {
            const [state] = bot.states.splice(idx, 1);
            bot.states.unshift(state); // move to top
            saveBot(bot).then(() => renderStates());
        }
    });
});

// -------------------- New State --------------------
export function newState() {
    const stateBuilderCard = document.getElementById('state-builder-card');
    if (stateBuilderCard) {
        stateBuilderCard.classList.remove('hidden');

        // Scroll smoothly into view
        stateBuilderCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Reset fields
    document.getElementById('action').selectedIndex = 0;
    document.getElementById('value').value = '';
    document.getElementById('transitions-container').innerHTML = '';

    import('./botEditor.js').then(({ clearSelectorInputs }) => {
        clearSelectorInputs();
    });

    // Make sure we're not editing an existing state
    bot.editingStateIndex = null;
}

// -------------------- Setup Event Listeners --------------------
function setupStateEventListeners(container) {
    container.removeEventListener('click', handleStateButtonClick);
    container.addEventListener('click', handleStateButtonClick);
  
    function handleStateButtonClick(event) {
      const button = event.target.closest('button');
      if (!button) return;
  
      // ---------- First-step button ----------
      if (button.classList.contains('first-state-btn')) {
        const stateId = button.dataset.stateId;
        const idx = bot.states.findIndex(s => s.id === stateId);
        if (idx > 0) {
          const [state] = bot.states.splice(idx, 1);
          bot.states.unshift(state);
          autoSaveBot();      // saves bot without full reload
          renderStates();     // re-render UI
        }
        return;
      }
  
      // ---------- Existing edit/delete ----------
      const action = button.dataset.action;
      const index = parseInt(button.dataset.index);
      if (action === 'delete') deleteState(index);
      else if (action === 'edit') loadState(index);
    }
  } // <-- closing brace for setupStateEventListeners
  

// -------------------- Delete State --------------------
export function deleteState(index) {
    bot.states.splice(index, 1);
    autoSaveBot();
    renderStates();
}

// -------------------- Load State for Editing --------------------
export function loadState(index) {
    const state = bot.states[index];
    if (!state) return;

    // Show the state builder form
    const stateBuilderCard = document.getElementById('state-builder-card');
    if (stateBuilderCard) {
        stateBuilderCard.classList.remove('hidden');
    }

    // Import the selector functions
    import('./botEditor.js').then(({ setSelectorValues }) => {
        document.getElementById('action').value = state.action;
        setSelectorValues(state.selectors || []);
        document.getElementById('value').value = state.value || state.store_as || '';

        // Set editing index
        bot.editingStateIndex = index;

        // Load transitions
        loadStateTransitions(state.transitions || []);
        
        console.log('Loading state for editing:', state);
    });
}

// -------------------- Load Transitions for Editing --------------------
async function loadStateTransitions(transitions) {
    const container = document.getElementById('transitions-container');
    if (!container) return;
    
    // Clear existing transitions
    container.innerHTML = '';
    
    // Load each transition
    for (const transition of transitions) {
        await addTransitionForm(transition.condition, transition.next);
        
        // Get the last added transition div
        const transitionDivs = container.querySelectorAll('.transition-item');
        const lastDiv = transitionDivs[transitionDivs.length - 1];
        
        // Populate the transition data
        populateTransitionForm(lastDiv, transition);
    }
}

function populateTransitionForm(transitionDiv, transitionData) {
    // Set selectors
    if (transitionData.selectors && transitionData.selectors.length > 0) {
        const selectorContainer = transitionDiv.querySelector('.transition-selectors-container');
        selectorContainer.innerHTML = '';
        
        transitionData.selectors.forEach(selector => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'transition-selector-input input input-bordered input-sm w-full';
            input.placeholder = 'CSS selector (optional)';
            input.value = selector;
            selectorContainer.appendChild(input);
        });
        
        // Add empty input at the end
        const emptyInput = document.createElement('input');
        emptyInput.type = 'text';
        emptyInput.className = 'transition-selector-input input input-bordered input-sm w-full';
        emptyInput.placeholder = 'CSS selector (optional)';
        selectorContainer.appendChild(emptyInput);
    }
    
    // Set text if present
    if (transitionData.text) {
        const textInput = transitionDiv.querySelector('.transition-text');
        if (textInput) textInput.value = transitionData.text;
    }
    
    // Set pattern if present
    if (transitionData.pattern) {
        const patternInput = transitionDiv.querySelector('.transition-pattern');
        if (patternInput) patternInput.value = transitionData.pattern;
    }
}