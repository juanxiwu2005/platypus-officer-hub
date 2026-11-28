// Final review images for phase R1 (Cheers), from Juanxi's choices on 2026-11-26 (docs/feedback-fix/CHEERS_TEAM_PROGRESS_PLAN.md).
// Opens the running demo (fictional seed club), injects each screen where it will live, and screenshots desktop, mobile and dark.
// Usage: start `npx vite --port 5199`, then `node docs/prototypes/cheers-r1-final/source/snap.cjs [shotIdPrefix]`.
// Nothing here is product code; all names, numbers and notes are fictional.
const path = require("path")
const { chromium } = require(path.resolve(__dirname, "../../../../node_modules/playwright"))
const OUT = path.resolve(__dirname, "..")
const BASE = process.env.BASE || "http://localhost:5199/"
const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }
const MOBILE = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }

const CSS = `
.cx-panel{display:grid;gap:14px;padding:16px 16px 20px}
.cx-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.cx-head b{font-size:var(--fs-lg)}
.cx-left{margin-left:auto;font-size:var(--fs-sm);color:var(--muted)}
.cx-label{font-size:var(--fs-sm);color:var(--muted);margin-bottom:6px;display:block}
.cx-label em{font-style:normal;color:var(--late);font-weight:600}
.cx-seg{display:flex;gap:6px;flex-wrap:wrap}
.cx-seg .chip.on,.cx-on{border-color:var(--accent);background:var(--accent-soft);color:var(--accent-ink);font-weight:600}
.cx-field{border:1px solid var(--line);border-radius:var(--r-md);padding:8px 12px;background:var(--surface);display:flex;align-items:center;gap:8px;font-size:var(--fs-md)}
.cx-field .muted{color:var(--muted)}
.cx-field .caret{margin-left:auto;color:var(--muted)}
.cx-text{border:1px solid var(--line);border-radius:var(--r-md);padding:10px 12px;min-height:86px;font-size:var(--fs-md);background:var(--surface);line-height:1.5}
.cx-text.empty{color:var(--muted)}
.cx-text.focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.cx-count{display:flex;justify-content:space-between;font-size:var(--fs-xs);color:var(--muted);margin-top:4px}
.cx-styles{display:flex;gap:8px}
.cx-sw{width:52px;height:36px;border-radius:var(--r-sm);border:2px solid transparent;display:grid;place-items:center;font-size:18px}
.cx-sw.on{border-color:var(--accent)}
.cx-t{background:var(--accent-soft)} .cx-s{background:var(--warn-soft)} .cx-g{background:var(--good-soft)}
.cx-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.cx-send{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.cx-check{display:inline-flex;gap:8px;align-items:center;font-size:var(--fs-md)}
.cx-check i{width:16px;height:16px;border:1.5px solid var(--line);border-radius:4px;display:inline-block}
.cx-check i.on{background:var(--accent);border-color:var(--accent)}
.btn[disabled],.cx-dis{opacity:.45;cursor:not-allowed}
.cx-hint{font-size:var(--fs-sm);color:var(--muted)}
.cx-recips{display:flex;gap:6px;flex-wrap:wrap}
.cx-recips span{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:var(--r-pill);padding:2px 10px 2px 3px;font-size:var(--fs-sm);background:var(--surface)}
.cx-mine{display:grid;gap:14px}
.cx-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cx-stat{background:var(--surface-2);border-radius:var(--r-md);padding:10px 12px;display:grid;gap:2px}
.cx-stat b{font-family:var(--serif);font-size:var(--fs-2xl);line-height:1.1;color:var(--accent-ink)}
.cx-stat span{font-size:var(--fs-sm);color:var(--muted)}
.cx-meter{height:6px;border-radius:var(--r-pill);background:var(--line);overflow:hidden;margin-top:4px}
.cx-meter i{display:block;height:100%;background:var(--accent);border-radius:var(--r-pill)}
.cx-feed{display:grid;gap:0}
.cx-fi{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:start;padding:9px 0;border-bottom:1px solid var(--line)}
.cx-fi:last-child{border-bottom:0}
.cx-fi .w{font-size:var(--fs-md)}
.cx-fi .r{font-size:var(--fs-sm);color:var(--muted)}
.cx-fi .p{font-weight:700;white-space:nowrap}
.cx-fi .p.in{color:var(--accent-ink)} .cx-fi .p.out{color:var(--muted)}
.cx-dir{font-size:var(--fs-xs);font-weight:700;letter-spacing:.04em;text-transform:uppercase;border-radius:var(--r-sm);padding:1px 6px;margin-right:6px}
.cx-dir.in{background:var(--accent-soft);color:var(--accent-ink)} .cx-dir.out{background:var(--surface-2);color:var(--muted)}
.cx-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.cx-overlay{position:fixed;inset:0;z-index:998;background:rgba(15,19,18,.5);display:grid;place-items:center;padding:16px}
.cx-modal{width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto;background:var(--surface);border-radius:var(--r-lg);padding:20px;display:grid;gap:14px;box-shadow:var(--shadow)}
.cx-modal.narrow{width:min(420px,100%)}
.cx-mh{display:flex;align-items:center;gap:10px}
.cx-mh h2{font-size:var(--fs-xl);margin:0}
.cx-x{margin-left:auto;border:0;background:transparent;font-size:20px;color:var(--muted)}
.cx-group{font-size:var(--fs-xs);font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-top:6px}
.cx-card{border-radius:var(--r-lg);padding:20px;display:grid;gap:8px;position:relative;overflow:hidden}
.cx-card .pts{font-family:var(--serif);font-size:34px;font-weight:700;color:var(--accent-ink);line-height:1}
.cx-card .to{font-family:var(--serif);font-size:var(--fs-xl);font-weight:700}
.cx-card .why{font-size:var(--fs-md);line-height:1.55}
.cx-card .meta{font-size:var(--fs-sm);color:var(--muted)}
.cx-card .deco{position:absolute;right:16px;top:12px;font-size:40px}
.cx-banner{border-radius:var(--r-md);background:var(--good-soft);padding:12px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.cx-banner b{font-size:var(--fs-md)}
.cx-strip{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.cx-strip p{margin:0}
.cx-mail{position:fixed;right:24px;bottom:0;z-index:999;width:540px;background:var(--surface);border:1px solid var(--line);border-radius:12px 12px 0 0;box-shadow:var(--shadow);font-size:var(--fs-md)}
.cx-mail .t{background:var(--surface-2);padding:10px 14px;border-radius:12px 12px 0 0;font-weight:600;display:flex;justify-content:space-between}
.cx-mail .f{padding:8px 14px;border-bottom:1px solid var(--line);color:var(--muted)}
.cx-mail .f b{color:var(--ink);font-weight:500}
.cx-mail .bd{padding:14px;white-space:pre-line;line-height:1.65;min-height:170px}
.cx-mail .bd a{color:var(--accent-ink)}
.cx-mail .ft{padding:10px 14px}
.cx-pager{display:flex;align-items:center;gap:10px}
.cx-d{white-space:nowrap}
`

const av = (n, sm = true) => `<span class="avatar ${sm ? "sm" : ""}">${n}</span>`
const MINE = `<header><h2>Your cheers</h2><span class="small muted">Only you see this</span></header>
  <div class="cx-mine">
    <div class="cx-stats">
      <div class="cx-stat"><b>110</b><span>points received this term</span></div>
      <div class="cx-stat"><b>175<span style="font-size:var(--fs-md);color:var(--muted);font-family:var(--sans)"> / 200</span></b><span>left to give this week</span><div class="cx-meter"><i style="width:87.5%"></i></div></div>
    </div>
    <div class="cx-feed">
      <div class="cx-fi">${av("JP")}<div><div class="w"><span class="cx-dir out">Sent</span>To <b>Jordan</b></div><div class="r">“Room booked two weeks early, so the caterer could confirm.” · <span class="cx-d">Today</span></div></div><span class="p out">−25</span></div>
      <div class="cx-fi">${av("AR")}<div><div class="w"><span class="cx-dir in">Received</span>From <b>Alex</b></div><div class="r">“The quote and flyer were attached, so I approved it in one go.” · <span class="cx-d">Oct 29</span></div></div><span class="p in">+50</span></div>
      <div class="cx-fi">${av("PN")}<div><div class="w"><span class="cx-dir in">Received</span>From <b>Priya</b></div><div class="r">“You explained the budget lines at the meeting.” · <span class="cx-d">Oct 27</span></div></div><span class="p in">+25</span></div>
    </div>
    <div class="cx-actions"><button class="btn small">View history</button><button class="btn btn-primary small">🙌 Give points</button></div>
  </div>`

const form = (state) => `<div class="cx-panel">
  <div class="cx-head"><b>Give points</b><span class="cx-left">${state.left || 175} left this week</span></div>
  <div><span class="cx-label">To</span>${state.multi
    ? `<div class="cx-recips"><span>${av("MC")}Maya ✕</span><span>${av("JP")}Jordan ✕</span><span style="border-style:dashed;color:var(--muted)">+ Add</span></div>`
    : `<div class="cx-field">${state.to ? `${av("JP")}Jordan Patel` : `<span class="muted">Choose a teammate</span>`}<span class="caret">▾</span></div>`}</div>
  <div><span class="cx-label">For a task (optional)</span><div class="cx-field">${state.to ? "Book Room &amp; Layout · Networking Night" : `<span class="muted">No task</span>`}<span class="caret">▾</span></div></div>
  <div><span class="cx-label">Points${state.multi ? " each" : ""}</span><div class="cx-seg"><button class="chip">10</button><button class="chip on">25</button><button class="chip">50</button><button class="chip">100</button></div></div>
  <div><span class="cx-label">Why they did well <em>Required</em></span>
    <div class="cx-seg" style="margin-bottom:8px"><button class="chip">Delivered on time</button><button class="chip">Clear details</button><button class="chip">Helped me out</button><button class="chip">Great teamwork</button></div>
    <div class="cx-text ${state.note ? "focus" : "empty"}">${state.note || "What did they do, and how did it help? Others won’t see this, only them."}</div>
    <div class="cx-count"><span>${state.note ? "" : "At least 10 characters."}</span><span>${state.note ? state.note.length : 0} / 280</span></div></div>
  <div><span class="cx-label">Card</span><div class="cx-styles"><span class="cx-sw cx-t">🙌</span><span class="cx-sw cx-s on">⭐</span><span class="cx-sw cx-g">🤝</span></div></div>
  <div class="cx-send"><span class="cx-check"><i class="${state.email ? "on" : ""}"></i>Also email</span><button class="btn btn-primary" ${state.note ? "" : "disabled"}>${state.multi ? "Send 2 cheers" : "Send"}</button></div>
</div>`

const NOTE = "Room booked two weeks early, so the caterer could confirm."
const history = `<div class="cx-overlay"><div class="cx-modal">
  <div class="cx-mh"><h2>Cheers history</h2><button class="cx-x" aria-label="Close">✕</button></div>
  <div class="cx-stats"><div class="cx-stat"><b>110</b><span>received this term</span></div><div class="cx-stat"><b>75</b><span>given this term</span></div></div>
  <div class="cx-seg"><button class="chip on">All</button><button class="chip">Received</button><button class="chip">Sent</button></div>
  <div class="cx-group">This week</div>
  <div class="cx-feed">
    <div class="cx-fi">${av("JP")}<div><div class="w"><span class="cx-dir out">Sent</span>To <b>Jordan</b> · Book Room &amp; Layout</div><div class="r">“${NOTE}” · <span class="cx-d">Sat Oct 31</span></div></div><span class="p out">−25</span></div>
    <div class="cx-fi">${av("AR")}<div><div class="w"><span class="cx-dir in">Received</span>From <b>Alex</b> · Quote gather</div><div class="r">“The quote and flyer were attached, so I approved it in one go.” · <span class="cx-d">Thu Oct 29</span></div></div><span class="p in">+50</span></div>
  </div>
  <div class="cx-group">Last week</div>
  <div class="cx-feed">
    <div class="cx-fi">${av("PN")}<div><div class="w"><span class="cx-dir in">Received</span>From <b>Priya</b></div><div class="r">“You explained the budget lines at the meeting.” · <span class="cx-d">Tue Oct 27</span></div></div><span class="p in">+25</span></div>
    <div class="cx-fi">${av("SO")}<div><div class="w"><span class="cx-dir out">Sent</span>To <b>Sam</b> · Marketing needs</div><div class="r">“The flyer draft was ready before I asked.” · <span class="cx-d">Mon Oct 26</span></div></div><span class="p out">−50</span></div>
    <div class="cx-fi">${av("JP")}<div><div class="w"><span class="cx-dir in">Received</span>From <b>Jordan</b> · Budget</div><div class="r">“Clear numbers, I could book the room right away.” · <span class="cx-d">Fri Oct 23</span></div></div><span class="p in">+35</span></div>
  </div>
  <p class="small muted" style="margin:0">Only you and the other person in each cheer can see it.</p>
</div></div>`

const received = (pager) => `<div class="cx-overlay"><div class="cx-modal narrow">
  <div class="cx-card cx-s"><span class="deco">⭐</span><span class="pts">+25</span><span class="to">Thank you, Jordan!</span><span class="why">“${NOTE}”</span><span class="meta">From Maya Chen · Book Room &amp; Layout · <span class="cx-d">Sat Oct 31</span></span></div>
  <div class="cx-row">${pager ? `<span class="small muted">1 of 2 new cheers</span>` : `<span class="small muted">You have 120 points this term.</span>`}<span class="cx-left">${pager ? `<button class="btn btn-primary">Next</button>` : `<button class="btn btn-primary">Close</button>`}</span></div>
</div></div>`

// ---------- shots ----------
const shots = [
  { id: "F1-team-card-desktop", dev: DESKTOP, route: "#/team", viewAs: "Maya", run: p => teamCard(p, MINE) },
  { id: "F1-team-card-dark", dev: { ...DESKTOP, colorScheme: "dark" }, route: "#/team", viewAs: "Maya", run: p => teamCard(p, MINE) },
  { id: "F1-team-card-mobile", dev: MOBILE, route: "#/team", viewAs: "Maya", run: async p => { await teamCard(p, MINE); await p.evaluate(() => (() => { const el = document.querySelector("#cx-mine"); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 76) })()) } },
  { id: "F2-give-empty-desktop", dev: DESKTOP, route: "#/team", viewAs: "Maya", run: async p => { await teamCard(p, MINE); await railBody(p, form({})) } },
  { id: "F2-give-filled-desktop", dev: DESKTOP, route: "#/team", viewAs: "Maya", run: async p => { await teamCard(p, MINE); await railBody(p, form({ to: true, note: NOTE, email: true })) } },
  { id: "F2-give-filled-mobile", dev: MOBILE, route: "#/team", viewAs: "Maya", run: async p => { await openMobileRail(p); await railBody(p, form({ to: true, note: NOTE, email: true })) } },
  { id: "F3-history-desktop", dev: DESKTOP, route: "#/team", viewAs: "Maya", run: async p => { await teamCard(p, MINE); await overlay(p, history) } },
  { id: "F3-history-mobile", dev: MOBILE, route: "#/team", viewAs: "Maya", run: async p => { await teamCard(p, MINE); await overlay(p, history) } },
  { id: "F4-task-prompt-desktop", dev: DESKTOP, route: "#/tasks?node=t-minutes", details: true, run: p => p.evaluate(() => {
      const sub = document.querySelector('.rail [data-testid="task-submission"]') || document.querySelector(".rail .task-submission")
      const box = document.createElement("div"); box.className = "cx-banner"; box.style.marginBottom = "14px"
      box.innerHTML = '<span style="font-size:22px">🙌</span><div style="flex:1;min-width:0"><b>Priya finished this.</b><div class="small muted">Say thanks? You write one line about why.</div></div><button class="btn btn-primary small">Give points</button>'
      sub.parentNode.insertBefore(box, sub)
    }) },
  { id: "F5-received-desktop", dev: DESKTOP, route: "#/", viewAs: "Jordan", run: p => overlay(p, received(false)) },
  { id: "F5-received-two-mobile", dev: MOBILE, route: "#/", viewAs: "Jordan", run: p => overlay(p, received(true)) },
  { id: "F5-received-dark", dev: { ...DESKTOP, colorScheme: "dark" }, route: "#/", viewAs: "Jordan", run: p => overlay(p, received(false)) },
  { id: "F6-email-draft", dev: DESKTOP, route: "#/team", viewAs: "Maya", run: async p => { await teamCard(p, MINE); await mail(p, "⭐ Maya sent you 25 points", `Hi Jordan,

Maya sent you 25 points for Book Room & Layout (Networking Night).

Why: “${NOTE}”

See your card:
https://deploy-preview-20--platypus-officer-hub.netlify.app/#/?cheer=ch-12`) } },
  { id: "F7-weekly-strip", dev: DESKTOP, route: "#/", run: async p => {
      await p.evaluate(() => {
        const top = document.querySelector('[data-testid="rq-summary"]'); const s = document.createElement("section"); s.className = "card"; s.style.marginBottom = "16px"
        s.innerHTML = '<div class="cx-strip"><span style="font-size:20px">🙌</span><p><b>This week:</b> Maya and Jordan delivered on time with details.</p><span style="margin-left:auto"><button class="btn small">Thank them</button></span></div>'
        top.parentNode.insertBefore(s, top)
      })
      await railBody(p, form({ multi: true, left: 500, note: "Two steps each, on time and with every file attached. Thank you both.", email: false }))
    } },
]

// ---------- helpers ----------
async function selectTab(p) {
  await p.evaluate(() => { const a = document.querySelector('[data-testid="tab-ask"]'), d = document.querySelector('[data-testid="tab-details"]'); if (!a || !d) return; d.disabled = false; a.setAttribute("aria-selected", "false"); d.setAttribute("aria-selected", "true") })
}
async function railBody(p, html) { await selectTab(p); await p.evaluate(h => { document.querySelector("aside.rail .rail-body").innerHTML = h }, html) }
async function teamCard(p, html) { await p.evaluate(h => { const c = document.querySelector("#cb-h")?.closest("section.card") ?? document.querySelector("#cx-mine"); c.id = "cx-mine"; c.innerHTML = h }, html) }
async function overlay(p, html) { await p.evaluate(h => document.body.insertAdjacentHTML("beforeend", h), html) }
async function openMobileRail(p) {
  const fab = p.locator(".ask-fab"); if (await fab.count()) { await fab.first().click(); await p.waitForTimeout(500) }
}
async function mail(p, subject, body) {
  await p.evaluate(([s, b]) => {
    const m = document.createElement("div"); m.className = "cx-mail"
    m.innerHTML = `<div class="t"><span>New message (email draft)</span><span>— ✕</span></div><div class="f">To <b>Jordan Patel</b></div><div class="f">Subject <b>${s}</b></div><div class="bd"></div><div class="ft"><button class="btn btn-primary">Send</button></div>`
    const lines = b.split("\n"), bd = m.querySelector(".bd")
    lines.forEach((line, i) => { if (line.startsWith("https://")) { const a = document.createElement("a"); a.href = "#"; a.textContent = line; bd.appendChild(a) } else bd.appendChild(document.createTextNode(line)); if (i < lines.length - 1) bd.appendChild(document.createTextNode("\n")) })
    document.body.appendChild(m)
  }, [subject, body])
}

;(async () => {
  const filter = process.argv[2]
  const b = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium" })
  for (const s of shots.filter(s => !filter || s.id.startsWith(filter))) {
    const ctx = await b.newContext({ ...s.dev, deviceScaleFactor: Number(process.env.DPR || s.dev.deviceScaleFactor) })
    const p = await ctx.newPage()
    await p.goto(BASE + s.route); await p.waitForTimeout(1300)
    if (s.viewAs) {
      const value = await p.evaluate(n => [...document.querySelectorAll('[data-testid="view-as"] option')].find(o => o.textContent.includes(n))?.value, s.viewAs)
      const more = p.getByTestId("more-toggle"); if (await more.isVisible().catch(() => false)) { await more.click(); await p.waitForTimeout(200) }
      await p.getByTestId("view-as").selectOption(value); await p.waitForTimeout(700)
    }
    if (s.details) { await p.getByTestId("tab-details").click(); await p.waitForTimeout(600) }
    await p.addStyleTag({ content: CSS })
    await s.run(p); await p.waitForTimeout(350)
    await p.screenshot({ path: path.join(OUT, s.id + ".png") })
    console.log("saved", s.id)
    await ctx.close()
  }
  await b.close()
})()
