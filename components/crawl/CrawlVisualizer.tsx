"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { CrawlStatusResponse } from "@/types";

/**
 * The live scene on the "building your knowledge base" screen.
 *
 * This is the one place in the product that earns a set piece. Scraping a
 * site takes about a minute, and for that minute the customer has nothing to
 * do but watch — so the wait itself is the experience. A spinner says only
 * "something is happening"; this says what is happening: their website on the
 * left, pages travelling across, a knowledge base filling on the right.
 *
 * Everything load-bearing is driven by the server's real figures. The fill
 * level is `successful / discovered` — an actual ratio, not a made-up
 * percentage — and the travelling pages stop the moment the job reaches a
 * terminal state. The only invented quantity is how many page glyphs are in
 * flight at once, which stands for "work is ongoing" and is true whenever it
 * is shown.
 */

/* Stage geometry. One source of truth, so the conduits, the glow and the
   token paths cannot drift apart from the nodes they connect. */
const ROOT = { x: 112, y: 115, r: 32 };
const CORE = { x: 596, y: 115, r: 40 };
const RING_R = 56;
const RING_C = 2 * Math.PI * RING_R;

/** Three lanes, bowed by different amounts, so the flow has depth. */
const LANES = [
  { controlY: 46, width: 1.4, opacity: 0.5 },
  { controlY: 115, width: 1.8, opacity: 0.8 },
  { controlY: 184, width: 1.4, opacity: 0.5 },
];

const LANE_START = { x: ROOT.x + ROOT.r + 8, y: ROOT.y };
const LANE_END = { x: CORE.x - RING_R - 6, y: CORE.y };

function laneControl(controlY: number) {
  return { x: (LANE_START.x + LANE_END.x) / 2, y: controlY };
}

function lanePath(controlY: number) {
  const c = laneControl(controlY);
  return `M ${LANE_START.x} ${LANE_START.y} Q ${c.x} ${c.y} ${LANE_END.x} ${LANE_END.y}`;
}

/**
 * Samples a quadratic bezier into keyframe arrays.
 *
 * Framer Motion cannot animate an element *along* a path, and `offset-path`
 * is still uneven across the browsers this has to run in. Sampling the curve
 * and handing the points over as keyframes gets the same result with no
 * platform risk: at 14 points the straight segments between them are far
 * shorter than a pixel at render size.
 */
function sampleCurve(controlY: number, points = 14) {
  const c = laneControl(controlY);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= points; i += 1) {
    const t = i / points;
    const u = 1 - t;
    xs.push(u * u * LANE_START.x + 2 * u * t * c.x + t * t * LANE_END.x);
    ys.push(u * u * LANE_START.y + 2 * u * t * c.y + t * t * LANE_END.y);
  }
  return { xs, ys };
}

/** Which lane each in-flight page glyph rides, and how it is spaced out. */
const TOKENS = [
  { lane: 1, delay: 0, duration: 2.5 },
  { lane: 0, delay: 0.55, duration: 2.9 },
  { lane: 2, delay: 0.95, duration: 2.7 },
  { lane: 1, delay: 1.5, duration: 2.5 },
  { lane: 0, delay: 2.1, duration: 2.9 },
  { lane: 2, delay: 2.5, duration: 2.7 },
];

export function CrawlVisualizer({ status }: { status: CrawlStatusResponse }) {
  const reduced = useReducedMotion();

  const failed = status.crawl_status === "failed";
  const active = !status.is_terminal && !failed;
  const flowing = active && !reduced;

  const ratio =
    status.discovered_pages > 0
      ? Math.min(1, status.successful_pages / status.discovered_pages)
      : status.is_terminal && status.successful_pages > 0
        ? 1
        : 0;

  // The liquid's surface travels from the bottom of the core to its top.
  const span = CORE.r * 2;
  const lift = ratio * span;

  const label = failed
    ? "Scraping stopped before the knowledge base was complete."
    : status.is_terminal
      ? `Knowledge base complete with ${status.successful_pages} pages stored.`
      : `Reading your website: ${status.successful_pages} of ${status.discovered_pages} discovered pages stored so far.`;

  return (
    <div className={cn("crawl-canvas", failed && "is-failed")}>
      <div className="crawl-canvas-grid" aria-hidden />

      <svg
        className="crawl-canvas-svg"
        viewBox="0 0 720 230"
        role="img"
        aria-label={label}
      >
        <defs>
          <linearGradient id="cv-liquid" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#8e2548" />
            <stop offset="55%" stopColor="#c0456b" />
            <stop offset="100%" stopColor="#e884ab" />
          </linearGradient>
          <linearGradient id="cv-ring" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#8e2548" />
            <stop offset="100%" stopColor="#f0a5c2" />
          </linearGradient>
          <linearGradient id="cv-lane" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d4578a" stopOpacity="0" />
            <stop offset="35%" stopColor="#d4578a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f0a5c2" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="cv-bloom">
            <stop offset="0%" stopColor="#c0456b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#c0456b" stopOpacity="0" />
          </radialGradient>
          <clipPath id="cv-core-clip">
            <circle cx={CORE.x} cy={CORE.y} r={CORE.r} />
          </clipPath>
        </defs>

        {/* Bloom behind the core: the light the filling knowledge base casts. */}
        <circle cx={CORE.x} cy={CORE.y} r={96} fill="url(#cv-bloom)" />

        {/* ---------- conduits ---------- */}
        {LANES.map((lane, index) => (
          <g key={index}>
            <path
              d={lanePath(lane.controlY)}
              fill="none"
              stroke="#ffffff1f"
              strokeWidth={lane.width}
              strokeLinecap="round"
            />
            {flowing ? (
              <path
                className="crawl-lane-flow"
                d={lanePath(lane.controlY)}
                fill="none"
                stroke="url(#cv-lane)"
                strokeWidth={lane.width + 0.6}
                strokeLinecap="round"
                strokeDasharray="3 16"
                opacity={lane.opacity}
                style={{ animationDelay: `${index * -0.5}s` }}
              />
            ) : null}
          </g>
        ))}

        {/* ---------- the customer's website ---------- */}
        {active && !reduced
          ? [0, 1, 2].map((index) => (
              <circle
                key={index}
                className="crawl-sonar"
                cx={ROOT.x}
                cy={ROOT.y}
                r={ROOT.r}
                fill="none"
                stroke="#e884ab"
                strokeWidth="1.2"
                style={{ animationDelay: `${index * 0.9}s` }}
              />
            ))
          : null}

        <circle
          cx={ROOT.x}
          cy={ROOT.y}
          r={ROOT.r}
          fill="#ffffff0f"
          stroke={failed ? "#e0718c66" : "#ffffff30"}
          strokeWidth="1"
        />
        {/* Globe: the site itself. Meridians rotate while it is being read. */}
        <g
          className={cn("crawl-globe", flowing && "is-spinning")}
          stroke={failed ? "#e0718c" : "#f0c6d8"}
          strokeWidth="1.4"
          fill="none"
          style={{ transformOrigin: `${ROOT.x}px ${ROOT.y}px` }}
        >
          <circle cx={ROOT.x} cy={ROOT.y} r={18} />
          <path d={`M ${ROOT.x - 18} ${ROOT.y} H ${ROOT.x + 18}`} />
          <ellipse cx={ROOT.x} cy={ROOT.y} rx={7.5} ry={18} />
          <path
            d={`M ${ROOT.x - 15.5} ${ROOT.y - 9} H ${ROOT.x + 15.5} M ${ROOT.x - 15.5} ${ROOT.y + 9} H ${ROOT.x + 15.5}`}
            opacity="0.55"
          />
        </g>

        {/* ---------- pages in flight ---------- */}
        {flowing
          ? TOKENS.map((token, index) => {
              const { xs, ys } = sampleCurve(LANES[token.lane].controlY);
              return (
                <motion.g
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{
                    x: xs,
                    y: ys,
                    opacity: [0, 0.95, 1, 1, 0.9, 0],
                    scale: [0.45, 0.9, 1, 1, 0.85, 0.4],
                  }}
                  transition={{
                    duration: token.duration,
                    delay: token.delay,
                    repeat: Infinity,
                    repeatDelay: 1.1,
                    ease: "linear",
                  }}
                >
                  <PageGlyph />
                </motion.g>
              );
            })
          : null}

        {/* ---------- the knowledge base ---------- */}
        <circle
          cx={CORE.x}
          cy={CORE.y}
          r={RING_R}
          fill="none"
          stroke="#ffffff1a"
          strokeWidth="3"
        />
        <motion.circle
          cx={CORE.x}
          cy={CORE.y}
          r={RING_R}
          fill="none"
          stroke="url(#cv-ring)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          transform={`rotate(-90 ${CORE.x} ${CORE.y})`}
          initial={{ strokeDashoffset: RING_C }}
          animate={{ strokeDashoffset: RING_C * (1 - ratio) }}
          transition={
            reduced ? { duration: 0 } : { duration: 1.1, ease: [0.16, 1, 0.3, 1] }
          }
        />

        <circle
          cx={CORE.x}
          cy={CORE.y}
          r={CORE.r}
          fill="#1b1222"
          stroke="#ffffff1f"
          strokeWidth="1"
        />

        {/* The level itself. A vessel filling is the one progress metaphor
            nobody needs explained, and here it maps to a real ratio. */}
        <g clipPath="url(#cv-core-clip)">
          <motion.g
            initial={{ y: 0 }}
            animate={{ y: -lift }}
            transition={
              reduced ? { duration: 0 } : { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
            }
          >
            <g className={cn(flowing && "crawl-wave")}>
              <path
                d={[
                  `M ${CORE.x - CORE.r - 40} ${CORE.y + CORE.r}`,
                  "q 10 -7 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0",
                  `L ${CORE.x + CORE.r + 40} ${CORE.y + CORE.r + 120}`,
                  `L ${CORE.x - CORE.r - 40} ${CORE.y + CORE.r + 120} Z`,
                ].join(" ")}
                fill="url(#cv-liquid)"
              />
            </g>
          </motion.g>
        </g>

        <circle
          cx={CORE.x}
          cy={CORE.y}
          r={CORE.r}
          fill="none"
          stroke="#ffffff2e"
          strokeWidth="1"
        />

        {/* Stored-page count, sat on the fill so it reads at any level. */}
        <text
          x={CORE.x}
          y={CORE.y + 4}
          textAnchor="middle"
          fontSize="27"
          fontWeight="600"
          fill="#fff"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {status.successful_pages}
        </text>
        <text
          x={CORE.x}
          y={CORE.y + 21}
          textAnchor="middle"
          fontSize="9.5"
          letterSpacing="0.14em"
          fill="#ffffffb3"
        >
          PAGES
        </text>
      </svg>

      <div className="crawl-canvas-legend">
        <span>
          <i className="crawl-dot-site" aria-hidden />
          Your website
        </span>
        <span>
          <i className="crawl-dot-core" aria-hidden />
          Knowledge base
          {status.discovered_pages > 0 ? (
            <em>
              {status.successful_pages}/{status.discovered_pages}
            </em>
          ) : null}
        </span>
      </div>
    </div>
  );
}

/** A page being carried across: deliberately a document, not an orb. */
function PageGlyph() {
  return (
    <g>
      <rect
        x={-15}
        y={-11}
        width={30}
        height={22}
        rx={4}
        fill="#2a1a33"
        stroke="#e884abaa"
        strokeWidth="1"
      />
      <g stroke="#f0a5c2" strokeWidth="1.5" strokeLinecap="round" opacity="0.85">
        <path d="M -9 -4 H 7" />
        <path d="M -9 1 H 9" />
        <path d="M -9 6 H 2" />
      </g>
    </g>
  );
}
