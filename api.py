# api.py
import json
from pathlib import Path
from flask import jsonify, request

from executor.runner import run_bot
from executor import actions as actions_module, conditions as conditions_module
from data.context import Context
import asyncio
import threading
from playwright.async_api import async_playwright
from executor.session import launch_persistent_context

# ----------------------------- BotRunner Class -----------------------------
class BotRunner:
    def __init__(self, bot_name, bot_file):
        self.bot_name = bot_name      # <--- add this
        self.bot_file = bot_file
        self.is_running = False
        self.browser = None
        self.page = None
        self._stop_event = asyncio.Event()
        self._pause_event = asyncio.Event()
        self._pause_event.set()

    async def run(self):
        self.is_running = True
        print(f"🔹 Starting bot: {self.bot_name}, file: {self.bot_file}")
        try:
            context_obj = Context()
            # Use persistent context for fullscreen
            self.playwright, self.browser, self.page = await launch_persistent_context(self.bot_name, headless=False)
            await self.page.set_viewport_size({"width": 1920, "height": 1080})  # force HTML scaling

            bot_task = asyncio.create_task(
                run_bot(self.bot_name, self.page, self.bot_file, context_obj, self._pause_event, self._stop_event)
            )
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
    from main import bot_threads, running_bots  # lazy import here too
    def run_in_thread():
        runner = BotRunner(bot_name, bot_file)
        running_bots[bot_name] = runner
        asyncio.run(runner.run())
        running_bots.pop(bot_name, None)
        bot_threads.pop(bot_name, None)

    thread = threading.Thread(target=run_in_thread)
    bot_threads[bot_name] = thread
    thread.start()

# ----------------------------- Register API Routes -----------------------------
def register_api_routes(app, running_bots, bot_threads):

    # ✅ Lazy import to avoid circular dependency
    from main import running_bots, bot_threads

    # ----------- Bot Management -----------
    @app.route("/api/bots", methods=["GET"])
    def get_bots():
        bots_dir = Path("bots")
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
                                "start_url": bot_data.get("start_url", "https://example.com"),
                                "is_running": is_running,
                            }
                        )
                except Exception as e:
                    print(f"Error reading bot file {bot_file}: {e}")
        return jsonify(bots)

    @app.route("/api/bots/save", methods=["POST"])
    def save_bot():
        data = request.get_json()
        bot_name = data.get("bot_name")
        if not bot_name:
            return jsonify({"error": "bot_name missing"}), 400

        file_name = data.get("file_name") or f"{bot_name.lower().replace(' ', '_')}.json"
        bots_dir = Path("bots")
        bots_dir.mkdir(exist_ok=True)
        file_path = bots_dir / file_name

        try:
            with open(file_path, "w") as f:
                json.dump(data, f, indent=2)
            return jsonify({"message": f"Bot {bot_name} saved as {file_name}"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/bots/<bot_name>/start", methods=["POST"])
    def start_bot(bot_name):
        if bot_name in running_bots and running_bots[bot_name].is_running:
            return jsonify({"error": "Bot is already running"}), 400

        bots_dir = Path("bots")
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

        run_bot_async(bot_name, bot_file)
        return jsonify({"message": f"Bot {bot_name} started"})

# ----------------------------- START PAUSE RESUME  -----------------------------

    @app.route("/api/bots/<bot_name>/stop", methods=["POST"])
    def stop_bot(bot_name):
        runner = running_bots.get(bot_name)
        if not runner:
            return jsonify({"error": "Bot is not running"}), 400
        print(f"🛑 STOP command received for bot {bot_name}")
        runner._stop_event.set()  # signal stop
        runner._pause_event.set()  # ensure it’s not stuck paused
        return jsonify({"message": f"Bot {bot_name} stopped"})


    @app.route("/api/bots/<bot_name>/pause", methods=["POST"])
    def pause_bot(bot_name):
        runner = running_bots.get(bot_name)
        if not runner:
            return jsonify({"error": "Bot not running"}), 400
        print(f"⏸ PAUSE command received for bot {bot_name}")
        runner._pause_event.clear()  # pause the bot
        return jsonify({"message": f"Bot {bot_name} paused"})


    @app.route("/api/bots/<bot_name>/resume", methods=["POST"])
    def resume_bot(bot_name):
        runner = running_bots.get(bot_name)
        if not runner:
            return jsonify({"error": "Bot not running"}), 400
        print(f"▶️ RESUME command received for bot {bot_name}")
        runner._pause_event.set()  # resume the bot
        return jsonify({"message": f"Bot {bot_name} resumed"})

    @app.route("/api/bots/<bot_file>", methods=["DELETE"])
    def delete_bot(bot_file):
        bots_dir = Path("bots")
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
        bots_dir = Path("bots")
        file_path = bots_dir / bot_file
        if not file_path.exists() or not file_path.is_file():
            return jsonify({"error": "Bot not found"}), 404
        with open(file_path, "r") as f:
            return jsonify(json.load(f))

    @app.route("/api/bots/<bot_name>/status", methods=["GET"])
    def get_bot_status(bot_name):
        is_running = bot_name in running_bots and running_bots[bot_name].is_running
        return jsonify({"is_running": is_running})

    # ----------- Actions & Conditions -----------
    @app.route("/api/actions", methods=["GET"])
    def list_actions():
        return jsonify(sorted(list(actions_module.ACTIONS.keys())))

    @app.route("/api/conditions", methods=["GET"])
    def list_conditions():
        return jsonify(sorted(list(conditions_module.CONDITIONS.keys())))

    # ----------- Minimal Config for UI (optional) -----------
    @app.route("/api/config", methods=["GET"])
    def get_config():
        # Only minimal info frontend may need
        return jsonify({
            "app_title": "🤖 Bot Framework",
            "browser_headless": False,
            "default_start_url": "https://example.com"
        })
