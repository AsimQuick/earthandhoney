<!--
---
file: HOMEPAGE_TEMPLATE_ADR.md
project: earthandhoney
purpose: AC-34.5 — chooses exactly one mechanism for producing the homepage
         through the template system (a `Pages` record using a homepage
         template variant vs. a documented singleton reusing the same shell
         and tokens as a standard page), and records the option chosen, the
         option rejected, and the reason, in the spirit of NAVIGATION_ADR.md.
created-by: dev-team
related-story: US-34
related-ac: 34.5
---
-->

# Homepage Template ADR

## AC-34.5 — Decision: how the homepage is produced by the template system

### Candidates considered

1. **A `Pages` collection record using a homepage template variant** — the
   homepage would be a document in the same `pages` collection every
   standard page lives in, distinguished by a template-selector field that
   switches which set of fields/template renders it.
2. **A documented singleton** — a fixed route (`src/app/(frontend)/page.tsx`)
   that is not a `Pages` collection record, but renders through the same
   template-system pattern as one: a dedicated page template component
   (`HomePageTemplate`, mirroring `StandardPageTemplate`) mounted inside the
   same `PublicShell` shell, built from the same `src/styles/tokens.css`
   token vocabulary.

### This ADR commits to **option 2** (a documented singleton)

### Reasons

- **There is exactly one homepage.** `pages` is a `hasMany`-shaped
  collection (zero-to-many documents) with no uniqueness constraint that
  could enforce "at most one document is the homepage." Nothing would stop
  a second document being flagged as the homepage-variant, with no defined
  resolution — two documents each claiming to be the homepage is exactly
  the duplicate-ownership defect Pillar 5 ("one owner per business
  function") names.
- **The PRD's homepage order is structurally different content, not a
  layout skin of the standard order.** PRD §13.2 (nav, full-width hero
  slideshow, optional short introduction, selected galleries or stories,
  primary inquiry form, footer) does not reuse §13.3's fields (H1 heading,
  short introduction, one or more gallery placements, optional structured
  text sections, inquiry form region, footer) — it replaces the H1 heading
  with a hero slideshow gallery, and the flat `galleryPlacements` list with
  a curated, ordered `selectedGalleriesOrStories` selection (AC-34.4).
  Making this a "`Pages` template variant" would require either growing the
  `pages` collection with homepage-only fields that are meaningless on
  every other document — reopening AC-31.1's closed, tested 16-field set,
  exactly what NAVIGATION_ADR.md already refused to do to the same
  collection for a much smaller need (a navigation-order field) — or a
  polymorphic per-template field-set switch on `pages`, the "arbitrary
  per-page configuration surface" shape Pillar 3 (deterministic beauty; no
  drag-and-drop, no page-level layout config) exists to prevent.
- **The homepage's content already has a single owner, and it isn't
  `pages`.** `homeHeroGallerySlug` (AC-34.2/34.3) and
  `homeSelectedGalleriesOrStories` (AC-34.4) already live on
  `StudioProfile` — a Payload **global**, i.e. Payload's own one-of-one
  singleton primitive — shipped and tested earlier on this branch
  (`src/globals/StudioProfile.ts`). Choosing option 1 now would mean
  re-deriving those same two fields on a second, competing storage location
  (a `pages` document), duplicating data `StudioProfile` already owns.
- **A Payload global is the natural fit for "the one homepage",** the same
  way it is already the fit for "the one business identity" (AC-24.4's
  `StudioProfile` fields) — no new collection-level uniqueness enforcement
  has to be invented to simulate a singleton out of a many-record
  collection.

### Reasons rejected: `Pages` record with a homepage template variant (option 1)

- Cannot be added without either reopening AC-31.1's closed field set or
  introducing per-template polymorphic fields on `pages` — both rejected
  above.
- A collection provides no guarantee that only one document is ever
  flagged as the homepage variant; a singleton does, by construction.
- Would duplicate `homeHeroGallerySlug` / `homeSelectedGalleriesOrStories`,
  data `StudioProfile` already owns as of AC-34.2–34.4 — the same
  "one owner per business function" violation NAVIGATION_ADR.md avoided by
  keeping a global rather than spreading navigation order across `pages`.

### Evidence this is not "hand-coded drift"

Despite not being a `Pages` record, the homepage route is not a one-off
hand-coded page: it renders through the same template-system pattern as
every `Pages`-backed route — `HomePageTemplate` (mirroring
`StandardPageTemplate`) mounted inside the identical `PublicShell`, at the
identical position in the DOM, built from the same token vocabulary, with
zero raw hex/px/arbitrary-Tailwind-bracket violations (US-23 AC-23.7's
detector, reused directly in `src/__tests__/us34-ac34.1-homepage-template.test.tsx`).

`src/__tests__/us34-ac34.5-homepage-shell-structural-drift.test.tsx` is this
AC's style-drift check, in the spirit of AC-31.7: it renders the homepage
and a synthetic standard page through the same `PublicShell`, and shows (1)
every `data-testid` genuinely shared between them — the shell chrome itself
(`site-shell`, `site-header`, `vertical-menu`, `primary-nav`, `site-footer`)
— carries an identical tag and class list on both, (2) both templates mount
at the identical position inside the shell (the same parent chain of
testid/tag/class from the shell root down to the template root), and (3)
the shell markup surrounding each template, with the template's own
content-specific subtree redacted, is byte-for-byte identical between the
homepage and a standard page.

### What would have to be true to revisit this decision

If a future requirement needed more than one homepage-shaped page (e.g.
per-region or per-brand landing variants), a real `pages` template-variant
mechanism would become justified, and this decision should be revisited —
but that would also require reopening AC-31.1's closed field set, so it is
a strictly bigger decision than this AC, and is out of scope here.
