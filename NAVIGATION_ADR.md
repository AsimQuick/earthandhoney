<!--
---
file: NAVIGATION_ADR.md
project: earthandhoney
purpose: AC-32.1 — chooses exactly one mechanism for data-driven, configurable
         site navigation (a Payload `Navigation` global vs. deriving the menu
         from each page's own include-in-menu/navigation-label/order fields),
         and records the option chosen, the option rejected, and the reason
         (DoD item 6).
created-by: dev-team
related-story: US-32
related-ac: 32.1
---
-->

# Navigation ADR

## AC-32.1 — Decision: how site navigation is data-driven

### Candidates considered

1. **A Payload `Navigation` global** — a single document holding an ordered
   list of navigation entries, each an explicit relationship into the
   `pages` collection. Order is the array's own row position.
2. **Derivation from each page's own fields** — reading `includeInMenu`,
   `navigationLabel`, and an order value directly off every `pages` document,
   with no separate global.

### This ADR commits to **option 1** (a Payload `Navigation` global)

### Reasons

- **Option 2's required "order" field cannot be added.** US-31 AC-31.1
  already closed the `pages` collection to exactly the 16 fields of PRD
  §13.1's "Add New Page" table, with a passing test
  (`src/__tests__/us31-ac31.1-pages-field-set.test.ts`) that asserts the
  field list maps one-to-one onto that table in both directions — "no field
  beyond the PRD set." PRD §13.1 has no navigation-order row. Adding a
  `navOrder` (or similarly named) field to `pages` to satisfy option 2 would
  grow that collection to 17 fields and break the AC-31.1 evidence a shipped,
  merged story already recorded. Reopening a closed AC's evidence to build a
  new one is exactly what CLAUDE.md's fork/DoD discipline treats as a
  regression, not new work.
- **A global's array field carries order for free.** Payload array rows are
  naturally ordered by position; the photographer reorders navigation by
  dragging rows in the Backstage admin UI. There is no numeric field to type
  correctly, no risk of two pages colliding on the same order value, and no
  need to open every individual page's edit screen to see or change the
  menu's order — the whole ordered list lives in one place.
- **One authoritative place to see "what's in the nav."** With option 2 the
  menu's membership and order would be reconstructed by querying scattered
  per-page fields; with the global it is one document a photographer (or a
  future migration) can read and edit directly.
- **`includeInMenu` (US-31) stays meaningful, not orphaned.** Choosing the
  global does not retire the `includeInMenu`/`navigationLabel` fields US-31
  already added to `pages` — `src/lib/getNavItems.ts` still filters the
  global's ordered list down to pages that are `status: 'published'` and
  have `includeInMenu` on before rendering, and still reads
  `navigationLabel` (falling back to `heading`) for each entry's label. A
  page listed in the global's ordered array is necessary but not sufficient
  to appear in the rendered menu — this is what keeps AC-32.3's "draft or
  include-in-menu-off pages never appear, and changing either field changes
  the menu without a code change" true under this design.

### Reasons rejected: Pages-field derivation (option 2)

- Requires an order field the `pages` collection cannot gain without
  reopening and breaking AC-31.1's closed, tested field set (see above).
- Without an explicit order field, ordering would have to fall back to
  something already on `pages` that was never meant to control navigation
  order — alphabetical `navigationLabel`, creation date, or
  `photographyType` — none of which give the photographer real editorial
  control, and none of which can guarantee PRD §12.1's required order
  (Weddings, Engagements, Details; see AC-32.2).
- Even where option 2 is viable in principle, it spreads one cross-cutting
  concern (site navigation) across every page document instead of keeping a
  single owner for it — the same "one owner per business function" pillar
  CLAUDE.md already states for other product areas.

### What would have to be true to revisit this decision

If AC-31.1's closed field set on `pages` is ever intentionally reopened —
for example a future PRD revision that adds an explicit order column to the
"Add New Page" table — the derivation approach becomes viable, and this
decision should be revisited so the product does not end up maintaining two
disagreeing sources of navigation order (the global and a per-page field) at
once.
