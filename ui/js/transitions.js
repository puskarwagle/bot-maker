import { fetchActions, fetchConditions } from "./api.js";

export async function addTransitionForm(condition = "element_exists", next = "") {
  const container = document.getElementById("transitions-container");
  if (!container) return;

  // Fetch options dynamically
  const conditions = await fetchConditions();

  // Create wrapper
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

  // Add event listeners
  div.querySelector('.remove-transition').addEventListener('click', () => div.remove());
  
  // Setup dynamic selector inputs for this transition
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
    
    // If the last input has content and there's no empty input after it, add one
    if (event.target === lastInput && event.target.value.trim()) {
      const newInput = document.createElement('input');
      newInput.type = 'text';
      newInput.className = 'transition-selector-input input input-bordered input-sm w-full';
      newInput.placeholder = 'CSS selector (optional)';
      container.appendChild(newInput);
    }
    
    // Remove empty inputs (except keep at least one)
    const filledInputs = Array.from(inputs).filter(input => input.value.trim());
    const emptyInputs = Array.from(inputs).filter(input => !input.value.trim());
    
    if (emptyInputs.length > 1) {
      // Keep only the last empty input
      for (let i = 0; i < emptyInputs.length - 1; i++) {
        emptyInputs[i].remove();
      }
    }
  });
}

export function getTransitionSelectorValues(transitionDiv) {
  const inputs = transitionDiv.querySelectorAll('.transition-selector-input');
  return Array.from(inputs)
    .map(input => input.value.trim())
    .filter(value => value.length > 0);
}
