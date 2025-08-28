# executor/session.py
from pathlib import Path
from playwright.async_api import async_playwright

DEFAULT_USER_DATA_DIR = Path("user_data")

async def launch_persistent_context(
    headless: bool = False,
    user_agent: str = None,
    args: list = None,
    user_data_dir: Path = None,
):
    user_data_dir = user_data_dir or DEFAULT_USER_DATA_DIR
    user_data_dir.mkdir(exist_ok=True)

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
            "--disable-session-crashed-bubble",   # 🚫 restore pages prompt
            "--disable-infobars",                 # 🚫 automation infobar
            "--lang=en-US,en",
            "--start-maximized",
            "--disable-web-security",
        ],
    )

    page = await context.new_page()

    # 🔑 This is what actually makes it "maximized"
    try:
        await page.set_viewport_size(None)  # removes fixed viewport, uses full window
    except Exception:
        # Fallback: manually force a big window size
        await page.set_viewport_size({"width": 1920, "height": 1080})

    return playwright, context, page
