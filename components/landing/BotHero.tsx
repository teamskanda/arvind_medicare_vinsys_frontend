"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * The hero sequence: an assistant bounces on the spot, a website appears
 * behind it, and it leaps into the corner of that page to become the
 * floating launcher a visitor would actually click.
 *
 * It is a demonstration rather than decoration — the animation states the
 * product's whole promise (your assistant ends up living on your site)
 * before anyone has read a line of copy.
 *
 * Built in SVG and DOM rather than WebGL on purpose. The decisive moment is
 * the bot crossing from open space into the browser frame and *becoming*
 * the launcher inside it; that is a shared-element transition between two
 * DOM nodes, which framer-motion does natively and which a canvas object
 * cannot hand off to cleanly. A sphere is also the one form that layered
 * radial gradients render convincingly, so nothing is lost in solidity, and
 * the page avoids shipping a 3D runtime for one ornament.
 *
 * Under `prefers-reduced-motion` the sequence does not run at all: the
 * final frame — website up, assistant docked as the launcher — is rendered
 * statically, which is also the frame that communicates the most.
 */

type Phase = "bouncing" | "reveal" | "leap" | "docked";

/* Stage coordinates, in percent of the stage box. The bot's position is
   animated between these; everything else is laid out around them. */
const HOME_LEFT = 44;
const GROUND_TOP = 58;
const APEX_TOP = 30;
/* Where the launcher ends up. Tuned so the docked body clears the website
   frame's bottom-right corner by roughly the margin a real floating chat
   button sits at, rather than hanging in the middle of the page. */
const DOCK_LEFT = 84;
const DOCK_TOP = 79;

const BOUNCES = 3;
const BOUNCE_MS = 620;

const DURATION: Record<Phase, number> = {
  bouncing: BOUNCES * BOUNCE_MS,
  reveal: 950,
  leap: 900,
  docked: 2900,
};

const NEXT: Record<Phase, Phase> = {
  bouncing: "reveal",
  reveal: "leap",
  leap: "docked",
  docked: "bouncing",
};

export function BotHero() {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduced ? "docked" : "bouncing");

  useEffect(() => {
    if (reduced) return;
    const timer = setTimeout(() => setPhase(NEXT[phase]), DURATION[phase]);
    return () => clearTimeout(timer);
  }, [phase, reduced]);

  const pageVisible = phase !== "bouncing";
  const docked = phase === "docked";
  const airborne = phase === "bouncing" || phase === "leap";

  /* Each phase supplies the bot's whole trajectory as keyframes. Writing
     them per phase, rather than as one long timeline, keeps each movement
     independently tunable and lets the loop restart cleanly. */
  const travel = {
    bouncing: {
      left: `${HOME_LEFT}%`,
      top: [
        `${GROUND_TOP}%`,
        `${APEX_TOP}%`,
        `${GROUND_TOP}%`,
        `${APEX_TOP + 2}%`,
        `${GROUND_TOP}%`,
        `${APEX_TOP + 5}%`,
        `${GROUND_TOP}%`,
      ],
      scale: 1,
      rotate: [0, -5, 0, 4, 0, -3, 0],
    },
    reveal: {
      left: `${HOME_LEFT}%`,
      top: `${GROUND_TOP}%`,
      scale: 1,
      rotate: 0,
    },
    leap: {
      // An arc, not a straight line: up and across, then down into the
      // corner, shrinking as it "lands" into the page.
      left: [`${HOME_LEFT}%`, `${(HOME_LEFT + DOCK_LEFT) / 2}%`, `${DOCK_LEFT}%`],
      top: [`${GROUND_TOP}%`, "16%", `${DOCK_TOP}%`],
      // Ends at launcher size: 0.3 of the travel box puts the shell at
      // roughly 55px, which is what a real floating chat button measures.
      scale: [1, 0.84, 0.3],
      rotate: [0, 14, 0],
    },
    docked: {
      left: `${DOCK_LEFT}%`,
      top: `${DOCK_TOP}%`,
      scale: 0.3,
      rotate: 0,
    },
  }[phase];

  const travelTransition = {
    bouncing: {
      duration: DURATION.bouncing / 1000,
      ease: "easeOut" as const,
      times: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1],
    },
    reveal: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
    leap: {
      duration: DURATION.leap / 1000,
      ease: [0.34, 0.6, 0.3, 1] as const,
      times: [0, 0.45, 1],
    },
    docked: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
  }[phase];

  return (
    <div
      className="bot-stage"
      // The dock point is published to CSS so the greeting bubble and the
      // halo can be placed against the same coordinates the bot actually
      // travels to. They previously carried their own hand-written offsets,
      // which is how the bubble ended up sitting on the bot's face.
      style={
        {
          "--dock-left": `${DOCK_LEFT}%`,
          "--dock-top": `${DOCK_TOP}%`,
        } as React.CSSProperties
      }
    >
      {/* ---------------------------------------------- the website ---- */}
      <AnimatePresence>
        {pageVisible ? (
          <motion.div
            className="bot-page"
            aria-hidden
            initial={reduced ? false : { opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.3 } }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            <MiniSite />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ------------------------------------------------- the shadow ---- */}
      {!docked ? (
        <motion.span
          className="bot-shadow"
          aria-hidden
          animate={
            phase === "bouncing"
              ? {
                  left: `${HOME_LEFT}%`,
                  opacity: [0.5, 0.18, 0.5, 0.2, 0.5, 0.24, 0.5],
                  scaleX: [1, 0.6, 1, 0.65, 1, 0.72, 1],
                }
              : phase === "leap"
                ? { opacity: 0, scaleX: 0.4 }
                : { left: `${HOME_LEFT}%`, opacity: 0.5, scaleX: 1 }
          }
          transition={
            phase === "bouncing"
              ? {
                  duration: DURATION.bouncing / 1000,
                  times: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1],
                }
              : { duration: 0.4 }
          }
        />
      ) : null}

      {/* ---------------------------------------------------- the bot ---- */}
      <motion.div
        className="bot-travel"
        animate={travel}
        transition={travelTransition}
      >
        {/* Squash and stretch lives on its own layer so it can run against
            the travel keyframes without the two fighting over `scale`. */}
        <motion.div
          animate={
            phase === "bouncing"
              ? {
                  scaleY: [0.86, 1.12, 0.86, 1.1, 0.88, 1.08, 0.9],
                  scaleX: [1.14, 0.9, 1.14, 0.92, 1.12, 0.94, 1.1],
                }
              : { scaleY: 1, scaleX: 1 }
          }
          transition={
            phase === "bouncing"
              ? {
                  duration: DURATION.bouncing / 1000,
                  times: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1],
                }
              : { duration: 0.3 }
          }
          style={{ transformOrigin: "50% 90%" }}
        >
          <BotAvatar airborne={airborne} docked={docked} reduced={!!reduced} />
        </motion.div>
      </motion.div>

      {/* Halo confirming the launcher has landed. It lives here, in the
          stage, rather than inside the website frame — the frame is inset
          from the stage, so a halo positioned within it was measuring from
          a different origin than the bot and sat visibly off-centre. */}
      {docked ? <span className="bot-dock-halo" aria-hidden /> : null}

      {/* ------------------------------------------ the greeting ---- */}
      <AnimatePresence>
        {docked ? (
          <motion.div
            className="bot-bubble"
            aria-hidden
            initial={reduced ? false : { opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
            transition={{
              duration: 0.45,
              delay: reduced ? 0 : 0.25,
              ease: [0.34, 1.56, 0.64, 1],
            }}
          >
            Hi — ask me anything about this site.
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ====================================================================== */

/**
 * The assistant itself: a round glossy shell in white, a burgundy crown
 * across the top, and a circular monitor set into the front for a face.
 *
 * The face is a screen, not a painted-on expression — it has a bezel sunk
 * into the shell, a raking glass highlight and faint scanlines. Those
 * scanlines are almost invisible individually and are the single detail
 * that stops the panel reading as a dark sticker on a ball.
 *
 * Solidity comes from stacked gradients standing in for a three-light
 * setup — a key above left, the burgundy body colour falling to near-black
 * at the lower right, and a cool bounce light coming back up off the
 * floor. Resolving that once at authoring time gets the same read as a
 * rendered object for none of the runtime cost.
 *
 * Every face shape is a `Q`-curve path with a matching command count, so
 * framer-motion can interpolate between expressions directly. Arc (`A`)
 * commands would have been shorter to write but do not morph reliably.
 */
function BotAvatar({
  airborne,
  docked,
  reduced,
}: {
  airborne: boolean;
  docked: boolean;
  reduced: boolean;
}) {
  const [lineEyes, setLineEyes] = useState(false);

  /* The eyes rest as circles and flick to lines now and then. Held for
     220ms rather than a blink's ~130ms, so the line shape actually reads
     as an expression instead of a glitch. The interval is deliberately
     irregular — a perfectly regular blink is what makes a face look
     mechanical. */
  useEffect(() => {
    if (reduced) return;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timer = setTimeout(
        () => {
          setLineEyes(true);
          setTimeout(() => setLineEyes(false), 220);
          schedule();
        },
        2400 + Math.random() * 2600,
      );
    };

    schedule();
    return () => clearTimeout(timer);
  }, [reduced]);

  /* Face geometry, inside the circular screen (centre 70,74 · r 31). The
     eyes are rects whose corner radius makes them read as dots or dashes,
     which interpolates cleanly — a circle element cannot morph into a
     line, but a rounded rect collapsing its height can. */
  const eyeCy = airborne ? 66 : 68;
  const eye = lineEyes
    ? { w: 14.5, h: 3.4, r: 1.7 }
    : airborne
      ? { w: 13.5, h: 13.5, r: 6.75 }
      : { w: 12, h: 12, r: 6 };

  const eyeAt = (cx: number) => ({
    x: cx - eye.w / 2,
    y: eyeCy - eye.h / 2,
    width: eye.w,
    height: eye.h,
    rx: eye.r,
  });

  /* Resting shape, passed as `initial` so the server renders real eyes.
     A motion element whose geometry lives only in `animate` has no width
     until hydration, which shows as a momentarily faceless bot. */
  const eyeRest = (cx: number) => ({
    x: cx - 6,
    y: 62,
    width: 12,
    height: 12,
    rx: 6,
  });

  /* The smile is always a stroked line, never a filled shape. */
  const smile = airborne
    ? "M 56 84 Q 70 96 84 84"
    : docked
      ? "M 59 85 Q 70 92 81 85"
      : "M 57 85 Q 70 95 83 85";

  return (
    <svg
      viewBox="0 0 140 140"
      className="bot-avatar"
      role="img"
      aria-label="A friendly assistant hopping into a website, where it becomes the chat button"
    >
      <defs>
        {/* White shell — bright above left, shading to warm grey below. */}
        <linearGradient id="bot-shell" x1="22%" y1="4%" x2="78%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="46%" stopColor="#f3edf0" />
          <stop offset="100%" stopColor="#bfb2ba" />
        </linearGradient>

        {/* Burgundy crown. */}
        <linearGradient id="bot-crown" x1="26%" y1="0%" x2="74%" y2="100%">
          <stop offset="0%" stopColor="#f08cb0" />
          <stop offset="34%" stopColor="#c0456b" />
          <stop offset="76%" stopColor="#8e2548" />
          <stop offset="100%" stopColor="#5c162f" />
        </linearGradient>

        {/* Visor glass. */}
        <radialGradient id="bot-visor" cx="36%" cy="22%" r="88%">
          <stop offset="0%" stopColor="#58183a" />
          <stop offset="48%" stopColor="#2c0c1e" />
          <stop offset="100%" stopColor="#120410" />
        </radialGradient>

        {/* Bounce light off the floor. */}
        <radialGradient id="bot-bounce" cx="56%" cy="98%" r="56%">
          <stop offset="0%" stopColor="#a56bff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#a56bff" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="bot-gloss" x1="0%" y1="0%" x2="30%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Just enough bloom to suggest a lit display. Anything stronger
            and the face stops looking like pixels behind glass and starts
            looking like neon. */}
        <filter id="bot-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Inside the screen glass, darkening toward the lower edge. */}
        <linearGradient id="bot-screen-inner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Scanlines. Barely visible on their own — but they are what makes
            the panel read as a display rather than a dark sticker. */}
        <pattern
          id="bot-scanlines"
          width="3"
          height="3"
          patternUnits="userSpaceOnUse"
        >
          <rect width="3" height="1.1" fill="#ffffff" opacity="0.055" />
        </pattern>

        {/* Keeps the crown inside the shell's circular silhouette. */}
        <clipPath id="bot-head-clip">
          <circle cx="70" cy="70" r="46" />
        </clipPath>
        <clipPath id="bot-screen-clip">
          <circle cx="70" cy="74" r="31" />
        </clipPath>
      </defs>

      {/* ---- round white shell ---- */}
      <circle cx="70" cy="70" r="46" fill="url(#bot-shell)" />

      {/* ---- burgundy crown, clipped to the circle ---- */}
      <g clipPath="url(#bot-head-clip)">
        {/* A single clean sweep rather than a scalloped edge — the simpler
            silhouette is what keeps this reading as a product mark and not
            a cartoon. */}
        <path d="M 20 44 Q 70 26 120 44 L 120 14 L 20 14 Z" fill="url(#bot-crown)" />
        <path
          d="M 34 38 Q 56 26 82 29 Q 60 33 44 44 Z"
          fill="#ffffff"
          opacity="0.22"
        />
        {/* Occlusion along the bottom of the sphere. */}
        <ellipse cx="70" cy="124" rx="46" ry="22" fill="#4a1026" opacity="0.3" />
        <circle cx="70" cy="70" r="46" fill="url(#bot-bounce)" />
      </g>

      {/* Shell rim light. */}
      <circle
        cx="70"
        cy="70"
        r="45.3"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.7"
        strokeWidth="1.3"
      />

      {/* ---- circular monitor ---- */}
      {/* Sat 4px below the shell's centre, which leaves a proper band for
          the crown above and a narrow chin below — the proportions a real
          device has, rather than a disc floating dead centre. */}
      <circle
        cx="70"
        cy="74"
        r="34"
        fill="#efe6eb"
        stroke="#00000016"
        strokeWidth="1"
      />
      <circle cx="70" cy="74" r="31" fill="url(#bot-visor)" />

      <g clipPath="url(#bot-screen-clip)">
        <rect x="39" y="43" width="62" height="62" fill="url(#bot-scanlines)" />
        <rect
          x="39"
          y="43"
          width="62"
          height="62"
          fill="url(#bot-screen-inner)"
        />
        {/* Glass highlight raking across the top-left of the panel. */}
        <path d="M 37 80 L 62 48 L 76 48 L 46 92 Z" fill="url(#bot-gloss)" />
      </g>

      {/* Screen edge. */}
      <circle
        cx="70"
        cy="74"
        r="31"
        fill="none"
        stroke="#ff9dc0"
        strokeOpacity="0.24"
        strokeWidth="1.1"
      />

      {/* ---- face, drawn on the screen ---- */}
      <g filter="url(#bot-glow)">
        <motion.rect
          fill="#ffffff"
          initial={eyeRest(57)}
          animate={eyeAt(57)}
          transition={{ duration: 0.16, ease: "easeOut" }}
        />
        <motion.rect
          fill="#ffffff"
          initial={eyeRest(83)}
          animate={eyeAt(83)}
          transition={{ duration: 0.16, ease: "easeOut" }}
        />
        <motion.path
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          d="M 57 85 Q 70 95 83 85"
          animate={{ d: smile }}
          transition={{ duration: 0.22 }}
        />
      </g>
    </svg>
  );
}

/* ====================================================================== */

/** The website the assistant lands in: chrome, a little content, and the
 *  empty corner that the bot is about to occupy. */
function MiniSite() {
  return (
    <div className="landing-frame h-full">
      <div className="landing-frame-bar">
        <span className="landing-frame-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="landing-frame-url">yourbusiness.com</span>
        <span className="w-[46px]" aria-hidden />
      </div>

      <div className="bot-page-body">
        <span className="bot-skeleton" style={{ width: "58%", height: 15 }} />
        <span className="bot-skeleton" style={{ width: "88%" }} />
        <span className="bot-skeleton" style={{ width: "74%" }} />
        <div className="bot-page-cards">
          <span className="bot-skeleton-card" />
          <span className="bot-skeleton-card" />
        </div>
        <span className="bot-skeleton" style={{ width: "46%" }} />
      </div>
    </div>
  );
}
