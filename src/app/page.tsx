import About from "@/components/sections/About";
import Header from "@/components/sections/Header";
import Hero from "@/components/sections/Hero";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <About />
    </div>
  );
}
