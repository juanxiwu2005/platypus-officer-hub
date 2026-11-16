import { useMemo, useRef, useState } from "react"
import type { DemoState } from "../../../data/types"
import { fmtLong, fmtShort } from "../../../lib/dates"
import { onboardingCopy } from "../../copy"
import { bufferExample } from "./bufferExample"
import { BUFFER_OPTIONS, bufferBinds, bufferRows, isNamedBuffer } from "./bufferRows"

const c = onboardingCopy.founder.firstEvent
const daysText = (n: number) => `${n} ${n === 1 ? c.day : c.days}`

/**
 * FB-3 (docs/feedback-fix/PLAN.md 5.2): "How early should your club finish?" Three named choices (Tight · 1 day, Standard · 3 days, Safe · 5 days),
 * plus "Custom · N days" while the draft holds another allowed value (2 or 7). Under it, this event's own steps that have an ASU deadline, with both
 * dates from the same engine preview as the chain above; a row whose date changed with the last choice says "moved earlier" or "moved later" in
 * words. One sentence says what the choice does, or honestly that nothing moves. With no ASU step, the general worked example stays.
 * `previewAt` re-plans the same event under another buffer (the rule engine), only to tell which rows moved.
 */
export function BufferChoice({ buffer, preview, previewAt, today, onChoose }: {
  buffer: number; preview: DemoState; previewAt: (buffer: number) => DemoState | null; today: string; onChoose: (buffer: number) => void
}) {
  const [from, setFrom] = useState<number | null>(null)
  // A Custom value stays offered for this visit, so it can be chosen again after trying a named one.
  const custom = useRef(isNamedBuffer(buffer) ? null : buffer)
  const before = useMemo(() => (from === null || from === buffer ? null : previewAt(from)), [from, buffer, previewAt])
  const rows = useMemo(() => bufferRows(preview, before), [preview, before])
  const example = useMemo(() => bufferExample(today, buffer), [today, buffer])
  const choose = (n: number) => { if (n === buffer) return; setFrom(buffer); onChoose(n) }
  const options = [
    ...BUFFER_OPTIONS.map(o => ({ key: o.id, days: o.days, label: c.bufferOptions[o.id], recommended: o.recommended })),
    ...(custom.current === null ? [] : [{ key: "custom", days: custom.current, label: c.bufferOptions.custom, recommended: false }]),
  ]

  return <div className="ob6-buffer fb3-buffer">
    <h2 id="ob6-buffer-label" className="ob6-buffer-label fb3-buffer-h">{c.buffer}</h2>
    <p className="small muted fb3-buffer-hint">{c.bufferHint}</p>
    <div className="fb3-buffer-opts" role="group" aria-labelledby="ob6-buffer-label">
      {options.map(o => <button key={o.key} type="button" className="fb3-buffer-opt" aria-pressed={buffer === o.days} onClick={() => choose(o.days)}>
        <span>{o.label} · {daysText(o.days)}</span>{o.recommended && <span className="tag accent">{c.recommended}</span>}
      </button>)}
    </div>
    {rows.length > 0
      ? <>
        {/* One row per step; the column headers name both dates for every row (a screen reader reads them with each cell). */}
        <table className="fb3-buffer-rows" aria-label={c.bufferRowsLabel} data-testid="buffer-rows">
          <thead><tr><th scope="col">{c.step}</th><th scope="col">{c.asuDeadline}</th><th scope="col">{c.clubFinishes}</th></tr></thead>
          <tbody aria-live="polite">
            {rows.map(r => <tr key={r.key} data-testid="buffer-row" data-moved={r.moved ?? undefined}>
              <th scope="row" className="fb3-buffer-step">{r.title}</th>
              <td><time dateTime={r.official}>{fmtShort(r.official)}</time></td>
              <td className="fb3-buffer-club"><time dateTime={r.club}>{fmtShort(r.club)}</time>
                {r.moved && <> <span className={`tag fb3-moved is-${r.moved}`} data-testid="buffer-moved">{r.moved === "earlier" ? c.movedEarlier : c.movedLater}</span></>}</td>
            </tr>)}
          </tbody>
        </table>
        <p className="small fb3-buffer-effect" data-testid="buffer-effect">
          {bufferBinds(rows, buffer) ? c.bufferEffect.replace("{days}", `${buffer} ${buffer === 1 ? c.workingDay : c.workingDays}`) : c.bufferNone}
        </p>
      </>
      : <p className="small ob6-example" data-testid="buffer-example">{c.bufferExample.replace("{official}", fmtLong(example.official)).replace("{club}", fmtLong(example.club))}</p>}
  </div>
}
