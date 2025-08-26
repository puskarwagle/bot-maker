import asyncio
import json
import os
import webbrowser
import threading
import time
from pathlib import Path
from flask import Flask, render_template, jsonify, request, send_from_directory, url_for
from playwright.async_api import async_playwright
from data.context import Context
from executor.runner import run_bot
from utils.config_manager import config_manager
import inspect
import executor.actions as actions_module
import executor.conditions as conditions_module

# Load configuration using ConfigManager
config = config_manager.load()

# Validate configuration
if not config_manager.validate():
    print("Warning: Configuration validation failed, some features may not work correctly")

# Initialize Flask app with template configuration
app = Flask(__name__, 
           template_folder=config.get('directories', {}).get('templates', 'ui/templates'),
           static_folder=config.get('directories', {}).get('static', 'ui'),
           static_url_path='')

# Make config available in templates
@app.context_processor
def inject_config():
    return {'config': config}

# ----------------------------- Global Variables -----------------------------
# Keep track of running bots and their threads
running_bots = {}
bot_threads = {}

# ----------------------------- Bot Runner Class -----------------------------
class BotRunner:
    """
    Encapsulates a bot execution instance.
    Manages browser, page, and async execution of a bot JSON file.
    """
    def __init__(self, bot_file):
        self.bot_file = bot_file
        self.is_running = False
        self.browser = None
        self.page = None
        
    async def run(self):
        """Run the bot asynchronously using Playwright"""
        self.is_running = True
        try:
            # Load bot configuration to get start URL
            with open(self.bot_file, 'r') as f:
                bot_config = json.load(f)
            start_url = bot_config.get('start_url', config.get('builder', {}).get('default_url', 'https://example.com'))

            async with async_playwright() as p:
                browser_config = config.get('browser', {})
                browser_type = getattr(p, browser_config.get('type', 'chromium'))
                self.browser = await browser_type.launch(headless=browser_config.get('headless', False))
                self.page = await self.browser.new_page()
                
                print(f"🌐 Navigating to: {start_url}")
                await self.page.goto(start_url)
                
                context = Context()
                await run_bot(self.page, self.bot_file, context)
                
        except Exception as e:
            print(f"Bot error: {e}")
        finally:
            if self.browser:
                await self.browser.close()
            self.is_running = False
    
    def stop(self):
        """Stop the bot gracefully"""
        self.is_running = False

def run_bot_async(bot_name, bot_file):
    """
    Run a bot in a separate thread.
    Registers the bot instance in `running_bots` and the thread in `bot_threads`.
    """
    def run_in_thread():
        runner = BotRunner(bot_file)
        running_bots[bot_name] = runner
        asyncio.run(runner.run())
        # Cleanup references when finished
        running_bots.pop(bot_name, None)
        bot_threads.pop(bot_name, None)
    
    thread = threading.Thread(target=run_in_thread)
    bot_threads[bot_name] = thread
    thread.start()

# ----------------------------- UI Routes -----------------------------
@app.route('/')
def index():
    """Serve the main UI HTML page using Jinja2 templates"""
    template_data = {
        'active_tab': 'builder',
        'builder': config.get('builder', {}),
        'editor': config.get('editor', {}),
        'runner': config.get('runner', {}),
        'actions': config.get('actions', [])
    }
    return render_template('index.html', **template_data)

@app.route('/<path:filename>')
def serve_ui_files(filename):
    """Serve static UI files (JS, CSS)"""
    return send_from_directory('ui', filename)

# ----------------------------- Bot Management APIs -----------------------------
@app.route('/api/bots', methods=['GET'])
def get_bots():
    """
    Return a list of all available bots with metadata:
    - name
    - file name
    - number of states
    - start_url
    - running status
    """
    bots_dir = Path(config.get('directories', {}).get('bots', 'bots'))
    bots = []
    
    if bots_dir.exists():
        for bot_file in bots_dir.glob('*.json'):
            try:
                with open(bot_file, 'r') as f:
                    bot_data = json.load(f)
                    bot_name = bot_data.get('bot_name', bot_file.stem)
                    is_running = bot_name in running_bots and running_bots[bot_name].is_running
                    bots.append({
                        'name': bot_name,
                        'file': bot_file.name,
                        'states_count': len(bot_data.get('states', [])),
                        'start_url': bot_data.get('start_url', config.get('builder', {}).get('default_url', 'https://example.com')),
                        'is_running': is_running
                    })
            except Exception as e:
                print(f"Error reading bot file {bot_file}: {e}")
    
    return jsonify(bots)

@app.route('/api/bots/save', methods=['POST'])
def save_bot():
    """
    Save or create a bot JSON file.
    Frontend can provide 'file_name' to persist as that file; otherwise, generated from bot_name.
    """
    data = request.get_json()
    bot_name = data.get('bot_name')
    if not bot_name:
        return jsonify({'error': 'bot_name missing'}), 400

    file_name = data.get('file_name') or f"{bot_name.lower().replace(' ', '_')}.json"
    bots_dir = Path(config.get('directories', {}).get('bots', 'bots'))
    bots_dir.mkdir(exist_ok=True)
    file_path = bots_dir / file_name

    try:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
        return jsonify({'message': f'Bot {bot_name} saved as {file_name}'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/bots/<bot_file>', methods=['DELETE'])
def delete_bot(bot_file):
    """
    Delete a bot JSON file.
    """
    bots_dir = Path(config.get('directories', {}).get('bots', 'bots'))
    file_path = bots_dir / bot_file

    if not file_path.exists() or not file_path.is_file():
        return jsonify({'error': 'Bot not found'}), 404

    try:
        file_path.unlink()
        return jsonify({'message': f'Bot {bot_file} deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/bots/<bot_file>', methods=['GET'])
def get_bot_file(bot_file):
    """
    Return the raw JSON content of a bot file.
    """
    bots_dir = Path(config.get('directories', {}).get('bots', 'bots'))
    file_path = bots_dir / bot_file

    if not file_path.exists() or not file_path.is_file():
        return jsonify({'error': 'Bot not found'}), 404

    try:
        with open(file_path, 'r') as f:
            bot_data = json.load(f)
        return jsonify(bot_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ----------------------------- Bot Execution APIs -----------------------------
@app.route('/api/bots/<bot_name>/start', methods=['POST'])
def start_bot(bot_name):
    """
    Start a bot asynchronously by name.
    Finds corresponding JSON file and runs in a separate thread.
    """
    if bot_name in running_bots and running_bots[bot_name].is_running:
        return jsonify({'error': 'Bot is already running'}), 400
    
    bots_dir = Path(config.get('directories', {}).get('bots', 'bots'))
    bot_file = None
    for file_path in bots_dir.glob('*.json'):
        try:
            with open(file_path, 'r') as f:
                bot_data = json.load(f)
                if bot_data.get('bot_name') == bot_name:
                    bot_file = str(file_path)
                    break
        except:
            continue
    
    if not bot_file:
        return jsonify({'error': 'Bot not found'}), 404
    
    try:
        run_bot_async(bot_name, bot_file)
        return jsonify({'message': f'Bot {bot_name} started'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/bots/<bot_name>/stop', methods=['POST'])
def stop_bot(bot_name):
    """
    Stop a running bot by name.
    """
    if bot_name not in running_bots:
        return jsonify({'error': 'Bot is not running'}), 400
    
    try:
        running_bots[bot_name].stop()
        return jsonify({'message': f'Bot {bot_name} stopped'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/bots/<bot_name>/status', methods=['GET'])
def get_bot_status(bot_name):
    """
    Return the running status of a bot (True/False)
    """
    is_running = bot_name in running_bots and running_bots[bot_name].is_running
    return jsonify({'is_running': is_running})

# ----------------------------- Dynamic Actions & Conditions APIs -----------------------------
@app.route('/api/actions', methods=['GET'])
def list_actions():
    """
    Return list of all functions in executor.actions.py
    Frontend can use these to populate the 'Action' dropdown dynamically
    """
    funcs = [name for name, obj in inspect.getmembers(actions_module) if inspect.isfunction(obj)]
    standard_actions = ['click', 'fill', 'extract']  # default standard actions
    return jsonify(sorted(list(set(funcs + standard_actions))))

@app.route('/api/conditions', methods=['GET'])
def list_conditions():
    """
    Return list of all functions in executor.conditions.py
    Frontend can use these to populate the 'Condition' dropdown dynamically
    """
    funcs = [name for name, obj in inspect.getmembers(conditions_module) if inspect.isfunction(obj)]
    standard_conditions = ['element_exists']
    return jsonify(sorted(list(set(funcs + standard_conditions))))

@app.route('/api/config', methods=['GET'])
def get_config():
    """
    Return the current configuration for frontend use
    """
    return jsonify(config)

# ----------------------------- Helpers -----------------------------
def open_browser():
    """Open browser after server starts"""
    app_config = config.get('app', {})
    delay = app_config.get('browser_delay', 1.5)
    port = app_config.get('port', 5000)
    time.sleep(delay)
    webbrowser.open(f'http://localhost:{port}')

# ----------------------------- Main -----------------------------
if __name__ == "__main__":
    app_config = config.get('app', {})
    print(f"🤖 {config.get('app', {}).get('title', 'Bot Framework')} Server Starting...")
    
    # Create bots directory
    bots_dir = Path(config.get('directories', {}).get('bots', 'bots'))
    bots_dir.mkdir(exist_ok=True)
    
    # Start browser if enabled
    if app_config.get('auto_open_browser', True):
        browser_thread = threading.Thread(target=open_browser)
        browser_thread.daemon = True
        browser_thread.start()
    
    # Start Flask app with dynamic configuration
    app.run(
        debug=app_config.get('debug', False),
        host=app_config.get('host', '0.0.0.0'),
        port=app_config.get('port', 5000),
        use_reloader=False
    )
