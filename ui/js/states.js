import { autoSaveBot, bot } from './botEditor.js';

// -------------------- Render States --------------------
export function renderStates(containerId = 'states-container') {
    const container = document.getElementById(containerId);
    if (!bot.states.length) {
        container.innerHTML = '<p class="text-gray-500 italic">No states added yet</p>';
        return;
    }

    container.innerHTML = bot.states.map((state, i) => `
        <div class="card bg-base-200 shadow-md mb-4">
            <div class="card-body flex justify-between items-center">
                <div>
                    <h3 class="card-title">${state.id}</h3>
                    <p>Action: ${state.action}</p>
                    <p>Selectors: ${state.selectors.join(', ')}</p>
                    ${state.value ? `<p>Value: ${state.value}</p>` : ''}
                    ${state.store_as ? `<p>Store As: ${state.store_as}</p>` : ''}
                </div>
                <div class="flex gap-2">
                    <button class="btn btn-sm btn-secondary" data-action="edit" data-index="${i}">✏️ Edit</button>
                    <button class="btn btn-sm btn-error" data-action="delete" data-index="${i}">× Delete</button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add event delegation for state buttons
    setupStateEventListeners(container);
}

// -------------------- Setup Event Listeners --------------------
function setupStateEventListeners(container) {
    // Remove existing listeners to avoid duplicates
    container.removeEventListener('click', handleStateButtonClick);
    container.addEventListener('click', handleStateButtonClick);
}

function handleStateButtonClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    
    const action = button.getAttribute('data-action');
    const index = parseInt(button.getAttribute('data-index'));
    
    if (action === 'delete') {
        deleteState(index);
    } else if (action === 'edit') {
        loadState(index);
    }
}

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
    
    document.getElementById('action').value = state.action;
    document.getElementById('selector').value = state.selectors.join(', ');
    document.getElementById('value').value = state.value || state.store_as || '';
    
    // Set editing index
    bot.editingStateIndex = index;
    
    // TODO: Load transitions into the transitions container
    console.log('Loading state for editing:', state);
}
