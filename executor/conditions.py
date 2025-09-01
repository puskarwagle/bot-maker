# executor/conditions.py
from typing import List, Union
from playwright.async_api import Page

CONDITIONS = {}

def register_condition(name):
    def decorator(func):
        CONDITIONS[name] = func
        return func
    return decorator

# -------------------- Basic / Always --------------------
@register_condition("always")
async def always(page: Page, context: dict, **kwargs):
    return True

# -------------------- Wait for Element --------------------
@register_condition("wait_for_element")
async def wait_for_element(
    page: Page,
    context: dict,
    conditional_parameter: Union[List[str], str] = None,
    timeout: int = 10000,
    **kwargs
):
    """
    Wait until one of the selectors exists (blocking condition).
    Returns True if found within timeout, False otherwise.
    """
    if not conditional_parameter:
        return False

    if isinstance(conditional_parameter, str):
        conditional_parameter = [conditional_parameter]

    for selector in conditional_parameter:
        try:
            await page.wait_for_selector(selector, timeout=timeout)
            return True
        except Exception:
            continue
    return False

@register_condition("wait_for_element_not_exists")
async def wait_for_element_not_exists(
    page: Page,
    context: dict,
    conditional_parameter: Union[List[str], str] = None,
    timeout: int = 10000,
    **kwargs
):
    """
    Wait until all selectors disappear from the DOM.
    Returns True if gone within timeout, False otherwise.
    """
    if not conditional_parameter:
        return False

    if isinstance(conditional_parameter, str):
        conditional_parameter = [conditional_parameter]

    for selector in conditional_parameter:
        try:
            await page.wait_for_selector(selector, state="detached", timeout=timeout)
        except Exception:
            return False
    return True

# -------------------- Variable Equals --------------------
@register_condition("variable_equals")
async def variable_equals(
    page: Page,
    context: dict,
    var: str = None,
    value=None,
    **kwargs
):
    return context.get(var) == value

# -------------------- Text Contains --------------------
@register_condition("text_contains")
async def text_contains(
    page: Page,
    context: dict,
    conditional_parameter: Union[List[str], str] = None,
    text: str = "",
    **kwargs
):
    if not conditional_parameter:
        return False

    if isinstance(conditional_parameter, str):
        conditional_parameter = [conditional_parameter]

    for selector in conditional_parameter:
        el = await page.query_selector(selector)
        if el:
            content = await page.inner_text(selector)
            if text in content:
                return True
    return False

# -------------------- URL Matches --------------------
@register_condition("url_matches")
async def url_matches(
    page: Page,
    context: dict,
    conditional_parameter: Union[List[str], str] = None,
    **kwargs
):
    url = page.url
    if not conditional_parameter:
        return False

    if isinstance(conditional_parameter, str):
        return conditional_parameter in url

    for pattern in conditional_parameter:
        if pattern in url:
            return True
    return False
