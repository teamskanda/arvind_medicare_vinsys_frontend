import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "error" | "warning" | "success" | "info";

const CONFIG: Record<Tone, { icon: typeof Info; className: string }> = {
  error: {
    icon: AlertCircle,
    className: "bg-danger-50 border-danger-700/25 text-danger-700",
  },
  warning: {
    icon: TriangleAlert,
    className: "bg-warning-50 border-warning-700/25 text-warning-700",
  },
  success: {
    icon: CheckCircle2,
    className: "bg-success-50 border-success-700/25 text-success-700",
  },
  info: {
    icon: Info,
    className: "bg-info-50 border-info-700/25 text-info-700",
  },
};

/** Inline message block. Errors use role="alert" so they are announced. */
export function Callout({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, className: toneClassName } = CONFIG[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-md border px-3.5 py-3 text-sm",
        toneClassName,
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? (
          <div className={cn("text-ink-700", title && "mt-0.5")}>{children}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
