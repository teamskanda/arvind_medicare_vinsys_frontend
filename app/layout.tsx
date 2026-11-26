import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";

import { RouteProgress } from "@/components/motion/RouteProgress";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * The display face, used only for the italic accent in headlines. A single
 * weight, loaded once — it carries the whole brand's voice, so it is worth
 * the request; anything more would not be.
 */
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SKANDA AI — AI assistants built from your website",
    template: "%s · SKANDA AI",
  },
  description:
    "Turn your website into an AI assistant. SKANDA AI reads your site and builds an assistant you can embed anywhere.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrument.variable}`}
      // `theme-dark` sits on <html> as well as <body> so the very first paint
      // — before React or any CSS-in-body resolves — is already dark. Without
      // it the browser flashes the default white canvas on a hard reload.
      style={{ colorScheme: "dark", backgroundColor: "#07050a" }}
    >
      <body className="theme-dark min-h-dvh antialiased">
        {/* Above every page, so one navigation indicator serves the whole
            product rather than each surface inventing its own. */}
        <RouteProgress />
        {children}
      </body>
    </html>
  );
}
