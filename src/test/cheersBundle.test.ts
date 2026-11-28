import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

/**
 * Cheers R1 (review fix): what loads with the app's first screen stays small. The store, the Reminders home (Today.tsx, not lazy),
 * the Layout's card host and the inbox are in the entry chunk, so the Cheers code they reach must not pull in the screens'
 * read helpers, the screens or the Cheers stylesheet. Those load with the lazy screens (Team, Give points, history, cards,
 * Task Details, and the weekly line once the cheap check passes). `npm run build` shows the sizes.
 */
const src = (file: string) => readFileSync(file, "utf8")
/** Runtime imports only: `import type` is erased from the build. */
const staticImports = (file: string) => [...src(file).matchAll(/^import\s(?!type\s)[^;"]*?from\s+"([^"]+)"|^import\s+"([^"]+)"/gm)].map(m => m[1] ?? m[2])

describe("Cheers in the entry chunk", () => {
  it("cheers.ts (the store's model) holds no screen-only read helper", () => {
    const text = src("src/data/cheers.ts")
    for (const name of ["weeklyLine", "thankPromptFor", "cheerRecipients", "receivedThisTerm", "givenThisTerm"]) expect(text, name).not.toMatch(new RegExp(`export (const|function) ${name}\\b`))
    expect(text).not.toMatch(/from "\.\/cheerViews"/)
    expect(text).not.toMatch(/activityQuery/)
  })

  it("the screen-only read helpers are in cheerViews.ts", async () => {
    const views = await import("../data/cheerViews")
    for (const name of ["weeklyLine", "thankPromptFor", "cheerRecipients", "receivedThisTerm", "givenThisTerm"]) expect(typeof (views as Record<string, unknown>)[name], name).toBe("function")
  })

  it("the entry-chunk Cheers files load neither the stylesheet nor the screens", () => {
    for (const file of ["src/components/cheers/WeeklyLine.tsx", "src/components/cheers/CardsHost.tsx", "src/components/PrivateInbox.tsx", "src/data/cheers.ts"]) {
      const imports = staticImports(file)
      expect(imports.filter(i => /\.css$/.test(i)), file).toEqual([])
      expect(imports.filter(i => /cheerViews|\/shared$|WeeklyLineStrip|ReceivedCards"?$|GiveCheer|CheerHistory/.test(i)), file).toEqual([])
    }
    // The weekly line's strip, with the stylesheet, is loaded lazily.
    expect(src("src/components/cheers/WeeklyLine.tsx")).toMatch(/lazy\(\(\) => import\("\.\/WeeklyLineStrip"\)\)/)
  })
})
