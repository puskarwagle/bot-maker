# executor/session.py
from pathlib import Path
from playwright.async_api import async_playwright

DEFAULT_USER_DATA_DIR = Path("user_data")

async def launch_persistent_context(bot_name: str, headless: bool = False, user_agent: str = None, args: list = None):
    user_data_dir = DEFAULT_USER_DATA_DIR / bot_name
    user_data_dir.mkdir(parents=True, exist_ok=True)

    playwright = await async_playwright().start()
    chromium = playwright.chromium

    context = await chromium.launch_persistent_context(
        user_data_dir=str(user_data_dir),
        headless=headless,
        user_agent=user_agent,
        args=[
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
            "--disable-features=TranslateUI,VizDisplayCompositor",
            "--disable-default-apps",
            "--disable-extensions",
            "--disable-popup-blocking",
            "--disable-session-crashed-bubble",
            "--disable-infobars",
            "--lang=en-US,en",
            "--start-maximized",
            "--disable-web-security",
        ],
    )

    page = await context.new_page()

    return playwright, context, page
