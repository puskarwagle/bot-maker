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

        # Run action with error handling
        try:
            action_func = ACTIONS.get(state["action"])
            if not action_func:
                print(f"⚠️ Action {state['action']} not found, skipping state")
                current_state_index += 1
                continue

            await action_func(page, state, context)

        except Exception as e:
            print(f"❌ Error in state {state_id}: {e}")
            print("Pausing bot due to error")
            # Optional: could implement PAUSE state handling here
            break

        # Evaluate transitions (determine next_state if you use dynamic transitions)
        next_state_id = None
        for t in state.get("transitions", []):
            try:
                cond_name = t["condition"]
                cond_func = CONDITIONS.get(cond_name)
                if not cond_func:
                    print(f"⚠️ Condition {cond_name} not found, skipping")
                    continue

                params = {k: v for k, v in t.items() if k not in ("condition", "next")}
                if await cond_func(page, context, **params):
                    next_state_id = t["next"]
                    break
            except Exception as e:
                print(f"⚠️ Error evaluating condition {cond_name}: {e}")
                continue

        # If the transition points to a valid state, jump to it; otherwise go to next in memory order
        if next_state_id and next_state_id in states:
            # Find index of next_state_id in memory order
            next_index = next((i for i, s in enumerate(state_order) if s["id"] == next_state_id), None)
            if next_index is not None:
                current_state_index = next_index
                continue

        current_state_index += 1  # next state in memory order

    print("✅ Bot finished all states")
