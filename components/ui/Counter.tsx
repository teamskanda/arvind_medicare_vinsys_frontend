"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useEffect } from "react";

/**
 * A number that rolls to its new value instead of snapping to it.
 *
 * Every figure on the crawl screen is polled every few seconds, so without
 * this the counts jump — and a jump reads as a page reload rather than as
 * something being counted. Rolling the digits is what tells the customer the
 * number is live.
 *
 * The value lives in a MotionValue and is rendered straight into the span, so
 * the animation never touches React state: a four-counter row animating at
 * 60fps causes zero re-renders of the page around it.
 *
 * `start` seeds the first frame only. Pass `start={0}` where the number is
 * part of an arrival moment and should count up on mount; leave it off in
 * places like list cards, where a settled figure should simply be there.
 */
export function Counter({
  value,
  start,
  duration = 0.9,
  className,
  format,
}: {
  value: number;
  start?: number;
  duration?: number;
  className?: string;
  format?: (value: number) => string;
}) {
  const reduced = useReducedMotion();
  const count = useMotionValue(start ?? value);
  const text = useTransform(count, (latest) => {
    const rounded = Math.round(latest);
    return format ? format(rounded) : rounded.toLocaleString();
  });

  useEffect(() => {
    if (reduced) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [value, duration, reduced, count]);

  // The MotionValue's current value is what renders on the server, so the
  // markup is never empty — it ships the start value and animates from there.
  return (
    <motion.span className={className} aria-hidden>
      {text}
    </motion.span>
  );
}

/**
 * Screen-reader-safe wrapper: the rolling digits are decorative mid-flight,
 * so assistive tech gets the settled figure instead of every frame of it.
 */
export function LiveCount({
  value,
  label,
  ...rest
}: {
  value: number;
  label?: string;
  start?: number;
  duration?: number;
  className?: string;
  format?: (value: number) => string;
}) {
  return (
    <>
      <Counter value={value} {...rest} />
      <span className="sr-only">
        {value.toLocaleString()}
        {label ? ` ${label}` : ""}
      </span>
    </>
  );
}
