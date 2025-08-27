import json
from executor.actions import ACTIONS
from executor.conditions import CONDITIONS
import asyncio

async def run_bot(page, bot_file, context):
    # Load bot config
    with open(bot_file, "r") as f:
        bot = json.load(f)

    states = {s["id"]: s for s in bot["states"]}
    state_order = bot["states"]  # list in memory order (UI order)
    current_state_index = 0

    # -------------------- Navigate to start_url first --------------------
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
        print(f"Executing state {state_id} -> {state['action']}")

        # Run action
        try:
            action_func = ACTIONS.get(state["action"])
            if action_func:
                await action_func(page, state, context)
            else:
                print(f"⚠️ Action {state['action']} not found, skipping state")
        except Exception as e:
            print(f"❌ Error in state {state_id}: {e}")
            print("Pausing bot due to error")
            break

        # Evaluate transitions
        next_state_id = None
        for t in state.get("transitions", []):
            try:
                cond_name = t["condition"]
                cond_func = CONDITIONS.get(cond_name)
                if not cond_func:
                    continue
                params = {k: v for k, v in t.items() if k not in ("condition", "next")}
                if await cond_func(page, context, **params):
                    next_state_id = t["next"]
                    break
            except:
                continue

        # Move to next state if transition exists
        if next_state_id and next_state_id in states:
            current_state_index = next((i for i, s in enumerate(state_order) if s["id"] == next_state_id), current_state_index)
        else:
            current_state_index += 1

    # -------------------- Pause at end --------------------
    if state_order:
        last_state = state_order[-1]
        print(f"⏸ Bot finished all states, now in PAUSE on state {last_state['id']}")
        while True:
            await asyncio.sleep(1)  # do absolutely nothing, stay idle
