"use client";

import { InView } from "../ui/in-view";

const problemHighlights = [
  {
    title: "Partner Territories (Problem Tracks)",
    detail:
      "High-impact problem statements are curated by partner companies. Each statement represents a focused track with real execution constraints.",
  },
  {
    title: "Lock Before Team Creation",
    detail:
      "Teams first complete onboarding, then lock one statement. Team registration is finalized only after the lock and create action.",
  },
  {
    title: "Per-Statement Team Cap",
    detail:
      "Each problem statement has a fixed team cap. Once filled, that statement is marked unavailable for new teams.",
  },
];

const onboardingSequence = [
  {
    step: "1. Build Team Draft",
    detail: "Fill in team details and validate members before proceeding.",
  },
  {
    step: "2. Lock One Statement",
    detail: "Choose a problem statement with available slots and lock it.",
  },
  {
    step: "3. Create Team",
    detail: "Finalize team creation and continue directly to the dashboard.",
  },
];

const About = () => {
  return (
    <section
      className="bg-background text-foreground font-mono relative scroll-auto"
      id="overview"
    >
      <div className="fncontainer relative py-20 md:py-24 space-y-16">
        <div className="space-y-5 text-center max-w-4xl mx-auto">
          <p className="rounded-full inline-flex px-3 uppercase font-bold tracking-wide bg-fngreen/20 text-fngreen border-2 border-fngreen">
            Structured Onboarding
          </p>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tighter uppercase text-balance">
            claim your block,
            <span className="text-fnblue italic font-extrabold">
              {" "}
              build your edge.
            </span>
          </h2>
          <p className="text-foreground/70 max-w-3xl mx-auto text-lg">
            Navigate curated company problems, lock your team slot early, and
            push from guided build to championship pitch in a high-intensity
            boardroom sprint.
          </p>
        </div>

        <div id="rules" className="grid gap-6 md:grid-cols-3 scroll-mt-28">
          {problemHighlights.map((item, key) => (
            <InView
              key={item.title}
              variants={{
                hidden: { opacity: 0, y: 100, filter: "blur(4px)" },
                visible: { opacity: 1, y: 0, filter: "blur(0px)" },
              }}
              viewOptions={{ margin: "0px 0px -200px 0px" }}
              transition={{ duration: 0.3 + key / 10, ease: "easeInOut" }}
              once
            >
              <div className="rounded-xl h-full bg-gray-100 border-b-4 border-fnblue border px-6 py-7 shadow-sm">
                <p className="text-xs uppercase tracking-[0.25em] text-fnblue font-bold">
                  Board Rule
                </p>
                <h3 className="text-2xl font-bold tracking-tight mt-3">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm text-foreground/80 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            </InView>
          ))}
        </div>

        <div className="rounded-2xl border border-b-4 border-fngreen bg-background/90 p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-fngreen font-bold">
            Onboarding Flow
          </p>
          <h3 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight uppercase">
            lock. create. dashboard.
          </h3>
          <p className="mt-3 text-sm md:text-base text-foreground/75 max-w-3xl">
            The registration flow is now direct and deterministic. Complete
            onboarding, lock a statement, and launch into team operations.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {onboardingSequence.map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-b-4 border-fnblue bg-gray-100 px-5 py-5 shadow-sm"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-fnblue font-bold">
                  {item.step}
                </p>
                <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          id="champion"
          className="rounded-2xl border bg-linear-to-br from-fnred to-fnredb border-b-4 border-fnredb text-white p-8 md:p-10 scroll-mt-28 shadow-lg relative overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-100 mix-blend-multiply pointer-events-none bg-repeat bg-center"
            style={{ backgroundImage: "url(/textures/noise-main.svg)" }}
          ></div>
          <div className="absolute -top-10 -right-12 size-36 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 size-28 rounded-full bg-fnyellow/20 blur-2xl" />

          <div className="relative space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em]">
                Winner Goodies
              </span>
              <span className="inline-flex rounded-full border border-fnyellow/40 bg-fnyellow/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-fnyellow">
                Monopoly Payout Zone
              </span>
            </div>

            <h3 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
              every problem statement winner unlocks premium rewards
            </h3>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-white/25 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/70 font-semibold">
                  Certification Reward
                </p>
                <p className="text-lg font-bold mt-2 leading-snug">
                  Nationally and internationally recognized certificates
                </p>
              </div>
              <div className="rounded-lg border border-white/25 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-white/70 font-semibold">
                  Career Reward
                </p>
                <p className="text-lg font-bold mt-2 leading-snug">
                  Internship opportunities from relevant partner tracks
                </p>
              </div>
            </div>

            <p className="text-white/90 text-base md:text-lg leading-relaxed">
              Rewards are tied to the problem track you choose and the partner
              company’s evaluation outcomes.
            </p>

            <div className="rounded-md border border-white/20 bg-black/10 px-4 py-3">
              <p className="text-xs md:text-sm uppercase tracking-[0.16em] text-white/80">
                * Internship access is subject to the selected problem
                statement, company policy, and final shortlist decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
