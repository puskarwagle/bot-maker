export async function fetchBots() {
    const res = await fetch('/api/bots');
    return res.json();
}

export async function fetchBot(file) {
    const res = await fetch(`/api/bots/${encodeURIComponent(file)}`);
    return res.json();
}

export async function loadBotFile(file) {
    const res = await fetch(`/api/bots/${encodeURIComponent(file)}`);
    if (!res.ok) {
        throw new Error(`Failed to load bot file: ${res.statusText}`);
    }
    return res.json();
}

export async function saveBot(bot) {
    const res = await fetch('/api/bots/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bot)
    });
    return res.json();
}

export async function deleteBot(file) {
    const res = await fetch(`/api/bots/${encodeURIComponent(file)}`, { method: 'DELETE' });
    return res.json();
}

export async function startBotAPI(botName) {
    const res = await fetch(`/api/bots/${encodeURIComponent(botName)}/start`, { method: 'POST' });
    return res.json();
}

export async function stopBotAPI(botName) {
    const res = await fetch(`/api/bots/${encodeURIComponent(botName)}/stop`, { method: 'POST' });
    return res.json();
}

// -------------------- Pause / Resume --------------------
export async function pauseBotAPI(botName) {
    const res = await fetch(`/api/bots/${encodeURIComponent(botName)}/pause`, { method: 'POST' });
    return res.json();
}

export async function resumeBotAPI(botName) {
    const res = await fetch(`/api/bots/${encodeURIComponent(botName)}/resume`, { method: 'POST' });
    return res.json();
}

// -------------------- Dynamic Actions & Conditions --------------------
export async function fetchActions() {
    const res = await fetch("/api/actions");
    if (!res.ok) return [];
    return res.json();
}

export async function fetchConditions() {
    const res = await fetch("/api/conditions");
    if (!res.ok) return [];
    return res.json();
}
