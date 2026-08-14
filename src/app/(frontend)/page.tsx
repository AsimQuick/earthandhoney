/**
 * ---
 * file: src/app/(frontend)/page.tsx
 * project: earthandhoney
 * purpose: Public homepage within the (frontend) route group, rendered
 *          through HomePageTemplate (AC-34.1) so the PRD §13.2 order —
 *          navigation, full-width hero slideshow placement, optional short
 *          introduction, selected galleries or stories, primary inquiry
 *          form, footer — is structurally fixed (nav/footer via
 *          PublicShell, per that component's own header). The hero slot now
 *          renders a real HeroSlideshow (AC-34.2) against the same three
 *          public/photobuddy/img/slide/*.jpg placeholder images the
 *          project's internal Gallery Engine hero-mode QA harness already
 *          uses — resolving a real Backstage hero gallery over the Flow A
 *          boundary is still AC-34.3's concern, so these three stay
 *          hard-coded here until that AC replaces them. The
 *          selected-galleries slot is still a placeholder stand-in: the
 *          curated/ordered selection model is AC-34.4's.
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.1
 * updated-by: dev-team
 * related-story: US-8
 * related-ac: 8.2
 * updated-by: dev-team
 * related-story: US-24
 * related-ac: 24.4
 * updated-by: dev-team
 * related-story: US-34
 * related-ac: 34.1
 * updated-by: dev-team
 * related-story: US-34
 * related-ac: 34.2
 * ---
 */
import { HomePageTemplate } from "@/components/page-template/HomePageTemplate";
import { HeroSlideshow } from "@/components/hero/HeroSlideshow";
import type { GalleryImage } from "@/components/gallery/types";

// The same three public/photobuddy/img/slide/*.jpg files the internal
// Gallery Engine hero-mode QA harness already uses as placeholder content —
// swapped for a real, Flow-A-resolved gallery by AC-34.3.
const HERO_PLACEHOLDER_IMAGES: GalleryImage[] = [
  { id: "home-hero-1", url: "/photobuddy/img/slide/1.jpg", alt: "Photography Emotion" },
  { id: "home-hero-2", url: "/photobuddy/img/slide/2.jpg", alt: "Big City Night" },
  { id: "home-hero-3", url: "/photobuddy/img/slide/3.jpg", alt: "Beautiful Lakes" },
];

// A generic, studio-name-free placeholder: this route renders no studio
// detail of its own (AC-24.4) — the shell chrome and route <head> around it
// already read the business name from StudioProfile.
export default function Home() {
  return (
    <HomePageTemplate
      heroSlideshowPlacement={<HeroSlideshow images={HERO_PLACEHOLDER_IMAGES} />}
    />
  );
}
