# 🤖 Web Automation Bot Framework

A powerful web automation framework that allows you to create, manage, and execute browser automation bots through a web-based dashboard. Built with Python, Flask, and Playwright.

## 🚀 Features

- **Visual Bot Builder**: Create automation workflows through an intuitive web interface
- **State Machine Architecture**: Define bots as a series of states with actions and transitions
- **Real-time Control**: Start, stop, pause, and resume bots from the dashboard
- **Persistent Browser Sessions**: Maintain login states and user data across sessions
- **Flexible Actions**: Support for clicking, filling forms, navigation, data extraction, and more
- **Conditional Logic**: Smart transitions based on element presence, URL matching, and timeouts
- **Multi-bot Management**: Run multiple bots simultaneously with independent control

## 📋 Prerequisites

- Python 3.8 or higher
- Modern web browser (Chrome recommended)
- Internet connection for web automation

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd zines
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install Playwright browsers**
   ```bash
   playwright install chromium
   ```

## 🚀 Quick Start

1. **Start the application**
   ```bash
   python main.py
   ```

2. **Access the dashboard**
   - The application will automatically open a browser window with the dashboard
   - Or manually navigate to: `http://localhost:5000`

3. **Create your first bot**
   - Click "Create New Bot" in the dashboard
   - Define your automation workflow using the visual builder
   - Save your bot configuration

4. **Run your bot**
   - Select your bot from the list
   - Click "Start" to begin automation
   - Use the control buttons to pause, resume, or stop the bot

## 📁 Project Structure

```
zines/
├── main.py              # Main application entry point
├── api.py               # Flask API routes and bot management
├── requirements.txt     # Python dependencies
├── bots/                # Bot configuration files (JSON)
├── ui/                  # Web dashboard frontend
├── executor/            # Bot execution engine
│   ├── runner.py        # Main bot execution logic
│   ├── actions.py       # Available bot actions
│   ├── conditions.py    # Transition conditions
│   └── session.py       # Browser session management
├── data/                # Data storage and context
└── user_data/           # Browser user data and sessions
```

## 🤖 Bot Configuration

Bots are defined as JSON files with a state machine structure:

```json
{
  "bot_name": "example_bot",
  "start_url": "https://example.com",
  "states": [
    {
      "id": "state_1",
      "action": "fill",
      "selectors": ["#username"],
      "value": "your_email@example.com",
      "transitions": [
        {
          "condition": "always",
          "next": "state_2"
        }
      ]
    }
  ]
}
```

### Available Actions

- **`click`**: Click on elements
- **`fill`**: Fill form fields with text
- **`navigate_to`**: Navigate to URLs
- **`press_enter`**: Press Enter key
- **`extract`**: Extract text from elements
- **`hover`**: Hover over elements
- **`do_nothing`**: No-op action for conditional states

### Available Conditions

- **`always`**: Always transition to next state
- **`element_exists`**: Check if element is present
- **`url_matches`**: Check if current URL matches pattern
- **`wait_for_element`**: Wait for element with timeout

## 🎯 Example Bot

The included `deknil.json` bot demonstrates LinkedIn job search automation:

1. **Login to LinkedIn**
2. **Navigate to Jobs page**
3. **Search for "Python" jobs in "Sydney"**
4. **Apply filters for recent postings and experience levels**
5. **Pause for manual review**

## 🔧 Configuration

### Environment Variables

- `FLASK_ENV`: Set to `development` for debug mode
- `PORT`: Custom port (default: 5000)

### Browser Settings

- Browser sessions are stored in `user_data/` directory
- Each bot gets its own persistent browser context
- Viewport is set to 1920x1080 for consistent scaling

## 🛡️ Security Notes

- Bot configurations may contain sensitive data (passwords, emails)
- Store bot files securely and don't commit them to version control
- Use environment variables for sensitive configuration
- Browser sessions maintain login states - handle with care

## 🐛 Troubleshooting

### Common Issues

1. **Playwright not found**
   ```bash
   playwright install chromium
   ```

2. **Port already in use**
   - Change the port in `main.py` or kill existing processes

3. **Bot not starting**
   - Check browser console for errors
   - Verify bot JSON syntax
   - Ensure selectors are correct

4. **Element not found**
   - Use browser dev tools to verify selectors
   - Add wait conditions for dynamic content
   - Check if page structure has changed

### Debug Mode

Enable debug logging by modifying `main.py`:
```python
app.run(debug=True, host="0.0.0.0", port=5000, use_reloader=False)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
- Check the troubleshooting section
- Review bot configuration examples
- Open an issue on GitHub

---

**Happy Automating! 🤖✨**
