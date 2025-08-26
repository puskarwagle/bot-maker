import { refreshBotsList } from "./botList.js";
import { renderStates } from "./states.js";

// export your global bot reference if you keep it in a module
export let bot = {
  bot_name: "MyBot",
  start_url: "https://example.com",
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
  if (!rawName) {
    alert("Enter a bot name first");
    return;
  }

  const slug = slugifyName(rawName);
  const fileName = `${slug}.json`;
  const startUrl = (document.getElementById("start-url")?.value || "").trim();

  // ✅ Validate URL
  try {
    new URL(startUrl);
  } catch {
    alert("Please enter a valid URL (including https:// or http://).");
    return;
  }

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
    bot_name: rawName,       // keep the display name as user entered
    start_url: startUrl,
    states: [],
    file_name: fileName      // ensure server uses login_bot.json etc.
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

    renderStates();
    refreshBotsList();
    alert(`Created bot: ${rawName} (${fileName})`);
  } catch (err) {
    console.error("Error creating bot:", err);
    alert("Error creating bot");
  }
}
