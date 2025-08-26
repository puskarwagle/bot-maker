# executor/conditions.py
from typing import List
from playwright.async_api import Page
from utils.config_manager import config_manager

# Load configuration using ConfigManager
config = config_manager.load()
CONDITIONS = {}

def register_condition(name):
    def decorator(func):
        CONDITIONS[name] = func
        return func
    return decorator

@register_condition("always")
async def always(page: Page, context: dict, **kwargs):
    return True

@register_condition("element_exists")
async def element_exists(page: Page, context: dict, selectors: List[str] = None, **kwargs):
    if isinstance(selectors, str):
        selectors = [selectors]
    for s in selectors:
        if await page.query_selector(s):
            return True
    return False

@register_condition("element_not_exists")
async def element_not_exists(page: Page, context: dict, selectors: List[str] = None, **kwargs):
    if isinstance(selectors, str):
        selectors = [selectors]
    for s in selectors:
        if await page.query_selector(s):
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
