# P5-07K Match visible room-check text to accessible names

One existing source file, <=150changedlines (expectedfew). Actual Chromium full axe on RoomView fallback after selectingCatering reports label-content-name-mismatch on all6VenueEditor check buttons: DOM spans concatenate label/status while aria-label has separators; lasttwo also include invisible checklist wording midname. Keep existing aria-label strings, callbacks,sourceIDs,logic,statuses,allCSS and tests unchanged.

Read AGENT_BRIEF,this card,src/quest/sample/venue.ts,src/quest/sample/VenueEditor.test.tsx, and writableVenueEditor.tsx. Write ONLYsrc/quest/sample/VenueEditor.tsx.
For the6check buttons, make visible contents match existing accessible name: firstspan renders check.label plus check.checklist? " (checklist check)" : "" followed by colon; add explicit whitespace before secondspan; secondspan keeps Clear/Needs work. No aria-label change or hidden source/status removal. Thus words/names match, checklist classification is honest and visible. Preserve every other control,label,handler,input/draftfield/layout; no geometry or newrule changes. No new dependency/config/globaldefault/delegation/commit/push. No redundant copy-only unit test: existing suite must pass, planner real mobile/selected-state axe0/44px/overflow/word checks before critic.

Allowedcommands npx vitest run src/quest/sample/VenueEditor.test.tsx and npx tsc --noEmit -p tsconfig.json. Planner full lint. Short truthful handoff.
