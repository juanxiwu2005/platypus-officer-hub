NAV = """<div class="top"><div class="logo">P</div><div class="brand"><b>Platypus</b><small>Desert Founders Society</small></div><div class="sp"></div><span class="pill demo">Demo · Sat, Oct 31</span><span class="sm muted">View as</span><select><option>Alex Rivera · President</option></select><button class="btn">Ask Platypus</button></div>
<div class="shell"><nav class="nav"><a><span class="ico">◷</span>Reminders</a><a><span class="ico">⟨⟩</span>Plan</a><a><span class="ico">⇥</span>Handoff</a><a><span class="ico">◎</span>Team</a><a><span class="ico">≡</span>Rules</a><div class="sec">REFERENCE</div><a class="on"><span class="ico">⚙</span>Settings</a><a><span class="ico">?</span>Help</a></nav>
<div><h1>Settings</h1><nav class="snav"><a>Club</a><a class="on">Roles &amp; teams</a><a>Workflow</a><a>Tasks</a><a>Links &amp; files</a><a>My preferences</a><a>Admin</a></nav></div><main>"""
def page(title, body, label, extra_css=""):
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{title}</title><link rel="stylesheet" href="shell.css"><style>{extra_css}</style></head><body>{NAV}<div class="label">{label}</div>{body}</main></div></body></html>"""
ROLES = [
  ("President","Alex Rivera","AR","lead","Club leadership","Nobody (top)","alex.rivera@example.org","480-555-0101","9999000001"),
  ("Vice president","Open seat","—","lead","Club leadership","President","—","—","—"),
  ("Events lead","Jordan Patel","JP","ops","Operations","President","jordan.patel@example.org","480-555-0103","9999000003"),
  ("Secretary","Priya Nair","PN","ops","Operations","President","priya.nair@example.org","480-555-0105","9999000005"),
  ("Marketing lead","Sam Okafor","SO","mkt","Marketing","President","sam.okafor@example.org","480-555-0104","9999000004"),
  ("Treasurer","Maya Chen","MC","fin","Finance","President","maya.chen@example.org","480-555-0102","9999000002"),
]
TEAMS = [("lead","Club leadership",1),("ops","Operations",25),("mkt","Marketing",8),("fin","Finance",12)]
