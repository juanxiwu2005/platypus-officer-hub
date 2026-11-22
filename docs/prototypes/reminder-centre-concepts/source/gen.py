"""Build static reminder-centre concept pages on top of the real Platypus shell and CSS tokens."""
import re, pathlib, json

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "concepts"
OUT.mkdir(exist_ok=True)
shell = (ROOT / "app-shell.html").read_text()
shell = shell.replace('href="/assets/', 'href="http://localhost:4173/assets/').replace('href="/favicon', 'href="http://localhost:4173/favicon')
shell = re.sub(r'<link rel="modulepreload"[^>]*>', '', shell)
shell = shell.replace(" crossorigin=\"\"", "")
MAIN_RE = re.compile(r'<main id="main" tabindex="-1">.*?</main>', re.S)
RAIL_RE = re.compile(r'<aside class="rail".*?</aside>', re.S)
BAND_H = 64

# ---------- demo data (fictional seed club, demo day Sat Oct 31) ----------
PEOPLE = {"jordan": ("Jordan Patel", "JP"), "maya": ("Maya Chen", "MC"), "priya": ("Priya Nair", "PN"),
          "sam": ("Sam Okafor", "SO"), "alex": ("Alex Rivera", "AR")}
READY = [  # (task, person, due, why, tone, event)
    ("Reconcile September receipts", "maya", "Oct 26", "5 days overdue", "late", None),
    ("Confirm the workshop checklist", "jordan", "Oct 27", "4 days overdue", "late", None),
    ("Book the spring weekly meeting room", "jordan", "Nov 3", "Start passed", "warn", None),
    ("Event Materials PPT Decorations", "jordan", "Nov 18", "Start passed", "warn", "Founder Dinner"),
    ("Draft the meeting agenda", "priya", "Nov 3", "Start passed", "warn", None),
]
FIX = [  # (task, problem, fix button, due)
    ("Send the October newsletter", "wait", "Oct 21"),
    ("Chase the USG reimbursement", "wait", "Nov 4"),
    ("Confirm the advisor for Founder Dinner", "wait", "Nov 6"),
    ("Speaker SAP Headshot", "wait", "Feb 19"),
    ("Share the October meeting photos", "owner", "Nov 2"),
    ("Sign up for a Memorial Union tabling slot", "owner", "Nov 13"),
    ("Book the finals study night room", "stuck", "Nov 10"),
    ("Content Creation", "stuck", "Feb 5"),
]
FIX_LABEL = {"wait": ("Pick who it waits on", "Choose person"), "owner": ("No owner", "Assign"), "stuck": ("Stuck · needs help", "Open")}
WEEK = [  # (task, person, day index from Sat Oct 31, kind)
    ("Check the officer list in Sun Devil Central", "alex", 2, "start"),
    ("Draft the meeting agenda", "priya", 3, "due"),
    ("Book the spring weekly meeting room", "jordan", 3, "due"),
    ("Follow up with the sponsor", "maya", 3, "start"),
    ("Design the Networking Night save-the-date", "sam", 6, "due"),
    ("Moderator Lead Staffing", "jordan", 6, "due"),
    ("Partner Speaker Review", "jordan", 6, "start"),
    ("Recruit Founder Dinner volunteers", "jordan", 6, "start"),
]
DAYS = ["Sat 31", "Sun 1", "Mon 2", "Tue 3", "Wed 4", "Thu 5", "Fri 6", "Sat 7"]

def av(pid, size=""):
    return f'<span class="cx-av{(" " + size) if size else ""}" title="{PEOPLE[pid][0]}">{PEOPLE[pid][1]}</span>'

def tag(text, tone):
    return f'<span class="cx-tag {tone}">{text}</span>'

def by_person():
    out = {}
    for r in READY:
        out.setdefault(r[1], []).append(r)
    return out

def mode_chip(mode="I review, Platypus sends"):
    return f'<span class="cx-mode"><span class="cx-dot"></span>{mode}<a href="#">Change</a></span>'

def page_head(extra=""):
    return f'<div class="page-head cx-head"><div class="page-title"><h1>Reminders</h1></div>{extra}</div>'

CSS = """
body { margin: 0; }
.cx-band { height: %(b)dpx; box-sizing: border-box; display: flex; align-items: center; gap: var(--s6); padding: 0 var(--s7);
  background: var(--ink); color: var(--bg); font-family: var(--sans); }
.cx-band b { font-size: var(--fs-xl); letter-spacing: .01em; }
.cx-band span { font-size: var(--fs-base); opacity: .82; }
.cx-band em { margin-left: auto; font-style: normal; font-size: var(--fs-sm); opacity: .7; }
.rail { height: calc(100vh - var(--topbar-h) - 28px - %(b)dpx); }
.cx-head { display: flex; align-items: center; justify-content: space-between; gap: var(--s6); }
.cx-mode { display: inline-flex; align-items: center; gap: var(--s4); font-size: var(--fs-md); color: var(--muted);
  border: 1px solid var(--line); background: var(--surface); border-radius: var(--r-pill); padding: var(--s2) var(--s5); }
.cx-mode a { color: var(--accent-ink); font-weight: 600; text-decoration: none; }
.cx-dot { width: 8px; height: 8px; border-radius: var(--r-circle); background: var(--accent); display: inline-block; }
.cx-av { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: var(--r-circle); flex: none;
  background: var(--accent-soft); color: var(--accent-ink); font-size: var(--fs-xs); font-weight: 700; }
.cx-av.lg { width: 40px; height: 40px; font-size: var(--fs-md); }
.cx-av.sm { width: 22px; height: 22px; font-size: 10px; }
.cx-tag { display: inline-flex; align-items: center; gap: var(--s2); white-space: nowrap; font-size: var(--fs-sm); font-weight: 600;
  padding: 1px var(--s4); border-radius: var(--r-sm); }
.cx-tag.late { color: var(--late); background: var(--late-soft); }
.cx-tag.warn { color: var(--warn); background: var(--warn-soft); }
.cx-tag.good { color: var(--good); background: var(--good-soft); }
.cx-tag.info { color: var(--accent-ink); background: var(--accent-soft); }
.cx-tag.mute { color: var(--muted); background: var(--surface-2); }
.cx-muted { color: var(--muted); }
.cx-row { display: flex; align-items: center; gap: var(--s5); min-height: 40px; border-bottom: 1px solid var(--line); font-size: var(--fs-md); }
.cx-row:last-child { border-bottom: 0; }
.cx-row .t { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
.cx-row .m { color: var(--muted); white-space: nowrap; font-size: var(--fs-sm); }
.cx-sec h2 { font-size: var(--fs-lg); margin: 0; display: flex; align-items: center; gap: var(--s4); }
.cx-sec header { display: flex; align-items: center; justify-content: space-between; gap: var(--s5); margin-bottom: var(--s4); }
.cx-n { font-size: var(--fs-sm); color: var(--muted); font-weight: 600; background: var(--surface-2); border-radius: var(--r-pill); padding: 0 var(--s4); }
.cx-btn-lg { font-size: var(--fs-base); padding: 10px 18px; }
.cx-check { width: 18px; height: 18px; border-radius: var(--r-xs); border: 2px solid var(--accent); background: var(--accent); flex: none;
  display: inline-grid; place-items: center; color: var(--on-accent); font-size: 12px; line-height: 1; }
.cx-check.off { background: var(--surface); border-color: var(--edge); color: transparent; }
.cx-strip { display: flex; gap: var(--s7); align-items: center; font-size: var(--fs-md); color: var(--muted); }
.cx-strip b { color: var(--ink); font-size: var(--fs-lg); margin-right: var(--s2); }
.cx-link { color: var(--accent-ink); font-weight: 600; font-size: var(--fs-md); text-decoration: none; }
""" % {"b": BAND_H}


def page(slug, band_title, band_text, main, css, rail=None, hide_rail=False, note="Static concept · fictional demo data · Sat Oct 31"):
    html = MAIN_RE.sub(lambda m: f'<main id="main" tabindex="-1">{main}</main>', shell, count=1)
    if hide_rail:
        html = RAIL_RE.sub('', html, count=1).replace('class="shell with-rail"', 'class="shell"')
    elif rail is not None:
        html = RAIL_RE.sub(lambda m: rail, html, count=1)
    band = f'<div class="cx-band"><b>{band_title}</b><span>{band_text}</span><em>{note}</em></div>'
    html = html.replace('<body>', f'<body>{band}', 1).replace('</head>', f'<style>{CSS}{css}</style></head>', 1)
    (OUT / f"{slug}.html").write_text(html)


def rail_details(title, body):
    return f'''<aside class="rail" aria-label="Assistant and details" data-testid="rail" data-state="open"><div class="rail-tabs"><div role="tablist" class="tab-group">
<button type="button" role="tab" aria-selected="false">Ask</button><button type="button" role="tab" aria-selected="true">Details</button></div><span class="spacer"></span></div>
<div class="rail-body cx-rail"><p class="cx-eyebrow">{title}</p>{body}</div></aside>'''

# ============ A. One-tap summary ============
groups = by_person()
a_css = """
.a-hero { display: grid; grid-template-columns: 1fr auto; gap: var(--s6); align-items: center; padding: var(--s7); border-color: var(--accent); background: var(--accent-soft); }
.a-big { font-size: 44px; font-weight: 700; line-height: 1; color: var(--accent-ink); font-family: var(--serif); }
.a-hero h2 { margin: 0 0 var(--s4); font-size: var(--fs-xl); display: flex; align-items: baseline; gap: var(--s5); }
.a-people { display: flex; gap: var(--s5); flex-wrap: wrap; margin-top: var(--s5); }
.a-person { display: inline-flex; align-items: center; gap: var(--s4); background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-pill); padding: var(--s2) var(--s5) var(--s2) var(--s2); font-size: var(--fs-md); }
.a-person b { font-weight: 600; } .a-act { display: grid; gap: var(--s4); justify-items: end; }
.a-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s6); }
.a-fixline { display: flex; align-items: center; gap: var(--s5); padding: var(--s4) 0; border-bottom: 1px solid var(--line); font-size: var(--fs-md); }
.a-fixline:last-child { border: 0; } .a-fixline .c { font-size: var(--fs-xl); font-weight: 700; width: 28px; text-align: center; }
.a-fixline .l { flex: 1; } .a-bars { display: grid; grid-template-columns: repeat(8, 1fr); gap: var(--s3); align-items: end; height: 104px; margin-top: var(--s4); }
.a-bar { display: grid; gap: var(--s2); justify-items: center; font-size: var(--fs-xs); color: var(--muted); }
.a-bar i { display: block; width: 100%; max-width: 34px; border-radius: var(--r-xs) var(--r-xs) 0 0; background: var(--mline-main); }
.a-bar.today i { background: var(--accent); } .a-bar.today { color: var(--accent-ink); font-weight: 700; }
"""
people_html = "".join(f'<span class="a-person">{av(p)}<b>{PEOPLE[p][0].split()[0]}</b><span class="cx-muted">{len(t)} task{"s" if len(t) > 1 else ""}</span></span>' for p, t in groups.items())
counts = [5, 0, 1, 3, 0, 0, 4, 0]
bars = "".join(f'<div class="a-bar{" today" if i == 0 else ""}"><b>{c or ""}</b><i style="height:{max(4, c * 16)}px"></i>{DAYS[i].split()[0]}</div>' for i, c in enumerate(counts))
a_main = page_head(mode_chip()) + f'''
<section class="card a-hero"><div><h2><span class="a-big">5</span>reminders ready today</h2>
<div class="cx-muted">Bundled into <b>3 emails</b> — one per person. Overdue first.</div><div class="a-people">{people_html}</div></div>
<div class="a-act"><button class="btn btn-primary cx-btn-lg">Send all 3 emails</button><a class="cx-link" href="#">Preview emails</a></div></section>
<div class="a-grid">
<section class="card cx-sec"><header><h2>Fix first <span class="cx-n">8</span></h2><span class="cx-muted">Can't be reminded yet</span></header>
<div class="a-fixline"><span class="c">4</span><span class="l">Waiting — pick who it waits on</span><a class="cx-link" href="#">Fix</a></div>
<div class="a-fixline"><span class="c">2</span><span class="l">No owner yet</span><a class="cx-link" href="#">Assign</a></div>
<div class="a-fixline"><span class="c">2</span><span class="l">Stuck — owner needs help</span><a class="cx-link" href="#">Open</a></div></section>
<section class="card cx-sec"><header><h2>Next 7 days <span class="cx-n">8</span></h2><span class="cx-muted">Planned checks</span></header><div class="a-bars">{bars}</div></section>
</div>
<section class="card"><div class="cx-strip"><span><b>4</b>sent this week</span><span><b>2</b>replied</span><span><b>1</b>no reply · <a class="cx-link" href="#">follow up</a></span><a class="cx-link" style="margin-left:auto" href="#">History</a></div></section>
'''
page("A-one-tap-summary", "Option A · One-tap summary", "The first screen answers how many messages can be sent today and where to click. Issues and plans show counts; open them for details.", a_main, a_css)

# ============ B. People digest ============
b_css = """
.b-top { display: flex; align-items: center; gap: var(--s6); padding: var(--s5) var(--s6); }
.b-top .s { flex: 1; font-size: var(--fs-base); } .b-top .s b { font-size: var(--fs-lg); }
.b-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s6); }
.b-card { display: grid; gap: var(--s4); align-content: start; }
.b-card header { display: flex; align-items: center; gap: var(--s5); }
.b-card header .n { flex: 1; } .b-card header .n b { display: block; font-size: var(--fs-base); }
.b-card header .n span { font-size: var(--fs-sm); color: var(--muted); }
.b-task { display: grid; gap: var(--s1); padding: var(--s4) var(--s5); border-radius: var(--r-sm); background: var(--surface-2); font-size: var(--fs-md); }
.b-task b { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.b-task div { display: flex; gap: var(--s4); align-items: center; font-size: var(--fs-sm); color: var(--muted); }
.b-foot a { white-space: nowrap; }
.b-foot { display: flex; justify-content: space-between; align-items: center; font-size: var(--fs-sm); color: var(--muted); border-top: 1px solid var(--line); padding-top: var(--s4); }
.b-fix { display: flex; flex-wrap: wrap; gap: var(--s4); }
.b-chip { display: inline-flex; gap: var(--s4); align-items: center; font-size: var(--fs-md); border: 1px dashed var(--edge); border-radius: var(--r-pill); padding: var(--s2) var(--s5); background: var(--surface); }
.b-chip b { font-weight: 600; }
"""
cards = ""
for p, tasks in groups.items():
    rows = "".join(f'<div class="b-task"><b>{t[0]}</b><div>{tag(t[3], t[4])}<span>Due {t[2]}</span></div></div>' for t in tasks)
    cards += f'''<section class="card b-card"><header>{av(p, "lg")}<div class="n"><b>{PEOPLE[p][0]}</b><span>1 email · {len(tasks)} task{"s" if len(tasks) > 1 else ""}</span></div><span class="cx-check">✓</span></header>
{rows}<div class="b-foot"><a class="cx-link" href="#">Preview email</a><span>Never reminded</span></div></section>'''
fix_chips = "".join(f'<span class="b-chip"><b>{t}</b><span class="cx-muted">· {FIX_LABEL[k][0]}</span></span>' for t, k, d in FIX[:4])
b_main = page_head(mode_chip()) + f'''
<section class="card b-top"><span class="cx-check">✓</span><span class="s"><b>3 people</b> · 5 tasks · overdue tasks go first in each email</span><button class="btn">Deselect all</button><button class="btn btn-primary cx-btn-lg">Send 3 emails</button></section>
<div class="b-grid">{cards}</div>
<section class="card cx-sec"><header><h2>Can't remind yet <span class="cx-n">8</span></h2><a class="cx-link" href="#">Fix all</a></header><div class="b-fix">{fix_chips}<span class="b-chip cx-muted">+4 more</span></div></section>
<section class="card"><div class="cx-strip"><span><b>8</b>planned next 7 days</span><span><b>4</b>sent this week</span><span><b>2</b>replied</span><a class="cx-link" style="margin-left:auto" href="#">Week plan</a></div></section>
'''
page("B-people-digest", "Option B · Group by person", "One email per person: combine Jordan’s three tasks into one email. Select recipients and send in one action.", b_main, b_css)

# ============ C. Pipeline ============
c_css = """
main { max-width: none; }
.c-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s5); align-items: start; }
.c-col { background: var(--lane); border: 1px solid var(--line); border-radius: var(--radius); padding: var(--s5); display: grid; gap: var(--s4); position: relative; }
.c-col > header { display: flex; align-items: center; gap: var(--s4); font-weight: 700; font-size: var(--fs-base); min-height: 34px; }
.c-col > header .sp { flex: 1; }
.c-col:not(:last-child)::after { content: ""; position: absolute; right: -15px; top: 20px; width: 0; height: 0; border: 8px solid transparent; border-left: 10px solid var(--mline-main); }
.c-col.ready { background: var(--accent-soft); border-color: var(--accent); }
.c-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md); padding: var(--s4) var(--s5); display: grid; gap: var(--s2); font-size: var(--fs-md); }
.c-card b { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.c-card div { display: flex; align-items: center; gap: var(--s4); font-size: var(--fs-sm); color: var(--muted); }
.c-card div .sp { flex: 1; }
.c-hint { font-size: var(--fs-sm); color: var(--muted); }
.c-sub { font-size: var(--fs-xs); font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-top: var(--s2); }
"""
def c_card(title, meta, right=""):
    return f'<div class="c-card"><b>{title}</b><div>{meta}<span class="sp"></span>{right}</div></div>'
fix_col = '<div class="c-sub">Pick who it waits on · 4</div>' + "".join(c_card(t, f'Due {d}', '<a class="cx-link" href="#">Choose</a>') for t, k, d in FIX[:2]) + '<div class="c-hint">+2 more</div>'
fix_col += '<div class="c-sub">No owner · 2</div>' + c_card(FIX[4][0], f'Due {FIX[4][2]}', '<a class="cx-link" href="#">Assign</a>') + '<div class="c-hint">+1 more</div>'
fix_col += '<div class="c-sub">Stuck · 2</div>' + c_card(FIX[6][0], 'Jordan · Due Nov 10', '<a class="cx-link" href="#">Help</a>') + '<div class="c-hint">+1 more</div>'
ready_col = "".join(c_card(t[0], f'{av(t[1], "sm")} {PEOPLE[t[1]][0].split()[0]}', tag(t[3], t[4])) for t in READY)
sent = [("Follow up with the sponsor", "maya", "Thu"), ("Check the officer list in Sun Devil Central", "alex", "Thu"), ("Recruit Founder Dinner volunteers", "jordan", "Wed"), ("Design the Networking Night save-the-date", "sam", "Wed")]
sent_col = c_card(sent[2][0], f'{av("jordan", "sm")} Jordan · 3 days', '<a class="cx-link" href="#">Follow up</a>') + c_card(sent[3][0], f'{av("sam", "sm")} Sam · 1 day', '<span>Sent Fri</span>') + '<div class="c-hint">Follow up appears after 2 days with no reply.</div>'
rep_col = c_card("Follow up with the sponsor", f'{av("maya", "sm")} Maya', tag("Working on it", "info")) + c_card("Check the officer list in Sun Devil Central", f'{av("alex", "sm")} Alex', tag("Done", "good"))
c_main = page_head(mode_chip()) + f'''<div class="c-board">
<section class="c-col"><header>Fix first <span class="cx-n">8</span></header>{fix_col}</section>
<section class="c-col ready"><header>Ready <span class="cx-n">5</span><span class="sp"></span><button class="btn btn-primary small">Send all · 3 emails</button></header>{ready_col}<div class="c-hint">Jordan's 3 tasks go in one email.</div></section>
<section class="c-col"><header>Waiting for reply <span class="cx-n">2</span></header>{sent_col}</section>
<section class="c-col"><header>Replied <span class="cx-n">2</span></header>{rep_col}</section>
</div>'''
page("C-pipeline", "Option C · Pipeline", "From left to right: fix issues, ready to send, sent, replied. Follow each reminder through a workflow.", c_main, c_css, hide_rail=True)

# ============ D. Week timeline (metro style) ============
d_css = """
main { max-width: none; }
.d-wrap { padding: 0; overflow: hidden; }
.d-grid { display: grid; grid-template-columns: 156px 1.5fr repeat(7, 1fr); }
.d-grid > div { border-bottom: 1px solid var(--line); min-height: 64px; display: flex; align-items: center; justify-content: center; gap: var(--s3); position: relative; flex-wrap: wrap; padding: var(--s3); }
.d-h { min-height: 48px !important; font-size: var(--fs-sm); color: var(--muted); font-weight: 600; background: var(--surface-2); }
.d-h.today { background: var(--accent-soft); color: var(--accent-ink); }
.d-col0 { justify-content: flex-start !important; padding-left: var(--s6) !important; gap: var(--s4) !important; font-weight: 600; font-size: var(--fs-md); flex-wrap: nowrap !important; }
.d-today { background: var(--accent-soft); }
.d-grid > div.lane::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 3px; background: var(--line); z-index: 0; }
.d-pt { position: relative; z-index: 1; width: 22px; height: 22px; border-radius: var(--r-circle); border: 3px solid var(--edge); background: var(--surface); }
.d-pt.late { background: var(--late); border-color: var(--late); } .d-pt.warn { background: var(--risk-yellow); border-color: var(--risk-yellow); }
.d-pt.plan { border-color: var(--info); } .d-pt.sel { box-shadow: 0 0 0 4px var(--info-glow); }
.d-legend { display: flex; gap: var(--s7); align-items: center; font-size: var(--fs-md); color: var(--muted); padding: var(--s5) var(--s6); }
.d-legend span { display: inline-flex; align-items: center; gap: var(--s4); } .d-legend .d-pt { width: 16px; height: 16px; border-width: 3px; }
.d-send { display: flex; align-items: center; gap: var(--s6); }
.d-fix { display: flex; align-items: center; gap: var(--s5); font-size: var(--fs-md); }
.d-fix .cx-tag { font-size: var(--fs-md); }
"""
lanes = ["jordan", "maya", "priya", "sam", "alex"]
ready_by = {p: [r for r in READY if r[1] == p] for p in lanes}
week_by = {}
for t, p, d, k in WEEK:
    week_by.setdefault((p, d), []).append(k)
grid = '<div class="d-h d-col0">Person</div>' + "".join(f'<div class="d-h{" today" if i == 0 else ""}">{"Today " if i == 0 else ""}{d}</div>' for i, d in enumerate(DAYS))
for p in lanes:
    grid += f'<div class="d-col0">{av(p)}{PEOPLE[p][0]}</div>'
    for i in range(8):
        dots = ""
        if i == 0:
            dots = "".join(f'<span class="d-pt {r[4]}{" sel" if r[0].startswith("Confirm the w") else ""}" title="{r[0]}"></span>' for r in ready_by[p])
        else:
            dots = "".join('<span class="d-pt plan"></span>' for _ in week_by.get((p, i), []))
        grid += f'<div class="lane{" d-today" if i == 0 else ""}">{dots}</div>'
d_rail = rail_details("Jordan Patel · today", f'''<div class="cx-rd"><h3>1 email · 3 tasks</h3>
<div class="cx-row"><span class="d-pt late" style="width:14px;height:14px"></span><span class="t">Confirm the workshop checklist</span>{tag("4d late", "late")}</div>
<div class="cx-row"><span class="d-pt warn" style="width:14px;height:14px"></span><span class="t">Book the spring weekly meeting room</span><span class="m">Nov 3</span></div>
<div class="cx-row"><span class="d-pt warn" style="width:14px;height:14px"></span><span class="t">Event Materials PPT Decorations</span><span class="m">Nov 18</span></div>
<p class="cx-muted">Next planned: Fri Nov 6 · 3 checks</p>
<button class="btn btn-primary" style="width:100%">Send Jordan's email</button><a class="cx-link" href="#">Preview email</a></div>''')
d_main = page_head(mode_chip()) + f'''<section class="card d-send"><span style="flex:1;font-size:var(--fs-base)"><b>Today: 5 reminders → 3 emails.</b> <span class="cx-muted">Hollow dots are planned checks.</span></span><button class="btn btn-primary cx-btn-lg">Send today's 3 emails</button></section>
<section class="card d-wrap"><div class="d-grid">{grid}</div>
<div class="d-legend"><span><i class="d-pt late"></i>Overdue</span><span><i class="d-pt warn"></i>Start passed</span><span><i class="d-pt plan"></i>Planned check</span><span style="margin-left:auto"></span></div></section>
<section class="card d-fix"><b>Not on the timeline</b>{tag("4 waiting · pick who", "warn")}{tag("2 no owner", "mute")}{tag("2 stuck", "late")}<a class="cx-link" style="margin-left:auto" href="#">Fix these 8</a></section>'''
d_css += """
.cx-rail { display: grid; gap: var(--s5); align-content: start; padding: var(--s6); }
.cx-eyebrow { margin: 0; font-size: var(--fs-sm); color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
.cx-rd { display: grid; gap: var(--s4); } .cx-rd h3 { margin: 0; font-size: var(--fs-lg); }
"""
page("D-week-timeline", "Option D · Weekly timeline", "One row per person and one column per day. Filled dots can be sent today; hollow dots are planned. As in the Plan metro chart, select one to see the person’s email on the right.", d_main, d_css, rail=d_rail)

# ============ E. Table with bulk bar ============
e_css = """
.e-tabs { display: flex; gap: var(--s2); border-bottom: 1px solid var(--line); margin: calc(-1 * var(--s6)) calc(-1 * var(--s6)) var(--s4); padding: 0 var(--s6); }
.e-tab { padding: var(--s5) var(--s5); font-size: var(--fs-md); font-weight: 600; color: var(--muted); border-bottom: 3px solid transparent; display: inline-flex; gap: var(--s3); align-items: center; }
.e-tab.on { color: var(--accent-ink); border-bottom-color: var(--accent); }
.e-tbl td, .e-tbl th { font-size: var(--fs-md); } .e-tbl td { height: 46px; }
.e-tbl td { white-space: nowrap; }
.e-tbl td.t { font-weight: 600; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.e-who { display: inline-flex; align-items: center; gap: var(--s4); white-space: nowrap; }
.e-bar { display: flex; align-items: center; gap: var(--s6); background: var(--ink); color: var(--bg); border-radius: var(--r-md); padding: var(--s5) var(--s6); font-size: var(--fs-base); }
.e-bar .sp { flex: 1; } .e-bar .btn { border-color: transparent; }
.e-bar .btn-ghost { background: transparent; color: var(--bg); border: 1px solid var(--muted); }
.e-filter { display: flex; gap: var(--s4); margin-bottom: var(--s4); font-size: var(--fs-sm); }
.e-ev { font-size: var(--fs-sm); color: var(--muted); }
"""
trs = "".join(f'<tr><td><span class="cx-check">✓</span></td><td class="t">{t[0]}</td><td><span class="e-who">{av(t[1], "sm")}{PEOPLE[t[1]][0]}</span></td><td>{t[2]}</td><td>{tag(t[3], t[4])}</td><td class="e-ev">{t[5] or "Club task"}</td></tr>' for t in READY)
e_main = page_head(mode_chip()) + f'''<section class="card">
<div class="e-tabs"><span class="e-tab on">Ready <span class="cx-n">5</span></span><span class="e-tab">Fix first <span class="cx-n">8</span></span><span class="e-tab">Next 7 days <span class="cx-n">8</span></span><span class="e-tab">Sent <span class="cx-n">4</span></span><span class="e-tab">No reply <span class="cx-n">1</span></span></div>
<div class="e-filter"><span class="cx-tag mute">All people ▾</span><span class="cx-tag mute">All events ▾</span><span class="cx-tag mute">Sort: most urgent ▾</span></div>
<table class="tbl e-tbl"><thead><tr><th><span class="cx-check">✓</span></th><th>Task</th><th>To</th><th>Due</th><th>Why now</th><th>Event</th></tr></thead><tbody>{trs}</tbody></table></section>
<div class="e-bar"><b>5 selected</b><span>→ 3 emails (Jordan gets 1 email for 3 tasks)</span><span class="sp"></span><button class="btn btn-ghost">Preview</button><button class="btn btn-primary">Send 3 emails</button></div>'''
page("E-table-bulk", "Option E · Table and bulk action bar", "Like Gmail: switch tabs, use one row per task, and select all to send from a bottom action bar. This option has the highest information density.", e_main, e_css)

# ============ F. Review & send (email preview in rail) ============
f_css = """
.cx-rail { display: grid; gap: var(--s5); align-content: start; padding: var(--s6); }
.cx-eyebrow { margin: 0; font-size: var(--fs-sm); color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
.f-list { padding: var(--s4) var(--s6); }
.f-grp { display: flex; align-items: center; gap: var(--s5); padding: var(--s5) 0 var(--s3); font-weight: 700; font-size: var(--fs-base); }
.f-grp .sp { flex: 1; } .f-grp .k { font-size: var(--fs-sm); color: var(--muted); font-weight: 600; }
.f-item { display: flex; align-items: center; gap: var(--s5); padding: var(--s3) var(--s4) var(--s3) 40px; font-size: var(--fs-md); border-radius: var(--r-sm); }
.f-item .t { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-on { background: var(--accent-soft); border-left: 3px solid var(--accent); border-radius: var(--r-sm); padding-bottom: var(--s4); }
.f-mail { border: 1px solid var(--line); border-radius: var(--r-md); padding: var(--s6); font-size: var(--fs-md); display: grid; gap: var(--s4); background: var(--surface); }
.f-mail .h { font-size: var(--fs-sm); color: var(--muted); border-bottom: 1px solid var(--line); padding-bottom: var(--s4); display: grid; gap: var(--s1); }
.f-mail p { margin: 0; } .f-mail ol { margin: 0; padding-left: var(--s7); display: grid; gap: var(--s3); }
.f-mail li span { color: var(--muted); }
.f-nav { display: flex; gap: var(--s4); } .f-nav .btn { flex: 1; justify-content: center; text-align: center; }
.f-top { display: flex; align-items: center; gap: var(--s6); }
.f-step { display: flex; gap: var(--s3); } .f-step i { width: 26px; height: 6px; border-radius: var(--r-pill); background: var(--line); }
.f-step i.on { background: var(--accent); }
"""
lst = ""
for gi, (p, tasks) in enumerate(groups.items()):
    on = p == "jordan"
    items = "".join(f'<div class="f-item"><span class="t">{t[0]}</span>{tag(t[3], t[4])}</div>' for t in tasks)
    lst += f'<div class="{"f-on" if on else ""}"><div class="f-grp" style="padding-left:var(--s4)">{av(p)}{PEOPLE[p][0]}<span class="sp"></span><span class="k">{"Reviewing" if on else ('<span class="cx-tag good">Sent ✓</span>' if p == "maya" else "Up next")}</span></div>{items}</div>'
f_rail = rail_details("Email 2 of 3 · to Jordan", '''<div class="f-mail"><div class="h"><span>To: jordan.patel@example.org</span><b style="color:var(--ink);font-size:var(--fs-base)">3 Platypus tasks need you this week</b></div>
<p>Hi Jordan — here's what needs you. Overdue first:</p>
<ol><li><b>Confirm the workshop checklist</b><br><span>Was due Oct 27 · 4 days overdue</span></li><li><b>Book the spring weekly meeting room</b><br><span>Due Nov 3 · start date passed</span></li><li><b>Event Materials PPT Decorations</b><br><span>Founder Dinner · Due Nov 18</span></li></ol>
<p>Update all three on one page: <a class="cx-link" href="#">Open my tasks</a></p><p class="cx-muted">Stuck? Reply and Alex will help.</p></div>
<div class="f-nav"><button class="btn">Skip</button><button class="btn btn-primary">Send & next</button></div>
<a class="cx-link" href="#" style="text-align:center">Send all 3 without reviewing</a>''')
f_main = page_head(mode_chip()) + f'''<section class="card f-top"><span style="flex:1;font-size:var(--fs-base)"><b>Review 3 emails</b> <span class="cx-muted">· 5 tasks · 1 sent</span></span><span class="f-step"><i class="on"></i><i class="on"></i><i></i></span></section>
<section class="card f-list">{lst}</section>
<section class="card cx-sec"><header><h2>Fix first <span class="cx-n">8</span></h2><a class="cx-link" href="#">Open list</a></header><div class="cx-muted" style="font-size:var(--fs-md)">4 waiting on someone unnamed · 2 without owner · 2 stuck</div></section>'''
page("F-review-and-send", "Option F · Review each email with a right-side preview", "List people on the left and preview the outgoing email on the right. Use Send & next to review each one, or send all in one action.", f_main, f_css, rail=f_rail)

# ============ G. Mode sheet: what the one-tap button means in each mode ============
g_css = """
main { max-width: none; }
.g-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s6); }
.g-card { display: grid; gap: var(--s5); align-content: start; }
.g-card h2 { margin: 0; font-size: var(--fs-lg); } .g-card .who { font-size: var(--fs-sm); color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
.g-hero { background: var(--accent-soft); border: 1px solid var(--accent); border-radius: var(--r-md); padding: var(--s6); display: grid; gap: var(--s4); }
.g-hero .big { font-family: var(--serif); font-size: 34px; font-weight: 700; color: var(--accent-ink); line-height: 1; }
.g-hero.auto { background: var(--good-soft); border-color: var(--good); } .g-hero.auto .big { color: var(--good); }
.g-steps { margin: 0; padding-left: var(--s7); display: grid; gap: var(--s3); font-size: var(--fs-md); }
.g-note { font-size: var(--fs-sm); color: var(--muted); border-top: 1px solid var(--line); padding-top: var(--s4); }
"""
g_main = page_head('<span class="cx-muted">Same 5 tasks · 3 people · three sending choices</span>') + f'''<div class="g-grid">
<section class="card g-card"><span class="who">Mode 1</span><h2>Send automatically</h2>
<div class="g-hero auto"><span class="big">5 → 3</span><b>Platypus sends today at 9:00 AM</b><div style="display:flex;gap:var(--s4)"><button class="btn">Pause today</button><button class="btn">Hold one…</button></div></div>
<ol class="g-steps"><li>No button to press.</li><li>The page shows only exceptions: the 8 to fix.</li><li>Hold or pause before 9:00.</li></ol>
<p class="g-note">Needs a server scheduler. Today the demo only records while the page is open.</p></section>
<section class="card g-card"><span class="who">Mode 2</span><h2>I review, then I send</h2>
<div class="g-hero"><span class="big">3 drafts</span><b>One draft per person, in order</b><div style="display:flex;gap:var(--s4)"><button class="btn btn-primary">Open draft 1 of 3</button><button class="btn">Copy all</button></div></div>
<ol class="g-steps"><li>Open Gmail draft, recipient filled in.</li><li>Send it in Gmail, come back.</li><li>Tap “Sent” → next draft opens.</li></ol>
<p class="g-note">A browser cannot open 3 Gmail windows in one click; a guided “next” keeps it to one tap each.</p></section>
<section class="card g-card"><span class="who">Mode 3</span><h2>I review, Platypus sends</h2>
<div class="g-hero"><span class="big">5 → 3</span><b>Check, then one tap</b><div style="display:flex;gap:var(--s4)"><button class="btn btn-primary">Send all 3 emails</button><button class="btn">Preview</button></div></div>
<ol class="g-steps"><li>Untick anyone you want to skip.</li><li>One tap sends all.</li><li>Undo for 10 seconds.</li></ol>
<p class="g-note">Same server outbox as Mode 1; the only difference is who presses the button.</p></section>
</div>'''
page("G-three-modes", "Supplement · One-tap behavior in three sending modes", "The same five tasks: automatic mode needs no action; self-send guides each email; Platypus-send sends all in one action.", g_main, g_css, hide_rail=True)

print("built", sorted(p.name for p in OUT.iterdir()))
