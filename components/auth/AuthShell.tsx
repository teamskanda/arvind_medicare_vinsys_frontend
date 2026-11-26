"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { FileText, Code2, ShieldCheck, type LucideIcon } from "lucide-react";

import { Logo } from "@/components/ui/Logo";

const POINTS: { icon: LucideIcon; term: string; detail: string }[] = [
  {
    icon: FileText,
    term: "Built from your pages",
    detail:
      "Every answer is grounded in content read from your own site — never invented.",
  },
  {
    icon: ShieldCheck,
    term: "You control the sources",
    detail:
      "Review each page it finds and exclude anything the assistant should not use.",
  },
  {
    icon: Code2,
    term: "Publish anywhere",
    detail:
      "One private address per assistant. Paste a single line of HTML and it is live.",
  },
];

/**
 * Sign-in layout: the form on a glass panel at left, the product's case at
 * right, both standing on the same aurora field as the marketing page — so
 * arriving here from the landing page feels like one continuous surface
 * rather than a jump into a utility screen.
 *
 * The right column is decorative reinforcement and collapses below `lg`;
 * nothing in it is needed to complete the form.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const reduced = useReducedMotion();

  const enter = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 18, filter: "blur(8px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-canvas">
      <div className="aurora-field" aria-hidden />
      <div className="grid-field" aria-hidden />
      <div className="grain" aria-hidden />

      <div className="relative z-10 flex min-h-dvh flex-col lg:flex-row">
        {/* ------------------------------------------------- form ----- */}
        <div className="flex flex-1 flex-col px-5 py-7 sm:px-10 lg:px-16">
          <Link
            href="/"
            className="inline-flex w-fit"
            aria-label="SKANDA AI home"
          >
            <Logo />
          </Link>

          <div className="flex flex-1 items-center justify-center py-10">
            <motion.div className="w-full max-w-[412px]" {...enter}>
              <div className="auth-panel">
                <h1 className="text-[1.65rem] leading-tight font-semibold tracking-[-0.035em] text-ink-900">
                  {title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  {subtitle}
                </p>

                <div className="mt-7">{children}</div>
              </div>

              <div className="mt-6 text-center text-sm text-ink-500">
                {footer}
              </div>
            </motion.div>
          </div>
        </div>

        {/* ------------------------------------------------ aside ----- */}
        <aside className="relative hidden border-l border-ink-100 lg:flex lg:w-[44%] lg:flex-col lg:justify-center lg:px-16">
          <motion.div
            {...(reduced
              ? {}
              : {
                  initial: { opacity: 0, x: 24 },
                  animate: { opacity: 1, x: 0 },
                  transition: {
                    duration: 0.8,
                    delay: 0.15,
                    ease: [0.16, 1, 0.3, 1] as const,
                  },
                })}
          >
            <p className="landing-kicker">Your knowledge, in conversation</p>

            <p className="mt-6 max-w-md text-[1.35rem] leading-[1.45] font-medium tracking-[-0.03em] text-ink-900">
              Paste a website address. SKANDA AI reads the site, builds a
              knowledge base from it, and gives you an{" "}
              <span className="font-display text-burgundy-700 italic">
                assistant that answers from your own content.
              </span>
            </p>

            <dl className="mt-11 max-w-md space-y-7 border-t border-ink-100 pt-9">
              {POINTS.map((item, index) => (
                <motion.div
                  key={item.term}
                  className="auth-aside-item"
                  {...(reduced
                    ? {}
                    : {
                        initial: { opacity: 0, y: 14 },
                        animate: { opacity: 1, y: 0 },
                        transition: {
                          duration: 0.6,
                          delay: 0.3 + index * 0.1,
                          ease: [0.16, 1, 0.3, 1] as const,
                        },
                      })}
                >
                  <span className="auth-aside-icon" aria-hidden>
                    <item.icon strokeWidth={1.6} />
                  </span>
                  <div>
                    <dt className="text-sm font-semibold text-ink-900">
                      {item.term}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-ink-500">
                      {item.detail}
                    </dd>
                  </div>
                </motion.div>
              ))}
            </dl>
          </motion.div>
        </aside>
      </div>
    </div>
  );
}
