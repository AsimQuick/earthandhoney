/**
 * ---
 * file: src/app/(frontend)/page.tsx
 * project: earthandhoney
 * purpose: Public homepage within the (frontend) route group, rendered
 *          through HomePageTemplate (AC-34.1) so the PRD §13.2 order —
 *          navigation, full-width hero slideshow placement, optional short
 *          introduction, selected galleries or stories, primary inquiry
 *          form, footer — is structurally fixed (nav/footer via
 *          PublicShell, per that component's own header). The hero and
 *          selected-galleries slots are placeholder stand-ins here: resolving
 *          a real Backstage hero gallery over the Flow A boundary is
 *          AC-34.3's concern, and the curated/ordered selection model is
 *          AC-34.4's — this AC fixes the template's structural position for
 *          both before that content lands, the same precedent
 *          StandardPageTemplate's inquiry-form-region slot set for US-33.
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
 * ---
 */
import { HomePageTemplate } from "@/components/page-template/HomePageTemplate";

// A generic, studio-name-free placeholder: this route renders no studio
// detail of its own (AC-24.4) — the shell chrome and route <head> around it
// already read the business name from StudioProfile.
export default function Home() {
  return (
    <HomePageTemplate
      heroSlideshowPlacement={
        <p data-testid="home-hero-placeholder">
          Hero slideshow placement — real gallery resolution arrives in AC-34.3.
        </p>
      }
    />
  );
}
