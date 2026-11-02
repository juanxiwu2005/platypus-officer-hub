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
    firstEvent: { title: "Plan your first event", cta: "Plan it", buffer: "Club buffer", bufferHint: "Your club finishes this many working days before each official deadline.", details: "Event details" },
    confirm: { title: "Ready to start?", start: "Start workspace", keep: "Keep current demo", replaceWarning: "This replaces the current demo workspace." },
    invite: { title: "Your club is ready.", lead: "Invite your officers.", copy: "Copy link", whatsapp: "WhatsApp", email: "Email", permission: "Only people with this link can join as an officer.", notSent: "Nothing is sent automatically. We open a message you can send.", preview: "See what your officers will see", today: "Go to Today", invited: "Invited", joined: "Joined" },
  },
  // member preview (OB-07, OB-08)
  member: {
    invitation: { cta: "Continue", trust: "We keep your name, your reminder choices and what you tell us here. Nothing is sent automatically." },
    you: { title: "Is this you?", notYou: "Not you?" },
    reminders: { title: "Where should reminders go?", whatsapp: "WhatsApp", sms: "SMS", email: "Email", morning: "Morning", evening: "Evening", quiet: "Quiet hours are 10 pm–8 am.", phoneWhy: "So your president can open a prewritten message to you. Nothing is sent automatically." },
    busyWeeks: { title: "Which weeks are busy?", skip: "Skip — nothing busy yet", effect: "Platypus will plan around these weeks." },
    about: { title: "What would make this role worthwhile?", why: "Helps match you with tasks you'll care about." },
    done: { title: "You're in.", cta: "Open my tasks", empty: "You'll see tasks here when your president assigns one." },
  },
  // errors
  invalidInvite: "This invitation link isn't working. Ask your president to send a new one.",
} as const
