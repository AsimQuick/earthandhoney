<!--
---
file: STORY_NO_BLOG_CHROME.md
project: earthandhoney
purpose: AC-36.5 — the record naming, item by item, the generic blog chrome
         this Story implementation deliberately does not build, and the two
         retired blog requirements from CLAUDE.md's "Retired From the Old
         Direction (do not build)" that do not return. This is the "story
         record naming the retired items it deliberately does not
         implement" the AC's evidence calls for, committed alongside the
         standing guard test
         src/__tests__/us36-ac36.5-no-blog-chrome.test.tsx so the claims
         below cannot silently drift out of sync with the code.
created-by: dev-team
related-story: US-36
related-ac: 36.5
---
-->

# Story: no generic blog chrome (US-36 AC-36.5)

The controlled vocabulary term is **Story**, not "blog post" or "blog". A Story is a
PRD §13.5 editorial record — title, subtitle/introduction, then a repeating (section
heading + short text + gallery placement) group, then an inquiry form region
(`src/components/page-template/StoryPageTemplate.tsx`, AC-36.1). It is deliberately
not a blog, and none of the chrome a generic blogging platform would ship exists
anywhere in this feature.

## The five blog-chrome items this AC forbids, and why each is absent

1. **No categories.** `src/collections/Stories.ts`'s field list is exactly `title`,
   `subtitleIntroduction`, `sections` (each row: `sectionHeading`, `shortText`,
   `galleryPlacement`), `slug`, `status` — no `category`/`categories` field, no
   category taxonomy collection, no category filter anywhere in
   `src/app/(frontend)/stories/page.tsx` (the story index route, AC-36.4) or
   `StoryPageTemplate.tsx`.
2. **No archives.** The story index route (`src/app/(frontend)/stories/page.tsx`)
   lists every published `Stories` document flatly, via
   `src/lib/getPublishedStories.ts` — there is no by-year/by-month archive route, no
   date-based grouping, and no calendar/archive-link UI. `Stories` carries no field
   naming a publish date the UI groups by.
3. **No comment system.** Neither `Stories.ts` nor `StoryPageTemplate.tsx` nor the
   index route reads or writes anything resembling a comment: no `comments` field, no
   comment collection, no comment form, no comment count or thread rendered on the
   story page.
4. **No author bios.** `Stories.ts` carries no `author` relationship or field, and
   neither `StoryPageTemplate.tsx` nor the index route renders an author name, avatar,
   or bio block. Every Story is attributed to the studio as a whole
   (`StudioProfile`, the single owner of studio identity per CLAUDE.md's System
   Ownership table), never to an individual byline.
5. **No tag clouds.** `Stories.ts` carries no `tags` field at all (unlike
   `src/collections/Pages.ts`, whose `tags` field PRD §37.6 already scopes as
   "internal relationships only", never a public tag-cloud UI). Neither
   `StoryPageTemplate.tsx` nor the index route renders a tag list, tag cloud, or
   tag-filtered view.

## The two retired blog requirements that do not return

CLAUDE.md's "Retired From the Old Direction (do not build)" section lists, verbatim:

> Blog sample-content requirement and the no-`<em>` content rule

Both are retired and neither returns in this Story implementation:

- **The blog sample-content requirement** — a pre-pivot requirement to ship seeded
  sample blog posts as part of the feature. US-36 ships no sample-content seed
  script, no fixture-data migration, and no requirement anywhere in its acceptance
  criteria to pre-populate `stories` documents; every `Stories` document in the
  tests and evidence above is created explicitly by the test that needs it and torn
  down afterwards (e.g. `src/__tests__/us36-ac36.4-story-index-route.test.ts`), not
  shipped as standing sample content.
- **The no-`<em>` content rule** — a pre-pivot rule that forbade `<em>` tags in
  content. `Stories.sections[].shortText` and `Stories.subtitleIntroduction` are
  plain `textarea` fields (`src/collections/Stories.ts`) with no rich-text engine,
  no HTML sanitiser, and no content-linting rule of any kind attached to them — so
  there is no mechanism here that could enforce, or that needs retiring again, an
  `<em>`-tag prohibition.

## Evidence

`src/__tests__/us36-ac36.5-no-blog-chrome.test.tsx` is the standing guard: it walks
`Stories.fields` for a category/tag/comment/author field, greps
`StoryPageTemplate.tsx` and the story index route's source for blog-chrome
vocabulary, renders `StoryPageTemplate` and the index route's list markup and
asserts no matching text or `data-testid` appears, and asserts this file continues
to name both retired CLAUDE.md items and quote the CLAUDE.md line verbatim so the
two documents cannot drift apart.
