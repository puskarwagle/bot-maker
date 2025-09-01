// js/ui-components.js
export class UIComponents {
    constructor(stateManager, actionTypes = [], conditionTypes = []) {
        this.stateManager = stateManager;
        this.actionTypes = actionTypes;
        this.conditionTypes = conditionTypes;
        this.clickCount = {};
    }

    updateActionTypes(actionTypes) {
        this.actionTypes = actionTypes;
    }

    updateConditionTypes(conditionTypes) {
        this.conditionTypes = conditionTypes;
    }

    // Table view rendering
    renderTableView(onPropertyUpdate, onTransitionUpdate) {
        const tbody = document.getElementById('statesTable');
        tbody.innerHTML = '';

        const stateData = this.stateManager.getStateData();
        const editingStateId = this.stateManager.getEditingStateId();

        stateData.states.forEach((state, index) => {
            const row = this.createTableRow(state, index, editingStateId, onPropertyUpdate, onTransitionUpdate);
            tbody.appendChild(row);
        });
    }

    createTableRow(state, index, editingStateId, onPropertyUpdate, onTransitionUpdate) {
        const row = document.createElement('tr');
        if (editingStateId === state.id) {
            row.classList.add('editing');
        }

        // Only add row click if clicking on empty space, not inputs
        row.onclick = (e) => {
            if (e.target === row || e.target.tagName === 'TD') {
                this.handleStateClick(e, state.id);
            }
        };
        row.style.cursor = 'pointer';

        // Alias cell
        const aliasCell = document.createElement('td');
        aliasCell.style.resize = 'horizontal';
        aliasCell.style.minWidth = '120px';
        const aliasInput = document.createElement('input');
        aliasInput.className = 'editable';
        aliasInput.value = this.stateManager.getStateAlias(state.id);
        aliasInput.onclick = (e) => {
            e.stopPropagation();
            aliasInput.style.width = '200px';
        };
        aliasInput.onblur = () => {
            aliasInput.style.width = '';
        };
        aliasInput.onchange = (e) => onPropertyUpdate('alias', index, e.target.value);
        aliasCell.appendChild(aliasInput);
        row.appendChild(aliasCell);

        // Action cell
        const actionCell = document.createElement('td');
        actionCell.style.minWidth = '140px';
        const actionSelect = this.createActionSelect(state.action, (value) => 
            onPropertyUpdate('action', index, value)
        );
        actionSelect.onclick = (e) => e.stopPropagation();
        actionCell.appendChild(actionSelect);
        row.appendChild(actionCell);

        // Value cell
        const valueCell = document.createElement('td');
        valueCell.style.minWidth = '120px';
        const valueInput = document.createElement('input');
        valueInput.className = 'value-input';
        valueInput.value = state.value || '';
        valueInput.onclick = (e) => {
            e.stopPropagation();
            valueInput.style.width = '250px';
        };
        valueInput.onblur = () => {
            valueInput.style.width = '';
        };
        valueInput.onchange = (e) => onPropertyUpdate('value', index, e.target.value);
        valueCell.appendChild(valueInput);
        row.appendChild(valueCell);

        // Selectors cell
        const selectorsCell = document.createElement('td');
        selectorsCell.style.minWidth = '200px';
        selectorsCell.style.resize = 'horizontal';
        const selectorsTextarea = document.createElement('textarea');
        selectorsTextarea.className = 'selector-input';
        selectorsTextarea.value = (state.selectors || []).join('\n');
        selectorsTextarea.rows = 2;
        selectorsTextarea.onclick = (e) => {
            e.stopPropagation();
            selectorsTextarea.style.width = '300px';
            selectorsTextarea.rows = 4;
        };
        selectorsTextarea.onblur = () => {
            selectorsTextarea.style.width = '';
            selectorsTextarea.rows = 2;
        };
        selectorsTextarea.onchange = (e) => {
            const selectors = e.target.value.split('\n').filter(s => s.trim());
            onPropertyUpdate('selectors', index, selectors);
        };
        selectorsCell.appendChild(selectorsTextarea);
        row.appendChild(selectorsCell);

        // Transitions cell
        const transitionsCell = this.createTransitionsCell(state, index, onTransitionUpdate);
        transitionsCell.style.minWidth = '300px';
        transitionsCell.style.resize = 'horizontal';
        row.appendChild(transitionsCell);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.style.width = '60px';
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn danger';
        deleteBtn.textContent = '🗑️';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Delete this state?')) {
                onPropertyUpdate('delete', index);
            }
        };
        actionsCell.appendChild(deleteBtn);
        row.appendChild(actionsCell);

        return row;
    }

    // Flow view rendering
    renderFlowView(onPropertyUpdate, onTransitionUpdate) {
        const flowView = document.getElementById('flowView');
        flowView.innerHTML = '';

        const stateData = this.stateManager.getStateData();
        const editingStateId = this.stateManager.getEditingStateId();

        stateData.states.forEach((state, index) => {
            const node = this.createFlowNode(state, index, editingStateId, onPropertyUpdate, onTransitionUpdate);
            flowView.appendChild(node);
        });
    }

    createFlowNode(state, index, editingStateId, onPropertyUpdate, onTransitionUpdate) {
        const node = document.createElement('div');
        node.className = 'flow-node';
        if (editingStateId === state.id) {
            node.classList.add('editing');
        }

        node.onclick = (e) => this.handleStateClick(e, state.id);

        // Header
        const header = document.createElement('div');
        header.className = 'state-header';

        const title = this.createFlowNodeTitle(state, index, editingStateId, onPropertyUpdate);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn danger';
        deleteBtn.textContent = '✕';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            onPropertyUpdate('delete', index);
        };

        header.appendChild(title);
        header.appendChild(deleteBtn);
        node.appendChild(header);

        // Selectors section
        const selectorsDiv = this.createSelectorsSection(state, index, editingStateId, onPropertyUpdate);
        node.appendChild(selectorsDiv);

        // Transitions section
        const transitionsDiv = this.createFlowTransitionsSection(state, index, editingStateId, onTransitionUpdate);
        node.appendChild(transitionsDiv);

        return node;
    }

    createFlowNodeTitle(state, index, editingStateId, onPropertyUpdate) {
        const title = document.createElement('div');

        if (editingStateId === state.id) {
            // Editable mode
            const aliasInput = document.createElement('input');
            aliasInput.className = 'editable';
            aliasInput.style.background = '#2a2a3a';
            aliasInput.style.color = '#00ffff';
            aliasInput.style.width = '100px';
            aliasInput.value = this.stateManager.getStateAlias(state.id);
            aliasInput.onchange = (e) => onPropertyUpdate('alias', index, e.target.value);

            const actionSelect = this.createActionSelect(state.action, (value) => 
                onPropertyUpdate('action', index, value)
            );
            actionSelect.style.background = '#2a2a3a';
            actionSelect.style.color = '#90ee90';

            const valueInput = document.createElement('input');
            valueInput.className = 'value-input';
            valueInput.style.background = '#2a2a3a';
            valueInput.value = state.value || '';
            valueInput.placeholder = 'value';
            valueInput.onchange = (e) => onPropertyUpdate('value', index, e.target.value);

            title.appendChild(document.createTextNode('['));
            title.appendChild(aliasInput);
            title.appendChild(document.createTextNode('] '));
            title.appendChild(actionSelect);
            title.appendChild(document.createTextNode(' ('));
            title.appendChild(valueInput);
            title.appendChild(document.createTextNode(')'));
        } else {
            // Display mode
            title.innerHTML = `<strong>[${this.stateManager.getStateAlias(state.id)}]</strong> ${state.action} <span style="color: #ffa500;">(${state.value || 'no value'})</span>`;
        }

        return title;
    }

    // Helper methods
    createActionSelect(selectedAction, onChangeCallback) {
        const actionSelect = document.createElement('select');
        actionSelect.className = 'action-select';
        this.actionTypes.forEach(action => {
            const option = document.createElement('option');
            option.value = action;
            option.textContent = action;
            if (action === selectedAction) option.selected = true;
            actionSelect.appendChild(option);
        });
        actionSelect.onchange = (e) => onChangeCallback(e.target.value);
        return actionSelect;
    }

    createConditionSelect(selectedCondition, onChangeCallback) {
        const conditionSelect = document.createElement('select');
        conditionSelect.className = 'condition-select';
        this.conditionTypes.forEach(condition => {
            const option = document.createElement('option');
            option.value = condition;
            option.textContent = condition;
            if (condition === selectedCondition) option.selected = true;
            conditionSelect.appendChild(option);
        });
        conditionSelect.onchange = (e) => onChangeCallback(e.target.value);
        return conditionSelect;
    }

    createTransitionsCell(state, stateIndex, onTransitionUpdate) {
        const transitionsCell = document.createElement('td');

        state.transitions.forEach((transition, tIndex) => {
            const transitionDiv = document.createElement('div');
            transitionDiv.className = 'condition-item';

            const conditionSelect = this.createConditionSelect(
                transition.condition,
                (value) => onTransitionUpdate('condition', stateIndex, tIndex, value)
            );
            conditionSelect.onclick = (e) => e.stopPropagation();

            const arrow = document.createElement('span');
            arrow.textContent = ' → ';
            arrow.style.color = '#666';

            const nextStateInput = document.createElement('input');
            nextStateInput.className = 'next-state-select';
            nextStateInput.value = transition.next === 'pause' ? 'pause' : 
                this.stateManager.getStateAlias(transition.next) || '';
            nextStateInput.placeholder = 'next_state_alias';
            nextStateInput.onclick = (e) => {
                e.stopPropagation();
                nextStateInput.style.width = '180px';
            };
            nextStateInput.onblur = () => {
                nextStateInput.style.width = '';
            };
            nextStateInput.onchange = (e) => onTransitionUpdate('next', stateIndex, tIndex, e.target.value);

            const conditionalParamInput = document.createElement('input');
            conditionalParamInput.className = 'optional-input';
            conditionalParamInput.value = transition.conditional_parameter || '';
            conditionalParamInput.placeholder = 'conditional_parameter';
            conditionalParamInput.style.width = '120px';
            conditionalParamInput.onclick = (e) => {
                e.stopPropagation();
                conditionalParamInput.style.width = '200px';
            };
            conditionalParamInput.onblur = () => {
                conditionalParamInput.style.width = '120px';
            };
            conditionalParamInput.onchange = (e) => onTransitionUpdate('param', stateIndex, tIndex, e.target.value);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-transition';
            removeBtn.textContent = '✕';
            removeBtn.style.cursor = 'pointer';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                onTransitionUpdate('remove', stateIndex, tIndex);
            };

            transitionDiv.appendChild(conditionSelect);
            transitionDiv.appendChild(arrow);
            transitionDiv.appendChild(nextStateInput);
            transitionDiv.appendChild(document.createTextNode(' param: '));
            transitionDiv.appendChild(conditionalParamInput);
            transitionDiv.appendChild(removeBtn);

            transitionsCell.appendChild(transitionDiv);
        });

        const addTransitionBtn = document.createElement('button');
        addTransitionBtn.className = 'add-transition';
        addTransitionBtn.textContent = '+ Transition';
        addTransitionBtn.style.cursor = 'pointer';
        addTransitionBtn.onclick = (e) => {
            e.stopPropagation();
            onTransitionUpdate('add', stateIndex);
        };
        transitionsCell.appendChild(addTransitionBtn);

        return transitionsCell;
    }

    createSelectorsSection(state, index, editingStateId, onPropertyUpdate) {
        const selectorsDiv = document.createElement('div');
        selectorsDiv.style.marginBottom = '10px';
        selectorsDiv.innerHTML = '<strong style="color: #ffa500;">Selectors:</strong>';
        
        if (editingStateId === state.id) {
            // Editable selectors
            const selectorsTextarea = document.createElement('textarea');
            selectorsTextarea.className = 'selector-input';
            selectorsTextarea.style.background = '#2a2a3a';
            selectorsTextarea.style.width = '100%';
            selectorsTextarea.style.marginTop = '5px';
            selectorsTextarea.value = (state.selectors || []).join('\n');
            selectorsTextarea.rows = 3;
            selectorsTextarea.placeholder = 'Enter selectors (one per line)';
            selectorsTextarea.onchange = (e) => {
                const selectors = e.target.value.split('\n').filter(s => s.trim());
                onPropertyUpdate('selectors', index, selectors);
            };
            selectorsDiv.appendChild(selectorsTextarea);
        } else {
            // Display selectors
            const selectorsList = document.createElement('div');
            selectorsList.style.fontSize = '11px';
            selectorsList.style.color = '#ffa500';
            selectorsList.style.marginTop = '5px';
            if (state.selectors && state.selectors.length > 0) {
                state.selectors.forEach(selector => {
                    const selectorSpan = document.createElement('div');
                    selectorSpan.textContent = selector;
                    selectorSpan.style.background = '#1a1a2a';
                    selectorSpan.style.padding = '2px 6px';
                    selectorSpan.style.margin = '2px 0';
                    selectorSpan.style.borderRadius = '3px';
                    selectorsList.appendChild(selectorSpan);
                });
            } else {
                selectorsList.textContent = 'No selectors';
                selectorsList.style.color = '#666';
            }
            selectorsDiv.appendChild(selectorsList);
        }
        
        return selectorsDiv;
    }

    createFlowTransitionsSection(state, index, editingStateId, onTransitionUpdate) {
        const transitionsDiv = document.createElement('div');
        transitionsDiv.className = 'transitions';
        transitionsDiv.innerHTML = '<strong style="color: #ffff00;">Transitions:</strong>';

        state.transitions.forEach((transition, tIndex) => {
            const transitionDiv = document.createElement('div');
            transitionDiv.className = 'transition';

            if (editingStateId === state.id) {
                this.createEditableTransition(transitionDiv, transition, index, tIndex, onTransitionUpdate);
            } else {
                this.createDisplayTransition(transitionDiv, transition);
            }

            transitionsDiv.appendChild(transitionDiv);
        });

        if (editingStateId === state.id) {
            const addTransitionBtn = document.createElement('button');
            addTransitionBtn.className = 'add-transition';
            addTransitionBtn.textContent = '+ Add Transition';
            addTransitionBtn.onclick = (e) => {
                e.stopPropagation();
                onTransitionUpdate('add', index);
            };
            transitionsDiv.appendChild(addTransitionBtn);
        }

        return transitionsDiv;
    }

    createEditableTransition(container, transition, stateIndex, tIndex, onTransitionUpdate) {
        const conditionSelect = this.createConditionSelect(
            transition.condition,
            (value) => onTransitionUpdate('condition', stateIndex, tIndex, value)
        );
        conditionSelect.style.background = '#1a1a2a';

        const nextStateInput = document.createElement('input');
        nextStateInput.className = 'next-state-select';
        nextStateInput.style.background = '#1a1a2a';
        nextStateInput.value = transition.next === 'pause' ? 'pause' : 
            this.stateManager.getStateAlias(transition.next) || '';
        nextStateInput.placeholder = 'next_alias';
        nextStateInput.onchange = (e) => onTransitionUpdate('next', stateIndex, tIndex, e.target.value);

        const conditionalParamInput = document.createElement('input');
        conditionalParamInput.className = 'optional-input';
        conditionalParamInput.style.background = '#1a1a2a';
        conditionalParamInput.value = transition.conditional_parameter || '';
        conditionalParamInput.placeholder = 'param';
        conditionalParamInput.onchange = (e) => onTransitionUpdate('param', stateIndex, tIndex, e.target.value);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-transition';
        removeBtn.textContent = '✕';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            onTransitionUpdate('remove', stateIndex, tIndex);
        };

        container.appendChild(conditionSelect);
        container.appendChild(document.createTextNode(' → '));
        container.appendChild(nextStateInput);
        container.appendChild(document.createTextNode(' ('));
        container.appendChild(conditionalParamInput);
        container.appendChild(document.createTextNode(')'));
        container.appendChild(removeBtn);
    }

    createDisplayTransition(container, transition) {
        const conditionIcon = transition.condition === 'always' ? '🔄' :
            transition.condition === 'element_exists' ? '🔍' :
                transition.condition === 'url_matches' ? '🌐' : '⚡';

        const nextAlias = transition.next === 'pause' ? 'pause' : 
            this.stateManager.getStateAlias(transition.next) || 'undefined';
        const paramText = transition.conditional_parameter ? ` (${transition.conditional_parameter})` : '';
        
        container.innerHTML = `
            ${conditionIcon} <strong>${transition.condition}</strong> → 
            <span style="color: #ff69b4;">${nextAlias}</span><span style="color: #ffa500;">${paramText}</span>
        `;
    }

    // Event handling
    handleStateClick(e, stateId) {
        e.stopPropagation();
        
        if (!this.clickCount[stateId]) {
            this.clickCount[stateId] = 0;
        }
        
        this.clickCount[stateId]++;
        
        if (this.clickCount[stateId] === 1) {
            setTimeout(() => {
                if (this.clickCount[stateId] === 1) {
                    this.stateManager.setEditingStateId(stateId);
                    // Trigger re-render - this should be handled by the main app
                    window.dispatchEvent(new CustomEvent('stateSelected', { detail: { stateId } }));
                }
                this.clickCount[stateId] = 0;
            }, 300);
        }
    }

    clearClickCounts() {
        this.clickCount = {};
    }

    // Bot selection UI
    renderBotSelection(bots, onBotSelect, onNewBot) {
        const container = document.getElementById('bot-selection-container');
        container.innerHTML = '';

        bots.forEach(bot => {
            const card = this.createBotCard(bot, onBotSelect);
            container.appendChild(card);
        });

        // Add "New Bot" card
        const addCard = this.createNewBotCard(onNewBot);
        container.appendChild(addCard);
    }

    createBotCard(bot, onBotSelect) {
        const card = document.createElement('div');
        card.style.cssText = `
            background-color:#111; 
            color:#fff; 
            width:250px; 
            height:300px; 
            border-radius:16px; 
            display:flex; 
            flex-direction:column; 
            align-items:center; 
            justify-content:flex-start; 
            padding:16px; 
            cursor:pointer;
            box-shadow:0 0 20px rgba(0,0,0,0.7);
            transition: transform 0.2s;
        `;
        card.onmouseover = () => card.style.transform = 'scale(1.05)';
        card.onmouseout = () => card.style.transform = 'scale(1)';
        card.onclick = () => onBotSelect(bot.file);

        const img = document.createElement('img');
        img.src = bot.bot_image || 'https://via.placeholder.com/150';
        img.style.cssText = 'width:100%; height:120px; object-fit:cover; border-radius:8px;';
        card.appendChild(img);

        const title = document.createElement('h2');
        title.textContent = bot.bot_name;
        title.style.cssText = 'margin:12px 0 4px 0; font-size:20px; text-align:center;';
        card.appendChild(title);

        const file = document.createElement('div');
        file.textContent = bot.file_name;
        file.style.cssText = 'font-size:14px; color:#aaa; text-align:center;';
        card.appendChild(file);

        const desc = document.createElement('p');
        desc.textContent = bot.bot_description || 'No description';
        desc.style.cssText = 'font-size:12px; color:#ccc; margin-top:8px; text-align:center; flex-grow:1;';
        card.appendChild(desc);

        return card;
    }

    createNewBotCard(onNewBot) {
        const addCard = document.createElement('div');
        addCard.style.cssText = `
            background-color:#111; 
            color:#fff; 
            width:250px; 
            height:300px; 
            border-radius:16px; 
            display:flex; 
            align-items:center; 
            justify-content:center; 
            font-size:48px; 
            cursor:pointer; 
            box-shadow:0 0 20px rgba(0,0,0,0.7);
            transition: transform 0.2s;
        `;
        addCard.textContent = '+';
        addCard.onmouseover = () => addCard.style.transform = 'scale(1.05)';
        addCard.onmouseout = () => addCard.style.transform = 'scale(1)';
        addCard.onclick = onNewBot;
        
        return addCard;
    }
}