"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bot, FileText, User } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * A small, honest illustration of what the assistant does: a question, a
 * pause, an answer, and the page the answer came from.
 *
 * The cited source is the point. Anyone can show a chat bubble; the thing
 * worth putting on the marketing page is that every reply names the page it
 * was grounded in, because that is the product's actual claim.
 *
 * The sequence loops on a timer. Under `prefers-reduced-motion` it renders
 * the finished exchange immediately and never advances — a looping
 * animation is exactly what that preference is asking us not to do.
 */

const STEPS = ["question", "thinking", "answer"] as const;

export function ChatPreview() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(reduced ? 2 : 0);

  useEffect(() => {
    if (reduced) return;

    const delays = [1500, 1400, 4200];
    const timer = setTimeout(
      () => setStep((current) => (current + 1) % STEPS.length),
      delays[step],
    );
    return () => clearTimeout(timer);
  }, [step, reduced]);

  const showQuestion = step >= 0;
  const showThinking = step === 1;
  const showAnswer = step === 2;

  return (
    <div className="landing-frame">
      <div className="landing-frame-bar">
        <span className="landing-frame-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="landing-frame-url">yourbusiness.com</span>
        <span className="w-[46px]" aria-hidden />
      </div>

      <div className="landing-frame-body">
        <AnimatePresence mode="popLayout" initial={false}>
          {showQuestion ? (
            <Row key="q" user delay={0}>
              What are your opening hours on a Sunday?
            </Row>
          ) : null}

          {showThinking ? (
            <Row key="t" delay={0}>
              <span className="landing-typing" aria-label="Assistant is typing">
                <i />
                <i />
                <i />
              </span>
            </Row>
          ) : null}

          {showAnswer ? (
            <Row key="a" delay={0}>
              We&rsquo;re open 10am&ndash;4pm on Sundays, with the kitchen
              closing at 3:30pm. Bank holiday Sundays run on the same hours.
              <span className="landing-chat-cite">
                <FileText aria-hidden />
                Grounded in <strong>/visit/opening-hours</strong>
              </span>
            </Row>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Row({
  children,
  user = false,
  delay,
}: {
  children: React.ReactNode;
  user?: boolean;
  delay: number;
}) {
  const reduced = useReducedMotion();

  const animation = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 12, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -8, scale: 0.98 },
        transition: { duration: 0.42, delay, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <motion.div
      layout={!reduced}
      className={`landing-chat-row${user ? " is-user" : ""}`}
      {...animation}
    >
      <span className="landing-chat-avatar" aria-hidden>
        {user ? <User /> : <Bot />}
      </span>
      <p className="landing-chat-bubble">{children}</p>
    </motion.div>
  );
}
