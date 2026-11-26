"use client";

import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "lg";
}

/**
 * Accessible dialog. Replaces window.alert / window.confirm, which the brief
 * rules out: native dialogs cannot be styled and look unprofessional in a
 * client-facing product.
 *
 * Handles Escape, backdrop click, focus-on-open and background scroll lock.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "sm",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog so keyboard users are not left behind.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <motion.div
      // A literal black scrim, not `bg-ink-900/…`. `ink-900` is the body
      // text colour, which the dark theme inverts to near-white — using it
      // here would wash the page out instead of dimming it.
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-[3px] sm:items-center"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        initial={reduced ? false : { opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "w-full rounded-2xl border border-ink-200 bg-surface outline-none",
          "shadow-[0_40px_90px_-30px_rgba(0,0,0,0.75)]",
          size === "sm" ? "max-w-md" : "max-w-3xl",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id="modal-title" className="truncate text-base font-semibold text-ink-900">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-sm text-ink-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-m-1 rounded p-1 text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        {children ? <div className="px-5 py-4">{children}</div> : null}

        {footer ? (
          <div className="flex justify-end gap-2 rounded-b-2xl border-t border-ink-100 bg-surface-2 px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
