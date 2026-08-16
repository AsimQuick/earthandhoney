/**
 * Migration: seed the missing `events.manage` permission and grant it
 * (US-39 AC-39.6.1.2, the second of AC-39.6's two schema prerequisites).
 *
 * NEXT_ACTION_CROSS_SURFACE_MAP.md (AC-39.3.1) recorded that every
 * `events.manage`-gated admin route in
 * vendor/picpeak/backend/src/routes/adminProjects.js — create, update/relink,
 * attach-event — returns an unconditional 403 for every role, including
 * super_admin, because no migration in the pinned fork ever seeds a
 * permission row named `events.manage`:
 *
 *  - migration 055's permission seed lists exactly five `events.*` rows —
 *    view, create, edit, delete, archive — and never `events.manage`.
 *  - migration 056's super_admin grant is "every row that exists in
 *    `permissions` at migration time", not a fixed list, so super_admin can
 *    only ever hold a permission that was actually seeded.
 *
 * That map explicitly deferred the fix to "whichever AC actually needs the
 * admin write routes to work" rather than resolving it on AC-39.3.1's own
 * authority. AC-39.6 is that AC: all three of its writes (phase change,
 * milestone completion, manual override) go through those gated routes.
 *
 * Fork discipline forbids editing 055 or 056 — both are already-shipped
 * migrations — so this ships as a new, later migration following the
 * seed-then-grant pattern migration 090 (`090_add_customer_accounts.js`)
 * already established: insert the permission row only if absent, then look
 * up role and permission ids fresh and insert only the role_permissions
 * grants that do not already exist. Grants super_admin.
 *
 * This migration ships the schema prerequisite only: no route is changed
 * and no gated route is exercised here — AC-39.6.3 is what proves the gate
 * actually opened.
 */

exports.up = async function (knex) {
  const existingPermissions = await knex('permissions').select('name');
  const existingNames = new Set(existingPermissions.map((p) => p.name));

  if (!existingNames.has('events.manage')) {
    await knex('permissions').insert({
      name: 'events.manage',
      display_name: 'Manage Projects',
      category: 'events',
      description: 'Create, update and attach events to Projects — the admin write routes gated on events.manage',
    });
  }

  // Look up role and permission ids fresh — the insert above (if it ran)
  // just landed and neither id is known ahead of time.
  const roles = await knex('roles').select('id', 'name').whereIn('name', ['super_admin']);
  const perms = await knex('permissions').select('id', 'name').whereIn('name', ['events.manage']);

  if (roles.length > 0 && perms.length > 0) {
    const existingGrants = await knex('role_permissions').select('role_id', 'permission_id');
    const existingGrantSet = new Set(existingGrants.map((g) => `${g.role_id}-${g.permission_id}`));

    const inserts = [];
    for (const role of roles) {
      for (const perm of perms) {
        const key = `${role.id}-${perm.id}`;
        if (!existingGrantSet.has(key)) {
          inserts.push({ role_id: role.id, permission_id: perm.id });
        }
      }
    }
    if (inserts.length > 0) {
      await knex('role_permissions').insert(inserts);
    }
  }
};

exports.down = async function (knex) {
  // Best-effort cleanup, matching migration 090's down(): delete the
  // events.manage permission row; its role_permissions grants cascade via
  // the foreign key (056_add_role_permissions_table.js declares
  // permission_id ON DELETE CASCADE), so an up-down-up returns to the
  // pre-migration state.
  await knex('permissions').where('name', 'events.manage').del();
};
