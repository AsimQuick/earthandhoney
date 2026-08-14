<!--
---
file: STORY_TEMPLATE_ADR.md
project: earthandhoney
purpose: AC-36.1 — chooses exactly one mechanism for modelling Stories per
         PRD §13.5 (a separate `Stories` collection vs. a `Pages` template
         variant), and records the option chosen, the option rejected, and
         the reason (DoD item 6), in the spirit of NAVIGATION_ADR.md and
         HOMEPAGE_TEMPLATE_ADR.md.
created-by: dev-team
related-story: US-36
related-ac: 36.1
---
-->

# Story Template ADR

## AC-36.1 — Decision: how Stories are modelled

### Candidates considered

1. **A `Pages` template variant** — a third `template` option (`'story'`)
   alongside `'standard'`/`'details'` (AC-35.3), with Story-only fields
   (title, subtitle/introduction, and a repeating section group) added to
   the existing `pages` collection.
2. **A separate `Stories` collection** — its own Payload collection with its
   own field set, rendered through its own template component
   (`StoryPageTemplate`), following the same template-system pattern every
   other template already uses (a component mounted inside `PublicShell`,
   built only from `src/styles/tokens.css` tokens).

### This ADR commits to **option 2** (a separate `Stories` collection)

### Reasons

- **The repeating section group cannot be added to `pages` without breaking
  a shipped, tested guard.** US-31 AC-31.1 closed the `pages` collection to
  exactly 17 fields (the 16 PRD §13.1 rows plus AC-35.3's sanctioned
  `template` selector), with a passing test
  (`src/__tests__/us31-ac31.1-pages-field-set.test.ts`) asserting the field
  list maps one-to-one onto that set in both directions — "no field beyond
  the PRD set, plus exactly one named exception." PRD §13.5's repeating
  (section heading + short text + gallery placement) group has no row in
  PRD §13.1's table and is not the sanctioned exception, so adding it would
  grow `pages` to 18 fields and break that test's evidence — the same
  situation NAVIGATION_ADR.md refused to create for a single order field.
- **The repeating section group would be meaningless on every
  non-Story page.** A Standard or Details record would carry an empty
  `storySections` array forever — a per-template field that only makes
  sense for one of three templates. This is precisely the "polymorphic
  per-template field-set switch on `pages`" HOMEPAGE_TEMPLATE_ADR.md already
  named and rejected (there, for the homepage's hero/selected-galleries
  fields) as the shape Pillar 3 (deterministic beauty; no arbitrary
  per-page configuration surface) exists to prevent.
- **Details (AC-35.3) is not a counter-precedent.** Details was added as a
  `template` variant with **zero new fields** on `pages` — it reuses the
  same `heading`/`shortIntroduction`/`galleryPlacements` every Standard page
  already has, only interpreting multiple placements as one masonry
  region. A Story's nested per-section gallery placement has no equivalent
  already-shared field to reuse; it is new shape, not new interpretation of
  existing shape — the distinction that makes option 1 unlike the Details
  precedent and like the Homepage one.
- **Stories are not a singleton**, so the "documented singleton" shape
  HOMEPAGE_TEMPLATE_ADR.md chose for the one-of-one homepage does not apply
  either — Stories are repeatable content (PRD §13.5: "based on real
  weddings, venues, cultural details, suppliers, and experiences"), which is
  exactly what a Payload collection (zero-to-many documents) is for.
- **One owner, no duplicate storage.** A dedicated `stories` collection
  keeps Story identity, content, and ordering in one place, the same "one
  owner per business function" pillar NAVIGATION_ADR.md invoked against
  spreading a cross-cutting concern across `pages`.

### Reasons rejected: `Pages` template variant (option 1)

- Cannot be added without either reopening and breaking AC-31.1's closed,
  tested field set, or bolting a Story-only repeating field onto every
  Standard/Details document where it is permanently empty and meaningless.
- Reintroduces the exact polymorphic per-template field-set problem
  HOMEPAGE_TEMPLATE_ADR.md already rejected once on this same collection.
- Unlike Details, there is no existing `pages` field the Story's nested
  section-with-gallery-placement shape can reuse — it is not a
  reinterpretation of an existing field, it is new shape.

### What this AC implements

- `src/collections/Stories.ts` — a new Payload collection: `title` (H1),
  `subtitleIntroduction` (subtitle/introduction), `sections` (a repeating
  `array` field, each row holding `sectionHeading`, `shortText`, and
  `galleryPlacement` — a single relationship into the existing Payload
  `gallery-placements` collection, the same external-identifier-only
  pattern `Pages.galleryPlacements` already uses, never a relation into the
  separate Backstage database), plus `slug` and `status` — the same base
  identity fields every other Payload content collection in this project
  (`Pages`, `Forms`) already carries, needed for a Story to be individually
  addressable and publishable at all.
- `src/components/page-template/StoryPageTemplate.tsx` — a template
  component mirroring `StandardPageTemplate`/`DetailsPageTemplate`'s
  existing pattern exactly: title (H1), optional subtitle/introduction,
  the repeating sections in author order (each section heading, short
  text, and gallery placement slot), then an inquiry-form-region slot. No
  nav/footer is rendered here, for the same reason the other two templates
  don't — `PublicShell` already owns both, once.
- `src/payload.config.ts` registers the new `Stories` collection.

Routing (a public `/stories/[slug]`-shaped route, the story index route,
and resolving each section's `galleryPlacement` over the Flow A boundary)
is out of scope for this AC — AC-36.2 through AC-36.4's concern. This AC's
evidence is the field definitions and one real story rendered through
`StoryPageTemplate` with fixture data, mirroring how AC-35.1 proved
`DetailsPageTemplate`'s order before AC-35.3 wired it into a live route.

### What would have to be true to revisit this decision

If PRD §13.5 ever converged Story's shape onto `pages`' existing fields
(no repeating per-section gallery placement, e.g. one gallery placement
list plus one body field like Standard's optional structured text
sections), a `pages` template variant would become viable the same way
Details was — but that would be a materially different PRD requirement
than the repeating group this AC implements, so it is out of scope here.
