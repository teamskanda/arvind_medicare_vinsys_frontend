import type { Metadata } from "next";

/**
 * Layout for the public chatbot.
 *
 * `noindex, nofollow` matters: these pages are real, publicly reachable URLs,
 * one per chatbot. Letting search engines index them would put a customer's
 * bare chat widget in search results competing with their own website, and
 * would make the `public_id` handles discoverable — the handle is
 * unguessable by design, and an index would undo that.
 */
export const metadata: Metadata = {
  title: "Chat assistant",
  robots: { index: false, follow: false },
  // The iframe is its own document; no need to inherit the dashboard's.
  other: { referrer: "strict-origin-when-cross-origin" },
};

export default function EmbedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // `theme-light` opts this document out of the dark token set the rest of
  // the product uses. The widget renders inside an iframe on the customer's
  // own website and has to follow their page, not our brand.
  return <div className="theme-light h-dvh w-full bg-white">{children}</div>;
}
