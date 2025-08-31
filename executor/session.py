# executor/session.py
from pathlib import Path
from playwright.async_api import async_playwright

DEFAULT_USER_DATA_DIR = Path("user_data")

async def launch_persistent_context(bot_name: str, headless: bool = False, user_agent: str = None, args: list = None):
    user_data_dir = DEFAULT_USER_DATA_DIR / bot_name
    
    # Clean up potentially corrupted user data directory
    if user_data_dir.exists():
        try:
            import shutil
            shutil.rmtree(user_data_dir)
            print(f"🧹 Cleaned up existing user data directory for {bot_name}")
        except Exception as e:
            print(f"⚠️ Could not clean up user data directory: {e}")
    
    user_data_dir.mkdir(parents=True, exist_ok=True)

    playwright = await async_playwright().start()
    
    # Try Firefox first as it's more stable on macOS
    try:
        firefox = playwright.firefox
        browser = await firefox.launch_persistent_context(
            user_data_dir=str(user_data_dir),
            headless=headless,
            viewport={"width": 1920, "height": 1080},
        )
        print(f"✅ Using Firefox for {bot_name}")
    except Exception as e:
        print(f"⚠️ Firefox failed, trying Chromium with minimal args: {e}")
        try:
            chromium = playwright.chromium
            browser = await chromium.launch_persistent_context(
                user_data_dir=str(user_data_dir),
                headless=headless,
                viewport={"width": 1920, "height": 1080},
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                ],
            )
            print(f"✅ Using Chromium with minimal args for {bot_name}")
        except Exception as e2:
            print(f"⚠️ Chromium persistent context failed, trying non-persistent: {e2}")
            # Fallback to non-persistent context
            chromium = playwright.chromium
            browser_instance = await chromium.launch(
                headless=headless,
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                ],
            )
            browser = await browser_instance.new_context(
                viewport={"width": 1920, "height": 1080},
            )
            print(f"✅ Using Chromium non-persistent context for {bot_name}")

    page = await browser.new_page()
    return playwright, browser, page
