# executor/run_bot.py
import json
from executor.actions import ACTIONS
from executor.conditions import CONDITIONS
import asyncio
import sys

async def run_bot(page, bot_file, context):
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
    while True:
        # Handle case with no states or finished states
        if current_state_index >= len(state_order):
            print("⏸ No more states to execute, staying in PAUSE")
            while True:
                await asyncio.sleep(1)

        state = state_order[current_state_index]
        state_id = state["id"]
        print(f"\n🔹 Executing state {state_id} -> {state['action']}")

        # Run action
        try:
            action_func = ACTIONS.get(state["action"])
            if action_func:
                result = await action_func(page, state, context)
                print(f"✅ Action '{state['action']}' executed successfully")
            else:
                print(f"⚠️ Action '{state['action']}' not found, skipping state")
        except Exception as e:
            print(f"❌ Error in action '{state['action']}' at state {state_id}: {e}")
            print("⏸ Pausing bot due to error")
            while True:
                await asyncio.sleep(1)

        # Evaluate transitions
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

        # -------------------- Determine next step --------------------
        if next_state_id == "PAUSE" or (next_state_id not in states and next_state_id != "STOP"):
            print(f"⏸ PAUSE triggered at state {state_id} (next: {next_state_id})")
            while True:
                await asyncio.sleep(1)
        elif next_state_id == "STOP":
            print(f"🛑 STOP triggered at state {state_id}, closing browser and exiting")
            await page.context.close()
            await page.browser.close()
            sys.exit(0)
        else:
            # Valid state_id, jump explicitly
            if next_state_id in states:
                current_state_index = next(
                    (i for i, s in enumerate(state_order) if s["id"] == next_state_id),
                    current_state_index
                )
                print(f"➡️ Jumping to state {next_state_id}")
            else:
                # Fallback, just pause if somehow invalid
                print(f"⚠️ Invalid next state '{next_state_id}' at state {state_id}, staying in PAUSE")
                while True:
                    await asyncio.sleep(1)
