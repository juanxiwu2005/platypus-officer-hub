import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { ESLint } from "eslint"

// Exercise the configured rules, including invalid input that a clean source tree cannot cover.
export const cases = [
  { name: "map expression", code: "items.map(item => <li>{item.name}</li>)", errors: 1 },
  { name: "map block return", code: "items.map(item => { return <li>{item.name}</li> })", errors: 1 },
  { name: "conditional list item", code: "items.map(item => item.ok ? <li /> : <span />)", errors: 2 },
  { name: "logical list item", code: "items.map(item => item.ok && <li />)", errors: 1 },
  { name: "flatMap callback", code: "items.flatMap(item => <li>{item.name}</li>)", errors: 1 },
  { name: "Array.from callback", code: "Array.from(items, item => <li>{item.name}</li>)", errors: 1 },
  { name: "array elements", code: "const list = [<li />, <li />]", errors: 2 },
  { name: "fragment component", code: "items.map(item => <React.Fragment><li /></React.Fragment>)", errors: 1 },
  // The replacement also catches shorthand fragments, which the previous rule allowed by default.
  { name: "shorthand fragment", code: "items.map(item => <><li /></>)", errors: 1, baselineErrors: 0 },
  { name: "keyed map", code: "items.map(item => <li key={item.id}>{item.name}</li>)", errors: 0 },
  { name: "keyed array", code: "const list = [<li key='a' />, <li key='b' />]", errors: 0 },
  { name: "keyed fragment", code: "items.map(item => <React.Fragment key={item.id}><li /></React.Fragment>)", errors: 0 },
  { name: "ordinary element", code: "const view = <section><li /></section>", errors: 0 },
  { name: "CSS variable", code: "const view = <div style={{ '--panel-width': width }} />", errors: 0 },
  { name: "data driven size", code: "const view = <div style={{ left, top, width, height }} />", errors: 0 },
  { name: "literal color", code: "const view = <div style={{ color: 'red' }} />", errors: 1 },
  { name: "literal font size", code: "const view = <div style={{ fontSize: 12 }} />", errors: 1 },
  { name: "style reference", code: "const view = <div style={styles} />", errors: 1 },
  { name: "style call", code: "const view = <div style={getStyle()} />", errors: 1 },
  { name: "cast style literal", code: "const view = <div style={{ color: 'red' } as React.CSSProperties} />", errors: 1 },
]

export async function checkLintGuardrails() {
  const eslint = new ESLint()
  for (const fixture of cases) {
    const [result] = await eslint.lintText(fixture.code, { filePath: "src/lint-guardrail-fixture.tsx" })
    assert.equal(result.fatalErrorCount, 0, fixture.name)
    assert.equal(result.errorCount, fixture.errors, `${fixture.name}: ${JSON.stringify(result.messages)}`)
  }
  for (const filePath of ["src/test/fixture.test.tsx"]) {
    assert.equal(await eslint.isPathIgnored(filePath), true, filePath)
  }

  // These are the exact CommonJS APIs used by ESLint, config-array and typescript-estree.
  // All three scoped overrides must retain them when the vulnerable 10.x matcher is replaced.
  const patterns = [
    ["src/pages/Events.tsx", "src/**/*.{ts,tsx}", true],
    ["src/lib/dates.ts", "src/**/*.{ts,tsx}", true],
    ["src/styles.css", "src/**/*.{ts,tsx}", false],
    ["src/test/example.test.tsx", "src/test/**", true],
    ["src/pages/Events.tsx", "src/test/**", false],
    ["dist/assets/index.js", "dist/**", true],
    ["src/.hidden.ts", "src/*.ts", true],
    ["config.ts", "*.ts", true],
    ["nested/config.ts", "*.ts", false],
  ]
  for (const consumer of ["eslint", "@eslint/config-array", "@typescript-eslint/typescript-estree"]) {
    const require = createRequire(import.meta.resolve(consumer))
    const { minimatch, Minimatch } = require("minimatch")
    for (const [path, pattern, expected] of patterns) {
      const options = { dot: true }
      assert.equal(minimatch(path, pattern, options), expected, `${consumer}: ${path}`)
      assert.equal(new Minimatch(pattern, options).match(path), expected, `${consumer}: ${path}`)
    }
    // config-array also supplies flipNegate and uses the resulting matcher repeatedly.
    const negative = new Minimatch("!src/test/**", { dot: true, flipNegate: true })
    assert.equal(negative.match("src/test/example.test.tsx"), true)
    assert.equal(negative.match("src/pages/Events.tsx"), false)
  }
  console.log(`Lint guardrails: ${cases.length} JSX/style cases, 1 exclusion and 60 scoped matcher checks passed.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await checkLintGuardrails()
