"use client";

import { ArrowLeft, Globe2, ScanLine } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Reveal } from "@/components/motion/Reveal";
import { startRouteProgress } from "@/components/motion/RouteProgress";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Field } from "@/components/ui/Field";
import { ApiError, api } from "@/lib/api";

export default function NewChatbotPage() {
  const router = useRouter();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldError(null);

    const value = websiteUrl.trim();
    if (!value) {
      setFieldError("Enter your website address.");
      return;
    }
    // Light client-side check only. The backend does the authoritative
    // validation (scheme, DNS, private-address and robots.txt checks).
    if (!/^[a-z0-9.-]+\.[a-z]{2,}/i.test(value.replace(/^https?:\/\//i, ""))) {
      setFieldError("That does not look like a website address.");
      return;
    }

    setSubmitting(true);
    try {
      const chatbot = await api.createChatbot(value);
      // Straight to the progress screen; the crawl has already started.
      startRouteProgress();
      router.push(`/dashboard/${chatbot.id}`);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Could not create the assistant. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 underline-offset-2 transition-colors hover:text-ink-900 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Back to my assistants
      </Link>

      <Reveal className="creation-card relative mt-5 overflow-hidden rounded-3xl border border-ink-100 bg-surface p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-32 h-64 bg-[radial-gradient(ellipse_55%_100%_at_30%_100%,#c0456b33,transparent_72%)]"
        />
        {/* Ringing outward, because this is the screen where you hand over a
            website address — the mark should look like it is listening for
            one rather than sitting there. */}
        <span
          className="pulse-ring relative mb-6 inline-flex size-13 items-center justify-center rounded-2xl bg-burgundy-50 text-burgundy-700 ring-1 ring-burgundy-200"
          style={{ "--pulse-scale": "1.7" } as React.CSSProperties}
        >
          <Globe2 className="size-6" strokeWidth={1.6} />
        </span>
        <h1 className="relative text-[1.65rem] font-semibold tracking-[-0.035em] text-ink-900">
          Create an{" "}
          <span className="text-sheen font-display italic">assistant</span>
        </h1>
        <p className="relative mt-2 text-sm leading-relaxed text-ink-500">
          Enter the website you want it to learn from. We read up to 20 pages
          and build the knowledge base automatically.
        </p>

        <form onSubmit={onSubmit} noValidate className="relative mt-7 space-y-4">
          {formError ? <Callout tone="error">{formError}</Callout> : null}

          <Field
            label="Website address"
            type="url"
            inputMode="url"
            autoFocus
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            error={fieldError}
            hint="For example acme.com or https://acme.com/products"
            placeholder="https://your-website.com"
            disabled={submitting}
          />

          <Button
            type="submit"
            loading={submitting}
            className="w-full"
            icon={<ScanLine aria-hidden className="size-4" />}
          >
            {submitting ? "Starting…" : "Start scraping"}
          </Button>
          {submitting && <p role="status" className="text-center text-sm text-ink-500">Checking your website and starting the crawl. This can take a minute.</p>}
        </form>

        <div className="relative mt-7 border-t border-ink-100 pt-6">
          <h2 className="text-sm font-semibold text-ink-900">
            What happens next
          </h2>
          <ol className="mt-3.5 space-y-3 text-sm leading-relaxed text-ink-500">
            {[
              "We check the address is reachable and that the site allows crawling.",
              "We discover and read up to 20 pages, favouring About, Services, Pricing, FAQ and Contact.",
              "You review every page we stored and exclude anything the assistant should not use.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-burgundy-50 text-[11px] font-semibold text-burgundy-700 ring-1 ring-burgundy-200"
                >
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>

      <p className="mt-4 px-1 text-xs text-ink-500">
        Only crawl websites you own or are authorised to crawl. SKANDA AI
        respects robots.txt and will refuse addresses that disallow automated
        access.
      </p>
    </div>
  );
}
