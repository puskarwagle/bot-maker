# executor/session.py
from pathlib import Path
from playwright.async_api import async_playwright

DEFAULT_USER_DATA_DIR = Path("user_data")

async def launch_persistent_context(
    width: int = 1280,
    height: int = 720,
    headless: bool = False,
    user_agent: str = None,
    args: list = None,
    user_data_dir: Path = None,
):
    """
    Launch a Chromium browser with persistent context.
    Everything (cookies, localStorage, etc.) is saved automatically.
    """
    user_data_dir = user_data_dir or DEFAULT_USER_DATA_DIR
    user_data_dir.mkdir(exist_ok=True)

    playwright = await async_playwright().start()
    chromium = playwright.chromium

    context = await chromium.launch_persistent_context(
        user_data_dir=str(user_data_dir),
        headless=headless,
        viewport={"width": width, "height": height},
        user_agent=user_agent,
        args=args or [],
    )

    page = await context.new_page()
    return playwright, context, page
