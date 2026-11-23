/**
 * Every English string the walkthrough shows, in one place (strategy sections 3, 4 and 6). Screens import from here instead of writing text in
 * components. A package may add keys inside its own block; it must not change another block.
 * S6 (2026-11-23, ob-6): the copy pass for the shorter setup. "Demo / fictional / nothing sent" is said once, hints show only on an error,
 * and the "later in Settings" lines are gone. The Goals, Confirm, You and About blocks went with their screens (see docs/PHASE3_DATA_DICTIONARY.md).
 */
export const onboardingCopy = {
  // shell
  exit: "Exit", back: "Back", next: "Continue", skip: "Skip for now", progress: "Walkthrough progress",
  demo: "Demo", demoNote: "Fictional data. It stays in this browser.",
  // welcome gate (OB-03)
  welcomeTitle: "Welcome to Platypus", welcomeLead: "Your club's chief of staff.",
  welcomeBody: "Plan your first event in 5 minutes.",
  start: "Start walkthrough", explore: "Explore the sample club",
  // founder flow: screen 1 (name and first event), screen 2 (team, with the constitution reading), screen 3 (invite)
  founder: {
    name: {
      title: "Name your club", field: "Club name", example: "e.g. Sun Devil Robotics Club",
    },
    constitution: {
      open: "Import roles from your constitution", sample: "Use sample", upload: "Upload a file", paste: "Paste text",
      reading: "Reading officer titles…", aiFailed: "AI is unavailable, so this was read in your browser. Check each line.",
      lead: "AI suggests roles from it and does not keep the text.",
      leadMore: "A copy stays in this browser. PDF, Word (.docx), .txt or .md.", leadLabel: "How your text is used",
      recommended: "Recommended", fictional: "Fictional example only",
      pasteLabel: "Constitution text", pasteUse: "Use this text", pasteFictional: "Fictional text only. Never paste a real constitution or member details.",
      words: "words ready", remove: "Remove", fileLabel: "Constitution file", reading2: "Reading duties…", retry: "Try AI again",
      suggested: "Suggested by AI. Check each line.", suggestedGaps: "Suggested by AI. Some duties use standard text. Edit them.", aiOff: "AI is off, so this was read in your browser. Check each line.",
      noTitles: "No officer titles were found. These are standard roles: edit them or add your own.",
      sampleName: "Sample constitution (fictional).txt", pastedName: "Pasted constitution.txt", tooShort: "Add a little more text: at least a sentence or two.",
      tooLong: "This document is very long. Paste the sections about officers and departments.", unreadable: "This file could not be read.",
    },
    team: {
      title: "Who's on your team?", role: "Role", person: "Person", open: "Open position", invited: "Officers add their own contact details.",
      add: "Add role", remove: "Remove", newRole: "New role", top: "Top", reportsTo: "Reports to", duties: "Duties", editDuties: "Edit duties", nobody: "Nobody (top)",
      suggested: "AI suggested roles.", use: "Use these suggestions", sameName: "Each officer needs a different name.",
      // Start workspace finishes setup here (it was on the Confirm screen up to ob-5). Stored values stay "start-workspace" / "keep-demo".
      start: "Start workspace", keep: "Keep current demo", replaceWarning: "This replaces the current demo workspace.",
      missing: "Plan your first event before you start.", saveFailed: "Your club could not be saved. Export your current data and retry before leaving this page.",
      // completeSetup needs a mission and the walkthrough no longer asks for one: a constitution reading may give one, otherwise this. Editable in Settings.
      mission: "Plan events together and follow through.",
    },
    firstEvent: {
      title: "Your first event", cta: "Plan it", buffer: "Club buffer", bufferHint: "Your club finishes this many working days before each official deadline.", bufferExample: "Example: ASU {official} → {club}.", details: "Event details",
      sentenceLabel: "Your first event, in one sentence", examplesLabel: "Examples", planning: "Planning…", chainLabel: "First steps and dates",
      stale: "Press Plan it to update the steps.", notEvent: "Describe one event starting with Plan, then review its details.",
      dateError: "Choose a date that is today or later in Event details.", day: "day", days: "days",
      sentenceExample: "e.g. Plan Welcome Mixer on Mar 5, 40 people, on campus",
      examples: [
        { label: "Welcome mixer", sentence: "Plan Welcome Mixer on Mar 5, 40 people, on campus, no food" },
        { label: "Study workshop", sentence: "Plan Study Skills Workshop on Mar 26, 25 people, on campus" },
        { label: "Spring dinner", sentence: "Plan Spring Kickoff Dinner on Apr 16, 60 people, outside caterer, USG funding" },
      ],
      fields: { name: "Event name", date: "Event date", type: "Event type", headcount: "Headcount", venue: "Venue", food: "Food", funding: "Funding", speaker: "Includes a guest speaker", source: "Planned with" },
    },
    invite: { title: "Your club is ready.", lead: "Invite your officers.", copy: "Copy link", copied: "Copied", copyFailed: "Press Ctrl+C to copy.", whatsapp: "WhatsApp", email: "Email", link: "Officer invitation link", permission: "Only people with this link can join.", preview: "See what your officers will see", today: "Go to Reminders", invited: "Invited", joined: "Joined", open: "Open position", officers: "Officers", subject: "Join {club} on Platypus", message: "Join {club} on Platypus as an officer: {link}" },
  },
  // member preview (OB-07, OB-08): Invitation (with name and email since ob-6), Reminders, Busy weeks, Done
  member: {
    invitation: {
      cta: "Continue", lead: "{president} invited you to be {role}", boss: "Reports to {boss}", president: "Your president",
      gets: ["One thing at a time.", "Reminders where you choose.", "Never called out in public."],
      trust: "Nothing is sent automatically.",
      previewing: "Previewing as", change: "Change", changeLabel: "Preview as",
      name: "Name", email: "Email", duplicate: "Choose a distinct fictional name.",
      invalidTip: "Open the link in the browser where the club was set up.", invalidRetry: "Use this browser's invitation", invalidHome: "Go to Reminders",
    },
    reminders: {
      title: "Where should reminders go?", whatsapp: "WhatsApp", sms: "SMS", email: "Email", morning: "Morning", evening: "Evening", timeLabel: "Reminder time",
      quiet: "Quiet hours: 10 pm–8 am.", phone: "Phone (optional)", phoneWhy: "So your president can open a prewritten message.",
      example: "Example", whenMorning: "this morning", whenEvening: "this evening",
      bubble: "Hi {name} — {when}: book the Founder Dinner venue. Reply “got it” when done.",
    },
    busyWeeks: {
      title: "Which weeks are busy?", skip: "Skip — nothing busy yet", effect: "Platypus will plan around these weeks.",
      group: "Weeks, starting this week", legend: "Striped: finals · Dashed: break", count: "{n} busy", limit: "Up to 20 weeks.",
      weekOf: "Week of {date}", finals: "finals week", brk: "break", between: "between semesters", holiday: "holiday", busy: "busy", autoAvoided: "already avoided",
    },
    done: {
      title: "You're in.", cta: "Open my tasks", empty: "You'll see tasks here when your president assigns one.",
      emptyPreview: "Tasks lists what's yours, with the club date.", first: "Your first task", due: "Club date",
      saveFailed: "We couldn't save your choices: {problem}", back: "Go back and fix it",
    },
  },
  // errors
  invalidInvite: "This invitation link isn't working. Ask your president to send a new one.",
} as const
