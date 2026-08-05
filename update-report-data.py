"""Hourly data updater for the AI token usage & cost report.

Reads the local opencode DB and pushes ONLY token-usage.json to `main`.
GitHub Actions then auto-renders the chart/tables and updates main + gh-pages.

Designed for Task Scheduler (every hour). Safe to run while app WIP changes
are uncommitted: it operates on its own git worktree.

Usage:  python update-report-data.py
"""
import sqlite3, os, datetime, tempfile, json, subprocess, sys, shutil

DB = os.path.expanduser(r"~\.local\share\opencode\opencode.db")
ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "token-usage.json")
WORK = os.path.join(tempfile.gettempdir(), "opencode", "lms-report-data")

PROJECT_ID = "74a341db257f9697b63cbd1b3beb682dbc29a25b"   # LMS - V2.0
MUR = 47.04
GIT_NAME = "rajbabna"; GIT_EMAIL = "rajbabna@users.noreply.github.com"

MODELS = {
 "DeepSeek": {
   "free": [("v4-flash-free (opencode)", 0, 0, 0)],
   "paid": [("v4-flash", 0.14, 0.28, 0.0028), ("v4-pro", 0.435, 0.87, 0.003625)]},
 "Gemini": {
   "free": [("Flash free tier (rate-limited, AI Studio)", 0, 0, 0)],
   "paid": [("2.5 Flash-Lite", 0.10, 0.40, 0.01), ("3.5 Flash", 1.50, 9.00, 0.375),
            ("3.1 Pro", 2.00, 12.00, 0.20)]},
 "ChatGPT (OpenAI)": {
   "free": [("No prod free tier (web ai.com only)", 0, 0, 0)],
   "paid": [("GPT-4o-mini", 0.15, 0.60, 0.075), ("GPT-5.6 Luna", 0.20, 1.20, 0.02),
            ("GPT-5.6 Terra", 2.00, 12.00, 0.20), ("GPT-5.6 Sol", 5.00, 30.00, 0.50)]},
 "Claude": {
   "free": [("No free tier (trial credit only)", 0, 0, 0)],
   "paid": [("Haiku 4.5", 1.0, 5.0, 0.10), ("Sonnet 5 (intro)", 2.0, 10.0, 0.20),
            ("Opus 5", 5.0, 25.0, 0.50)]},
}

def run(*a, cwd=ROOT):
    return subprocess.run(a, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")

# ---------- read DB ----------
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
sessions = [dict(r) for r in conn.execute("""
  select id, project_id, title, tokens_input, tokens_output, tokens_reasoning,
         tokens_cache_read, time_created, time_updated from session""")]
msgs = [dict(r) for r in conn.execute("""
  select data from message
  where session_id in (select id from session where project_id=?)""", (PROJECT_ID,))]
conn.close()

sessions = [s for s in sessions if s["project_id"] == PROJECT_ID]
def pages(s): return (s["tokens_input"] or 0) + (s["tokens_output"] or 0) + (s["tokens_cache_read"] or 0)
sessions = [s for s in sessions if pages(s) > 0]
if not sessions:
    sys.exit("No LMS sessions found.")

dominant = max(sessions, key=pages)
LLM_SECONDS = 0.0
import json as _json
for m in msgs:
    d = _json.loads(m["data"])
    if d.get("role") != "assistant": continue
    t = d.get("time") or {}
    c, cr = t.get("completed"), t.get("created")
    if isinstance(c, (int, float)) and isinstance(cr, (int, float)) and c >= cr:
        LLM_SECONDS += (c - cr) / 1000.0

def iso(ms):
    return datetime.datetime.fromtimestamp(ms/1000).strftime("%d %b %Y, %H:%M")

data = {
    "project": "LMS - V2.0",
    "project_id": PROJECT_ID,
    "mur": MUR,
    "captured_ms": max(s["time_updated"] for s in sessions),
    "project_started_ms": min(s["time_created"] for s in sessions),
    "llm_seconds": LLM_SECONDS,
    "dominant": {
        "title": dominant["title"],
        "input": dominant["tokens_input"] or 0,
        "output": dominant["tokens_output"] or 0,
        "reasoning": dominant["tokens_reasoning"] or 0,
        "cache": dominant["tokens_cache_read"] or 0,
    },
    "aggregate": {
        "sessions": len(sessions),
        "input": sum(s["tokens_input"] or 0 for s in sessions),
        "output_billed": sum((s["tokens_output"] or 0) + (s["tokens_reasoning"] or 0) for s in sessions),
        "cache": sum(s["tokens_cache_read"] or 0 for s in sessions),
    },
    "models": MODELS,
}

# ---------- sync via a dedicated worktree (keeps app WIP untouched) ----------
def git(*a, cwd=WORK):
    return run("git", *a, cwd=cwd)

# ensure worktree of main exists (.git is a file, not a dir, in a worktree)
os.makedirs(WORK, exist_ok=True)
if not os.path.exists(os.path.join(WORK, ".git")):
    r = run("git", "worktree", "add", "--detach", WORK, "origin/main")
    if r.returncode != 0:
        print("worktree add failed:", r.stderr); sys.exit(1)
elif not subprocess.run(["git", "-C", WORK, "rev-parse", "--git-dir"],
                        capture_output=True).returncode == 0:
    r = run("git", "worktree", "add", "--detach", WORK, "origin/main")
    if r.returncode != 0:
        print("worktree add failed:", r.stderr); sys.exit(1)

# fast-forward the detached worktree to latest origin/main
git("fetch", "origin", "main")
r = git("reset", "--hard", "FETCH_HEAD")
if r.returncode != 0:
    print("reset failed:", r.stderr); sys.exit(1)

# update the data file only
with open(os.path.join(WORK, "token-usage.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

git("config", "user.name", GIT_NAME); git("config", "user.email", GIT_EMAIL)
git("add", "--", "token-usage.json")
r = git("diff", "--cached", "--quiet")
if r.returncode == 0:
    print("no change in token usage; nothing to push")
    sys.exit(0)

git("commit", "-m", f"Update token usage data (captured {iso(data['captured_ms'])})")
r = git("push", "origin", "HEAD:main")
if r.returncode != 0:
    print("push failed:", r.stderr); sys.exit(1)
print("pushed token-usage.json to main")
print("GitHub Actions will auto-render the report now.")
