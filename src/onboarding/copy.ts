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
    name: { title: "Name your club", field: "Club name", school: "ASU Tempe" },
    constitution: { title: "Start from your constitution", sample: "Use sample", upload: "Upload a file", paste: "Paste text", skip: "Skip — use standard roles", reading: "Reading officer titles…", aiFailed: "We couldn't use AI just now, so we read it here in your browser instead. Check each line." },
    goals: { title: "Choose two or three goals", mission: "Add a mission (optional)" },
    team: { title: "Who's on your team?", role: "Role", person: "Person", open: "Open position", invited: "Officers add their own phone and details when they join." },
    firstEvent: { title: "Plan your first event", cta: "Plan it", buffer: "Club buffer", bufferHint: "Your club finishes this many working days before each official deadline.", details: "Event details" },
    confirm: { title: "Ready to start?", start: "Start workspace", keep: "Keep current demo", replaceWarning: "This replaces the current demo workspace." },
    invite: { title: "Your club is ready.", lead: "Invite your officers.", copy: "Copy link", whatsapp: "WhatsApp", email: "Email", permission: "Only people with this link can join as an officer.", notSent: "Nothing is sent automatically. We open a message you can send.", preview: "See what your officers will see", today: "Go to Today", invited: "Invited", joined: "Joined" },
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
    busyWeeks: { title: "Which weeks are busy?", skip: "Skip — nothing busy yet", effect: "Platypus will plan around these weeks." },
    about: { title: "What would make this role worthwhile?", why: "Helps match you with tasks you'll care about." },
    done: { title: "You're in.", cta: "Open my tasks", empty: "You'll see tasks here when your president assigns one." },
  },
  // errors
  invalidInvite: "This invitation link isn't working. Ask your president to send a new one.",
} as const
