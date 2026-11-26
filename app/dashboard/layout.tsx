import { redirect } from "next/navigation";

import { PageTransition } from "@/components/motion/PageTransition";
import { TopBar } from "@/components/dashboard/TopBar";
import { getCurrentUser } from "@/lib/auth/server";
export const dynamic = "force-dynamic";

/**
 * Dashboard shell. Middleware already redirects unauthenticated visitors;
 * this second check means the layout never renders without a user even if
 * middleware is bypassed.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const fullName =
    user.full_name ?? null;

  return (
    <div className="relative min-h-dvh">
      {/* The same ambient field as the marketing and auth pages, held much
          fainter here. It is `fixed`, so it stays put while content scrolls
          over it and never repaints on scroll. */}
      <div className="app-field" aria-hidden />

      <div className="relative z-10">
        <TopBar email={user.email ?? ""} fullName={fullName} />
        <PageTransition>
          <main className="mx-auto w-full max-w-6xl px-5 py-9 sm:px-6 lg:px-8">
            {children}
          </main>
        </PageTransition>
      </div>
    </div>
  );
}
