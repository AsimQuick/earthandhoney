/**
 * ---
 * file: src/lib/projectMilestones.ts
 * project: earthandhoney
 * purpose: AC-38.3 — the reader a UI calls for PRD 23.2's eighteen Project
 *          milestones, instead of a component hardcoding its own literal
 *          copy of the list. Contains no milestone name, key, or count of
 *          its own: `getMilestoneDefinitions` issues a live query against
 *          the `project_milestones` table migration 124 seeds and maps
 *          back exactly what the database holds, in `sequence_order`. The
 *          `MilestoneQueryClient` parameter is a minimal knex-compatible
 *          shape (not a knex import) because the caller — PicPeak's own
 *          Backstage backend/admin surface, per Pillar 1 — supplies the
 *          real connection; this module only owns the read shape.
 * created-by: dev-team
 * related-story: US-38
 * related-ac: 38.3
 * ---
 */

export interface MilestoneDefinition {
  milestoneKey: string
  name: string
  sequenceOrder: number
  completionState: string
  completedAt: string | null
  completedBy: string | null
}

interface RawMilestoneRow {
  milestone_key: string
  name: string
  sequence_order: number
  completion_state: string
  completed_at: string | null
  completed_by: string | null
}

interface MilestoneQueryBuilder {
  whereNull(column: string): MilestoneQueryBuilder
  orderBy(column: string, direction: string): MilestoneQueryBuilder
  select(...columns: string[]): Promise<RawMilestoneRow[]>
}

export type MilestoneQueryClient = (table: string) => MilestoneQueryBuilder

export const PROJECT_MILESTONES_TABLE = 'project_milestones'

/**
 * Reads the eighteen PRD 23.2 milestone template rows (`project_id IS
 * NULL`) back from the database, ordered exactly as `sequence_order` has
 * them. Returns whatever the query yields — nothing here overrides,
 * filters by name, or falls back to a built-in list.
 */
export async function getMilestoneDefinitions(db: MilestoneQueryClient): Promise<MilestoneDefinition[]> {
  const rows = await db(PROJECT_MILESTONES_TABLE)
    .whereNull('project_id')
    .orderBy('sequence_order', 'asc')
    .select('milestone_key', 'name', 'sequence_order', 'completion_state', 'completed_at', 'completed_by')

  return rows.map((row) => ({
    milestoneKey: row.milestone_key,
    name: row.name,
    sequenceOrder: row.sequence_order,
    completionState: row.completion_state,
    completedAt: row.completed_at,
    completedBy: row.completed_by,
  }))
}
