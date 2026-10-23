import { RULES, RULE_CATEGORIES } from "../data/rules"
import { Coming, PageHead } from "../components/Page"

export default function Rules() {
  return (
    <>
      <PageHead path="/rules" lead="ASU rules Platypus checks every plan against. Each one links to its source." />
      {RULE_CATEGORIES.map(cat => {
        const rules = RULES.filter(r => r.category === cat.id)
        if (rules.length === 0) return null
        return (
          <section key={cat.id} className="card" aria-labelledby={`cat-${cat.id}`}>
            <header><h2 id={`cat-${cat.id}`}>{cat.label}</h2><span className="small muted">{rules.length} rules</span></header>
            <ul className="list" data-testid={`rules-${cat.id}`}>
              {rules.map(r => (
                <li key={r.id} style={{ display: "grid", gap: 4 }}>
                  <div><span className="rule-id">{r.id}</span> {r.text}</div>
                  {r.limit !== "—" && <div className="small"><b>Deadline:</b> {r.limit}</div>}
                  {r.note && <div className="small" style={{ color: "var(--warn)" }}>{r.note}</div>}
                  <div className="small muted">
                    {r.sources.map((s, i) => <span key={s.url}>{i > 0 && " · "}<a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></span>)}
                    {` · checked ${r.checkedOn}`}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
      <Coming wp="WP1 and WP2" items={["Each rule linked to the steps it governs", "Club-specific rules layered on top of ASU's", "Ask a rule question in the command bar"]} />
    </>
  )
}
