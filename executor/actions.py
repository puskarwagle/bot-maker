from typing import List
from playwright.async_api import Page

ACTIONS = {}

def register_action(name):
    def decorator(func):
        ACTIONS[name] = func
        return func
    return decorator

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

@register_action("wait_for")
async def wait_for(page: Page, state: dict, context: dict):
    selectors = state.get("selectors") or []
    if not selectors:
        raise Exception(f"No selectors provided for wait_for in state {state['id']}")
    selector = selectors[0]
    default_timeout = 50000
    timeout = state.get("timeout", default_timeout)
    await page.wait_for_selector(selector, timeout=timeout)
    print(f"Waited for {selector} (timeout: {timeout}ms)")
