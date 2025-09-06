# bots/seek.py
import os
from playwright.sync_api import Playwright, sync_playwright, expect

def run(playwright: Playwright, keywords: str, location: str) -> None:
    auth_path = os.path.join(os.path.dirname(__file__), "auth.json")  # <- FIXED
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context(storage_state=auth_path)
    page = context.new_page()
    page.goto("https://www.seek.com.au/")
    
    page.get_by_placeholder("Enter keywords").click()
    page.get_by_placeholder("Enter keywords").fill(keywords)
    page.get_by_placeholder("Enter keywords").press("Enter")
    
    page.get_by_placeholder("Enter suburb, city, or region").click()
    page.get_by_placeholder("Enter suburb, city, or region").fill(location)
    page.get_by_label("Submit search").click()
    
    # ---------------------
    # context.close()
    # browser.close()
