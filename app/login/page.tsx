"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { startRouteProgress } from "@/components/motion/RouteProgress";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Field } from "@/components/ui/Field";
import { isValidEmail, safeNextPath } from "@/lib/auth/validate";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * Set once the credentials are accepted and we are waiting on the
   * workspace. Deliberately never cleared — the only way out of this state
   * is the dashboard replacing the page.
   */
  const [handoff, setHandoff] = useState(false);

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = "Enter your email address.";
    else if (!isValidEmail(email))
      errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error?.message ?? "Could not sign you in. Please try again.",
        );
      }
      // The dashboard is server-rendered on demand, so there is a real wait
      // between here and the workspace appearing. Left alone, the form just
      // sits there looking like the click did nothing.
      setHandoff(true);
      startRouteProgress();
      router.push(safeNextPath(params.get("next")));
      router.refresh();
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? cause.message
          : "Could not sign you in. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <>
      {handoff ? (
        <div className="auth-handoff">
          <BrandLoader label="Preparing your workspace…" />
        </div>
      ) : null}

      <AuthShell
        title="Welcome back"
        subtitle="Sign in to your SKANDA AI workspace."
        footer={
          <span>
            Don&rsquo;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-burgundy-700 underline-offset-4 transition-colors hover:text-burgundy-800 hover:underline"
            >
              Create one
            </Link>
          </span>
        }
      >
        <form className="space-y-5" onSubmit={onSubmit} noValidate>
          {formError && <Callout tone="error">{formError}</Callout>}

          <Field
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@yourbusiness.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
            disabled={busy}
          />

          <div className="relative">
            <Field
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
              disabled={busy}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-[35px] right-3 rounded p-1 text-ink-300 transition-colors hover:text-ink-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>

          <Button
            type="submit"
            className="w-full"
            loading={busy}
            icon={
              !busy ? <ArrowRight aria-hidden className="size-4" /> : undefined
            }
          >
            Log in
          </Button>
        </form>
      </AuthShell>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<BrandLoader fullscreen label="Loading sign in…" />}>
      <LoginForm />
    </Suspense>
  );
}
