import { refreshBotsList } from "./botList.js";
import { renderStates } from "./states.js";
import { validateBotName, validateStartUrl, showValidationErrors, clearValidationErrors } from "./validation.js";

// export your global bot reference
export let bot = {
  bot_name: "",
  start_url: "",
  states: [],
  file_name: null
};

// Utility: make a safe filename slug
export function slugifyName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")   // non-alphanum → _
    .replace(/^_+|_+$/g, "")       // trim leading/trailing _
    .replace(/_{2,}/g, "_");       // collapse multiple _
}

// ------------------ Create New Bot ------------------
export async function createNewBot() {
  const rawName = (document.getElementById("bot-name")?.value || "").trim();
  const startUrl = (document.getElementById("start-url")?.value || "").trim();

  // Clear previous validation messages
  clearValidationErrors();

  // ✅ Validate Bot Name
  const nameValidation = validateBotName(rawName);
  if (!nameValidation.isValid) {
    showValidationErrors(nameValidation.errors);
    return;
  }

  // ✅ Validate Start URL
  const urlValidation = validateStartUrl(startUrl);
  if (!urlValidation.isValid) {
    showValidationErrors(urlValidation.errors);
    return;
  }

  const slug = slugifyName(rawName);
  const fileName = `${slug}.json`;

  // Optional: prevent accidental overwrite
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
    // if listing fails, continue—save endpoint will still handle it
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

    // Adopt the new bot as current; ensure file_name is set
    bot = { ...newBot };

    // Load the bot into the editor
    const { loadBot } = await import('./botEditor.js');
    loadBot(newBot);

    refreshBotsList();
    alert(`Created bot: ${rawName} (${fileName})`);
  } catch (err) {
    console.error("Error creating bot:", err);
    alert("Error creating bot");
  }
}
