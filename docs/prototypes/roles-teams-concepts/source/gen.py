from frame import page, TEAMS
ROLES = [r for r in __import__("frame").ROLES if r[0] != "Vice president"]
def tag(k,n): return f'<span class="tag {k}"><i></i>{n}</span>'
steps = {k:c for k,_,c in TEAMS}

# ---------- A: table grouped by team ----------
rows=""
for k,name,count in TEAMS:
    members=[r for r in ROLES if r[3]==k]
    rows+=f'<tr class="grp"><td colspan="7"><div class="row between"><div class="row">{tag(k,name)}<span class="sm muted">{len(members)} role{"s" if len(members)!=1 else ""} · owns {count} workflow step{"s" if count!=1 else ""}</span></div><span class="sm" style="color:var(--accent-ink)">Rename · Open in Workflow →</span></div></td></tr>'
    for r in members:
        rows+=f'<tr><td><b>{r[0]}</b></td><td><select><option>{r[4]}</option></select></td><td>{r[5]}</td><td><div class="row"><span class="av">{r[2]}</span>{r[1]}</div></td><td>{r[6]}</td><td>{r[7]}</td><td><button class="btn" style="padding:4px 10px">Duties</button></td></tr>'
A = f"""<section class="card">
<div class="row between"><div><h2>Roles &amp; teams</h2><p class="sm muted" style="margin:6px 0 0">Each role belongs to one team. Workflow branches use these teams.</p></div><div class="row"><button class="btn">Copy all emails</button><button class="btn">+ New team</button><button class="btn primary">Edit roles</button></div></div>
<div style="margin-top:16px;border:1px solid var(--line);border-radius:12px;overflow:hidden"><table><thead><tr><th>Role</th><th>Team</th><th>Reports to</th><th>Officer</th><th>Email</th><th>Phone</th><th></th></tr></thead><tbody>{rows}</tbody></table></div>
<div class="row" style="margin-top:14px;gap:16px"><span class="sm muted">Organization chart</span>{''.join(tag(k,n) for k,n,_ in TEAMS)}</div>
<div class="org">
 <div class="ob lead2">President<small>Alex Rivera</small></div>
 <div class="ol"></div>
 <div class="row" style="justify-content:center;gap:18px">{''.join(f'<div class="ob {r[3]}2">{r[0]}<small>{r[1]}</small></div>' for r in ROLES if r[0]!="President")}</div>
</div></section>"""
A_css = """.grp td{background:color-mix(in srgb,var(--surface-2) 60%,#fff);padding:8px 12px}
.org{margin-top:10px;background:var(--surface-2);border-radius:12px;padding:18px;display:grid;gap:0;justify-items:center}
.ob{border:2px solid var(--c);border-radius:12px;background:#fff;padding:8px 18px;text-align:center;font-weight:600;min-width:150px}.ob small{display:block;font-weight:400;color:var(--muted);font-size:12px}
.lead2{--c:var(--t-lead)}.ops2{--c:var(--t-ops)}.mkt2{--c:var(--t-mkt)}.fin2{--c:var(--t-fin)}
.ol{width:2px;height:22px;background:#888e8b}"""

# ---------- B: team board ----------
cards=""
for k,name,count in TEAMS:
    members=[r for r in ROLES if r[3]==k]
    chips="".join(f'<div class="rc"><span class="grip">⋮⋮</span><span class="av">{r[2]}</span><div><b>{r[0]}</b><div class="xs muted">{r[1]}</div></div></div>' for r in members)
    cards+=f'<div class="tc {k}"><div class="row between"><span class="tag {k}"><i></i>{name}</span><span class="xs muted">⋯</span></div><div class="xs muted" style="margin:8px 0 10px">{count} workflow step{'s' if count!=1 else ''} · Speaker series</div>{chips}<div class="drop">Drop a role here</div></div>'
B = f"""<section class="card">
<div class="row between"><div><h2>Teams</h2><p class="sm muted" style="margin:6px 0 0">Drag a role onto a team. The workflow's team branches update with it.</p></div><div class="row"><button class="btn">+ New team</button><button class="btn primary">Save teams</button></div></div>
<div class="board">{cards}<div class="tc add"><b>+ New team</b><span class="xs muted">e.g. Partnerships</span></div></div>
<div class="unas"><span class="sm"><b>Not in a team</b> · 0 roles</span><span class="sm muted">Every role is in a team. New roles land here until you drag them onto a team.</span></div>
<div class="row between" style="margin-top:18px"><h3>Roles</h3><span class="sm" style="color:var(--accent-ink)">Show contact table ▸</span></div>
<p class="sm muted" style="margin:6px 0 0">Reporting lines, contacts and duties stay in the role table. Select a role card to edit it.</p>
</section>"""
B_css = """.board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) 150px;gap:14px;margin-top:18px}
.tc{border-radius:14px;padding:14px;border:1px solid color-mix(in srgb,var(--c) 28%,transparent);background:color-mix(in srgb,var(--c) 7%,#fff);min-height:260px}
.tc.add{--c:#888e8b;border-style:dashed;display:grid;place-content:center;text-align:center;gap:4px;color:var(--muted)}
.rc>div{min-width:0}.rc b{display:block;line-height:1.2}.rc{min-width:0;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-bottom:8px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.grip{color:#b8bdb9;font-size:12px;letter-spacing:-2px}
.drop{border:1.5px dashed color-mix(in srgb,var(--c) 40%,transparent);border-radius:10px;padding:10px;text-align:center;font-size:12px;color:var(--muted)}
.unas{margin-top:14px;display:flex;align-items:center;gap:14px;border:1px dashed var(--line);border-radius:12px;padding:10px 14px;background:var(--surface-2)}"""

# ---------- C: org chart with team zones + inspector ----------
C = f"""<div style="display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px">
<section class="card">
<div class="row between"><div><h2>Roles &amp; teams</h2><p class="sm muted" style="margin:6px 0 0">Reporting lines on top, teams as coloured areas. Select a role to edit it.</p></div><div class="row"><div class="seg"><span class="on">Chart</span><span>Contact list</span></div><button class="btn">+ Role</button><button class="btn">+ Team</button></div></div>
<div class="chart">
 <div class="zone lead z1"><span class="tag lead"><i></i>Club leadership · 1 step</span><div class="box sel"><b>President</b><small>Alex Rivera</small></div></div>
 <svg class="wires" viewBox="0 0 900 120" preserveAspectRatio="none"><path d="M450 0 V50 H120 V120 M450 50 H340 V120 M450 50 H560 V120 M450 50 H780 V120" fill="none" stroke="#888e8b" stroke-width="2"/></svg>
 <div class="zones">
  <div class="zone ops"><span class="tag ops"><i></i>Operations · 25 steps</span><div class="row" style="gap:10px"><div class="box"><b>Events lead</b><small>Jordan Patel</small></div><div class="box"><b>Secretary</b><small>Priya Nair</small></div></div></div>
  <div class="zone mkt"><span class="tag mkt"><i></i>Marketing · 8 steps</span><div class="box"><b>Marketing lead</b><small>Sam Okafor</small></div></div>
  <div class="zone fin"><span class="tag fin"><i></i>Finance · 12 steps</span><div class="box"><b>Treasurer</b><small>Maya Chen</small></div></div>
 </div>
</div>
<div class="row" style="margin-top:14px;gap:18px"><span class="xs muted"><b>Lines</b> = who reports to whom</span><span class="xs muted"><b>Coloured area</b> = workflow team (same colour as Settings → Workflow)</span></div>
</section>
<aside class="card insp">
<div class="row between"><h3>President</h3><span class="xs muted">✕</span></div>
<label>Officer<select><option>Alex Rivera</option></select></label>
<label>Reports to<select><option>Nobody (top)</option></select></label>
<label>Team<select><option>Club leadership</option></select></label>
<p class="xs muted" style="margin:-4px 0 0">Owns 1 step in Speaker series: Full Check. <span style="color:var(--accent-ink)">Open in Workflow →</span></p>
<label>Email<input value="alex.rivera@example.org"></label>
<div class="row"><label style="flex:1">Phone<input value="480-555-0101"></label><label style="flex:1">ASU ID<input value="9999000001"></label></div>
<label>Duties<textarea rows="4">Leads the club, chairs meetings, signs off events with the advisor.</textarea></label>
</aside></div>"""
C_css = """.seg{display:inline-flex;background:var(--surface-2);border-radius:10px;padding:3px}.seg span{padding:5px 12px;border-radius:8px;font-size:14px;color:var(--muted)}.seg .on{background:#fff;color:var(--ink);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.chart{margin-top:18px;background:var(--surface-2);border-radius:14px;padding:16px}
.zone{border-radius:14px;padding:10px;background:color-mix(in srgb,var(--c) 9%,#fff);border:1px solid color-mix(in srgb,var(--c) 25%,transparent);display:grid;gap:12px;justify-items:center}
.z1{width:260px;margin:0 auto}.zone .tag{justify-self:start}
.wires{display:block;width:100%;height:60px}
.zones{display:grid;grid-template-columns:auto auto auto;justify-content:center;gap:12px}.zone{min-width:0}
.box{background:#fff;border:2px solid var(--c);border-radius:12px;padding:8px 10px;text-align:center;min-width:104px;white-space:nowrap;font-size:14px}.box small{display:block;color:var(--muted);font-size:12px}
.box.sel{box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 22%,transparent)}
.insp input,.insp select,.insp textarea{width:100%;box-sizing:border-box}.insp{min-width:0;display:grid;gap:12px;align-content:start}.insp label{display:grid;gap:4px;font-size:13px;color:var(--muted)}
.insp input,.insp textarea{font:inherit;font-size:14px;border:1px solid var(--line);border-radius:8px;padding:7px 9px;color:var(--ink)}"""

# ---------- D: team list + team detail ----------
def cnt(n,w): return f"{n} {w}{'s' if n!=1 else ''}"
teamlist="".join(f'<a class="ti{" on" if k=="fin" else ""}"><span class="tag {k}"><i></i>{n}</span><span class="xs muted" style="text-align:right">{cnt(len([r for r in ROLES if r[3]==k]),"role")}<br>{cnt(c,"step")}</span></a>' for k,n,c in TEAMS)
D = f"""<div style="display:grid;grid-template-columns:250px 1fr;gap:16px">
<section class="card" style="padding:14px"><div class="row between" style="padding:4px 6px 10px"><h3>Teams</h3><span class="xs" style="color:var(--accent-ink)">+ New</span></div>{teamlist}
<a class="ti"><span class="sm"><b>All roles</b></span><span class="xs muted">5</span></a><a class="ti"><span class="sm muted">Not in a team</span><span class="xs muted">0</span></a>
<div class="xs muted" style="padding:12px 6px 0;border-top:1px solid var(--line);margin-top:8px">Teams are used by every workflow template. Renaming keeps all links.</div></section>
<section class="card">
<div class="row between"><div class="row"><span class="tag fin" style="font-size:15px;padding:5px 14px"><i></i>Finance</span><span class="sm muted">Team name, colour and members</span></div><div class="row"><button class="btn">Rename</button><button class="btn">Delete team</button></div></div>
<div class="grid2">
 <div><div class="sub">Members</div>
  <div class="mem"><span class="av">MC</span><div style="flex:1"><b>Treasurer</b><div class="xs muted">Maya Chen · maya.chen@example.org</div></div><span class="xs muted">Reports to President</span></div>
  <div class="mem add"><span>+ Add a role to Finance</span><select><option>Choose role…</option></select></div>
  <div class="sub" style="margin-top:18px">Duties of this team</div>
  <p class="sm" style="margin:0">Budgets, quotes, purchase approvals, reimbursements and the finance record for each event.</p>
 </div>
 <div><div class="sub">Work in workflows</div>
  <div class="wf"><div class="row between"><b class="sm">Speaker series · v1</b><span class="xs" style="color:var(--accent-ink)">Open in Workflow →</span></div>
   <div class="lane"><span class="xs muted" style="width:92px">Before event</span><i></i><i class="y"></i><i></i><i class="y"></i><i class="y"></i><i class="y"></i><i class="y"></i><i></i><span class="xs muted" style="white-space:nowrap">8 steps</span></div>
   <div class="lane"><span class="xs muted" style="width:92px">After event</span><i></i><i></i><i></i><i></i><span class="xs muted">4 steps</span></div></div>
  <div class="wf"><div class="row between"><b class="sm">Speaker series copy · draft</b><span class="xs muted">not used</span></div></div>
  <p class="xs muted" style="margin:8px 0 0">Steps belong to the team, not to a person. When Maya hands over, the next Treasurer inherits them.</p>
 </div>
</div></section></div>"""
D_css = """.ti{display:flex;justify-content:space-between;align-items:center;padding:9px 8px;border-radius:10px;text-decoration:none;color:inherit}.ti.on{background:var(--accent-soft)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:18px}
.sub{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.mem{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:8px}.mem.add{border-style:dashed;justify-content:space-between;color:var(--accent-ink);font-size:14px}
.wf{border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px;background:color-mix(in srgb,var(--t-fin) 5%,#fff)}
.lane{display:flex;align-items:center;gap:10px;margin-top:10px;position:relative}.lane i{width:14px;height:14px;border-radius:50%;border:2px solid var(--info);background:#fff;flex-shrink:0}.lane i.y{border-color:#ba8306}"""

pages = {
 "A-table-grouped": ("A · Grouped table", A, A_css, "<b>A · Table grouped by team</b> — smallest change: Team column + team headers; org chart coloured by team."),
 "B-team-board": ("B · Team board", B, B_css, "<b>B · Team board</b> — drag role cards between team cards; teams first, contacts second."),
 "C-chart-zones": ("C · Chart with team areas", C, C_css, "<b>C · Org chart with team areas</b> — reporting lines + coloured team areas; edit in the right panel."),
 "D-team-detail": ("D · Team detail", D, D_css, "<b>D · Team list + detail</b> — pick a team; see its roles and the workflow steps it owns."),
}
for f,(t,b,c,l) in pages.items():
    open(f"{f}.html","w").write(__import__("frame").page(t,b,l,c))
print("written", len(pages))
