/**
 * Every English string the walkthrough shows, in one place (strategy sections 3, 4 and 6). Screens import from here instead of writing text in
 * components. A package may add keys inside its own block; it must not change another block.
 */
export const onboardingCopy = {
  // shell
  exit: "Save & exit", back: "Back", next: "Continue", skip: "Skip for now", skipHint: "You can add this later in Settings.", progress: "Walkthrough progress",
  demo: "Demo", demoNote: "Fictional data. It stays in this browser.",
  // welcome gate (OB-03)
  welcomeTitle: "Welcome to Platypus", welcomeLead: "Your club's chief of staff.",
  welcomeBody: "Set up a fictional club and see what your officers will see. About 5 minutes.",
  welcomePrivacy: "Everything here is fictional and stays in this browser.",
  start: "Start walkthrough", explore: "Explore the sample club",
  // founder flow (OB-04 … OB-06, OB-09)
  founder: {
    name: {
      title: "Name your club", field: "Club name", school: "ASU Tempe", preview: "Preview", placeholder: "Your club",
      schoolWhy: "Platypus is set up for ASU clubs in this version, so the school is fixed.", schoolLabel: "School",
    },
    constitution: {
      title: "Start from your constitution", sample: "Use sample", upload: "Upload a file", paste: "Paste text", skip: "Skip — use standard roles",
      reading: "Reading officer titles…", aiFailed: "We couldn't use AI just now, so we read it here in your browser instead. Check each line.",
      lead: "Read in your browser. AI finds roles; the text is not stored.",
      leadMore: "The text is read in your browser, then sent to AI to find roles and duties. AI does not store it. A copy stays in this browser so you can come back. PDF, Word (.docx), .txt or .md.",
      recommended: "Recommended", fictional: "Fictional example only",
      pasteLabel: "Constitution text", pasteUse: "Use this text", pasteFictional: "Fictional text only. Never paste a real constitution or member details.",
      words: "words ready", remove: "Remove", fileLabel: "Constitution file", reading2: "Reading duties…", retry: "Try AI again",
      suggested: "Suggested by AI. Check each line.", suggestedGaps: "Suggested by AI. Some duties use standard text. Edit them.", aiOff: "AI is off, so this was read in your browser. Check each line.",
      noTitles: "No officer titles were found. These are standard roles: edit them or add your own.",
      sampleName: "Sample constitution (fictional).txt", pastedName: "Pasted constitution.txt", tooShort: "Add a little more text: at least a sentence or two.",
      tooLong: "This document is very long. Paste the sections about officers and departments.", unreadable: "This file could not be read.",
    },
    goals: {
      title: "Choose two or three goals", lead: "Progress starts at zero.", mission: "Add a mission (optional)", missionField: "Mission",
      decrease: "Decrease", increase: "Increase", target: "target", needTwo: "Choose two or three goals.", missionLong: "Keep the mission under 300 characters.",
      items: { events: { label: "Weekly events", unit: "per week" }, members: { label: "Active members", unit: "members" }, income: { label: "External income", unit: "USD" } },
    },
    team: {
      title: "Who's on your team?", role: "Role", person: "Person", open: "Open position", invited: "Officers add their own phone and details when they join.",
      add: "Add role", remove: "Remove", newRole: "New role", top: "Top", reportsTo: "Reports to", duties: "Duties", nobody: "Nobody (top)", more: "Reports to and duties",
      suggested: "AI suggested roles.", use: "Use these suggestions", sameName: "Each officer needs a different name.",
    },
    firstEvent: {
      title: "Plan your first event", cta: "Plan it", buffer: "Club buffer", bufferHint: "Your club finishes this many working days before each official deadline.", bufferExample: "ASU deadline {official} becomes {club} for your club.", details: "Event details",
      sentenceLabel: "Your first event, in one sentence", examplesLabel: "Examples", planning: "Planning…", chainLabel: "First steps and dates",
      stale: "Press Plan it to update the steps.", notEvent: "Describe one event starting with Plan, then review its details.",
      dateError: "Choose a date that is today or later in Event details.", day: "day", days: "days",
      examples: [
        { label: "Welcome mixer", sentence: "Plan Welcome Mixer on Mar 5, 40 people, on campus, no food" },
        { label: "Study workshop", sentence: "Plan Study Skills Workshop on Mar 26, 25 people, on campus" },
        { label: "Spring dinner", sentence: "Plan Spring Kickoff Dinner on Apr 16, 60 people, outside caterer, USG funding" },
      ],
      fields: { name: "Event name", date: "Event date", type: "Event type", headcount: "Headcount", venue: "Venue", food: "Food", funding: "Funding", speaker: "Includes a guest speaker", source: "Planned with" },
    },
    confirm: { title: "Ready to start?", summary: "This creates {club} with {officers} and {event} on {date}.", officers: { one: "1 officer", many: "{n} officers" }, start: "Start workspace", keep: "Keep current demo", replaceWarning: "This replaces the current demo workspace.", missing: "Plan your first event before you start.", backToEvent: "Back to first event" },
    invite: { title: "Your club is ready.", lead: "Invite your officers.", copy: "Copy link", copied: "Copied", copyFailed: "Press Ctrl+C to copy.", whatsapp: "WhatsApp", email: "Email", link: "Officer invitation link", permission: "Only people with this link can join.", notSent: "Nothing sends automatically. We open a message for you.", preview: "See what your officers will see", today: "Go to Today", invited: "Invited", joined: "Joined", open: "Open position", officers: "Officers", joinedNote: "Demo only: Joined appears when an officer finishes setup in this browser.", subject: "Join {club} on Platypus", message: "Join {club} on Platypus as an officer: {link}" },
  },
  // member preview (OB-07, OB-08)
  member: {
    invitation: {
      cta: "Continue", lead: "{president} invited you to be {role}", boss: "Reports to {boss}", president: "Your president",
      gets: ["One thing at a time.", "Reminders where you choose.", "Never called out in public."],
      trust: "We keep your name and reminder choices. Nothing is sent automatically.",
      previewing: "Previewing as", change: "Change", changeLabel: "Preview as", demoNote: "Fictional demo. Choosing a name does not verify an identity.",
      invalidTip: "Demo tip: open the link in the browser where the club was set up.", invalidRetry: "Use this browser's invitation", invalidHome: "Go to Today",
    },
    you: { title: "Is this you?", notYou: "Not you?", name: "Name", email: "Email", duplicate: "Choose a distinct fictional name." },
    reminders: {
      title: "Where should reminders go?", whatsapp: "WhatsApp", sms: "SMS", email: "Email", morning: "Morning", evening: "Evening", timeLabel: "Reminder time",
      quiet: "Quiet hours: 10 pm–8 am.", phone: "Phone (optional)", phoneWhy: "So your president can open a prewritten message. Nothing is sent automatically.",
      example: "Example", whenMorning: "this morning", whenEvening: "this evening",
      bubble: "Hi {name} — {when}: book the Founder Dinner venue. Reply “got it” when done.",
    },
    busyWeeks: {
      title: "Which weeks are busy?", skip: "Skip — nothing busy yet", effect: "Platypus will plan around these weeks.",
      group: "Weeks, starting this week", legend: "Striped: finals · Dashed: break", count: "{n} busy", limit: "Up to 20 weeks.",
      weekOf: "Week of {date}", finals: "finals week", brk: "break", between: "between semesters", holiday: "holiday", busy: "busy", autoAvoided: "already avoided",
    },
    about: {
      title: "What would make this role worthwhile?", why: "Helps match you with tasks you'll care about.",
      goal: "Career goal", interests: "Interests", expectations: "Expectations", tooLong: "Keep each answer under 500 characters.",
      goalTags: ["Leadership", "Marketing", "Finance"], interestTags: ["Events", "Design", "Networking"], expectationTags: ["Mentoring", "Experience", "Friends"],
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
