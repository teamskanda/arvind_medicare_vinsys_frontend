import { cn } from "@/lib/utils";
import type { CrawlStatus, PageStatus } from "@/types";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "bg-ink-50 text-ink-700 border-ink-200",
  success: "bg-success-50 text-success-700 border-success-700/20",
  warning: "bg-warning-50 text-warning-700 border-warning-700/20",
  danger: "bg-danger-50 text-danger-700 border-danger-700/20",
  info: "bg-info-50 text-info-700 border-info-700/20",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
        "text-[11px] font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const CRAWL_LABELS: Record<CrawlStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "neutral" },
  crawling: { label: "Scraping", tone: "info" },
  processing: { label: "Processing", tone: "info" },
  completed: { label: "Ready", tone: "success" },
  partially_completed: { label: "Partially complete", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
};

export function CrawlStatusBadge({ status }: { status: CrawlStatus }) {
  const { label, tone } = CRAWL_LABELS[status] ?? CRAWL_LABELS.pending;
  return <Badge tone={tone}>{label}</Badge>;
}

const PAGE_LABELS: Record<PageStatus, { label: string; tone: Tone }> = {
  scraped: { label: "Scraped", tone: "success" },
  duplicate: { label: "Duplicate", tone: "warning" },
  empty: { label: "No content", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
};

export function PageStatusBadge({ status }: { status: PageStatus }) {
  const { label, tone } = PAGE_LABELS[status] ?? PAGE_LABELS.failed;
  return <Badge tone={tone}>{label}</Badge>;
}
