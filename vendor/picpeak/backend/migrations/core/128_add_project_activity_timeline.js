/**
 * Migration: a Project's append-only activity timeline (US-39 AC-39.6,
 * PRD 22.3, 23.4).
 *
 * Nothing in the fork records a Project's own history of phase changes,
 * milestone completions and manual next-action overrides before this
 * migration — each of those AC-39.1/39.2/39.5 events happens, but leaves no
 * trace another surface (US-43's cockpit, US-44's Project Room) could later
 * read back as "what changed and when." This migration creates
 * `project_activity_timeline`, one append-only row per timeline entry:
 *
 *   id             — auto-incrementing, and the AUTHORITATIVE ordering
 *                     column. Two entries appended within the same request
 *                     can share a millisecond-resolution `occurred_at`, so
 *                     AC-39.6.3's evidence (an ordered sequence of entries)
 *                     orders by `id`, never by timestamp alone.
 *   project_id     — the owning Project. NOT NULL: an entry always belongs
 *                     to exactly one Project. CASCADE on delete: a deleted
 *                     Project's history has nothing left to be history of.
 *   entry_type     — a stable machine-readable kind, e.g. 'phase_change',
 *                     'milestone_completed', 'next_action_override_set'.
 *   summary        — human-readable prose describing what changed, the
 *                     string a timeline UI renders directly.
 *   actor_admin_id — the acting admin, if any. SET NULL on delete so the
 *                     row (and its actor_name snapshot) survives an admin
 *                     account being removed later — the same pairing
 *                     migration 127 already established.
 *   actor_name     — a snapshot of that admin's username at write time, the
 *                     durable "who" even if actor_admin_id is later nulled.
 *   metadata       — nullable structured detail (e.g. from/to values for a
 *                     phase change) a UI may render alongside the summary
 *                     without parsing it out of the prose.
 *   occurred_at    — when the change happened.
 *
 * This AC ships only the table: no service writes to it and no route reads
 * it yet — those are AC-39.6.1.2 (the second schema prerequisite) and the
 * later ACs that append and read entries.
 *
 * Idempotent: table creation guarded by hasTable, matching migrations
 * 122-127's convention. No seed data — a Project's timeline starts empty.
 */

exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('project_activity_timeline'))) {
    await knex.schema.createTable('project_activity_timeline', (table) => {
      table.increments('id').primary();
      table.integer('project_id').unsigned().notNullable()
        .references('id').inTable('projects').onDelete('CASCADE');
      table.string('entry_type', 64).notNullable();
      table.text('summary').notNullable();
      table.integer('actor_admin_id').unsigned()
        .references('id').inTable('admin_users').onDelete('SET NULL');
      table.string('actor_name', 255).notNullable();
      table.json('metadata');
      table.timestamp('occurred_at').defaultTo(knex.fn.now());
      table.index(['project_id']);
    });
  }
};

exports.down = async function (knex) {
  if (await knex.schema.hasTable('project_activity_timeline')) {
    await knex.schema.dropTable('project_activity_timeline');
  }
};
