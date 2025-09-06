# tryGui.py
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import importlib.util
import os
from threading import Thread

BOTS_DIR = "bots"

class BotRunnerApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Bot Runner")
        self.geometry("600x400")
        self.resizable(False, False)
        self.running = False
        self.current_thread = None
        
        self.create_widgets()
        self.load_bots()

    def create_widgets(self):
        # -------------------- Bot Selection --------------------
        frame_top = ttk.Frame(self)
        frame_top.pack(fill="x", pady=10, padx=10)

        ttk.Label(frame_top, text="Select Bot:").pack(side="left")
        self.bot_var = tk.StringVar()
        self.bot_dropdown = ttk.Combobox(frame_top, textvariable=self.bot_var, state="readonly")
        self.bot_dropdown.pack(side="left", padx=5)

        # -------------------- Form Inputs --------------------
        frame_form = ttk.Frame(self)
        frame_form.pack(fill="x", pady=5, padx=10)

        ttk.Label(frame_form, text="Keywords:").grid(row=0, column=0, sticky="w")
        self.keywords_entry = ttk.Entry(frame_form)
        self.keywords_entry.grid(row=0, column=1, sticky="ew", padx=5)
        self.keywords_entry.insert(0, "Python")

        ttk.Label(frame_form, text="Location:").grid(row=1, column=0, sticky="w")
        self.location_entry = ttk.Entry(frame_form)
        self.location_entry.grid(row=1, column=1, sticky="ew", padx=5)
        self.location_entry.insert(0, "Sydney")

        frame_form.columnconfigure(1, weight=1)

        # -------------------- Run / Stop Button --------------------
        self.run_btn = ttk.Button(self, text="Start Bot", command=self.toggle_bot)
        self.run_btn.pack(pady=10)

        # -------------------- Logs --------------------
        self.log_box = scrolledtext.ScrolledText(self, height=10, state="disabled")
        self.log_box.pack(fill="both", expand=True, padx=10, pady=10)

    def log(self, message):
        self.log_box.configure(state="normal")
        self.log_box.insert("end", f"{message}\n")
        self.log_box.see("end")
        self.log_box.configure(state="disabled")

    def load_bots(self):
        bots = [f[:-3] for f in os.listdir(BOTS_DIR) if f.endswith(".py")]
        self.bot_dropdown["values"] = bots
        if bots:
            self.bot_dropdown.current(0)

    def toggle_bot(self):
        if self.running:
            self.log("Stopping bot...")
            self.running = False
            self.run_btn.configure(text=f"Start {self.bot_var.get()}")
        else:
            bot_name = self.bot_var.get()
            if not bot_name:
                messagebox.showwarning("Error", "Select a bot first!")
                return
            self.running = True
            self.run_btn.configure(text=f"Stop {bot_name}")
            keywords = self.keywords_entry.get()
            location = self.location_entry.get()
            self.current_thread = Thread(target=self.run_bot_thread, args=(bot_name, keywords, location), daemon=True)
            self.current_thread.start()

    def run_bot_thread(self, bot_name, keywords, location):
        try:
            bot_path = os.path.join(BOTS_DIR, f"{bot_name}.py")
            spec = importlib.util.spec_from_file_location(bot_name, bot_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            from playwright.sync_api import sync_playwright
            with sync_playwright() as playwright:
                self.log(f"Running {bot_name} with keywords='{keywords}' and location='{location}'")
                module.run(playwright, keywords, location)
                self.log(f"{bot_name} finished successfully!")
        except Exception as e:
            self.log(f"Error: {e}")
        finally:
            self.running = False
            self.run_btn.configure(text=f"Start {bot_name}")

if __name__ == "__main__":
    app = BotRunnerApp()
    app.mainloop()
