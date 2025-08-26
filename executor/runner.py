import json
from executor.actions import ACTIONS
from executor.conditions import CONDITIONS
import asyncio  # for sleep if you want a pause

async def run_bot(page, bot_file, context):
    with open(bot_file, "r") as f:
        bot = json.load(f)

    states = {s["id"]: s for s in bot["states"]}
    current_state = bot["states"][0]["id"]

    while current_state and current_state != "END":
        # Handle PAUSE state without executing actions
        if current_state == "PAUSE":
            print("Bot is paused. Waiting...")
            await asyncio.sleep(1)  # wait 1 second, or configurable
            continue  # loop back without changing browser/page state

        state = states.get(current_state)
        if not state:
            print(f"State {current_state} not found. Ending bot.")
            break

        print(f"Executing {current_state} -> {state['action']}")

        # Run action dynamically
        action_func = ACTIONS.get(state["action"])
        if not action_func:
            raise Exception(f"Action {state['action']} not found")
        await action_func(page, state, context)

        # Evaluate transitions dynamically
        next_state = None
        for t in state.get("transitions", []):
            cond_name = t["condition"]
            cond_func = CONDITIONS.get(cond_name)
            if not cond_func:
                raise Exception(f"Condition {cond_name} not found")
            params = {k: v for k, v in t.items() if k not in ("condition", "next")}
            if await cond_func(page, context, **params):
                next_state = t["next"]
                break

        if not next_state:
            print("No valid transition found. Ending bot.")
            break

        current_state = next_state
