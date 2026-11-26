"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/ui/Logo";

/**
 * Marketing header. Transparent over the hero, then frosts once the page
 * scrolls — the state is a data attribute so the whole transition lives in
 * CSS and no style object is rebuilt on scroll.
 */
export function LandingNav() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="landing-nav" data-stuck={stuck}>
      <div className="landing-shell landing-nav-inner">
        <Link href="/" aria-label="SKANDA AI home" className="shrink-0">
          <Logo />
        </Link>

        <nav className="landing-nav-links" aria-label="Main">
          <a href="#how-it-works">How it works</a>
          <a href="#grounded">Accuracy</a>
          <a href="#publish">Publishing</a>
        </nav>

        <div className="landing-nav-actions">
          <Link href="/login" className="landing-nav-login">
            Log in
          </Link>
          <Link href="/signup" className="landing-cta gradient-brand glow-brand">
            Get started
            <span className="landing-cta-arrow" aria-hidden>
              <ArrowUpRight className="size-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
