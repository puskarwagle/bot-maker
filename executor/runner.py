# executor/runner.py
import json
import asyncio
import sys
from executor.actions import ACTIONS
from executor.conditions import CONDITIONS

async def run_bot(bot_name: str, page, bot_file, context, pause_event: asyncio.Event, stop_event: asyncio.Event):
    """
    Executes bot states, respecting PAUSE and STOP events.
    pause_event: cleared = paused, set = running
    stop_event: set = stop requested
    """
    # -------------------- Load bot --------------------
    with open(bot_file, "r") as f:
        bot = json.load(f)

    states = {s["id"]: s for s in bot.get("states", [])}
    state_order = bot.get("states", [])  # preserve UI/memory order
    current_state_index = 0

    # -------------------- Navigate to start_url --------------------
    start_url = bot.get("start_url") or "https://example.com"
    print(f"🌐 Navigating to start URL: {start_url}")
    await page.goto(start_url)
    await page.goto(start_url, wait_until='domcontentloaded')
    await asyncio.sleep(1)
    print("✅ Page loaded, starting states execution")

    # -------------------- State Execution Loop --------------------
    while current_state_index < len(state_order):
        state = state_order[current_state_index]
        state_id = state["id"]

        # -------------------- Check for STOP before action --------------------
        if stop_event.is_set():
            print(f"🛑 STOP requested before state {state_id}, exiting")
            await page.context.close()
            # await page.browser.close()
            return

        # -------------------- Wait if PAUSED --------------------
        while not pause_event.is_set():
            if stop_event.is_set():
                print(f"🛑 STOP received during PAUSE at state {state_id}, exiting")
                await page.context.close()
                # await page.browser.close()
                return
            await asyncio.sleep(0.1)  # short sleep, responsive to stop

        print(f"\n🔹 Executing state {state_id} -> {state['action']}")

        # -------------------- Execute Action --------------------
        try:
            action_func = ACTIONS.get(state["action"])
            if action_func:
                await action_func(page, state, context)
                print(f"✅ Action '{state['action']}' executed successfully")
            else:
                print(f"⚠️ Action '{state['action']}' not found, skipping state")
        except Exception as e:
            print(f"❌ Error in action '{state['action']}' at state {state_id}: {e}")
            print("⏸ Pausing bot due to error")
            # PAUSE until manually resumed or stopped
            pause_event.clear()
            while not pause_event.is_set():
                if stop_event.is_set():
                    print(f"🛑 STOP received during error pause at state {state_id}, exiting")
                    await page.context.close()
                    # await page.browser.close()
                    return
                await asyncio.sleep(0.1)
            # After resume, continue to next iteration
            continue

        # -------------------- Evaluate Transitions --------------------
        next_state_id = None
        transitions = state.get("transitions", [])
        if not transitions:
            print(f"ℹ️ No transitions defined for state {state_id}")

        for t in transitions:
            cond_name = t.get("condition")
            cond_func = CONDITIONS.get(cond_name)
            params = {k: v for k, v in t.items() if k not in ("condition", "next")}
            if not cond_func:
                print(f"⚠️ Condition '{cond_name}' not found, skipping")
                continue
            try:
                cond_result = await cond_func(page, context, **params)
                print(f"➡️ Condition '{cond_name}' evaluated with params {params} -> {cond_result}")
                if cond_result:
                    next_state_id = t.get("next")
                    print(f"🎯 Transition matched: next_state_id = {next_state_id}")
                    break
            except Exception as e:
                print(f"⚠️ Error evaluating condition '{cond_name}' with params {params}: {e}")
                continue

        # -------------------- Handle Next State --------------------
        if next_state_id in ["pause", "PAUSE", "Pause"] or (next_state_id not in states and next_state_id != "STOP"):
            print(f"⏸ Pause triggered at state {state_id} (next: {next_state_id})")
            pause_event.clear()
            while not pause_event.is_set():
                if stop_event.is_set():
                    print(f"🛑 STOP received during pause at state {state_id}, exiting")
                    await page.context.close()
                    # await page.browser.close()
                    return
                await asyncio.sleep(0.1)
        elif next_state_id == "STOP":
            print(f"🛑 STOP triggered at state {state_id}, closing browser and exiting")
            await page.context.close()
            # await page.browser.close()
            return
        else:
            # Valid state_id, jump explicitly
            if next_state_id in states:
                current_state_index = next(
                    (i for i, s in enumerate(state_order) if s["id"] == next_state_id),
                    current_state_index
                )
                print(f"➡️ Jumping to state {next_state_id}")
            else:
                # No next or invalid, go to next sequentially
                current_state_index += 1
