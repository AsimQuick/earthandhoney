/**
 * Migration: PRD 23.2's eighteen Project milestones, as data rows.
 *
 * Nothing in the fork tracks Project milestones at all before this
 * migration — there is no `project_milestones` table, and PRD 23.2's
 * eighteen-item list (inquiry reviewed ... project closed) exists only as
 * prose in the PRD. This migration creates `project_milestones` and seeds
 * PRD 23.2's eighteen milestones into it as canonical template rows
 * (`project_id IS NULL`), each carrying:
 *
 *   milestone_key      — stable snake_case identifier (e.g. 'inquiry_reviewed').
 *   name                — the PRD's own wording (e.g. 'inquiry reviewed').
 *   sequence_order      — 1..18, PRD 23.2's list order.
 *   completion_state    — defaults to 'pending' on a template row.
 *   completed_at        — NULL on a template row.
 *   completed_by        — NULL on a template row; the actor who completed it.
 *
 * A real Project's own milestone rows (`project_id` set) are created later
 * by US-41's atomic Project-setup path, cloned from these eighteen
 * templates — this migration only establishes that the eighteen are DATA,
 * queryable and seeded, not a list a UI component would otherwise have to
 * hardcode. `src/lib/projectMilestones.ts` is the reader a UI calls instead.
 *
 * Idempotent: table creation guarded by hasTable; the seed only inserts
 * milestone_key values not already present among the template rows, so a
 * partial or repeated prior run is a safe no-op re-apply.
 */

// PRD 23.2, in order. `name` is the PRD's own wording verbatim.
const PRD_MILESTONES = [
  { milestone_key: 'inquiry_reviewed', name: 'inquiry reviewed' },
  { milestone_key: 'consultation_completed', name: 'consultation completed, if used' },
  { milestone_key: 'quote_sent', name: 'quote sent' },
  { milestone_key: 'quote_approved', name: 'quote approved' },
  { milestone_key: 'contract_sent', name: 'contract sent' },
  { milestone_key: 'contract_signed', name: 'contract signed' },
  { milestone_key: 'deposit_invoice_sent', name: 'deposit invoice sent' },
  { milestone_key: 'deposit_paid', name: 'deposit paid' },
  { milestone_key: 'booked', name: 'booked' },
  { milestone_key: 'dates_venues_confirmed', name: 'dates and venues confirmed' },
  { milestone_key: 'shoot_completed', name: 'shoot completed' },
  { milestone_key: 'images_in_production', name: 'images in production' },
  { milestone_key: 'gallery_ready', name: 'gallery ready' },
  { milestone_key: 'final_balance_paid', name: 'final balance paid' },
  { milestone_key: 'gallery_released', name: 'gallery released' },
  { milestone_key: 'downloads_completed', name: 'downloads completed' },
  { milestone_key: 'gallery_expired_archived', name: 'gallery expired/archived' },
  { milestone_key: 'project_closed', name: 'project closed' },
].map((m, index) => ({ ...m, sequence_order: index + 1 }));

exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('project_milestones'))) {
    await knex.schema.createTable('project_milestones', (table) => {
      table.increments('id').primary();
      // NULL denotes a canonical template row (PRD 23.2's eighteen), not
      // yet attached to any specific Project. US-41 clones these per Project.
      table.integer('project_id').unsigned()
        .references('id').inTable('projects').onDelete('CASCADE');
      table.string('milestone_key', 64).notNullable();
      table.string('name', 255).notNullable();
      table.integer('sequence_order').notNullable();
      table.string('completion_state', 24).notNullable().defaultTo('pending');
      table.timestamp('completed_at');
      table.string('completed_by', 255);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['project_id', 'milestone_key']);
      table.index(['project_id']);
      table.index(['milestone_key']);
    });
  }

  const existing = await knex('project_milestones').whereNull('project_id').select('milestone_key');
  const existingKeys = new Set(existing.map((row) => row.milestone_key));
  const toInsert = PRD_MILESTONES.filter((m) => !existingKeys.has(m.milestone_key));
  if (toInsert.length === 0) return;

  await knex('project_milestones').insert(
    toInsert.map((m) => ({
      project_id: null,
      milestone_key: m.milestone_key,
      name: m.name,
      sequence_order: m.sequence_order,
      completion_state: 'pending',
      completed_at: null,
      completed_by: null,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })),
  );
};

exports.down = async function (knex) {
  if (await knex.schema.hasTable('project_milestones')) {
    await knex.schema.dropTable('project_milestones');
  }
};
