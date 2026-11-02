/**
 * Shared pool (v1.2 demo of the v2 cross-club idea). Lives on our server, not in any club's browser data.
 * The assistant may READ it to give advice; nothing in the app or the AI can write to it.
 * EVERYTHING HERE IS FICTIONAL demo data — no survey, interview or participant data (AGENTS.md rule 1).
 * In v1.5/v2 this file is replaced by a database table that clubs opt in to share with.
 */
export const SHARED_POOL = {
    note: "Fictional demo data shared by example clubs. Advice only; check the rule book and the office for anything official.",
    clubs: [
        { id: "pool-robotics", name: "Sun Devil Robotics Guild (example)", size: 60 },
        { id: "pool-film", name: "Tempe Film Collective (example)", size: 35 },
        { id: "pool-culture", name: "Global Kitchen Club (example)", size: 90 },
        { id: "pool-pitch", name: "Pitch Night Society (example)", size: 45 },
    ],
    approvalTimes: [
        { process: "USG funding request", medianWeeks: 3, reports: 12, tip: "Requests sent the week after a USG meeting waited longest." },
        { process: "Outside caterer food exception", medianWeeks: 2, reports: 7, tip: "Attach the caterer's insurance proof up front; missing proof was the most common hold-up." },
        { process: "Room booking through Event Services", medianWeeks: 1, reports: 15, tip: "Large rooms in the Memorial Union filled first in November." },
        { process: "Off-campus travel approval", medianWeeks: 2.5, reports: 4, tip: "Rosters were requested twice; send the final roster with the first submission." },
    ],
    venues: [
        { name: "Memorial Union meeting room (example)", capacity: 40, sharedBy: "pool-pitch", note: "Good for workshops; projector worked every time." },
        { name: "Engineering lecture hall (example)", capacity: 120, sharedBy: "pool-robotics", note: "Needs a faculty sponsor signature for evening use." },
        { name: "Student Pavilion courtyard (example)", capacity: 200, sharedBy: "pool-culture", note: "Outdoor; plan a rain room. Food trucks allowed with approval." },
    ],
    vendors: [
        { name: "Desert Bites Catering (example)", category: "caterer", sharedBy: "pool-culture", note: "Has an ASU-ready insurance certificate; needed a 10-business-day lead in reports." },
        { name: "Copper Print Shop (example)", category: "printing", sharedBy: "pool-film", note: "Posters same week; student discount on request." },
        { name: "Valley Startup Mentors (example)", category: "speakers", sharedBy: "pool-pitch", note: "Volunteer judges for pitch nights; book through their coordinator." },
    ],
    lessons: [
        { topic: "Speaker events", sharedBy: "pool-pitch", text: "Confirm the speaker and the room in the same week; when one slipped, the other had to be redone." },
        { topic: "Food events", sharedBy: "pool-culture", text: "Headcount above 100 changed the food rules for two clubs; lock the RSVP cap early." },
        { topic: "Officer handoff", sharedBy: "pool-robotics", text: "Clubs that shared passwords and partner contacts before finals had a smoother first month." },
    ],
};
