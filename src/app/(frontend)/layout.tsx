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
 * updated-by: dev-team
 * related-story: US-24
 * related-ac: 24.5
 * updated-by: dev-team
 * related-story: US-31
 * related-ac: 31.6
 * updated-by: dev-team
 * related-story: US-32
 * related-ac: 32.1
 * ---
 */
import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { preload } from "react-dom";
import "./globals.css";
import { PublicShell } from "@/components/layout/PublicShell";
import { getNavItems } from "@/lib/getNavItems";
import { getStudioProfile } from "@/lib/getStudioProfile";
import { buildStudioStructuredData } from "@/lib/studioStructuredData";

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

// The site title/description/social image are studio details (PRD §21.1)
// owned by the StudioProfile global, not hard-coded here (AC-24.4/24.5) —
// generateMetadata is the async Next.js hook that lets a route's <head>
// depend on that global. No `keywords` field is read or set here — PRD
// §21.2 forbids a meta-keywords surface anywhere in the product (AC-24.5).
export async function generateMetadata(): Promise<Metadata> {
  const studioProfile = await getStudioProfile();

  return {
    // AC-31.6: the one place a relative canonical/Open Graph URL a route
    // returns (e.g. `alternates.canonical: "/${slug}"`) is resolved into an
    // absolute one — system-computed from the deployment's own public URL,
    // never typed by the photographer on a per-page basis.
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: {
      default: studioProfile.businessName,
      template: studioProfile.defaultTitlePattern,
    },
    description: studioProfile.defaultMetaDescription,
    openGraph: studioProfile.defaultSocialImage
      ? {
          images: [{ url: studioProfile.defaultSocialImage.url }],
        }
      : undefined,
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
  // The primary nav (Payload `Navigation` global, AC-32.1) — data-driven,
  // never a hard-coded route list in the shell/menu components.
  const navItems = await getNavItems();
  // The JSON-LD LocalBusiness/ProfessionalService block (AC-24.5) is built
  // from the same StudioProfile fields as the <head> above. It renders as a
  // plain <script> in the document body — structured data does not need to
  // live in <head> to be read by crawlers, and the Metadata API has no field
  // for it.
  const structuredData = buildStudioStructuredData(studioProfile);

  return (
    <html lang="en" className={`${rubik.variable} h-full antialiased`}>
      <body className="min-h-full">
        <script
          type="application/ld+json"
          data-testid="studio-structured-data"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <PublicShell businessName={studioProfile.businessName} navItems={navItems}>
          {children}
        </PublicShell>
      </body>
    </html>
  );
}
