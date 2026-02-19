export const PROBLEM_STATEMENT_CAP = 10;

export type ProblemStatement = {
  id: string;
  summary: string;
  title: string;
};

export const PROBLEM_STATEMENTS: ProblemStatement[] = [
  {
    id: "ps-01",
    title: "Campus Mobility Optimizer",
    summary:
      "Design a system that improves first-mile and last-mile mobility around large university campuses.",
  },
  {
    id: "ps-02",
    title: "Smart Hostel Energy Control",
    summary:
      "Build a measurable solution to reduce hostel electricity waste without affecting student comfort.",
  },
  {
    id: "ps-03",
    title: "Peer Learning Match Engine",
    summary:
      "Create a matching platform that pairs students by skills, availability, and learning goals.",
  },
  {
    id: "ps-04",
    title: "Sustainable Food Court Operations",
    summary:
      "Propose a product to track and reduce food waste across campus food court vendors.",
  },
  {
    id: "ps-05",
    title: "Verified Student Marketplace",
    summary:
      "Build a trusted buy/sell marketplace for students with identity verification and dispute handling.",
  },
  {
    id: "ps-06",
    title: "Event Footfall Intelligence",
    summary:
      "Design analytics that helps clubs forecast turnout and improve event engagement.",
  },
  {
    id: "ps-07",
    title: "Placement Readiness Signal",
    summary:
      "Develop an assessment and recommendation layer that predicts and improves placement readiness.",
  },
  {
    id: "ps-08",
    title: "Accessible Campus Navigation",
    summary:
      "Create an accessibility-first navigation assistant for visually and mobility-impaired users.",
  },
  {
    id: "ps-09",
    title: "Micro-Internship Exchange",
    summary:
      "Build a product that connects local startups with students for short, outcome-based projects.",
  },
  {
    id: "ps-10",
    title: "Research Collaboration Graph",
    summary:
      "Design a discovery tool that maps interests and enables cross-department research collaboration.",
  },
  {
    id: "ps-11",
    title: "Digital Queue for Campus Services",
    summary:
      "Reimagine queueing for high-traffic student services using time slots and real-time updates.",
  },
  {
    id: "ps-12",
    title: "Mental Wellness Support Router",
    summary:
      "Create a privacy-safe triage assistant that routes students to the right wellness resources.",
  },
  {
    id: "ps-13",
    title: "Alumni Mentorship Pipeline",
    summary:
      "Build a structured mentorship workflow connecting alumni with student cohorts at scale.",
  },
  {
    id: "ps-14",
    title: "Lab Asset Utilization Dashboard",
    summary:
      "Develop a dashboard that tracks lab equipment usage and improves scheduling efficiency.",
  },
  {
    id: "ps-15",
    title: "Community Impact Tracker",
    summary:
      "Design a framework that quantifies and reports social impact for student-led initiatives.",
  },
];

const statementMap = new Map(PROBLEM_STATEMENTS.map((item) => [item.id, item]));

export const getProblemStatementById = (problemStatementId: string) =>
  statementMap.get(problemStatementId) ?? null;
