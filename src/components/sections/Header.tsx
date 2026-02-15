"use client";

import { User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FnButton } from "@/components/ui/fn-button";
import { LineShadowText } from "@/components/ui/line-shadow-text";
import { createClient } from "@/utils/supabase/client";
import { ConfettiButton } from "../ui/confetti-button";

const Header = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const isRegistered = Boolean(teamId);

  const navLinks = [
    { href: "/#overview", label: "Overview" },
    { href: "/#rules", label: "Rules" },
    { href: "/#release", label: "Release" },
    { href: "/#champion", label: "Goodies" },
  ];

  const handleIsRegistered = useCallback(async () => {
    try {
      const res = await fetch("/api/register", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        setTeamId(null);
        return;
      }

      const data = (await res.json()) as { teams?: { id: string }[] };
      setTeamId(data.teams?.[0]?.id ?? null);
    } catch {
      setTeamId(null);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const syncSignedInState = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!isMounted) return;

        const signedIn = Boolean(user);
        setIsSignedIn(signedIn);

        if (signedIn) {
          await handleIsRegistered();
        } else {
          setTeamId(null);
        }
      } catch {
        if (isMounted) {
          setIsSignedIn(false);
          setTeamId(null);
        }
      }
    };

    void syncSignedInState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const signedIn = Boolean(session?.user);
      setIsSignedIn(signedIn);

      if (signedIn) {
        void handleIsRegistered();
      } else {
        setTeamId(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [handleIsRegistered]);

  return (
    <div className="border-b border-foreground/10 shadow-sm p-4 font-semibold sticky top-0 z-50 bg-background/60 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="fncontainer flex items-center justify-between gap-4">
        <div className="absolute left-1 md:left-2 xl:left-3 2xl:left-5">
          <ConfettiButton
            options={{
              get angle() {
                return Math.floor(Math.random() * 90) + 270;
              },
            }}
            className="bg-transparent hover:bg-transparent"
          >
            <Link
              href="https://www.thefoundersclub.in/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/logo.svg"
                alt="alt"
                width={40}
                height={40}
                className="h-8 w-auto"
              />
            </Link>
          </ConfettiButton>
        </div>
        <Link
          href="/#overview"
          className="text-xl md:text-3xl ml-2 flex items-start gap-2 font-mono uppercase font-extrabold italic"
        >
          <LineShadowText>Foundathon</LineShadowText>
          {""}
          <LineShadowText>3.0</LineShadowText>
        </Link>

        <div className="flex flex-1 items-center justify-end gap-6">
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((item) => (
              <FnButton key={item.href} asChild kind="nav">
                <Link href={item.href}>{item.label}</Link>
              </FnButton>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <FnButton asChild tone="gray" className="hidden sm:inline-flex">
              <Link href="/problem-statements">Problem Statements</Link>
            </FnButton>
            {isRegistered ? (
              <FnButton asChild tone="blue">
                <Link href={`/team/${teamId}`}>Dashboard</Link>
              </FnButton>
            ) : (
              <FnButton asChild tone="blue">
                <Link href="/register">Register Team</Link>
              </FnButton>
            )}
            {isSignedIn ? (
              <FnButton tone={"yellow"}>
                <User size={20} strokeWidth={3} />
              </FnButton>
            ) : (
              <FnButton asChild tone="yellow">
                <Link href="/api/auth/login">Sign In</Link>
              </FnButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Header;
