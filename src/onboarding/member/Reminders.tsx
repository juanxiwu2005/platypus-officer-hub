import { useState } from "react"
import type { Channel, Person } from "../../data/types"
import { onboardingCopy } from "../copy"
import { useFlow } from "../engine/useFlow"
import { ChannelIcon } from "./invitation/ChannelIcon"
import { fill } from "./invitation/choice"
import { MemberStrip } from "./invitation/MemberStrip"
import { previewPatch, previewProblem } from "./invitation/profile"
import { StepFooter } from "./invitation/StepFooter"
import { usePreview, type Preview } from "./invitation/usePreview"

const c = onboardingCopy.member.reminders
const CHOICES: { channel: Channel; label: string }[] = [{ channel: "whatsapp", label: c.whatsapp }, { channel: "sms", label: c.sms }, { channel: "email", label: c.email }]
const TIMES: { value: "morning" | "evening"; label: string }[] = [{ value: "morning", label: c.morning }, { value: "evening", label: c.evening }]
const needsPhone = (channel: Channel) => channel !== "email"

/** Member screen 2 of 4: where reminders go and when. The example bubble below shows exactly what one would look like; it sends nothing. */
export function Reminders() {
  const preview = usePreview()
  if (!preview.person) return null
  return <RemindersForm key={preview.person.id} preview={preview} person={preview.person} />
}

function RemindersForm({ preview, person }: { preview: Preview; person: Person }) {
  const flow = useFlow()
  const { state, stored, save } = preview
  const [channel, setChannel] = useState<Channel>(stored?.channel ?? person.channels[0] ?? "email")
  const [remindAt, setRemindAt] = useState<"morning" | "evening">(stored?.remindAt ?? person.remindAt)
  const [phone, setPhone] = useState(stored?.phone ?? person.phone ?? "")
  const [error, setError] = useState("")
  const first = (stored?.name ?? person.name).trim().split(/\s+/)[0] ?? ""
  const remember = (next: { channel?: Channel; remindAt?: "morning" | "evening"; phone?: string }) => {
    const ch = next.channel ?? channel, at = next.remindAt ?? remindAt, ph = next.phone ?? phone
    setChannel(ch); setRemindAt(at); setPhone(ph); setError("")
    save({ channel: ch, remindAt: at, phone: needsPhone(ch) && ph.trim() ? ph : undefined })
  }
  return <form noValidate className="ob-m-page" onSubmit={event => {
    event.preventDefault()
    const ph = needsPhone(channel) ? phone.trim() : ""
    const problem = previewProblem(state.people, person, previewPatch(person, stored, { channels: [channel], remindAt, phone: ph }))
    if (problem) { setError(problem); return }
    save({ channel, remindAt, phone: ph || undefined }); flow?.next()
  }}>
    <section className="ob-card ob-m-card">
      <MemberStrip preview={preview} />
      <h1 id="ob-m-ch-title">{c.title}</h1>
      <div className="ob-m-opts" role="radiogroup" aria-labelledby="ob-m-ch-title">
        {CHOICES.map(o => <label key={o.channel} className="ob-m-opt">
          <input type="radio" name="channel" value={o.channel} checked={channel === o.channel} onChange={() => remember({ channel: o.channel })} />
          <ChannelIcon channel={o.channel} /><span>{o.label}</span>
        </label>)}
      </div>
      {needsPhone(channel) && <div className="ob-m-phone" data-testid="phone-field">
        <label className="field">{c.phone}<input type="tel" inputMode="tel" autoComplete="off" placeholder="480-555-0100" value={phone} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? "ob-m-phone-why ob-m-rem-error" : "ob-m-phone-why"} onChange={e => remember({ phone: e.target.value })} /></label>
        <p id="ob-m-phone-why" className="small muted">{c.phoneWhy}</p>
      </div>}
      <div className="ob-m-seg" role="radiogroup" aria-label={c.timeLabel}>
        {TIMES.map(o => <label key={o.value}><input type="radio" name="remindAt" value={o.value} checked={remindAt === o.value} onChange={() => remember({ remindAt: o.value })} /><span>{o.label}</span></label>)}
      </div>
      <p className="small muted">{c.quiet}</p>
      {error && <p id="ob-m-rem-error" role="alert" className="ob-m-error">{error}</p>}
      <div className="ob-m-sample" data-testid="sample-reminder" aria-live="polite">
        <p className="ob-m-sample-tag small muted">{c.example}</p>
        <div key={`${channel}-${remindAt}`} className={`ob-m-bubble is-${channel}`}>
          <ChannelIcon channel={channel} />
          <p>{fill(c.bubble, { name: first, when: remindAt === "morning" ? c.whenMorning : c.whenEvening })}</p>
        </div>
      </div>
    </section>
    <StepFooter onBack={() => { flow?.back() }} />
  </form>
}
