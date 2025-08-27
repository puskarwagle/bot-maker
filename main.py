import asyncio
import json
import webbrowser
import threading
import time
from pathlib import Path
from flask import Flask, render_template, jsonify, request, send_from_directory
from playwright.async_api import async_playwright

from data.context import Context
from executor.runner import run_bot
import executor.actions as actions_module
import executor.conditions as conditions_module

# ----------------------------- DEFAULT CONFIG -----------------------------
config = {
    "app": {
        "title": "🤖 Bot Framework",
        "host": "0.0.0.0",
        "port": 5000,
        "debug": False,
        "auto_open_browser": True,
        "browser_delay": 1.5,
    },
    "ui": {
        "theme": "dark",
        "body_classes": "bg-gray-900 text-gray-100",
        "tailwind_cdn": "https://cdn.tailwindcss.com",
        "daisyui_cdn": "https://cdn.jsdelivr.net/npm/daisyui@2.51.5/dist/full.css",
        "custom_css": False,
        "show_json_preview": False,
        "tabs": [
            {"id": "builder", "label": "Bot Builder", "active": True},
            {"id": "bots", "label": "Bots", "active": False},
        ],
    },
    "builder": {
        "title": "Create Bot",
        "name_placeholder": "Bot Name",
        "url_placeholder": "Start URL",
        "default_url": "https://example.com",
        "create_button_text": "Create Bot",
    },
    "editor": {
        "available_bots_title": "Available Bots",
        "loading_text": "Loading bots...",
        "state_builder_title": "Add/Edit State",
        "action_label": "Action",
        "selector_label": "Selector(s)",
        "selector_placeholder": "#username, .button, etc.",
        "value_label": "Value",
        "value_placeholder": "Text to fill or store key",
        "transitions_title": "Transitions",
        "add_transition_text": "+ Add Transition",
        "add_state_text": "Add/Update State",
        "states_list_title": "Bot States",
        "json_preview_title": "JSON Preview",
    },
    "browser": {
        "type": "chromium",
        "headless": False,
        "timeout": 5000,
    },
    "directories": {
        "bots": "bots",
        "templates": "ui/templates",
        "static": "ui",
    },
    "auto_save": {"enabled": True, "delay_ms": 500},
}

# ----------------------------- Flask App -----------------------------
app = Flask(
    __name__,
    template_folder=config["directories"]["templates"],
    static_folder=config["directories"]["static"],
    static_url_path="",
)

@app.context_processor
def inject_config():
    return {"config": config}

# ----------------------------- Globals -----------------------------
running_bots = {}
bot_threads = {}

# ----------------------------- Bot Runner -----------------------------
class BotRunner:
    def __init__(self, bot_file):
        self.bot_file = bot_file
        self.is_running = False
        self.browser = None
        self.page = None
        self._stop_event = asyncio.Event()
        self._pause_event = asyncio.Event()
        self._pause_event.set()

    async def run(self):
        self.is_running = True
        try:
            with open(self.bot_file, "r") as f:
                bot_config = json.load(f)
            start_url = bot_config.get("start_url", "https://example.com")

            async with async_playwright() as p:
                browser_type = getattr(p, "chromium")
                self.browser = await browser_type.launch(headless=False)
                self.page = await self.browser.new_page()

                context = Context()
                bot_task = asyncio.create_task(run_bot(self.page, self.bot_file, context))
                stop_task = asyncio.create_task(self._wait_for_stop())

                while not bot_task.done():
                    await self._pause_event.wait()
                    done, _ = await asyncio.wait(
                        [bot_task, stop_task],
                        timeout=0.1,
                        return_when=asyncio.FIRST_COMPLETED,
                    )

                if stop_task.done():
                    bot_task.cancel()
                    try:
                        await bot_task
                    except asyncio.CancelledError:
                        pass
        finally:
            if self.browser:
                await self.browser.close()
            self.is_running = False

    def stop(self):
        self._stop_event.set()

    def pause(self):
        print("Pausing bot")
        self._pause_event.clear()

    def resume(self):
        print("Resuming bot")
        self._pause_event.set()

    async def _wait_for_stop(self):
        await self._stop_event.wait()

def run_bot_async(bot_name, bot_file):
    def run_in_thread():
        runner = BotRunner(bot_file)
        running_bots[bot_name] = runner
        asyncio.run(runner.run())
        running_bots.pop(bot_name, None)
        bot_threads.pop(bot_name, None)

    thread = threading.Thread(target=run_in_thread)
    bot_threads[bot_name] = thread
    thread.start()

# ----------------------------- UI Routes -----------------------------
@app.route("/")
def index():
    return send_from_directory("ui", "index.html")

@app.route("/<path:filename>")
def serve_ui_files(filename):
    return send_from_directory("ui", filename)

# ----------------------------- Bot Management APIs -----------------------------
@app.route("/api/bots", methods=["GET"])
def get_bots():
    bots_dir = Path(config["directories"]["bots"])
    bots = []
    if bots_dir.exists():
        for bot_file in bots_dir.glob("*.json"):
            try:
                with open(bot_file, "r") as f:
                    bot_data = json.load(f)
                    bot_name = bot_data.get("bot_name", bot_file.stem)
                    is_running = (
                        bot_name in running_bots and running_bots[bot_name].is_running
                    )
                    bots.append(
                        {
                            "name": bot_name,
                            "file": bot_file.name,
                            "states_count": len(bot_data.get("states", [])),
                            "start_url": bot_data.get(
                                "start_url", config["builder"]["default_url"]
                            ),
                            "is_running": is_running,
                        }
                    )
            except Exception as e:
                print(f"Error reading bot file {bot_file}: {e}")
    return jsonify(bots)

@app.route("/api/bots/<bot_name>/pause", methods=["POST"])
def pause_bot(bot_name):
    if bot_name not in running_bots:
        return jsonify({"error": "Bot not running"}), 400
    running_bots[bot_name].pause()
    return jsonify({"message": f"Bot {bot_name} paused"})

@app.route("/api/bots/<bot_name>/resume", methods=["POST"])
def resume_bot(bot_name):
    if bot_name not in running_bots:
        return jsonify({"error": "Bot not running"}), 400
    running_bots[bot_name].resume()
    return jsonify({"message": f"Bot {bot_name} resumed"})

@app.route("/api/bots/save", methods=["POST"])
def save_bot():
    data = request.get_json()
    bot_name = data.get("bot_name")
    if not bot_name:
        return jsonify({"error": "bot_name missing"}), 400

    file_name = data.get("file_name") or f"{bot_name.lower().replace(' ', '_')}.json"
    bots_dir = Path(config["directories"]["bots"])
    bots_dir.mkdir(exist_ok=True)
    file_path = bots_dir / file_name

    try:
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)
        return jsonify({"message": f"Bot {bot_name} saved as {file_name}"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/bots/<bot_file>", methods=["DELETE"])
def delete_bot(bot_file):
    bots_dir = Path(config["directories"]["bots"])
    file_path = bots_dir / bot_file
    if not file_path.exists() or not file_path.is_file():
        return jsonify({"error": "Bot not found"}), 404
    try:
        file_path.unlink()
        return jsonify({"message": f"Bot {bot_file} deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/bots/<bot_file>", methods=["GET"])
def get_bot_file(bot_file):
    bots_dir = Path(config["directories"]["bots"])
    file_path = bots_dir / bot_file
    if not file_path.exists() or not file_path.is_file():
        return jsonify({"error": "Bot not found"}), 404
    try:
        with open(file_path, "r") as f:
            bot_data = json.load(f)
        return jsonify(bot_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/bots/<bot_name>/start", methods=["POST"])
def start_bot(bot_name):
    if bot_name in running_bots and running_bots[bot_name].is_running:
        return jsonify({"error": "Bot is already running"}), 400

    bots_dir = Path(config["directories"]["bots"])
    bot_file = None
    for file_path in bots_dir.glob("*.json"):
        try:
            with open(file_path, "r") as f:
                bot_data = json.load(f)
                if bot_data.get("bot_name") == bot_name:
                    bot_file = str(file_path)
                    break
        except:
            continue

    if not bot_file:
        return jsonify({"error": "Bot not found"}), 404

    try:
        run_bot_async(bot_name, bot_file)
        return jsonify({"message": f"Bot {bot_name} started"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/bots/<bot_name>/stop", methods=["POST"])
def stop_bot(bot_name):
    if bot_name not in running_bots:
        return jsonify({"error": "Bot is not running"}), 400
    try:
        running_bots[bot_name].stop()
        return jsonify({"message": f"Bot {bot_name} stopped"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/bots/<bot_name>/status", methods=["GET"])
def get_bot_status(bot_name):
    is_running = bot_name in running_bots and running_bots[bot_name].is_running
    return jsonify({"is_running": is_running})

# ----------------------------- Actions & Conditions APIs -----------------------------
@app.route("/api/actions", methods=["GET"])
def list_actions():
    # ACTIONS is already available due to the top-level import
    return jsonify(sorted(list(actions_module.ACTIONS.keys())))

@app.route("/api/conditions", methods=["GET"])
def list_conditions():
    # CONDITIONS is already available due to the top-level import
    return jsonify(sorted(list(conditions_module.CONDITIONS.keys())))

@app.route("/api/config", methods=["GET"])
def get_config():
    return jsonify(config)

# ----------------------------- Helpers -----------------------------
def open_browser():
    app_config = config["app"]
    delay = app_config.get("browser_delay", 1.5)
    port = app_config.get("port", 5000)
    time.sleep(delay)
    webbrowser.open(f"http://localhost:{port}")

# ----------------------------- Main -----------------------------
if __name__ == "__main__":
    app_config = config["app"]
    print(f"🤖 {app_config.get('title', 'Bot Framework')} Server Starting...")

    bots_dir = Path(config["directories"]["bots"])
    bots_dir.mkdir(exist_ok=True)

    if app_config.get("auto_open_browser", True):
        browser_thread = threading.Thread(target=open_browser)
        browser_thread.daemon = True
        browser_thread.start()

    app.run(
        debug=app_config.get("debug", False),
        host=app_config.get("host", "0.0.0.0"),
        port=app_config.get("port", 5000),
        use_reloader=False,
    )
