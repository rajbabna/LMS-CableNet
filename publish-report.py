"""One-command refresh for the AI token usage & cost report.

Reads the local opencode session DB, writes token-usage.json (the committed
source of truth), renders token-cost-report.html + token-cost-chart.svg + the
README cost table via render-report.py, then commits & pushes to `main` and
`gh-pages`.

GitHub Actions re-renders automatically when token-usage.json changes, so the
chart/tables can also be regenerated from committed JSON without this machine.

Usage:  python publish-report.py
"""
import sqlite3, os, datetime, tempfile, json, re, subprocess, sys

# ---------- config ----------
DB = os.path.expanduser(r"~\.local\share\opencode\opencode.db")
ROOT = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.join(ROOT, "token-cost-report.html")
CHART = os.path.join(ROOT, "token-cost-chart.svg")
README = os.path.join(ROOT, "README.md")
DATA = os.path.join(ROOT, "token-usage.json")
GHPAGES_DIR = os.path.join(tempfile.gettempdir(), "opencode", "lms-gh-pages")

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

def run(*args, **kw):
    return subprocess.run(args, cwd=kw.get("cwd", ROOT), capture_output=True, text=True,
                          encoding="utf-8", errors="replace")

# ---------- live data ----------
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
sessions = [dict(r) for r in conn.execute("""
  select id, project_id, title, tokens_input, tokens_output, tokens_reasoning,
         tokens_cache_read, tokens_cache_write, model, time_created, time_updated
  from session""")]
msgs = [dict(r) for r in conn.execute("""
  select data from message
  where session_id in (select id from session where project_id=?)""", (PROJECT_ID,))]
conn.close()

sessions = [s for s in sessions if s["project_id"] == PROJECT_ID]
def pages(s): return (s["tokens_input"] or 0) + (s["tokens_output"] or 0) + (s["tokens_cache_read"] or 0)
sessions = [s for s in sessions if pages(s) > 0]
if not sessions:
    sys.exit("No LMS sessions found in the opencode DB.")
dominant = max(sessions, key=pages)

LLM_SECONDS = 0.0
for m in msgs:
    d = json.loads(m["data"])
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
with open(DATA, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
print("data ->", DATA)

# render (reuse the pure renderer)
r = run(sys.executable, os.path.join(ROOT, "render-report.py"))
print(r.stdout, end="")
if r.returncode != 0:
    print(r.stderr); sys.exit("render-report.py failed")

# ---------- git publish ----------
def git(*a, cwd=ROOT): return run("git", *a, cwd=cwd)
r = git("rev-parse", "--abbrev-ref", "HEAD")
branch = r.stdout.strip()

files = ["token-usage.json", "token-cost-report.html", "token-cost-chart.svg", "README.md", "render-report.py", "publish-report.py"]
git("add", "--", *files)
msg = f"Update AI token usage & cost report (captured {iso(data['captured_ms'])})"
git("-c", f"user.name={GIT_NAME}", "-c", f"user.email={GIT_EMAIL}", "commit", "-m", msg)
git("push", "origin", branch)
print(f"pushed {branch}")

# update gh-pages
if not os.path.isdir(os.path.join(GHPAGES_DIR, ".git")):
    os.makedirs(GHPAGES_DIR, exist_ok=True)
    r = git("worktree", "add", GHPAGES_DIR, "origin/gh-pages")
    if r.returncode != 0:
        r = git("worktree", "add", GHPAGES_DIR, "gh-pages")
import shutil
for f in ("token-cost-report.html", "token-cost-chart.svg"):
    src = os.path.join(ROOT, f)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(GHPAGES_DIR, f))
git("add", "-A", cwd=GHPAGES_DIR)
git("-c", f"user.name={GIT_NAME}", "-c", f"user.email={GIT_EMAIL}", "commit",
    "-m", f"Update AI token usage & cost report (captured {iso(data['captured_ms'])})", cwd=GHPAGES_DIR)
git("push", "origin", "gh-pages", cwd=GHPAGES_DIR)
print("pushed gh-pages")
print("\nDone. Live page: https://rajbabna.github.io/LMS-CableNet/token-cost-report.html")
