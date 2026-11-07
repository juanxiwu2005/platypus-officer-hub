import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

// DX-07: the browser's address-bar colour must equal the page background, light and dark. If someone changes --bg and
// forgets index.html, this goes red.
const root = path.resolve(__dirname, "../..")
const html = readFileSync(path.join(root, "index.html"), "utf8")
const css = readFileSync(path.join(root, "src/styles.css"), "utf8")

function themeColor(scheme: "light" | "dark") {
  const tag = html.match(new RegExp(`<meta name="theme-color" content="(#[0-9a-fA-F]{6})" media="\\(prefers-color-scheme: ${scheme}\\)"`))
  return tag?.[1].toLowerCase()
}
/** --bg from the light :root block, or from the forced-dark block. */
function bg(scheme: "light" | "dark") {
  const block = scheme === "light" ? css.match(/:root \{[\s\S]*?\n\}/)![0] : css.match(/:root\[data-theme="dark"\] \{[\s\S]*?\n\}/)![0]
  return block.match(/--bg:\s*(#[0-9a-fA-F]{6})/)![1].toLowerCase()
}

describe("index.html colours", () => {
  it("declares both schemes", () => {
    expect(html).toContain('<meta name="color-scheme" content="light dark"')
  })
  it("theme-color equals --bg in light", () => expect(themeColor("light")).toBe(bg("light")))
  it("theme-color equals --bg in dark", () => expect(themeColor("dark")).toBe(bg("dark")))
  it("would notice a mismatch", () => expect(themeColor("light")).not.toBe(bg("dark")))
})
