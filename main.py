# main.py
import asyncio
import threading
import time
from pathlib import Path
from flask import Flask, send_from_directory
from playwright.async_api import async_playwright
from api import register_api_routes

# ----------------------------- Flask App -----------------------------
app = Flask(
    __name__,
    template_folder="ui/templates",
    static_folder="ui",
    static_url_path="",
)

# ----------------------------- Globals -----------------------------
running_bots = {}  # bot_name -> BotRunner instance
bot_threads = {}   # bot_name -> Thread instance
playwright_instance = None
browser_context = None
browser_page = None

# ----------------------------- UI Routes -----------------------------
@app.route("/")
def index():
    # return send_from_directory("ui", "index.html")
    return send_from_directory("ui", "table.html")


@app.route("/<path:filename>")
def serve_ui_files(filename):
    return send_from_directory("ui", filename)

# ----------------------------- Register API -----------------------------
register_api_routes(app, running_bots, bot_threads)

# ----------------------------- Browser Helpers -----------------------------
async def start_browser():
    """Launch Playwright browser and open dashboard tab."""
    global playwright_instance, browser_context, browser_page
    playwright_instance = await async_playwright().start()

    browser_context = await playwright_instance.chromium.launch_persistent_context(
        user_data_dir="user_data/dashboard",
        headless=False,
        viewport=None,  # allow real window size
        args=[
            "--start-maximized",
            "--window-size=1920,1080",
        ],
    )

    browser_page = await browser_context.new_page()
    await browser_page.set_viewport_size({"width": 1920, "height": 1080})  # 🔑 force viewport scaling
    await browser_page.goto("http://localhost:5000")
    print("🌐 Dashboard loaded inside Playwright browser.")




async def shutdown_browser():
    """Cleanly close Playwright on exit."""
    global playwright_instance, browser_context
    if browser_context:
        await browser_context.close()
    if playwright_instance:
        await playwright_instance.stop()
    print("🛑 Browser shutdown complete.")

# ----------------------------- Main -----------------------------
def main():
    print("🤖 Bot Framework Server Starting...")

    # Ensure necessary folders exist
    Path("bots").mkdir(exist_ok=True)
    Path("user_data").mkdir(exist_ok=True)

    # Start Flask in a separate thread so Playwright can run in main loop
    def run_flask():
        app.run(debug=False, host="0.0.0.0", port=5000, use_reloader=False)

    flask_thread = threading.Thread(target=run_flask)
    flask_thread.daemon = True
    flask_thread.start()

    # Start Playwright browser and load dashboard
    try:
        asyncio.run(start_browser())
        # Keep the main thread alive while Flask + Playwright run
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("⌨️ Keyboard interrupt received, shutting down...")
    finally:
        asyncio.run(shutdown_browser())

if __name__ == "__main__":
    main()
