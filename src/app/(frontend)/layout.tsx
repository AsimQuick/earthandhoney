/**
 * ---
 * file: src/app/(frontend)/layout.tsx
 * project: earthandhoney
 * purpose: Root layout for the public-facing Next.js route group, kept separate from the (payload) admin route group
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.1
 * updated-by: dev-team
 * related-story: US-8
 * related-ac: 8.1
 * updated-by: dev-team
 * related-story: US-8
 * related-ac: 8.2
 * updated-by: dev-team
 * related-story: US-8
 * related-ac: 8.4
 * updated-by: dev-team
 * related-story: US-23
 * related-ac: 23.2
 * updated-by: dev-team
 * related-story: US-24
 * related-ac: 24.4
 * ---
 */
import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { preload } from "react-dom";
import "./globals.css";
import { PublicShell } from "@/components/layout/PublicShell";
import { getStudioProfile } from "@/lib/getStudioProfile";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  style: ["normal", "italic"],
});

// Preload only the primary (400) weight of each self-hosted family — the
// weight the "editorial" font combination in src/styles/tokens.css uses by
// default — so the first paint already has the real font available and no
// font-display: swap causes a layout shift. Secondary weights (Fraunces
// 300/600, Inter 500) load on demand without a preload hint.
function preloadPrimaryFontWeights() {
  preload("/fonts/fraunces/fraunces-latin-400-normal.woff2", {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });
  preload("/fonts/inter/inter-latin-400-normal.woff2", {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });
}

// The site title/description are studio details (PRD §21.1) owned by the
// StudioProfile global, not hard-coded here (AC-24.4) — generateMetadata is
// the async Next.js hook that lets a route's <head> depend on that global.
export async function generateMetadata(): Promise<Metadata> {
  const studioProfile = await getStudioProfile();

  return {
    title: {
      default: studioProfile.businessName,
      template: studioProfile.defaultTitlePattern,
    },
    description: studioProfile.defaultMetaDescription,
    icons: {
      icon: "/favicon.ico",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  preloadPrimaryFontWeights();
  const studioProfile = await getStudioProfile();

  return (
    <html lang="en" className={`${rubik.variable} h-full antialiased`}>
      <body className="min-h-full">
        <PublicShell businessName={studioProfile.businessName}>{children}</PublicShell>
      </body>
    </html>
  );
}
