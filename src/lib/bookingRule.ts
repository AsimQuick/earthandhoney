/**
 * ---
 * file: src/lib/bookingRule.ts
 * project: earthandhoney
 * purpose: AC-39.2 — evaluates PRD 23.2's booking rule ("A Project becomes
 *          Booked only when its configured booking requirements are
 *          complete") from milestone completion, reading which milestones
 *          are required off `project_booking_requirements` (migration 126)
 *          and which are complete off `project_milestones` (migration 124)
 *          — never a hardcoded three-item check. `evaluateBookingRule` is a
 *          pure predicate over two already-loaded key sets, independently
 *          unit-testable and containing no milestone key literal of its
 *          own; `getBookingRequirements` and `isProjectBooked` are the
 *          DB-backed callers a real surface (US-39 AC-39.3's cockpit/
 *          Project Room) would use. Sprint 6 note (CLAUDE.md, AC-39.2): the
 *          milestones this rule reads (by default quote_approved,
 *          contract_signed, deposit_paid) are completed by a human or an
 *          admin action this sprint — the ledger and Stripe integration are
 *          PRD Phase 6 — so nothing here claims a verified payment drove
 *          any transition; this module only evaluates whatever completion
 *          state it is given.
 * created-by: dev-team
 * related-story: US-39
 * related-ac: 39.2
 * ---
 */

export const PROJECT_BOOKING_REQUIREMENTS_TABLE = 'project_booking_requirements'
export const PROJECT_MILESTONES_TABLE = 'project_milestones'

interface RawRow {
  milestone_key: string
  completion_state?: string
}

interface BookingQueryBuilder {
  where(column: string, value: unknown): BookingQueryBuilder
  whereNull(column: string): BookingQueryBuilder
  select(...columns: string[]): Promise<RawRow[]>
}

export type BookingQueryClient = (table: string) => BookingQueryBuilder

/**
 * The booking rule itself: a Project is Booked iff every configured
 * required milestone key is present among its completed milestone keys.
 * Takes both sets already loaded so it stays a pure, synchronous predicate
 * — no I/O, and no hardcoded milestone list of its own. An empty required
 * set is never satisfied — configuration that requires nothing is treated
 * as unconfigured, not as vacuously Booked.
 */
export function evaluateBookingRule(
  requiredMilestoneKeys: readonly string[],
  completedMilestoneKeys: readonly string[],
): boolean {
  if (requiredMilestoneKeys.length === 0) return false
  const completed = new Set(completedMilestoneKeys)
  return requiredMilestoneKeys.every((key) => completed.has(key))
}

/**
 * Reads which milestone keys are configured as booking requirements for a
 * Project: that Project's own override rows if it has any, otherwise the
 * default template rows (`project_id IS NULL`) migration 126 seeds. Never
 * falls back to a built-in list of its own.
 */
export async function getBookingRequirements(db: BookingQueryClient, projectId: number): Promise<string[]> {
  const ownRows = await db(PROJECT_BOOKING_REQUIREMENTS_TABLE).where('project_id', projectId).select('milestone_key')

  if (ownRows.length > 0) {
    return ownRows.map((row) => row.milestone_key)
  }

  const templateRows = await db(PROJECT_BOOKING_REQUIREMENTS_TABLE).whereNull('project_id').select('milestone_key')

  return templateRows.map((row) => row.milestone_key)
}

/** Reads which of a Project's own milestone rows are complete. */
async function getCompletedMilestoneKeys(db: BookingQueryClient, projectId: number): Promise<string[]> {
  const rows = await db(PROJECT_MILESTONES_TABLE)
    .where('project_id', projectId)
    .select('milestone_key', 'completion_state')

  return rows.filter((row) => row.completion_state === 'complete').map((row) => row.milestone_key)
}

/**
 * Whether a Project is Booked right now: its configured booking
 * requirements (its own override, or the default template) evaluated
 * against its actual milestone completion state.
 */
export async function isProjectBooked(db: BookingQueryClient, projectId: number): Promise<boolean> {
  const [required, completed] = await Promise.all([
    getBookingRequirements(db, projectId),
    getCompletedMilestoneKeys(db, projectId),
  ])
  return evaluateBookingRule(required, completed)
}
