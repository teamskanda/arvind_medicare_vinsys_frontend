import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

/**
 * The primary fill is the `gradient-brand` utility rather than a step on
 * the burgundy ramp. That ramp has to work as *text* on a dark surface,
 * which pulls it lighter than a solid button behind white text can afford;
 * giving the action its own fill lets both stay above 4.5:1 instead of one
 * compromising for the other.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    "gradient-brand glow-brand text-white border border-transparent hover:brightness-110 active:brightness-95",
  secondary:
    "bg-surface text-ink-900 border border-ink-200 hover:border-burgundy-300 hover:bg-ink-50 active:bg-ink-100",
  ghost:
    "bg-transparent text-ink-700 border border-transparent hover:bg-ink-50 hover:text-ink-900 active:bg-ink-100",
  danger:
    "bg-surface text-danger-700 border border-ink-200 hover:bg-danger-50 hover:border-danger-700/40",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium",
        "transition-[transform,filter,background-color,border-color,color] duration-200 ease-out",
        "hover:-translate-y-px active:translate-y-0",
        "disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-55",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 aria-hidden className="size-4 animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
