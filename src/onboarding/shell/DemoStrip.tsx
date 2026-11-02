import type { ReactNode } from "react"
import { onboardingCopy } from "../copy"

/** A narrow amber strip, same look as the Demo pill in the app. The member preview puts "Previewing as …" in it. */
export function DemoStrip({ children }: { children?: ReactNode }) {
  return <p className="ob-demo-strip" role="note"><b>{onboardingCopy.demo.toUpperCase()}</b> <span>{children ?? onboardingCopy.demoNote}</span></p>
}
