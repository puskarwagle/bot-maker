// js/state-manager.js
export class StateManager {
    constructor() {
        this.stateData = {
            bot_name: "",
            start_url: "",
            states: [],
            file_name: ""
        };
        this.editingStateId = null;
    }

    // State data operations
    getStateData() {
        return this.stateData;
    }

    setStateData(data) {
        this.stateData = data;
        this.backfillAliases();
    }

    getEditingStateId() {
        return this.editingStateId;
    }

    setEditingStateId(stateId) {
        this.editingStateId = stateId;
    }

    // State operations
    addState() {
        const newState = {
            id: this.generateStateId(),
            alias: '',
            action: 'do_nothing',
            selectors: [],
            transitions: [],
            value: ''
        };
        this.stateData.states.push(newState);
        return newState;
    }

    removeState(index) {
        if (index >= 0 && index < this.stateData.states.length) {
            this.stateData.states.splice(index, 1);
            return true;
        }
        return false;
    }

    updateStateProperty(stateIndex, property, value) {
        if (stateIndex >= 0 && stateIndex < this.stateData.states.length) {
            this.stateData.states[stateIndex][property] = value;
        }
    }

    // Transition operations
    addTransition(stateIndex) {
        const newTransition = {
            condition: 'always',
            next: 'pause',
            conditional_parameter: ''
        };
        if (stateIndex >= 0 && stateIndex < this.stateData.states.length) {
            this.stateData.states[stateIndex].transitions.push(newTransition);
        }
    }

    removeTransition(stateIndex, transitionIndex) {
        if (stateIndex >= 0 && stateIndex < this.stateData.states.length) {
            const state = this.stateData.states[stateIndex];
            if (transitionIndex >= 0 && transitionIndex < state.transitions.length) {
                state.transitions.splice(transitionIndex, 1);
            }
        }
    }

    updateTransitionProperty(stateIndex, transitionIndex, property, value) {
        if (property === 'next' && value !== 'pause') {
            // Convert alias back to state ID
            const targetState = this.getStateByAlias(value);
            if (targetState) {
                value = targetState.id;
            }
        }
        
        if (stateIndex >= 0 && stateIndex < this.stateData.states.length) {
            const state = this.stateData.states[stateIndex];
            if (transitionIndex >= 0 && transitionIndex < state.transitions.length) {
                state.transitions[transitionIndex][property] = value;
            }
        }
    }

    // Alias operations
    getStateAlias(stateId) {
        const state = this.stateData.states.find(s => s.id === stateId);
        if (!state) return stateId;
        return state.alias || `${state.action}_${stateId.split('_').pop().slice(-4)}`;
    }

    getStateByAlias(alias) {
        return this.stateData.states.find(s => this.getStateAlias(s.id) === alias);
    }

    getAllStateAliases() {
        return this.stateData.states.map(s => this.getStateAlias(s.id));
    }

    updateStateAlias(stateIndex, newAlias) {
        if (stateIndex < 0 || stateIndex >= this.stateData.states.length) return;
        
        const oldAlias = this.getStateAlias(this.stateData.states[stateIndex].id);
        this.stateData.states[stateIndex].alias = newAlias;

        // Update all references to this alias in transitions
        this.stateData.states.forEach(state => {
            state.transitions.forEach(transition => {
                if (transition.next === oldAlias || transition.next === this.stateData.states[stateIndex].id) {
                    transition.next = newAlias;
                }
            });
        });
    }

    // Utility methods
    backfillAliases() {
        this.stateData.states.forEach(state => {
            if (!state.alias) {
                state.alias = `${state.action}_${state.id.split('_').pop().slice(-4)}`;
            }
        });
    }

    generateStateId() {
        return `state_${Date.now()}`;
    }

    slugifyName(name) {
        return name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .replace(/_{2,}/g, "_");
    }
}