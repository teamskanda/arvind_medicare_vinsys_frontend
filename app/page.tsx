import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Code2,
  FileText,
  Globe2,
  HelpCircle,
  Layers,
  type LucideIcon,
  MessageCircle,
  Newspaper,
  Palette,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";

import { ChatPreview } from "@/components/landing/ChatPreview";
import { HeroStage } from "@/components/landing/HeroStage";
import { LandingNav } from "@/components/landing/LandingNav";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Spotlight } from "@/components/motion/Spotlight";
import { Logo } from "@/components/ui/Logo";
import { getCurrentUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ScanLine,
    title: "Point it at your website",
    text: "Enter an address you own. SKANDA AI reads the site, lists every page it finds, and lets you decide which ones the assistant is allowed to use.",
  },
  {
    icon: Palette,
    title: "Shape how it looks and speaks",
    text: "Set its personality, colours, typography and launcher on a live canvas, and ask it real questions while you work to hear the change immediately.",
  },
  {
    icon: Code2,
    title: "Publish it anywhere",
    text: "Each assistant gets its own address. Drop in one line of HTML, or share the link directly — redesign it later without touching the page again.",
  },
];

const SOURCES: { icon: LucideIcon; label: string }[] = [
  { icon: Globe2, label: "Product pages" },
  { icon: HelpCircle, label: "FAQ and help centre" },
  { icon: FileText, label: "Policies and terms" },
  { icon: Tag, label: "Pricing" },
  { icon: Newspaper, label: "Blog and news" },
  { icon: BookOpen, label: "Documentation" },
  { icon: Layers, label: "Service listings" },
  { icon: MessageCircle, label: "Contact and hours" },
];

const STATS = [
  { value: "One line", label: "of HTML to publish\nit on your site" },
  { value: "~1 min", label: "to read a site and\nbuild its knowledge base" },
  { value: "Every reply", label: "cites the page it\nwas drawn from" },
];

export default async function RootPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="landing">
      <div className="aurora-field" aria-hidden />
      <div className="grid-field" aria-hidden />
      <div className="grain" aria-hidden />

      <LandingNav />

      <main>
        {/* ---------------------------------------------------- hero ---- */}
        <section className="landing-shell landing-hero">
          <div>
            <Reveal direction="up" duration={0.8}>
              <Link href="/signup" className="landing-pill">
                <span className="landing-pill-badge gradient-brand">New</span>
                Built on your own content
                <ArrowUpRight className="size-3.5 opacity-60" aria-hidden />
              </Link>
            </Reveal>

            <Reveal direction="up" delay={0.08} duration={0.85}>
              <h1>
                Your website,
                <br />
                answering <em>for itself.</em>
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.16}>
              <p className="landing-description">
                SKANDA AI reads the pages you already have and turns them into
                an assistant your visitors can talk to — grounded in your
                content, styled like your brand, live on your site in minutes.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.24}>
              <div className="landing-hero-actions">
                <Link
                  href="/signup"
                  className="landing-cta gradient-brand glow-brand"
                >
                  Build your assistant
                  <span className="landing-cta-arrow" aria-hidden>
                    <ArrowUpRight className="size-4" />
                  </span>
                </Link>
                <a href="#how-it-works" className="landing-ghost-cta">
                  <Sparkles className="size-4" aria-hidden />
                  See how it works
                </a>
              </div>
            </Reveal>

            <RevealGroup className="landing-stats" delay={0.3}>
              {STATS.map((stat) => (
                <RevealItem key={stat.value}>
                  <p className="landing-stat-value">{stat.value}</p>
                  <p className="landing-stat-label whitespace-pre-line">
                    {stat.label}
                  </p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>

          <HeroStage />
        </section>

        {/* ------------------------------------------------- marquee ---- */}
        <div className="landing-marquee" aria-hidden>
          <div className="landing-marquee-track">
            {[...SOURCES, ...SOURCES].map((source, index) => (
              <span className="landing-marquee-item" key={index}>
                <source.icon strokeWidth={1.6} />
                {source.label}
              </span>
            ))}
          </div>
        </div>

        {/* -------------------------------------------- how it works ---- */}
        <section id="how-it-works" className="landing-shell landing-section">
          <Reveal>
            <div className="landing-section-heading">
              <p className="landing-kicker">
                <Sparkles className="size-3.5" aria-hidden />
                From website to welcome
              </p>
              <h2>
                Three steps, and it&rsquo;s <em>yours.</em>
              </h2>
              <p className="landing-section-lead">
                One connected workspace, from the first page it reads to the
                first conversation it has.
              </p>
            </div>
          </Reveal>

          <RevealGroup className="landing-steps" stagger={0.11}>
            {STEPS.map((step, index) => (
              <RevealItem key={step.title}>
                <Spotlight as="article" className="landing-step h-full">
                  <span className="landing-step-index">
                    0{index + 1}
                  </span>
                  <span className="landing-step-icon" aria-hidden>
                    <step.icon strokeWidth={1.5} />
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </Spotlight>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* ------------------------------------------------- grounded ---- */}
        <section id="grounded" className="landing-shell landing-section">
          <div className="landing-split">
            <Reveal direction="right">
              <div>
                <p className="landing-kicker">
                  <ShieldCheck className="size-3.5" aria-hidden />
                  Grounded, not guessed
                </p>
                <div className="landing-section-heading">
                  <h2>
                    It answers from your pages — <em>and shows you which.</em>
                  </h2>
                </div>
                <p className="landing-section-lead">
                  Every reply is built from content scraped off your own site,
                  and arrives with the page it came from attached. When the
                  answer isn&rsquo;t in your content, it says so rather than
                  inventing one.
                </p>

                <ul className="landing-checklist">
                  {[
                    "Review every page it found and exclude anything it shouldn't use.",
                    "Each answer cites its source, so you can check it in one click.",
                    "Update a page on your site and refresh the knowledge base to match.",
                  ].map((item) => (
                    <li key={item}>
                      <Check strokeWidth={2.4} aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal direction="left" delay={0.1}>
              <ChatPreview />
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------- publish ---- */}
        <section id="publish" className="landing-shell landing-section">
          <div className="landing-split landing-split-reverse">
            <Reveal direction="left">
              <div>
                <p className="landing-kicker">
                  <Code2 className="size-3.5" aria-hidden />
                  Publishing
                </p>
                <div className="landing-section-heading">
                  <h2>
                    One address. <em>One line.</em>
                  </h2>
                </div>
                <p className="landing-section-lead">
                  Every assistant you build gets its own private address.
                  Embed it as a frame, float it as a launcher, or simply send
                  someone the link — the design keeps updating from your
                  workspace, so you never reinstall anything.
                </p>

                <ul className="landing-checklist">
                  {[
                    "A unique, unguessable address per assistant.",
                    "Restyle it whenever you like — published pages follow along.",
                    "Works on any site that lets you paste HTML.",
                  ].map((item) => (
                    <li key={item}>
                      <Check strokeWidth={2.4} aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal direction="right" delay={0.1}>
              <EmbedFrame />
            </Reveal>
          </div>
        </section>

        {/* --------------------------------------------------- closer ---- */}
        <section className="landing-shell landing-section pt-0!">
          <Reveal>
            <div className="landing-closer">
              <div className="grain" aria-hidden />
              <p className="landing-kicker justify-center">
                <Sparkles className="size-3.5" aria-hidden />
                Meet your next conversation
              </p>
              <h2>
                Bring your website <em>to life.</em>
              </h2>
              <p>
                Create a free account, point it at your site, and watch your
                own pages start answering questions.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="landing-cta gradient-brand glow-brand"
                >
                  Create your account
                  <span className="landing-cta-arrow" aria-hidden>
                    <ArrowUpRight className="size-4" />
                  </span>
                </Link>
                <Link href="/login" className="landing-ghost-cta">
                  I already have one
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="landing-shell landing-footer">
        <Logo />
        <nav aria-label="Footer">
          <a href="#how-it-works">How it works</a>
          <a href="#grounded">Accuracy</a>
          <a href="#publish">Publishing</a>
          <Link href="/login">Log in</Link>
        </nav>
        <span>
          &copy; {new Date().getFullYear()} SKANDA AI — thoughtful answers
          begin with your own knowledge.
        </span>
      </footer>
    </div>
  );
}

/**
 * The embed snippet, shown as the customer will actually receive it. The
 * markup is static text rather than a screenshot so it stays crisp at any
 * zoom and can be read by a screen reader.
 */
function EmbedFrame() {
  return (
    <div className="landing-frame">
      <div className="landing-frame-bar">
        <span className="landing-frame-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="landing-frame-url">index.html</span>
        <span className="w-[46px]" aria-hidden />
      </div>

      <pre className="overflow-x-auto px-6 py-7 font-mono text-[12.5px] leading-[2.05] text-ink-500">
        <code>
          {"<"}
          <span className="text-burgundy-700">iframe</span>
          {"\n  "}
          <span className="text-ink-700">src</span>=
          <span className="text-burgundy-700">
            &quot;https://skanda.ai/embed/a7f3c2e9&quot;
          </span>
          {"\n  "}
          <span className="text-ink-700">title</span>=
          <span className="text-burgundy-700">&quot;Ask us anything&quot;</span>
          {"\n  "}
          <span className="text-ink-700">width</span>=
          <span className="text-burgundy-700">&quot;420&quot;</span>{" "}
          <span className="text-ink-700">height</span>=
          <span className="text-burgundy-700">&quot;620&quot;</span>
          {"\n  "}
          <span className="text-ink-700">style</span>=
          <span className="text-burgundy-700">
            &quot;border:0;border-radius:16px&quot;
          </span>
          {"\n>" + "</"}
          <span className="text-burgundy-700">iframe</span>
          {">"}
        </code>
      </pre>

      <div className="flex items-center gap-2.5 border-t border-ink-100 bg-surface-2 px-6 py-3.5 text-[12.5px] text-ink-500">
        <ShieldCheck className="size-4 text-burgundy-700" aria-hidden />
        Private address, unique to this assistant.
      </div>
    </div>
  );
}
