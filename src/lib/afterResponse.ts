/**
 * ---
 * file: src/lib/afterResponse.ts
 * project: earthandhoney
 * purpose: AC-26.4.1 — schedules post-response work from a route handler in
 *          the one way Next.js can still act on its result.
 *          The live proof recorded in WEBHOOK_LIVE_PROOF.md is what forced
 *          this module into existence. AC-26.3 requires the webhook receiver
 *          to return 2xx without waiting on the revalidation, and it did
 *          that by firing the work off unawaited (`void doWork()`). Against
 *          the running stack that response is correct and prompt, the
 *          delivery is recorded `success`, and `revalidatePath` is reached
 *          and returns without error — and the page never refreshes.
 *          The reason is that `revalidatePath` does not invalidate anything
 *          by itself: it records the path on the *request's* work store, and
 *          Next.js flushes those recorded revalidations when the request
 *          completes. Work fired off unawaited keeps running after the
 *          response is sent, so its `revalidatePath` call lands on a store
 *          that has already been flushed — accepted, no error, no effect.
 *          `after()` is Next.js's own answer to exactly this: the task runs
 *          after the response is sent, but inside the request's after-context,
 *          which Next.js flushes once the task settles. Deferring through it
 *          keeps AC-26.3's promptly-returned 2xx and makes the revalidation
 *          it queues actually take effect.
 *          The fallback exists because `after()` throws when there is no
 *          request scope at all (next/dist/server/after/after.js) — which is
 *          the case when a unit test invokes an exported route handler
 *          directly rather than through a server. There, running the task as
 *          a plain unawaited promise is both the only option and the right
 *          one: nothing is flushing a cache in a unit test, and the caller
 *          still gets its response before the task settles.
 * created-by: dev-team
 * related-story: US-26
 * related-ac: 26.4.1
 * ---
 */
import { after } from 'next/server'

/**
 * Runs `task` after the response has been sent, without the caller awaiting
 * it. Rejections are the task's own business — this never throws and never
 * delays the response.
 */
export function scheduleAfterResponse(task: () => Promise<void>): void {
  try {
    after(task)
  } catch {
    // No Next.js request scope (a unit test calling the handler directly).
    void task()
  }
}
