import type { InputHTMLAttributes } from "react";
import { useId } from "react";

import { cn } from "@/lib/utils";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  hint?: string;
}

/**
 * Labelled text input with accessible error wiring.
 *
 * The label is always a real <label> bound to the input, and errors are
 * announced via aria-describedby + aria-invalid rather than colour alone.
 */
export function Field({
  label,
  error,
  hint,
  className,
  id: providedId,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink-900">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "block w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-ink-900",
          "placeholder:text-ink-300",
          "transition-[border-color,box-shadow,background-color] duration-200 ease-out",
          // The focus ring is drawn with a shadow rather than the global
          // outline so it hugs the rounded corner and can carry the brand
          // tint. `:focus-visible` in the base layer still covers every
          // other control; this only refines it for text inputs.
          "focus:outline-none focus-visible:outline-none",
          error
            ? "border-danger-700/60 focus:border-danger-700 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-danger-700)_22%,transparent)]"
            : "border-ink-200 hover:border-ink-300 focus:border-burgundy-500 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-burgundy-600)_22%,transparent)]",
          "disabled:bg-ink-50 disabled:text-ink-500",
          className,
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
