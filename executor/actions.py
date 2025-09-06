from typing import List, Dict
from playwright.async_api import Page

ACTIONS = {}

def register_action(name):
    def decorator(func):
        ACTIONS[name] = func
        return func
    return decorator

@register_action("press_enter")
async def press_enter(page: Page, state: Dict, context: Dict):
    """
    Press the Enter key on a given selector, or on the active element if no selector is provided.
    """
    selectors = state.get("selectors") or [None]  # allow None for active element
    for s in selectors:
        if s:
            el = await page.query_selector(s)
            if el:
                await el.press("Enter")
                print(f"Pressed Enter on {s}")
                return
        else:
            await page.keyboard.press("Enter")
            print("Pressed Enter on active element")
            return
    raise Exception(f"No working selector to press Enter for state {state['id']}")

@register_action("do_nothing")
async def do_nothing(page: Page, state: dict, context: dict):
    """
    A no-op action that does nothing.
    Useful for states that only have conditions/transitions.
    """
    pass

@register_action("navigate_to")
async def navigate_to(page: Page, state: dict, context: dict):
    """
    Navigate the page to the URL specified in state['value'].
    Optional: state['timeout'] in milliseconds.
    """
    url = state.get("value")
    if not url:
        raise Exception(f"No URL provided for navigate_to in state {state['id']}")
    
    timeout = state.get("timeout", 30000)  # default 30s
    print(f"🌐 Navigating to {url} (timeout: {timeout}ms)")
    await page.goto(url, timeout=timeout)
    await page.wait_for_load_state("domcontentloaded", timeout=timeout)

@register_action("click")
async def click(page: Page, state: dict, context: dict):
    selectors = state.get("selectors") or [state.get("selector")]
    for s in selectors:
        if await page.query_selector(s):
            await page.click(s)
            print(f"Clicked {s}")
            return
    raise Exception(f"No working selector for click in state {state['id']}")

@register_action("fill")
async def fill(page: Page, state: dict, context: dict):
    value = state.get("value")
    selectors = state.get("selectors") or [state.get("selector")]
    for s in selectors:
        if await page.query_selector(s):
            await page.fill(s, value)
            print(f"Filled '{value}' into {s}")
            return
    raise Exception(f"No working selector for fill in state {state['id']}")

@register_action("extract")
async def extract(page: Page, state: dict, context: dict):
    store_as = state.get("store_as")
    selectors = state.get("selectors") or [state.get("selector")]
    for s in selectors:
        el = await page.query_selector(s)
        if el:
            text = await page.inner_text(s)
            context[store_as] = text
            print(f"Extracted '{text}' into {store_as}")
            return
    raise Exception(f"No working selector for extract in state {state['id']}")

@register_action("hover")
async def hover(page: Page, state: dict, context: dict):
    selectors = state.get("selectors") or [state.get("selector")]
    for s in selectors:
        if await page.query_selector(s):
            await page.hover(s)
            print(f"Hovered over {s}")
            return
    raise Exception(f"No working selector for hover in state {state['id']}")

@register_action("scroll_into_view")
async def scroll_into_view(page: Page, state: dict, context: dict):
    """
    Scroll the first matching selector into view if needed.
    Accepts multiple selectors (tries in order).
    """
    selectors = state.get("selectors") or [state.get("selector")]
    for s in selectors:
        el = await page.query_selector(s)
        if el:
            await el.scroll_into_view_if_needed()
            print(f"Scrolled {s} into view")
            return
    raise Exception(f"No working selector for scroll_into_view in state {state['id']}")

@register_action("wait_for_selector")
async def wait_for_selector(page: Page, state: dict, context: dict):
    """
    Wait for a selector to appear using Locator API.
    Optional keys:
      - 'timeout': milliseconds (default: 30s)
      - 'state': 'attached' | 'detached' | 'visible' | 'hidden'
    """
    selectors = state.get("selectors") or [state.get("selector")]
    timeout = state.get("timeout", 30000)
    wait_state = state.get("state", "visible")

    for s in selectors:
        locator = page.locator(s)
        try:
            await locator.wait_for(state=wait_state, timeout=timeout)
            print(f"✅ Locator {s} became {wait_state}")
            return
        except Exception as e:
            print(f"⚠️ Failed waiting for {s}: {e}")

    raise Exception(f"No locator became ready in state {state['id']}")

@register_action("click_scroll_into_view")
async def click_scroll_into_view(page: Page, state: dict, context: dict):
    selectors = state.get("selectors") or [state.get("selector")]
    for s in selectors:
        el = await page.query_selector(s)
        if el:
            await el.scroll_into_view_if_needed()
            await el.click()
            print(f"Clicked {s} after scrolling into view")
            return
    raise Exception(f"No working selector for click_scroll_into_view in state {state['id']}")
