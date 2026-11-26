"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";

/**
 * Copy text to the clipboard, with a confirmation the customer can see.
 *
 * `navigator.clipboard` is unavailable on insecure origins (plain HTTP other
 * than localhost) and can be refused by permissions policy, so there is a
 * `document.execCommand` fallback through a hidden textarea. Without it the
 * Copy buttons silently do nothing for anyone running the dashboard over
 * HTTP on a LAN address — which is exactly how the app often gets shown.
 */
export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  size = "sm",
  variant = "secondary",
  className,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  size?: "sm" | "md";
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    const ok = await writeToClipboard(value);
    setCopied(ok);
    setFailed(!ok);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, 2000);
  }, [value]);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => void copy()}
      className={className}
      icon={
        copied ? (
          <Check aria-hidden className="size-3.5" />
        ) : (
          <Copy aria-hidden className="size-3.5" />
        )
      }
    >
      {failed ? "Press Ctrl+C" : copied ? copiedLabel : label}
    </Button>
  );
}

async function writeToClipboard(value: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Permission denied or an insecure origin. Try the legacy path.
    }
  }

  if (typeof document === "undefined") return false;
  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
