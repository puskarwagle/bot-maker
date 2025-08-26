// -------------------- Form Validation Module --------------------

// Allowed actions and conditions (these should match your backend)
const ALLOWED_ACTIONS = [
    'extract', 'click', 'fill', 'navigate', 'wait', 'scroll', 
    'hover', 'submit', 'select', 'check', 'uncheck'
];

const ALLOWED_CONDITIONS = [
    'element_exists', 'text_matches', 'url_contains', 'always', 
    'element_not_exists', 'text_not_matches', 'url_not_contains'
];

// -------------------- Validation Functions --------------------

export function validateBotName(name) {
    const errors = [];
    
    if (!name || typeof name !== 'string') {
        errors.push('Bot name is required');
        return { isValid: false, errors };
    }
    
    const trimmed = name.trim();
    if (trimmed.length === 0) {
        errors.push('Bot name cannot be empty');
    }
    
    if (trimmed.length > 100) {
        errors.push('Bot name must be 100 characters or less');
    }
    
    return { isValid: errors.length === 0, errors };
}

export function validateStartUrl(url) {
    const errors = [];
    
    if (!url || typeof url !== 'string') {
        errors.push('Start URL is required');
        return { isValid: false, errors };
    }
    
    const trimmed = url.trim();
    if (trimmed.length === 0) {
        errors.push('Start URL cannot be empty');
        return { isValid: false, errors };
    }
    
    try {
        const urlObj = new URL(trimmed);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            errors.push('URL must use http:// or https:// protocol');
        }
    } catch (e) {
        errors.push('Please enter a valid URL (e.g., https://example.com)');
    }
    
    return { isValid: errors.length === 0, errors };
}

export function validateStates(states) {
    const errors = [];
    
    if (!Array.isArray(states)) {
        errors.push('States must be an array');
        return { isValid: false, errors };
    }
    
    if (states.length === 0) {
        errors.push('At least one state is required');
        return { isValid: false, errors };
    }
    
    const stateIds = new Set();
    
    states.forEach((state, index) => {
        const stateErrors = validateState(state, index, stateIds);
        errors.push(...stateErrors.errors);
        
        if (stateErrors.isValid && state.id) {
            stateIds.add(state.id);
        }
    });
    
    // Validate state references in transitions
    states.forEach((state, index) => {
        if (state.transitions && Array.isArray(state.transitions)) {
            state.transitions.forEach((transition, tIndex) => {
                if (transition.next && transition.next !== 'END' && !stateIds.has(transition.next)) {
                    errors.push(`State ${index + 1}, transition ${tIndex + 1}: references non-existent state "${transition.next}"`);
                }
            });
        }
    });
    
    return { isValid: errors.length === 0, errors };
}

export function validateState(state, index = 0, existingIds = new Set()) {
    const errors = [];
    const stateLabel = `State ${index + 1}`;
    
    if (!state || typeof state !== 'object') {
        errors.push(`${stateLabel}: must be an object`);
        return { isValid: false, errors };
    }
    
    // Validate ID
    if (!state.id || typeof state.id !== 'string' || state.id.trim().length === 0) {
        errors.push(`${stateLabel}: id is required and must be a non-empty string`);
    } else if (existingIds.has(state.id)) {
        errors.push(`${stateLabel}: id "${state.id}" is not unique`);
    }
    
    // Validate action
    if (!state.action || typeof state.action !== 'string') {
        errors.push(`${stateLabel}: action is required`);
    } else if (!ALLOWED_ACTIONS.includes(state.action)) {
        errors.push(`${stateLabel}: action "${state.action}" is not allowed. Must be one of: ${ALLOWED_ACTIONS.join(', ')}`);
    }
    
    // Validate selectors
    if (!Array.isArray(state.selectors)) {
        errors.push(`${stateLabel}: selectors must be an array`);
    } else if (state.selectors.length === 0) {
        errors.push(`${stateLabel}: at least one selector is required`);
    } else {
        state.selectors.forEach((selector, sIndex) => {
            if (!selector || typeof selector !== 'string' || selector.trim().length === 0) {
                errors.push(`${stateLabel}: selector ${sIndex + 1} must be a non-empty string`);
            }
        });
    }
    
    // Validate transitions
    if (state.transitions) {
        if (!Array.isArray(state.transitions)) {
            errors.push(`${stateLabel}: transitions must be an array`);
        } else {
            state.transitions.forEach((transition, tIndex) => {
                const transitionErrors = validateTransition(transition, `${stateLabel}, transition ${tIndex + 1}`);
                errors.push(...transitionErrors.errors);
            });
        }
    }
    
    return { isValid: errors.length === 0, errors };
}

export function validateTransition(transition, label = 'Transition') {
    const errors = [];
    
    if (!transition || typeof transition !== 'object') {
        errors.push(`${label}: must be an object`);
        return { isValid: false, errors };
    }
    
    // Validate condition
    if (!transition.condition || typeof transition.condition !== 'string') {
        errors.push(`${label}: condition is required`);
    } else if (!ALLOWED_CONDITIONS.includes(transition.condition)) {
        errors.push(`${label}: condition "${transition.condition}" is not allowed. Must be one of: ${ALLOWED_CONDITIONS.join(', ')}`);
    }
    
    // Validate next
    if (!transition.next || typeof transition.next !== 'string' || transition.next.trim().length === 0) {
        errors.push(`${label}: next state is required`);
    }
    
    // Validate selectors (conditional based on condition type)
    const conditionsRequiringSelectors = ['element_exists', 'element_not_exists', 'text_matches', 'text_not_matches'];
    if (conditionsRequiringSelectors.includes(transition.condition)) {
        if (!Array.isArray(transition.selectors) || transition.selectors.length === 0) {
            errors.push(`${label}: selectors are required for condition "${transition.condition}"`);
        } else {
            transition.selectors.forEach((selector, sIndex) => {
                if (!selector || typeof selector !== 'string' || selector.trim().length === 0) {
                    errors.push(`${label}: selector ${sIndex + 1} must be a non-empty string`);
                }
            });
        }
    }
    
    // Validate text (optional but must be string if present)
    if (transition.text !== undefined && (typeof transition.text !== 'string')) {
        errors.push(`${label}: text must be a string`);
    }
    
    // Validate pattern (optional but must be valid regex if present)
    if (transition.pattern !== undefined) {
        if (typeof transition.pattern !== 'string') {
            errors.push(`${label}: pattern must be a string`);
        } else {
            try {
                new RegExp(transition.pattern);
            } catch (e) {
                errors.push(`${label}: pattern "${transition.pattern}" is not a valid regular expression`);
            }
        }
    }
    
    return { isValid: errors.length === 0, errors };
}

export function validateFileName(fileName, botName = '') {
    const errors = [];
    
    if (!fileName || typeof fileName !== 'string') {
        errors.push('File name is required');
        return { isValid: false, errors };
    }
    
    const trimmed = fileName.trim();
    if (trimmed.length === 0) {
        errors.push('File name cannot be empty');
        return { isValid: false, errors };
    }
    
    if (!trimmed.endsWith('.json')) {
        errors.push('File name must end with .json');
    }
    
    // Check for unsafe characters
    const unsafeChars = /[<>:"/\\|?*\s]/;
    if (unsafeChars.test(trimmed)) {
        errors.push('File name contains unsafe characters (spaces, special characters)');
    }
    
    // Optional: check if it matches slugified bot name
    if (botName) {
        const expectedFileName = slugifyName(botName) + '.json';
        if (trimmed !== expectedFileName) {
            errors.push(`File name should be "${expectedFileName}" based on bot name`);
        }
    }
    
    return { isValid: errors.length === 0, errors };
}

// -------------------- Complete Bot Validation --------------------

export function validateBot(bot) {
    const errors = [];
    
    if (!bot || typeof bot !== 'object') {
        errors.push('Bot data is required');
        return { isValid: false, errors };
    }
    
    // Validate each component
    const nameValidation = validateBotName(bot.bot_name);
    const urlValidation = validateStartUrl(bot.start_url);
    const statesValidation = validateStates(bot.states || []);
    const fileNameValidation = validateFileName(bot.file_name || '', bot.bot_name);
    
    errors.push(...nameValidation.errors);
    errors.push(...urlValidation.errors);
    errors.push(...statesValidation.errors);
    errors.push(...fileNameValidation.errors);
    
    return { 
        isValid: errors.length === 0, 
        errors,
        details: {
            botName: nameValidation,
            startUrl: urlValidation,
            states: statesValidation,
            fileName: fileNameValidation
        }
    };
}

// -------------------- UI Validation Helpers --------------------

export function showValidationErrors(errors, containerId = 'validation-errors') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('Validation errors container not found');
        return;
    }
    
    if (errors.length === 0) {
        container.innerHTML = '';
        container.classList.add('hidden');
        return;
    }
    
    container.innerHTML = `
        <div class="alert alert-error">
            <div>
                <h3 class="font-bold">Validation Errors:</h3>
                <ul class="list-disc list-inside mt-2">
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
    container.classList.remove('hidden');
}

export function clearValidationErrors(containerId = 'validation-errors') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
        container.classList.add('hidden');
    }
}

// -------------------- Real-time Field Validation --------------------

export function validateField(fieldId, validator) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const value = field.value;
    const validation = validator(value);
    
    // Remove existing validation classes
    field.classList.remove('input-error', 'input-success');
    
    // Add appropriate class
    if (validation.isValid) {
        field.classList.add('input-success');
    } else {
        field.classList.add('input-error');
    }
    
    // Show/hide field-specific error
    const errorId = `${fieldId}-error`;
    let errorElement = document.getElementById(errorId);
    
    if (validation.errors.length > 0) {
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = errorId;
            errorElement.className = 'text-error text-sm mt-1';
            field.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = validation.errors[0]; // Show first error
    } else if (errorElement) {
        errorElement.remove();
    }
    
    return validation;
}

// -------------------- Utility Functions --------------------

function slugifyName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_{2,}/g, '_');
}

// Export allowed values for use in other modules
export { ALLOWED_ACTIONS, ALLOWED_CONDITIONS };