"""One-command refresh for the AI token usage & cost report.

Regenerates token-cost-report.html + token-cost-chart.svg + the README cost table
from the local opencode session DB, then commits and pushes to `main` and `gh-pages`.

Usage:  python publish-report.py
"""
import sqlite3, math, os, datetime, tempfile, json, re, subprocess, sys, io

# ---------- config ----------
DB = os.path.expanduser(r"~\.local\share\opencode\opencode.db")
ROOT = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.join(ROOT, "token-cost-report.html")
CHART = os.path.join(ROOT, "token-cost-chart.svg")
README = os.path.join(ROOT, "README.md")
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
ORDER = list(MODELS)

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

IN   = dominant["tokens_input"] or 0
OUT  = dominant["tokens_output"] or 0
REA  = dominant["tokens_reasoning"] or 0
CACHE= dominant["tokens_cache_read"] or 0
OUTB = OUT + REA

AGG_IN = sum(s["tokens_input"] or 0 for s in sessions)
AGG_OUTB = sum((s["tokens_output"] or 0) + (s["tokens_reasoning"] or 0) for s in sessions)
AGG_CACHE = sum(s["tokens_cache_read"] or 0 for s in sessions)
PROJECT_STARTED_MS = min(s["time_created"] for s in sessions)
LAST_CAPTURE_MS = max(s["time_updated"] for s in sessions)

LLM_SECONDS = 0.0
for m in msgs:
    d = json.loads(m["data"])
    if d.get("role") != "assistant": continue
    t = d.get("time") or {}
    c, cr = t.get("completed"), t.get("created")
    if isinstance(c, (int, float)) and isinstance(cr, (int, float)) and c >= cr:
        LLM_SECONDS += (c - cr) / 1000.0

def fmt(n):
    if n >= 1e9: return f"{n/1e9:,.2f}B"
    if n >= 1e6: return f"{n/1e6:,.2f}M"
    if n >= 1e3: return f"{n/1e3:,.1f}K"
    return f"{n:,}"

def fmtduration(sec):
    sec = int(round(sec))
    if sec < 60: return f"{sec}s"
    m, s = divmod(sec, 60)
    if m < 60: return f"{m}m {s}s"
    h, m = divmod(m, 60)
    if h < 24: return f"{h}h {m}m"
    d, h = divmod(h, 24)
    return f"{d}d {h}h {m}m"

def iso(ms):
    return datetime.datetime.fromtimestamp(ms/1000).strftime("%d %b %Y, %H:%M")

def cost(in_, out_, cache_, m): return in_/1e6*m[1] + out_/1e6*m[2] + cache_/1e6*m[3]
def modelcost(m): return cost(IN, OUTB, CACHE, m)
def aggcost(m): return cost(AGG_IN, AGG_OUTB, AGG_CACHE, m)

# ---------- chart ----------
W, H = 980, 900
ML, MT, MB = 170, 110, 62
plotL, plotR = ML, W-40
A, B = 0.5, 10000.0
def X(v): return plotL + (math.log10(v)-math.log10(A))/(math.log10(B)-math.log10(A))*(plotR-plotL)

part = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">',
        '<rect width="100%" height="100%" fill="#fafafa"/>',
        f'<text x="{W/2}" y="26" text-anchor="middle" font-family="Segoe UI,Arial" font-size="19" font-weight="700" fill="#202124">Projected cost of the dominant working session by provider &amp; model</text>',
        f'<text x="{W/2}" y="48" text-anchor="middle" font-family="Segoe UI,Arial" font-size="12.5" fill="#5f6368">Input {fmt(IN)} · Output {fmt(OUTB)} (incl. {fmt(REA)} reasoning) · Cache-read {fmt(CACHE)} · log-scale, USD</text>']
for dec in range(-1, 5):
    v = 10**dec
    if v < A: continue
    x = X(v)
    part.append(f'<line x1="{x:.1f}" y1="{MT}" x2="{x:.1f}" y2="{H-MB}" stroke="#e3e6ea" stroke-width="1"/>')
    part.append(f'<text x="{x:.1f}" y="{H-MB+16}" text-anchor="middle" font-family="Segoe UI,Arial" font-size="10.5" fill="#9aa0a6">${v:,.0f}</text>')
FREE = "#eafb0a"; SLOT, GP = 24, 10
ycur = MT
blockh = {prov: len(MODELS[prov]["free"])*(SLOT+GP) + len(MODELS[prov]["paid"])*(SLOT+GP) + 8 for prov in ORDER}
for prov in ORDER:
    ytop = ycur; ycur += blockh[prov]
    part.append(f'<text x="{ML-12}" y="{ytop+12:.1f}" text-anchor="end" font-family="Segoe UI,Arial" font-size="14" font-weight="700" fill="#202124">{prov}</text>')
    yy = ytop
    for grp in ["free", "paid"]:
        for k, m in enumerate(MODELS[prov][grp]):
            c = modelcost(m)
            fill = FREE if grp == "free" else ("#2E7D32" if k == 0 else ("#F9A825" if k == 1 else "#C62828"))
            x0 = X(A); x1 = X(max(c, 0.6))
            part.append(f'<rect x="{x0:.1f}" y="{yy:.1f}" width="{max(x1-x0,2):.1f}" height="{SLOT}" rx="3" fill="{fill}"/>')
            inner = x1 - x0 > 150
            part.append(f'<text x="{x1 if inner else x1+6:.1f}" y="{yy+SLOT/2+4:.1f}" text-anchor="{"end" if inner else "start"}" font-family="Consolas" font-size="11" font-weight="700" fill="{"#111" if grp=="free" else "#fff"}">{m[0]} · ${c:,.2f}</text>')
            yy += SLOT + GP
        yy += 4
ly = H - 18; lx = ML
for lab, cl in [("Free (no cost)", FREE), ("Paid - budget", "#2E7D32"), ("Paid - mid", "#F9A825"), ("Paid - premium", "#C62828")]:
    part.append(f'<rect x="{lx}" y="{ly-13}" width="13" height="13" rx="2" fill="{cl}"/>')
    part.append(f'<text x="{lx+18}" y="{ly-3:.0f}" font-family="Segoe UI,Arial" font-size="11.5" fill="#3c4043">{lab}</text>')
    lx += (plotR - ML) / 4
part.append('</svg>')
svg = "\n".join(part)

# ---------- README table rows ----------
def row(m, c):
    return f"| {m[0]:<22} | {('$%.2f' % c):>10} | {('Rs %,.2f' % (c*MUR)):>11} |"

def paid_rank(fn):
    return sorted(((p, m[0], fn(m)) for p in ORDER for m in MODELS[p]["paid"]), key=lambda t: t[2])

# ---------- write report ----------
paid_s = paid_rank(modelcost)
paid_a = paid_rank(aggcost)
rows_html = "".join(
    f'<tr class="{"rowfree" if grp=="free" else "rowpaid"}"><td>{p}</td><td><span class="bord">{"Free" if grp=="free" else "Paid"}</span></td><td>{m[0]}</td><td>${modelcost(m):,.2f}</td></tr>'
    for p in ORDER for grp in ("free", "paid") for m in MODELS[p][grp])
rank_usd = "".join(
    f'<tr class="rank-{"lo" if i==0 else ("md" if i==1 else "hi")}"><td colspan="3">{"Lowest paid" if i==0 else ("Median paid" if i==1 else "Highest paid")}</td><td>{t[0]} · {t[1]} · ${t[2]:,.2f}</td></tr>'
    for i, t in enumerate([paid_s[0], paid_s[len(paid_s)//2], paid_s[-1]]))
mur_rows_html = "".join(
    f'<tr class="{"rowfree" if grp=="free" else "rowpaid"}"><td>{p}</td><td><span class="bord">{"Free" if grp=="free" else "Paid"}</span></td><td>{m[0]}</td><td>${aggcost(m):,.2f}</td><td>Rs {aggcost(m)*MUR:,.2f}</td></tr>'
    for p in ORDER for grp in ("free", "paid") for m in MODELS[p][grp])
rank_mur = "".join(
    f'<tr class="rank-{"lo" if i==0 else ("md" if i==1 else "hi")}"><td colspan="3">{"Lowest paid" if i==0 else ("Median paid" if i==1 else "Highest paid")}</td><td>{t[0]} · {t[1]} · ${t[2]:,.2f}</td><td>Rs {t[2]*MUR:,.2f}</td></tr>'
    for i, t in enumerate([paid_a[0], paid_a[len(paid_a)//2], paid_a[-1]]))
total_sessions = len(sessions)

html = f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>LMS token cost report — {datetime.date.today()}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
 :root{{--accent:#1a73e8;--ink:#202124;--muted:#5f6368;--line:#e8eaed}}
 *{{box-sizing:border-box}}
 body{{font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(160deg,#eef2f7,#e2e8f0);margin:0;padding:26px 14px;color:var(--ink)}}
 .card{{background:#fff;border-radius:14px;box-shadow:0 6px 24px rgba(32,33,36,.10);padding:24px 28px;margin:0 auto 22px;max-width:1020px;border:1px solid var(--line)}}
 h1{{font-size:21px;margin:0 0 6px}} h2{{font-size:14px;margin:20px 0 10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}}
 svg{{width:100%;height:auto;display:block}}
 p{{color:var(--muted);font-size:13px;line-height:1.7;margin:5px 0}} p b{{color:var(--ink)}}
 .kv{{display:flex;flex-wrap:wrap;gap:6px 28px}}
 .kv span{{font-size:13px;color:var(--muted)}} .kv b{{color:var(--ink)}} .kv i{{font-style:normal;font-size:12px;color:#5f6368}}
 .grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:14px 0}}
 .stat{{background:#f6f8fa;border:1px solid var(--line);border-radius:10px;padding:12px 14px}}
 .stat .l{{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}}
 .stat .v{{font-size:22px;font-weight:700}} .stat .s{{font-size:11px;color:#9aa0a6}}
 table{{border-collapse:separate;border-spacing:0;width:100%;font-size:13px;border:1px solid var(--line);border-radius:10px;overflow:hidden}}
 thead th{{background:#f6f8fa;color:#3c4043;text-align:left;text-transform:uppercase;letter-spacing:.05em;font-size:11.5px;padding:11px 14px;border-bottom:2px solid var(--accent)}}
 td{{padding:9px 14px;text-align:left;border-bottom:1px solid #f0f2f4}}
 tbody tr:last-child td{{border-bottom:none}} tbody tr:hover{{background:#eef4fe}}
 .rowfree td{{background:#fbfff0}} tr.rank-lo td{{background:#e8f5e9;font-weight:700;color:#2e7d32}}
 tr.rank-md td{{background:#fff8e1;font-weight:700;color:#8a6d00}} tr.rank-hi td{{background:#fdecea;font-weight:700;color:#c62828}}
 td:nth-child(4){{font-weight:700;font-family:Consolas}} td:nth-child(1){{font-weight:600}}
 .bord{{display:inline-block;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:999px;color:#5f6368;background:#fff;border:1px solid var(--line)}}
 tr.rowfree .bord{{background:#eafb0a;color:#202124;border-color:#cfe200}}
 .note{{font-style:italic;color:#9aa0a6;font-weight:400;font-size:11.5px}}
 footer{{text-align:center;color:#9aa0a6;font-size:11px;margin-top:4px}} .regen{{text-align:center;font-size:11.5px;color:#9aa0a6}}
</style></head><body>
<div class="card">
 <h1>Token Usage &amp; Cost Report</h1>
 <div class="kv">
  <span>Project: <b>LMS - V2.0</b></span>
  <span>Project started: <b>{iso(PROJECT_STARTED_MS)}</b></span>
  <span>Last captured: <b>{iso(LAST_CAPTURE_MS)}</b></span>
  <span>LLM interaction time: <b>{fmtduration(LLM_SECONDS)}</b></span>
 </div>
 <p style="color:#9aa0a6;font-size:12px;margin-top:8px">Scope: opencode sessions for the LMS project only — the "global" session and any non-LMS tokens are excluded.</p>
 <div class="grid">
  <div class="stat"><div class="l">Input (dominant session)</div><div class="v">{fmt(IN)}</div><div class="s">tokens</div></div>
  <div class="stat"><div class="l">Output (dominant)</div><div class="v">{fmt(OUTB)}</div><div class="s">{fmt(OUT)} + {fmt(REA)} reasoning</div></div>
  <div class="stat"><div class="l">Cache read (dominant)</div><div class="v">{fmt(CACHE)}</div><div class="s">billed at cache rates</div></div>
  <div class="stat"><div class="l">All LMS sessions total</div><div class="v">{fmt(AGG_IN+AGG_OUTB)}</div><div class="s">input+output, {total_sessions} sessions</div></div>
 </div>
 <h2>Projected cost if run on paid models</h2>
 {''.join(part)}
</div>

<div class="card">
 <h2>Full breakdown — free &amp; paid models</h2>
 <table>
  <thead><tr><th>Provider</th><th>Type</th><th>Model</th><th>Total cost (USD)</th></tr></thead>
  <tbody>{rows_html}{rank_usd}</tbody>
 </table>
 <h2>Comparison</h2>
 <p><b>Cheapest paid:</b> {paid_s[0][0]} → {paid_s[0][1]} at <b>${paid_s[0][2]:,.2f}</b>.<br>
    <b>Priciest paid:</b> {paid_s[-1][0]} → {paid_s[-1][1]} at <b>${paid_s[-1][2]:,.2f}</b>.</p>
</div>

<div class="card">
 <h2>Mauritian Rupee (MUR) conversion</h2>
 <p style="margin-bottom:8px">Exchange rate applied: <b>1 USD = {MUR:.2f} MUR</b> (rate as of 5 Aug 2026). Costs based on <b>all LMS sessions combined</b> ({fmt(AGG_IN)} input / {fmt(AGG_OUTB)} output incl. reasoning / {fmt(AGG_CACHE)} cache-read).</p>
 <table>
  <thead><tr><th>Provider</th><th>Type</th><th>Model</th><th>USD</th><th>MUR</th></tr></thead>
  <tbody>{mur_rows_html}{rank_mur}</tbody>
 </table>
</div>
<footer>Data: local opencode session telemetry · project LMS - V2.0 · captured {iso(LAST_CAPTURE_MS)} · generated {datetime.datetime.now():%Y-%m-%d %H:%M}</footer>
<p class="regen">Regenerate: python publish-report.py</p>
</body></html>"""

tmp = os.path.join(tempfile.gettempdir(), "token-cost-report.html")
with open(tmp, "w", encoding="utf-8") as f: f.write(html)
import shutil as _sh
ok = False
try:
    os.replace(tmp, REPORT); ok = True
except OSError:
    try:
        _sh.copy2(tmp, REPORT); ok = True
    except OSError:
        ok = False
print("report ->", REPORT if ok else "LOCKED (browser open); kept temp copy: " + tmp)

with open(CHART, "w", encoding="utf-8") as f:
    f.write("<!-- chart extracted from token-cost-report.html (regenerate: python publish-report.py) -->\n" + svg)
print("chart  ->", CHART)

# ---------- README table ----------
def readme_table_rows():
    rows = []
    for p in ORDER:
        for g in ("free", "paid"):
            for m in MODELS[p][g]:
                c = aggcost(m)
                rows.append(f"| {p:>15} | {'Free' if g=='free' else 'Paid':<5} | {m[0]:<26} | ${c:>9,.2f} | Rs {c*MUR:>10,.2f} |")
    return "\n".join(rows)
new_table = readme_table_rows()
with open(README, encoding="utf-8") as f: readme = f.read()
pat = re.compile(r"<!-- COST-TABLE-START -->.*?<!-- COST-TABLE-END -->", re.S)
if pat.search(readme):
    readme = pat.sub("<!-- COST-TABLE-START -->\n" + new_table + "\n<!-- COST-TABLE-END -->", readme)
    with open(README, "w", encoding="utf-8") as f: f.write(readme)
    print("readme table updated")
else:
    print("! README markers not found; table left untouched")

# ---------- git publish ----------
def git(*a, cwd=ROOT): return run("git", *a, cwd=cwd)

r = git("rev-parse", "--abbrev-ref", "HEAD")
branch = r.stdout.strip()
files = ["token-cost-report.html", "token-cost-chart.svg", "README.md"]
git("add", "--", *files)
msg = f"Update AI token usage & cost report (captured {iso(LAST_CAPTURE_MS)})"
git("-c", f"user.name={GIT_NAME}", "-c", f"user.email={GIT_EMAIL}", "commit", "-m", msg)
git("push", "origin", branch)
print(f"pushed {branch}")

# update gh-pages
if not os.path.isdir(os.path.join(GHPAGES_DIR, ".git")):
    os.makedirs(GHPAGES_DIR, exist_ok=True)
    r = git("worktree", "add", GHPAGES_DIR, "origin/gh-pages")
    if r.returncode != 0:
        # branch may exist locally already
        r = git("worktree", "add", GHPAGES_DIR, "gh-pages")
for f in ("token-cost-report.html", "token-cost-chart.svg"):
    src = os.path.join(ROOT, f)
    if os.path.exists(src):
        import shutil
        shutil.copy2(src, os.path.join(GHPAGES_DIR, f))
git("add", "-A", cwd=GHPAGES_DIR)
git("-c", f"user.name={GIT_NAME}", "-c", f"user.email={GIT_EMAIL}", "commit",
    "-m", f"Update AI token usage & cost report (captured {iso(LAST_CAPTURE_MS)})", cwd=GHPAGES_DIR)
git("push", "origin", "gh-pages", cwd=GHPAGES_DIR)
print("pushed gh-pages")
print("\nDone. Live page: https://rajbabna.github.io/LMS-CableNet/token-cost-report.html")
