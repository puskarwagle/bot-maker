# executor/conditions.py
from typing import List
from playwright.async_api import Page

CONDITIONS = {}

def register_condition(name):
    def decorator(func):
        CONDITIONS[name] = func
        return func
    return decorator

@register_condition("always")
async def always(page: Page, context: dict, **kwargs):
    return True

@register_condition("wait_for_element")
async def wait_for_element(page: Page, context: dict, selectors: list[str] | str = None, timeout: int = 10000, **kwargs):
    """
    Wait until one of the selectors exists (blocking condition).
    Returns True if found within timeout, False otherwise.
    """
    if isinstance(selectors, str):
        selectors = [selectors]
    for s in selectors:
        try:
            await page.wait_for_selector(s, timeout=timeout)
            return True
        except Exception:
            continue
    return False


@register_condition("wait_for_element_not_exists")
async def wait_for_element_not_exists(page: Page, context: dict, selectors: list[str] | str = None, timeout: int = 10000, **kwargs):
    """
    Wait until all of the selectors disappear from the DOM.
    Returns True if gone within timeout, False otherwise.
    """
    if isinstance(selectors, str):
        selectors = [selectors]
    for s in selectors:
        try:
            await page.wait_for_selector(s, timeout=timeout, state="detached")
        except Exception:
            # still not gone within timeout
            return False
    return True


@register_condition("variable_equals")
async def variable_equals(page: Page, context: dict, var=None, value=None, **kwargs):
    return context.get(var) == value

@register_condition("text_contains")
async def text_contains(page: Page, context: dict, selectors=None, text=None, **kwargs):
    for s in selectors:
        el = await page.query_selector(s)
        if el:
            content = await page.inner_text(s)
            if text in content:
                return True
    return False

@register_condition("url_matches")
async def url_matches(page: Page, context: dict, pattern=None, **kwargs):
    url = page.url
    return pattern in url
