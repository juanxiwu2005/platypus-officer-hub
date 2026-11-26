// Static review concepts for Cheers and team progress (2026-11-26).
// Opens the running demo (fictional seed club), injects one concept into the place it would live, and screenshots it.
// Usage: start `npx vite --port 5199`, then `node docs/prototypes/cheers-concepts/source/snap.cjs [shotIdPrefix]`.
// Nothing here is product code; all names and numbers are fictional.
const path = require("path")
const { chromium } = require(path.resolve(__dirname, "../../../../node_modules/playwright"))
const OUT = path.resolve(__dirname, "..")
const BASE = process.env.BASE || "http://localhost:5199/"

const CSS = `
.cx-panel{display:grid;gap:14px;padding:16px 16px 20px}
.cx-head{display:flex;align-items:center;gap:10px}
.cx-head b{font-size:var(--fs-lg)}
.cx-left{margin-left:auto;font-size:var(--fs-sm);color:var(--muted)}
.cx-label{font-size:var(--fs-sm);color:var(--muted);margin-bottom:6px;display:block}
.cx-seg{display:flex;gap:6px;flex-wrap:wrap}
.cx-seg .chip.on,.cx-on{border-color:var(--accent);background:var(--accent-soft);color:var(--accent-ink);font-weight:600}
.cx-text{border:1px solid var(--line);border-radius:var(--r-md);padding:10px 12px;min-height:64px;color:var(--muted);font-size:var(--fs-md);background:var(--surface)}
.cx-styles{display:flex;gap:8px}
.cx-sw{width:52px;height:36px;border-radius:var(--r-sm);border:2px solid transparent;display:grid;place-items:center;font-size:18px}
.cx-sw.on{border-color:var(--accent)}
.cx-t{background:var(--accent-soft)} .cx-s{background:var(--warn-soft)} .cx-g{background:var(--good-soft)}
.cx-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.cx-send{display:flex;align-items:center;justify-content:space-between;gap:10px}
.cx-check{display:inline-flex;gap:8px;align-items:center;font-size:var(--fs-md)}
.cx-check i{width:16px;height:16px;border:1.5px solid var(--line);border-radius:4px;display:inline-block}
.cx-check i.on{background:var(--accent);border-color:var(--accent)}
.cx-card{border-radius:var(--r-lg);padding:20px;display:grid;gap:8px;position:relative;overflow:hidden}
.cx-card .pts{font-family:var(--serif);font-size:34px;font-weight:700;color:var(--accent-ink);line-height:1}
.cx-card .to{font-family:var(--serif);font-size:var(--fs-xl);font-weight:700}
.cx-card .why{font-size:var(--fs-md)}
.cx-card .meta{font-size:var(--fs-sm);color:var(--muted)}
.cx-card .deco{position:absolute;right:16px;top:12px;font-size:40px;opacity:.9}
.cx-stepper{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:var(--r-pill);overflow:hidden}
.cx-stepper span{padding:4px 12px;font-weight:600}
.cx-stepper button{border:0;background:var(--surface-2);padding:4px 12px;font-size:16px;color:var(--ink)}
.cx-pop{position:absolute;z-index:50;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow);padding:12px;display:grid;gap:8px;width:300px}
.cx-pop .small{color:var(--muted)}
.cx-pop .btn{justify-content:space-between}
.cx-feed{display:grid;gap:0}
.cx-fi{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:start;padding:10px 0;border-bottom:1px solid var(--line)}
.cx-fi:last-child{border-bottom:0}
.cx-fi .w{font-size:var(--fs-md)}
.cx-fi .r{font-size:var(--fs-sm);color:var(--muted)}
.cx-fi .p{font-weight:700;color:var(--accent-ink);white-space:nowrap}
.cx-pair{display:inline-flex;align-items:center;gap:2px}
.cx-pair .avatar{box-shadow:0 0 0 2px var(--surface)}
.cx-pair{gap:3px}
.cx-nowrap{white-space:nowrap}
.cx-ell{max-width:96px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cx-tot{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.cx-tot span{font-size:var(--fs-sm);background:var(--surface-2);border-radius:var(--r-pill);padding:2px 10px}
.cx-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cx-mini{border-radius:var(--r-md);padding:12px;display:grid;gap:4px;font-size:var(--fs-sm)}
.cx-mini b{font-size:var(--fs-md)}
.cx-mini .p{font-weight:700;color:var(--accent-ink)}
.cx-strip{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.cx-strip p{margin:0}
.cx-sugg{display:grid;gap:0}
.cx-sugg>div{display:grid;grid-template-columns:auto auto 1fr auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)}
.cx-sugg>div:last-child{border-bottom:0}
.cx-bar{height:10px;border-radius:var(--r-pill);background:var(--surface-2);position:relative;overflow:hidden}
.cx-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:var(--r-pill)}
.cx-bar .c{background:var(--accent-soft);box-shadow:inset 0 0 0 1px var(--accent)}
.cx-bar .d{background:var(--accent)}
.cx-prog{display:grid;gap:6px;margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
.cx-prog .lbl{display:flex;justify-content:space-between;font-size:var(--fs-sm);color:var(--muted)}
.cx-prog .lbl b{color:var(--ink)}
.cx-phases{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
.cx-phases>div{display:grid;gap:4px;font-size:var(--fs-sm)}
.cx-phases b{font-size:var(--fs-sm)}
.cx-ringrow{display:flex;align-items:center;gap:16px;margin-top:14px;padding-top:12px;border-top:1px solid var(--line);flex-wrap:wrap}
.cx-legend{display:grid;gap:4px;font-size:var(--fs-sm)}
.cx-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.cx-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:999;background:var(--ink);color:var(--bg);border-radius:var(--r-lg);padding:12px 16px;display:flex;align-items:center;gap:14px;box-shadow:var(--shadow);font-size:var(--fs-md)}
.cx-toast .btn{background:var(--bg);color:var(--ink);border-color:var(--bg)}
.cx-banner{margin-top:14px;border-radius:var(--r-md);background:var(--good-soft);padding:12px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.cx-banner b{font-size:var(--fs-md)}
.cx-overlay{position:fixed;inset:0;z-index:998;background:rgba(15,19,18,.45);display:grid;place-items:center}
.cx-modal{width:420px;background:var(--surface);border-radius:var(--r-lg);padding:20px;display:grid;gap:14px;box-shadow:var(--shadow)}
.cx-inbox-card{display:block;border-radius:var(--r-md);background:var(--accent-soft);padding:10px 12px;margin:4px 0}
.cx-inbox-card b{color:var(--accent-ink)}
.cx-mail{position:fixed;right:24px;bottom:0;z-index:999;width:520px;background:var(--surface);border:1px solid var(--line);border-radius:12px 12px 0 0;box-shadow:var(--shadow);font-size:var(--fs-md)}
.cx-mail .t{background:var(--surface-2);padding:10px 14px;border-radius:12px 12px 0 0;font-weight:600;display:flex;justify-content:space-between}
.cx-mail .f{padding:8px 14px;border-bottom:1px solid var(--line);color:var(--muted)}
.cx-mail .f b{color:var(--ink);font-weight:500}
.cx-mail .bd{padding:14px;white-space:pre-line;line-height:1.6;min-height:150px}
.cx-mail .ft{padding:10px 14px}
.cx-star{color:var(--warn);font-size:var(--fs-sm);margin-left:6px}
`

const av = (n, sm = true) => `<span class="avatar ${sm ? "sm" : ""}">${n}</span>`

// ---------- shots ----------
const shots = [
  // P1 send sheet
  { id: "P1-A-form", route: "#/team", rail: true, run: async p => {
    await railBody(p, `<div class="cx-panel">
      <div class="cx-head">${av("JP", false)}<b>Cheer Jordan</b><span class="cx-left">150 left this week</span></div>
      <div><span class="cx-label">Points</span><div class="cx-seg"><button class="chip">10</button><button class="chip on">25</button><button class="chip">50</button><button class="chip">100</button></div></div>
      <div><span class="cx-label">Why</span><div class="cx-seg"><button class="chip on">Delivered on time</button><button class="chip">Clear details</button><button class="chip">Helped me out</button><button class="chip">Great teamwork</button></div></div>
      <div class="cx-text">Room booked two weeks early (optional)</div>
      <div><span class="cx-label">Card</span><div class="cx-styles"><span class="cx-sw cx-t on">🙌</span><span class="cx-sw cx-s">⭐</span><span class="cx-sw cx-g">🤝</span></div></div>
      <div class="cx-send"><span class="cx-check"><i></i>Also email</span><button class="btn btn-primary">Send cheer</button></div>
    </div>`) } },
  { id: "P1-B-card-first", route: "#/team", rail: true, run: async p => {
    await railBody(p, `<div class="cx-panel">
      <div class="cx-head"><b>Cheer Jordan</b><span class="cx-left">150 left this week</span></div>
      <div class="cx-card cx-s"><span class="deco">⭐</span><span class="pts">+25</span><span class="to">Thank you, Jordan!</span><span class="why">Room booked two weeks early. Networking Night is in great shape.</span><span class="meta">From Maya · Book Room &amp; Layout</span></div>
      <div class="cx-row"><span class="cx-styles"><span class="cx-sw cx-t">🙌</span><span class="cx-sw cx-s on">⭐</span><span class="cx-sw cx-g">🤝</span></span><span class="cx-left"><span class="cx-stepper"><button>−</button><span>25</span><button>+</button></span></span></div>
      <p class="small muted">Type on the card to change the message.</p>
      <div class="cx-send"><span class="cx-check"><i class="on"></i>Also email</span><button class="btn btn-primary">Send card</button></div>
    </div>`) } },
  { id: "P1-C-one-tap", route: "#/team", run: async p => {
    await p.evaluate(() => {
      const row = [...document.querySelectorAll('[data-testid="officers"] tr')].find(r => r.textContent.includes("Jordan"))
      const r = row.getBoundingClientRect(), pop = document.createElement("div")
      pop.className = "cx-pop"; pop.style.left = (r.left + 120) + "px"; pop.style.top = (r.bottom + window.scrollY + 4) + "px"
      pop.innerHTML = `<b>Cheer Jordan</b><span class="small">For: Book Room &amp; Layout (done Oct 28)</span>
        <button class="btn">🙌 Thanks <b>+10</b></button><button class="btn cx-on">⭐ Great work <b>+25</b></button><button class="btn">🚀 Above and beyond <b>+50</b></button>
        <span class="small">One tap sends it. <u>Write a note</u></span>`
      document.body.appendChild(pop)
      row.style.background = "var(--accent-soft)"
    }) } },

  // P2 entry points
  { id: "P2-A-buttons-in-rows", route: "#/team", run: async p => {
    await p.evaluate(() => {
      document.querySelectorAll('[data-testid="officers"] tr').forEach(tr => { const td = document.createElement("td"); td.innerHTML = '<button class="btn small cx-nowrap">🙌 Cheer</button>'; tr.appendChild(td) })
      document.querySelectorAll('[data-testid="officers"] td:nth-child(2)').forEach(td => td.style.display = "none")
    }) } },
  { id: "P2-B-after-done", route: "#/tasks?node=t-minutes", details: true, run: async p => {
    await p.evaluate(() => {
      const sub = document.querySelector('.rail [data-testid="task-submission"]') || document.querySelector('.rail .task-submission')
      const box = document.createElement("div")
      box.className = "cx-banner"; box.style.marginTop = "0"; box.style.marginBottom = "14px"
      box.innerHTML = '<span style="font-size:22px">🙌</span><div style="flex:1;min-width:0"><b>Priya finished this.</b><div class="small muted">Say thanks? It takes one tap.</div></div><button class="btn btn-primary small">+25 Thanks</button>'
      sub.parentNode.insertBefore(box, sub)
    }) } },
  { id: "P2-C-topbar-button", route: "#/events", run: async p => {
    await p.evaluate(() => {
      const bell = document.querySelector('[data-testid="bell"]').closest(".menu-wrap")
      const wrap = document.createElement("div"); wrap.style.position = "relative"
      wrap.innerHTML = '<button class="btn" style="border-color:var(--accent);color:var(--accent-ink)">🙌 Cheer</button>'
      bell.parentNode.insertBefore(wrap, bell)
      const r = wrap.getBoundingClientRect(), pop = document.createElement("div")
      pop.className = "cx-pop"; pop.style.left = (r.right - 300) + "px"; pop.style.top = (r.bottom + 8) + "px"; pop.style.position = "fixed"
      pop.innerHTML = `<b>Who do you want to cheer?</b><div class="cx-text" style="min-height:0">Type a name…</div>
        <span class="small">Worked with you this week</span>
        <button class="btn"><span class="who"><span class="avatar sm">JP</span>Jordan · Book Room &amp; Layout</span></button>
        <button class="btn"><span class="who"><span class="avatar sm">MC</span>Maya · Quote gather</span></button>
        <button class="btn"><span class="who"><span class="avatar sm">SO</span>Sam · Marketing needs</span></button>`
      document.body.appendChild(pop)
    }) } },

  // P3 receiving
  { id: "P3-A-bell-card", route: "#/", viewAs: "Jordan", run: async p => {
    await p.getByTestId("bell").click(); await p.waitForTimeout(300)
    await p.evaluate(() => {
      let list = document.querySelector(".inbox-list"); if (!list) { const box = document.querySelector(".inbox"); box.querySelectorAll("p").forEach(x => x.remove()); list = document.createElement("ul"); list.className = "inbox-list"; box.appendChild(list) } const li = document.createElement("li")
      li.innerHTML = '<span class="cx-inbox-card"><b>+25 from Maya</b> ⭐<br>Delivered on time · “Room booked two weeks early.”<br><span class="small muted">Book Room &amp; Layout · Networking Night</span></span>'
      list.prepend(li)
      const n = document.querySelector('.inbox header .small'); if (n) n.textContent = "1 new cheer"
    }) } },
  { id: "P3-B-modal-card", route: "#/", viewAs: "Jordan", run: async p => {
    await p.evaluate(() => {
      const o = document.createElement("div"); o.className = "cx-overlay"
      o.innerHTML = `<div class="cx-modal"><div class="cx-card cx-s"><span class="deco">⭐</span><span class="pts">+25</span><span class="to">Thank you, Jordan!</span><span class="why">Room booked two weeks early. Networking Night is in great shape.</span><span class="meta">From Maya Chen · Book Room &amp; Layout · Oct 31</span></div>
        <div class="cx-row"><span class="small muted">You have 120 points this term.</span><span class="cx-left"><button class="btn btn-primary">Close</button></span></div></div>`
      document.body.appendChild(o)
    }) } },
  { id: "P3-C-home-card", route: "#/", viewAs: "Jordan", run: async p => {
    await p.evaluate(() => {
      const target = document.querySelector('[data-testid="your-reminders"]') || document.querySelector("main .card")
      const s = document.createElement("section"); s.className = "card"; s.style.marginBottom = "16px"
      s.innerHTML = `<header><h2>Cheers for you</h2><span class="small muted">120 points this term</span></header>
        <div class="cx-feed">
          <div class="cx-fi"><span class="avatar sm">MC</span><div><div class="w"><b>Maya</b> · Delivered on time</div><div class="r">“Room booked two weeks early.” · Book Room &amp; Layout</div></div><span class="p">+25</span></div>
          <div class="cx-fi"><span class="avatar sm">AR</span><div><div class="w"><b>Alex</b> · Great teamwork</div><div class="r">“Thanks for covering the partner meeting.” · Partner meeting</div></div><span class="p">+50</span></div>
          <div class="cx-fi"><span class="avatar sm">SO</span><div><div class="w"><b>Sam</b> · Helped me out</div><div class="r">“The venue photos made the flyer easy.”</div></div><span class="p">+10</span></div>
        </div>`
      target.parentNode.insertBefore(s, target)
    }) } },

  // P4 Team cheers card
  { id: "P4-A-feed", route: "#/team", run: async p => { await teamCard(p, `<header><h2>Cheers</h2><span class="small muted">This term · 640 points shared</span></header>
      <div class="cx-feed">
        ${[["MC","JP","Maya → Jordan","Delivered on time","“Room booked two weeks early.”",25,"Today"],["AR","MC","Alex → Maya","Clear details","“The quote and flyer were attached.”",50,"Oct 29"],["JP","SO","Jordan → Sam","Helped me out","“Venue photos for the flyer.”",10,"Oct 28"],["AR","PN","Alex → Priya","Clear details","“Minutes posted the same day.”",25,"Oct 27"]].map(([a,b,w,t,r,pt,d]) => `<div class="cx-fi"><span class="cx-pair">${av(a)}${av(b)}</span><div><div class="w"><b>${w}</b> · ${t}</div><div class="r">${r} · ${d}</div></div><span class="p">+${pt}</span></div>`).join("")}
      </div>
      <div class="cx-tot"><span>Jordan 120</span><span>Maya 110</span><span>Priya 85</span><span>Sam 60</span><span>Alex 40</span></div>`) } },
  { id: "P4-B-people-table", route: "#/team", run: async p => { await teamCard(p, `<header><h2>Cheers</h2><span class="small muted">This term</span></header>
      <table class="tbl"><thead><tr><th>Officer</th><th>Received</th><th>Latest</th><th></th></tr></thead><tbody>
      ${[["AR","Alex",40,180,"Thanks for the agenda"],["JP","Jordan",120,60,"Room booked early"],["MC","Maya",110,75,"Quote attached"],["PN","Priya",85,40,"Minutes same day"],["SO","Sam",60,30,"Venue photos"]].map(([i,n,r,g,l]) => `<tr><td><span class="who">${av(i)}${n}</span></td><td><b>${r}</b></td><td class="small muted"><div class="cx-ell">“${l}”</div></td><td><button class="btn small">Cheer</button></td></tr>`).join("")}
      </tbody></table>`) } },
  { id: "P4-C-card-wall", route: "#/team", run: async p => { await teamCard(p, `<header><h2>Cheers</h2><span class="small muted">This term · 640 points shared</span></header>
      <div class="cx-grid">
        <div class="cx-mini cx-s"><span>⭐ <span class="p">+25</span></span><b>Jordan</b><span>“Room booked two weeks early.”</span><span class="muted">from Maya · today</span></div>
        <div class="cx-mini cx-t"><span>🙌 <span class="p">+50</span></span><b>Maya</b><span>“The quote and flyer were attached.”</span><span class="muted">from Alex · Oct 29</span></div>
        <div class="cx-mini cx-g"><span>🤝 <span class="p">+10</span></span><b>Sam</b><span>“Venue photos for the flyer.”</span><span class="muted">from Jordan · Oct 28</span></div>
        <div class="cx-mini cx-t"><span>🙌 <span class="p">+25</span></span><b>Priya</b><span>“Minutes posted the same day.”</span><span class="muted">from Alex · Oct 27</span></div>
      </div>`) } },

  // P5 president weekly thanks
  { id: "P5-A-one-line", route: "#/", run: async p => {
    await p.evaluate(() => {
      const top = document.querySelector('[data-testid="rq-summary"]'); const s = document.createElement("section"); s.className = "card"; s.style.marginBottom = "16px"
      s.innerHTML = '<div class="cx-strip"><span style="font-size:20px">🙌</span><p><b>Cheers this week:</b> 6 sent. Maya and Jordan delivered on time with details.</p><span class="cx-left"><button class="btn small">Thank them</button></span></div>'
      top.parentNode.insertBefore(s, top)
    }) } },
  { id: "P5-B-suggest-card", route: "#/", run: async p => {
    await p.evaluate(() => {
      const top = document.querySelector('[data-testid="rq-summary"]'); const s = document.createElement("section"); s.className = "card"; s.style.marginBottom = "16px"
      s.innerHTML = `<header><h2>Thank the team</h2><span class="small muted">Delivered on time with details this week</span></header>
        <div class="cx-sugg">
          <div><span class="cx-check"><i class="on"></i></span><span class="avatar sm">MC</span><span>Maya · <span class="muted">Quote gather, Budget</span></span><b>+25</b></div>
          <div><span class="cx-check"><i class="on"></i></span><span class="avatar sm">JP</span><span>Jordan · <span class="muted">Event Registry, Book room</span></span><b>+25</b></div>
          <div><span class="cx-check"><i class="on"></i></span><span class="avatar sm">PN</span><span>Priya · <span class="muted">Meeting minutes</span></span><b>+25</b></div>
        </div>
        <div class="cx-send" style="margin-top:10px"><span class="small muted">425 of 500 left after sending</span><button class="btn btn-primary">Send 3 cheers</button></div>`
      top.parentNode.insertBefore(s, top)
    }) } },
  { id: "P5-C-in-ask", route: "#/", run: async p => {
    await p.evaluate(() => {
      const w = document.querySelector('[data-testid="ask-welcome"]')
      w.innerHTML = `<p class="ask-hello">Hi Alex. It's a new week.</p>
        <div class="cx-banner" style="display:grid;gap:8px;margin:0"><b>3 people delivered on time with details</b><span class="small">Maya (2 steps), Jordan (2 steps), Priya (1 step)</span><div class="cx-row"><button class="btn btn-primary small">Cheer all 3 · +25 each</button><button class="btn small">Choose</button></div></div>
        <div class="chips"><button class="chip">Who needs a nudge?</button><button class="chip">What are my top 5 tasks?</button></div>`
    }) } },

  // P6 email draft
  { id: "P6-A-short-email", route: "#/team", run: async p => { await mail(p, "Maya sent you 25 points", `Hi Jordan,

You received 25 points from Maya because: Room booked two weeks early.

See your cheers in Platypus:
platypus.app/team`) } },
  { id: "P6-B-context-email", route: "#/team", run: async p => { await mail(p, "⭐ 25 points from Maya: Book Room & Layout", `Hi Jordan,

Maya sent you 25 points.

“Room booked two weeks early.”

Task: Book Room & Layout · Networking Night (Mar 25)
Your total this term: 120 points

Open Platypus: platypus.app/team`) } },

  // P7 event progress
  { id: "P7-A-thin-bar", route: "#/events", run: async p => { await eventHead(p, `<div class="cx-prog"><div class="lbl"><span><b>Team progress</b> · claimed 31/38</span><span><b>Delivered 9/38</b></span></div><div class="cx-bar"><i class="c" style="width:82%"></i><i class="d" style="width:24%"></i></div></div>`) } },
  { id: "P7-B-by-phase", route: "#/events", run: async p => { await eventHead(p, `<div class="cx-phases">
      ${[["Plan","6/6",100,100],["Prepare","3/20",90,15],["Event day","0/6",60,0],["Close","0/6",40,0]].map(([n,f,c,d]) => `<div><span><b>${n}</b> · ${f}</span><div class="cx-bar"><i class="c" style="width:${c}%"></i><i class="d" style="width:${d}%"></i></div></div>`).join("")}
    </div>`) } },
  { id: "P7-C-ring", route: "#/events", run: async p => { await eventHead(p, `<div class="cx-ringrow">
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--surface-2)" stroke-width="8"/><circle cx="32" cy="32" r="26" fill="none" stroke="var(--accent-soft)" stroke-width="8" stroke-dasharray="134 163.4" transform="rotate(-90 32 32)"/><circle cx="32" cy="32" r="26" fill="none" stroke="var(--accent)" stroke-width="8" stroke-dasharray="39 163.4" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle" font-size="15" font-weight="700" fill="var(--ink)">24%</text></svg>
      <div class="cx-legend"><span><i style="background:var(--accent)"></i><b>9</b> delivered</span><span><i style="background:var(--accent-soft);box-shadow:inset 0 0 0 1px var(--accent)"></i><b>22</b> claimed, in progress</span><span><i style="background:var(--surface-2)"></i><b>7</b> not claimed</span></div>
      <span class="cx-left"><span class="chip" style="cursor:default">2 done without details</span></span>
    </div>`) } },

  // P8 milestone celebration
  { id: "P8-A-toast", route: "#/events", run: async p => {
    await eventHead(p, `<div class="cx-prog"><div class="lbl"><span><b>Team progress</b> · claimed 38/38</span><span><b>Delivered 9/38</b></span></div><div class="cx-bar"><i class="c" style="width:100%"></i><i class="d" style="width:24%"></i></div></div>`)
    await p.evaluate(() => { const t = document.createElement("div"); t.className = "cx-toast"; t.innerHTML = '🎉 Every step of Networking Night is claimed. Nice work, team. <button class="btn small">Cheer the team</button>'; document.body.appendChild(t) }) } },
  { id: "P8-B-banner", route: "#/events", run: async p => { await eventHead(p, `<div class="cx-banner"><span style="font-size:22px">🎉</span><div style="flex:1;min-width:0"><b>Halfway delivered: 19 of 38 steps</b><div class="small muted">Jordan, Maya, Sam, Priya and Alex got it here.</div></div><span class="cx-pair">${av("JP")}${av("MC")}${av("SO")}${av("PN")}${av("AR")}</span><button class="btn btn-primary small">Cheer the team</button></div>`) } },
  { id: "P8-C-bell-notice", route: "#/events", run: async p => {
    await p.getByTestId("bell").click(); await p.waitForTimeout(300)
    await p.evaluate(() => {
      let list = document.querySelector(".inbox-list"); if (!list) { const box = document.querySelector(".inbox"); box.querySelectorAll("p").forEach(x => x.remove()); list = document.createElement("ul"); list.className = "inbox-list"; box.appendChild(list) } const li = document.createElement("li")
      li.innerHTML = '<span class="cx-inbox-card" style="background:var(--good-soft)">🎉 <b>Founder Dinner: every step delivered.</b><br>24 of 24 done with details. Thanks, team.<br><span class="small muted">You did 6 of them.</span></span>'
      list.prepend(li)
    }) } },

  // P9 clean delivery record
  { id: "P9-A-team-line", route: "#/team", run: async p => { await teamCard(p, `<header><h2>Cheers</h2><span class="small muted">This term · 640 points shared</span></header>
      <div class="cx-banner" style="margin:0 0 10px"><span style="font-size:20px">★★</span><div><b>2 clean events this term</b><div class="small muted">Founder Dinner and Spring Speaker Night: every step on time, with details.</div></div></div>
      <div class="cx-feed">
        <div class="cx-fi"><span class="cx-pair">${av("MC")}${av("JP")}</span><div><div class="w"><b>Maya → Jordan</b> · Delivered on time</div><div class="r">“Room booked two weeks early.” · Today</div></div><span class="p">+25</span></div>
        <div class="cx-fi"><span class="cx-pair">${av("AR")}${av("MC")}</span><div><div class="w"><b>Alex → Maya</b> · Clear details</div><div class="r">“The quote and flyer were attached.” · Oct 29</div></div><span class="p">+50</span></div>
      </div>`) } },
  { id: "P9-B-event-stars", route: "#/events", run: async p => {
    await p.evaluate(() => {
      const nav = document.querySelectorAll(".event-nav button")
      nav.forEach(b => { if (/Founder Dinner|Spring Speaker/.test(b.textContent)) b.insertAdjacentHTML("beforeend", '<span class="cx-star" title="Clean delivery">★</span>') })
      const n = document.querySelector(".event-nav"); n.insertAdjacentHTML("beforeend", '<p class="small muted" style="padding:10px 8px 0;margin:0">★ = every step on time, with details</p>')
    }) } },
]

// ---------- helpers ----------
async function railBody(p, html) {
  await p.evaluate(() => { const a = document.querySelector('[data-testid="tab-ask"]'), d = document.querySelector('[data-testid="tab-details"]'); const ca = a.className, ad = a.getAttribute("aria-selected"); a.className = d.className; d.className = ca; a.setAttribute("aria-selected", d.getAttribute("aria-selected") || "false"); d.setAttribute("aria-selected", ad || "true"); d.disabled = false; a.setAttribute("aria-selected", "false"); d.setAttribute("aria-selected", "true") })
  await p.evaluate(h => { document.querySelector("aside.rail .rail-body").innerHTML = h }, html)
}
async function teamCard(p, html) {
  await p.evaluate(h => { const c = document.querySelector("#cb-h").closest("section.card"); c.innerHTML = h }, html)
}
async function eventHead(p, html) {
  await p.evaluate(h => { document.querySelector("section.event-head").insertAdjacentHTML("beforeend", h) }, html)
}
async function mail(p, subject, body) {
  await p.evaluate(([s, b]) => {
    const m = document.createElement("div"); m.className = "cx-mail"
    m.innerHTML = `<div class="t"><span>New message (email draft)</span><span>— ✕</span></div><div class="f">To <b>Jordan Patel</b></div><div class="f">Subject <b>${s}</b></div><div class="bd"></div><div class="ft"><button class="btn btn-primary">Send</button></div>`
    m.querySelector(".bd").textContent = b
    document.body.appendChild(m)
  }, [subject, body])
}

;(async () => {
  const filter = process.argv[2]
  const b = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium" })
  for (const s of shots.filter(s => !filter || s.id.startsWith(filter))) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: Number(process.env.DPR || 2) })
    await p.goto(BASE + s.route); await p.waitForTimeout(1300)
    if (s.viewAs) {
      const value = await p.evaluate(n => [...document.querySelectorAll('[data-testid="view-as"] option')].find(o => o.textContent.includes(n))?.value, s.viewAs)
      await p.getByTestId("view-as").selectOption(value); await p.waitForTimeout(600)
    }
    if (s.details) { await p.getByTestId("tab-details").click(); await p.waitForTimeout(600) }
    await p.addStyleTag({ content: CSS })
    await s.run(p); await p.waitForTimeout(300)
    await p.screenshot({ path: path.join(OUT, s.id + ".png") })
    console.log("saved", s.id)
    await p.close()
  }
  await b.close()
})()
