import { ArrowRight } from "lucide-react";
import Link from "next/link";

const content = {
  caption: "Foundathon 3.0 | Monopoly Edition | 2026",
  heading: "claim the problem",
  headingHighlight: "own the board",
  description:
    "Pick one of multiple partner-backed real-world problem statements on a first-come, first-serve basis. Build for 2 days with direct company mentorship, then compete in a final expert-panel showdown on Day 3.",
  primaryButtonText: "Register Team",
  secondaryButtonText: "See Release Countdown",
};

const Hero = () => {
  return (
    <section
      id="overview"
      className="bg-gray-200 text-foreground font-mono relative overflow-hidden border-b border-foreground/10 scroll-mt-10"
    >
      <div
        className="absolute inset-0 z-0 opacity-55"
        style={{ backgroundImage: "url(/textures/circle-16px.svg)" }}
      />
      <div className="bg-fnyellow blur-2xl size-90 rounded-full absolute top-16 -left-16 opacity-20 z-10" />
      <div className="bg-fnblue blur-[100px] size-120 rounded-full absolute -bottom-24 right-0 opacity-20 z-10" />
      <div className="fncontainer relative flex items-center justify-center min-h-[92vh] z-10 py-20">
        <div className="flex flex-col items-center gap-7 max-w-5xl">
          <div className="rounded-full px-4 uppercase font-bold tracking-wide bg-fngreen/20 text-fngreen border-2 border-fngreen text-center">
            {content.caption}
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase text-center text-balance leading-16">
            {content.heading}{" "}
            <span className="text-fnblue italic font-extrabold">
              {content.headingHighlight}
            </span>
          </h1>
          <p className="text-foreground/70 text-center max-w-3xl text-lg">
            {content.description}
          </p>
          <div className="flex items-center mt-6 gap-4 flex-wrap justify-center">
            <Link
              href="#champion"
              className="px-6 py-3 text-xl font-bold bg-fnred/70 border-b-4 border-fnred rounded-md active:border-0 transition-discrete duration-150 flex items-center gap-2"
            >
              {content.primaryButtonText}
              <ArrowRight />
            </Link>
            <Link
              href="#release"
              className="px-6 py-3 text-xl font-bold bg-background/90 border-b-4 border-fnblue border rounded-md active:border-0 transition-discrete duration-150"
            >
              {content.secondaryButtonText}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Hero;
