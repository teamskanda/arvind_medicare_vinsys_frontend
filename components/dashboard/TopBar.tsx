"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export function TopBar({
  email,
  fullName,
}: {
  email: string;
  fullName: string | null;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function onSignOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out");
      router.push("/login");
      router.refresh();
    } catch {
      setSignOutError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  const initials =
    (fullName ?? email)
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  return (
    <header className="sticky top-0 z-30 border-b border-ink-100 bg-canvas/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-15 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="shrink-0">
          <Logo />
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 rounded-full border border-ink-100 bg-surface/60 py-1 pr-3.5 pl-1 sm:flex">
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-full bg-burgundy-50 text-[11px] font-semibold text-burgundy-700 ring-1 ring-burgundy-200"
            >
              {initials}
            </span>
            <span className="max-w-[180px] truncate text-sm text-ink-700">
              {fullName ?? email}
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={onSignOut}
            loading={signingOut}
            icon={<LogOut aria-hidden className="size-3.5" />}
          >
            Sign out
          </Button>
        </div>
      </div>
      {signOutError && <p role="alert" className="px-5 pb-3 text-center text-sm text-danger-700">{signOutError}</p>}
    </header>
  );
}
