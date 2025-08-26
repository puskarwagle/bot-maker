import { fetchActions, fetchConditions } from "./api.js";

export async function addTransitionForm() {
  const transitionsDiv = document.getElementById("transitions");
  if (!transitionsDiv) return;

  // Fetch options dynamically
  const actions = await fetchActions();
  const conditions = await fetchConditions();

  // Create wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "transition-form";

  // From State input
  const fromInput = document.createElement("input");
  fromInput.type = "text";
  fromInput.placeholder = "From State";
  fromInput.name = "from_state";

  // To State input
  const toInput = document.createElement("input");
  toInput.type = "text";
  toInput.placeholder = "To State";
  toInput.name = "to_state";

  // Condition select
  const conditionSelect = document.createElement("select");
  conditionSelect.name = "condition";
  conditions.forEach(cond => {
    const option = document.createElement("option");
    option.value = cond;
    option.textContent = cond;
    conditionSelect.appendChild(option);
  });

  // Action select
  const actionSelect = document.createElement("select");
  actionSelect.name = "action";
  actions.forEach(act => {
    const option = document.createElement("option");
    option.value = act;
    option.textContent = act;
    actionSelect.appendChild(option);
  });

  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener('click', () => wrapper.remove());

  // Append all
  wrapper.appendChild(fromInput);
  wrapper.appendChild(toInput);
  wrapper.appendChild(conditionSelect);
  wrapper.appendChild(actionSelect);
  wrapper.appendChild(deleteBtn);

  transitionsDiv.appendChild(wrapper);
}
