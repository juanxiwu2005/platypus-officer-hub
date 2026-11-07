import type { Channel } from "../../../data/types"

/** Three small line icons, drawn with currentColor so they follow the theme. Decorative: the channel name is always written next to them. */
export function ChannelIcon({ channel }: { channel: Channel }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const
  if (channel === "email") return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></svg>
  if (channel === "sms") return <svg {...common}><path d="M4 5h16v11H9l-5 4z" /></svg>
  return <svg {...common}><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-2-2.5-1-1 1c-1-.4-2-1.4-2.4-2.4l1-1-1-2.5z" /></svg>
}
