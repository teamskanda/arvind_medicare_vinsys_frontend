"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Field } from "@/components/ui/Field";
import { isValidEmail, MIN_PASSWORD_LENGTH, safeNextPath } from "@/lib/auth/validate";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = "Enter your email address.";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName.trim() || null }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message ?? "Could not create your account. Please try again.");
      }
      router.push(safeNextPath(params.get("next")));
      router.refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not create your account. Please try again.");
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Build an AI assistant from your own website."
      footer={
        <span>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-burgundy-700 underline-offset-4 transition-colors hover:text-burgundy-800 hover:underline"
          >
            Log in
          </Link>
        </span>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        {formError && <Callout tone="error">{formError}</Callout>}
        <Field
          label="Your name"
          type="text"
          autoComplete="name"
          placeholder="Jane Doe"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          hint="Optional."
          disabled={busy}
        />
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
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            disabled={busy}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute top-[35px] right-3 rounded p-1 text-ink-300 transition-colors hover:text-ink-700"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <PasswordMeter value={password} />

        <Button
          type="submit"
          className="w-full"
          loading={busy}
          icon={!busy ? <ArrowRight aria-hidden className="size-4" /> : undefined}
        >
          Create account
        </Button>

        <p className="text-xs leading-relaxed text-ink-500">
          This is a private account — only you can see and manage the
          assistants you build.
        </p>
      </form>
    </AuthShell>
  );
}

/**
 * Password strength hint.
 *
 * Deliberately modest: it scores length and character variety only, and the
 * label says "strength" rather than anything implying a guarantee. The
 * actual rule the account must satisfy is the minimum length the backend
 * enforces — this is encouragement to go past it, not a second gate, and it
 * never blocks submission.
 */
function PasswordMeter({ value }: { value: string }) {
  if (!value) return null;

  const score =
    Number(value.length >= MIN_PASSWORD_LENGTH) +
    Number(value.length >= 12) +
    Number(/[^A-Za-z0-9]/.test(value)) +
    Number(/\d/.test(value) && /[A-Za-z]/.test(value));

  const LEVELS = [
    { label: "Too short", className: "bg-danger-700" },
    { label: "Weak", className: "bg-danger-700" },
    { label: "Fair", className: "bg-warning-700" },
    { label: "Good", className: "bg-burgundy-600" },
    { label: "Strong", className: "bg-success-700" },
  ];
  const level = LEVELS[score];

  return (
    <div aria-hidden className="-mt-2 flex items-center gap-3">
      <div className="flex flex-1 gap-1.5">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              index < score ? level.className : "bg-ink-100"
            }`}
          />
        ))}
      </div>
      <span className="w-14 text-right text-[11px] font-medium text-ink-500">
        {level.label}
      </span>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-ink-500">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
