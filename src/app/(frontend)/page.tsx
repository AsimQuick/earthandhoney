/**
 * ---
 * file: src/app/(frontend)/page.tsx
 * project: earthandhoney
 * purpose: Public homepage within the (frontend) route group, rendered
 *          through HomePageTemplate (AC-34.1) so the PRD §13.2 order —
 *          navigation, full-width hero slideshow placement, optional short
 *          introduction, selected galleries or stories, primary inquiry
 *          form, footer — is structurally fixed (nav/footer via
 *          PublicShell, per that component's own header). The hero slot
 *          resolves StudioProfile.homeHeroGallerySlug into a real Backstage
 *          gallery over the Flow A boundary (AC-34.3, via
 *          resolveHomeHeroGalleryPlacement), rendering HeroSlideshow
 *          (AC-34.2) on success or GalleryUnavailablePlaceholder — never a
 *          blank hero or a thrown error — when that gallery is unset,
 *          unreachable, or missing. The selected-galleries slot is still a
 *          placeholder stand-in: the curated/ordered selection model is
 *          AC-34.4's.
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
 * updated-by: dev-team
 * related-story: US-34
 * related-ac: 34.3
 * ---
 */
import { HomePageTemplate } from "@/components/page-template/HomePageTemplate";
import { getStudioProfile } from "@/lib/getStudioProfile";
import { resolveHomeHeroGalleryPlacement } from "@/lib/resolveHomeHeroGalleryPlacement";

// A generic, studio-name-free placeholder: this route renders no studio
// detail of its own (AC-24.4) — the shell chrome and route <head> around it
// already read the business name from StudioProfile.
export default async function Home() {
  const studioProfile = await getStudioProfile();
  const heroSlideshowPlacement = await resolveHomeHeroGalleryPlacement(
    studioProfile.homeHeroGallerySlug,
  );

  return <HomePageTemplate heroSlideshowPlacement={heroSlideshowPlacement} />;
}
