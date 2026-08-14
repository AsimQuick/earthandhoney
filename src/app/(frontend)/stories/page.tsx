/**
 * ---
 * file: src/app/(frontend)/stories/page.tsx
 * project: earthandhoney
 * purpose: AC-36.4 — the public story index route. Lists every published
 *          `Stories` (US-36 AC-36.1) record and excludes drafts, using
 *          src/lib/getPublishedStories.ts's `status: 'published'`-filtered
 *          query — a draft story is never in the data this route renders
 *          from, not merely hidden by a template-level check. Renders
 *          inside the root layout's `PublicShell` like every other public
 *          route (src/app/(frontend)/layout.tsx), so it carries the same
 *          primary navigation and footer with no extra wiring here.
 * created-by: dev-team
 * related-story: US-36
 * related-ac: 36.4
 * ---
 */
import type { Metadata } from 'next'

import { getPublishedStories } from '@/lib/getPublishedStories'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Stories',
}

export default async function StoriesIndexRoute() {
  const stories = await getPublishedStories()

  return (
    <main data-testid="story-index">
      <h1>Stories</h1>
      {stories.length === 0 ? (
        <p data-testid="story-index-empty">No stories published yet.</p>
      ) : (
        <ul>
          {stories.map((story) => (
            <li key={story.slug} data-testid="story-index-item">
              <a href={`/stories/${story.slug}`}>{story.title}</a>
              {story.subtitleIntroduction ? <p>{story.subtitleIntroduction}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
