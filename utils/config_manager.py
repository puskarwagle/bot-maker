"""
Configuration management utility for the Bot Framework.
Provides centralized configuration loading and validation.
"""
import json
from pathlib import Path
from typing import Dict, Any, Optional

class ConfigManager:
    """Manages application configuration with validation and defaults."""
    
    def __init__(self, config_path: str = 'config.json'):
        self.config_path = Path(config_path)
        self._config = None
        self._defaults = self._get_defaults()
    
    def _get_defaults(self) -> Dict[str, Any]:
        """Return default configuration values."""
        return {
            "app": {
                "title": "🤖 Bot Framework",
                "host": "0.0.0.0",
                "port": 5000,
                "debug": False,
                "auto_open_browser": True,
                "browser_delay": 1.5
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
                ]
            },
            "builder": {
                "title": "Create Bot",
                "name_placeholder": "Bot Name",
                "url_placeholder": "Start URL",
                "default_url": "https://example.com",
                "create_button_text": "Create Bot"
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
                "json_preview_title": "JSON Preview"
            },
            "browser": {
                "type": "chromium",
                "headless": False,
                "timeout": 5000
            },
            "directories": {
                "bots": "bots",
                "templates": "ui/templates",
                "static": "ui"
            },
            "actions": [
                {"value": "click", "label": "Click"},
                {"value": "fill", "label": "Fill"},
                {"value": "extract", "label": "Extract"}
            ],
            "auto_save": {
                "enabled": True,
                "delay_ms": 500
            }
        }
    
    def load(self) -> Dict[str, Any]:
        """Load configuration from file, falling back to defaults."""
        if self._config is not None:
            return self._config
        
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r') as f:
                    file_config = json.load(f)
                self._config = self._merge_configs(self._defaults, file_config)
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Could not load config from {self.config_path}: {e}")
                self._config = self._defaults.copy()
        else:
            print(f"Config file {self.config_path} not found, using defaults")
            self._config = self._defaults.copy()
        
        return self._config
    
    def _merge_configs(self, defaults: Dict[str, Any], overrides: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively merge configuration dictionaries."""
        result = defaults.copy()
        
        for key, value in overrides.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._merge_configs(result[key], value)
            else:
                result[key] = value
        
        return result
    
    def get(self, key_path: str, default: Any = None) -> Any:
        """Get configuration value using dot notation (e.g., 'app.port')."""
        config = self.load()
        keys = key_path.split('.')
        
        current = config
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return default
        
        return current
    
    def save(self, config: Optional[Dict[str, Any]] = None) -> bool:
        """Save configuration to file."""
        if config is None:
            config = self._config
        
        if config is None:
            return False
        
        try:
            with open(self.config_path, 'w') as f:
                json.dump(config, f, indent=2)
            return True
        except IOError as e:
            print(f"Error saving config to {self.config_path}: {e}")
            return False
    
    def validate(self) -> bool:
        """Validate current configuration."""
        config = self.load()
        
        # Basic validation
        required_sections = ['app', 'ui', 'builder', 'editor', 'browser', 'directories']
        for section in required_sections:
            if section not in config:
                print(f"Warning: Missing required config section: {section}")
                return False
        
        # Validate port number
        port = config.get('app', {}).get('port')
        if not isinstance(port, int) or port < 1 or port > 65535:
            print(f"Warning: Invalid port number: {port}")
            return False
        
        return True

# Global instance
config_manager = ConfigManager()