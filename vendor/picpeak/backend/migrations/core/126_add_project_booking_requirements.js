/**
 * Migration: PRD 23.2's booking-requirement configuration (US-39 AC-39.2).
 *
 * PRD 23.2: "A Project becomes Booked only when its configured booking
 * requirements are complete, normally: quote approved + contract signed +
 * deposit paid = Booked." The PRD's own wording is "its configured booking
 * requirements" — which milestones count toward Booked is data, not a
 * hardcoded three-item check baked into a booking-rule function. Nothing in
 * the fork carries that configuration before this migration. This migration
 * creates `project_booking_requirements` and seeds PRD 23.2's normal-case
 * three requirements as canonical template rows (`project_id IS NULL`),
 * matching `project_milestones`' own template-row pattern (migration 124):
 *
 *   project_id   — NULL denotes the default template configuration shared
 *                   by every Project that has not overridden it; set
 *                   denotes a project-specific override — a non-default
 *                   requirement set for that one Project.
 *   milestone_key — the required milestone's key, matching
 *                   `project_milestones.milestone_key`.
 *   created_at
 *
 * `src/lib/bookingRule.ts`'s `getBookingRequirements` reads a Project's own
 * override rows first, falling back to the default template three only when
 * that Project has none — so a non-default requirement set is simply more
 * rows with a real `project_id`, never a second code path.
 *
 * Idempotent: table creation guarded by hasTable; the seed only inserts
 * milestone_key values not already present among the template rows, so a
 * partial or repeated prior run is a safe no-op re-apply — same convention
 * migrations 122-125 use.
 */

// PRD 23.2's "normal case", in the PRD's own order.
const DEFAULT_BOOKING_REQUIREMENTS = ['quote_approved', 'contract_signed', 'deposit_paid'];

exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('project_booking_requirements'))) {
    await knex.schema.createTable('project_booking_requirements', (table) => {
      table.increments('id').primary();
      // NULL denotes the default template configuration; set denotes a
      // project-specific override (a non-default requirement set).
      table.integer('project_id').unsigned()
        .references('id').inTable('projects').onDelete('CASCADE');
      table.string('milestone_key', 64).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['project_id', 'milestone_key']);
      table.index(['project_id']);
    });
  }

  const existing = await knex('project_booking_requirements').whereNull('project_id').select('milestone_key');
  const existingKeys = new Set(existing.map((row) => row.milestone_key));
  const toInsert = DEFAULT_BOOKING_REQUIREMENTS.filter((key) => !existingKeys.has(key));
  if (toInsert.length === 0) return;

  await knex('project_booking_requirements').insert(
    toInsert.map((milestone_key) => ({
      project_id: null,
      milestone_key,
      created_at: knex.fn.now(),
    })),
  );
};

exports.down = async function (knex) {
  if (await knex.schema.hasTable('project_booking_requirements')) {
    await knex.schema.dropTable('project_booking_requirements');
  }
};
