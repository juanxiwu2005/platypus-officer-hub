// Keep lint-policy explanations in English for all contributors.
// Guardrail: no inline style={{...}} except CSS-variable injection and data-driven position or size.
// Everything else belongs in src/styles.css as a class that uses design tokens (docs/DESIGN_TOKENS.md).
// src/organization, src/phase1 and src/workspace are a separate older code base with their own CSS
// (about 4,500 lines) and many inline styles. They are excluded for now; unify them later.
import parser from "@typescript-eslint/parser"
import reactX from "eslint-plugin-react-x"

// ESLint 10 support; no-missing-key retains the JSX collection-key guardrail and also checks <>.

const NOT_ALLOWED_STYLE_KEY =
  "JSXAttribute[name.name='style'] ObjectExpression > Property:not([key.name=/^(left|top|width|height)$/]):not([key.value=/^--/])"
const STYLE_NOT_A_LITERAL =
  "JSXAttribute[name.name='style'] > JSXExpressionContainer > :not(ObjectExpression):not(TSAsExpression)"

export default [
  { ignores: ["dist/**", "dist-storage/**", "node_modules/**", "netlify/**", "scripts/**", "e2e/**", "src/organization/**", "src/phase1/**", "src/workspace/**", "src/test/**"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { "react-x": reactX },
    settings: { react: { version: "18.3" } },
    rules: {
      "react-x/no-missing-key": "error",
      "no-restricted-syntax": [
        "error",
        { selector: NOT_ALLOWED_STYLE_KEY, message: "Inline style is only for CSS variables (--name) and data-driven left/top/width/height. Use a class from src/styles.css." },
        { selector: STYLE_NOT_A_LITERAL, message: "style must be an object literal with CSS variables or data-driven left/top/width/height. Use a class from src/styles.css." },
      ],
    },
  },
]
