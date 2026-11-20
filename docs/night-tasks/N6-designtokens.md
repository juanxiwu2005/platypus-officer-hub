# Depends on: N2-radius.md
# Depends on: N3-fontscale.md
# Depends on: N4-infotoken.md

# Goal

Write a copy of the docs/DESIGN_Tokens.md, and explain the rules established in previous rounds.
For those who don't write the code, and for the AI to change the interface later, it's the only basis.

This is the "design system delivery" that has been missing from this project.

# Files

- Docs/DESIGN_TOKENS.md (new)

# Constraints

- Only field presentation data are used.
- Do not modify dependencies, deployments, GitHub Actions, secret key, research data or Night Mode security files.
- Do not modify or mege main.
- **New only this document, no code change, no CSS change.**
- Write documentation in English, following the current `AGENTS.md` language rule, which supersedes the former Chinese-documentation instruction.
- **does not reread the document to "check the baseline".**

# Done means

Docs/DESIGN_TOKENS.md includes:

## 1. First sentence.

Describe the status of this document: read it before changing any interface. The new style can only use token and no dead values are allowed.

## 2. Tables for each set of token

From `:root` in src/ styles.css, **reads the actual value** (do not use memory) by group:

- `--fs-*`: Value per file + When to use
- Corner (`--r-*`): the value per file + on what element
- Hierarchy (`--z-*`): Values per file + stack order from low to high
- Spacing (`--s*`): The value of each file + indicates that it is summarized from high frequency values, not the ideal grid
- Colours: brand colour and 6A state color, **Each state color has to bring its contrast numbers.**
  From T4 and T5 handoff records, don't guess.

## 3. A section, "Why these values?"

Brief description: These slots are summarized from existing interfaces and are not reversed.
The goal is to allow the interface to be described and evaluated, not to change its face.

## 4. A section "for people who will change their interfaces."

- Add Styles Only With Token
- When a new value is needed, add token and use it again.
- Dark colour mode: indicates that the follow-up system (`prefers-color-scheme`) is now available.
  CSS supported `data-theme="light"`/ `"dark"` mandatory coverage, but no interface switch

## 5.

- The `npm run check` must be passed (this round should not change the code and it should pass directly).
- In the handoff record: The values in the document are actually read from styles.css, not estimated.

# Out of scope

- Do not change any CSS or code.
- Do not create another document.
