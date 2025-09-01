import asyncio
import threading
import time
import webbrowser
from pathlib import Path
from flask import Flask, send_from_directory
from executor.api import register_api_routes

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

# ----------------------------- UI Routes -----------------------------
@app.route("/")
def index():
    return send_from_directory("ui", "index.html")

@app.route("/<path:filename>")
def serve_ui_files(filename):
    return send_from_directory("ui", filename)

# ----------------------------- Register API -----------------------------
register_api_routes(app, running_bots, bot_threads)

# ----------------------------- Browser Helpers -----------------------------
def open_dashboard():
    """Open dashboard in default browser."""
    webbrowser.open("http://localhost:5000")
    print("🌐 Dashboard opened in default browser.")

def run_flask():
    """Run Flask server."""
    app.run(debug=False, host="0.0.0.0", port=5000, use_reloader=False)

# ----------------------------- Main -----------------------------
def main():
    print("🤖 Bot Framework Server Starting...")
    
    # Ensure necessary folders exist
    Path("bots").mkdir(exist_ok=True)
    Path("user_data").mkdir(exist_ok=True)
    
    # Start Flask in a separate thread
    flask_thread = threading.Thread(target=run_flask)
    flask_thread.daemon = True
    flask_thread.start()
    
    # Give Flask a moment to start, then open browser
    time.sleep(3)
    open_dashboard()
    
    # Keep server alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("⌨️ Shutting down...")

if __name__ == "__main__":
    main()