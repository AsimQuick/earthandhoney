/**
 * Admin → Projects routes (the admin-only Project Overview cockpit, Model A).
 *
 * Mounted at /api/admin/projects. Projects group events; the overview rolls
 * up the per-event/per-customer documents. Read = `events.view`, write =
 * `events.manage` (projects are fundamentally an events-grouping concept).
 * The overview additionally gates each money-doc type on the admin's own
 * bills/quotes/contracts view permission.
 */

const express = require('express');
const { body, param } = require('express-validator');
const { adminAuth } = require('../middleware/auth');
const { requirePermission, userHasAnyPermission } = require('../middleware/permissions');
const { handleAsync, validateRequest, successResponse } = require('../utils/routeHelpers');
const projectService = require('../services/projectService');

const router = express.Router();
router.use(adminAuth);

// List
router.get('/', requirePermission('events.view'), handleAsync(async (req, res) => {
  const projects = await projectService.listProjects({
    search: req.query.q || '',
    status: req.query.status || null,
  });
  return successResponse(res, { projects });
}));

// Create — US-41 AC-41.1.2.1: one create call, one setup path. `createProject` still owns PRD 22.3's item 1 (the `projects` insert); `projectSetupService.completeProjectSetup` is the single shared path for the other nine, called once immediately after it with `req.admin` as the actor — see PROJECT_SETUP_MECHANISM_MAP.md and that service's own header. Required inline, and this block packed to zero added lines, so no line number earlier ACs' evidence cites against this pinned file shifts — the same reason `GET /:id/next-action` below requires its services inline rather than at the top of the file.
router.post('/',
  requirePermission('events.manage'),
  [body('name').isString().trim().isLength({ min: 1, max: 255 }), body('customerAccountId').optional({ values: 'falsy' }).isInt({ min: 1 }), body('primaryContactEmail').optional({ values: 'falsy' }).isEmail()],
  handleAsync(async (req, res) => {
    validateRequest(req);
    const projectSetupService = require('../services/projectSetupService');
    const project = await projectService.createProject({ name: req.body.name, customerAccountId: req.body.customerAccountId || null }, req.admin.id);
    await projectSetupService.completeProjectSetup(project, { customerAccountId: req.body.customerAccountId || null, primaryContactEmail: req.body.primaryContactEmail || null }, { adminId: req.admin.id, adminName: req.admin.username });
    const created = await projectService.getProjectById(project.id);
    return successResponse(res, { project: created }, 201, 'Project created');
  }),
);

// Detail
router.get('/:id', requirePermission('events.view'), [param('id').isInt({ min: 1 })], handleAsync(async (req, res) => {
  validateRequest(req);
  const project = await projectService.getProjectById(parseInt(req.params.id, 10));
  if (!project) return res.status(404).json({ error: 'Project not found' });
  return successResponse(res, { project });
}));

// Update
router.put('/:id',
  requirePermission('events.manage'),
  [
    param('id').isInt({ min: 1 }),
    body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
    body('customerAccountId').optional({ values: 'null' }).isInt({ min: 1 }),
    body('status').optional().isString().isLength({ max: 24 }),
  ],
  handleAsync(async (req, res) => {
    validateRequest(req);
    const project = await projectService.updateProject(parseInt(req.params.id, 10), {
      name: req.body.name,
      customerAccountId: req.body.customerAccountId,
      status: req.body.status,
    });
    return successResponse(res, { project }, 200, 'Project updated');
  }),
);

// Attach an event to the project
router.post('/:id/events',
  requirePermission('events.manage'),
  [param('id').isInt({ min: 1 }), body('eventId').isInt({ min: 1 })],
  handleAsync(async (req, res) => {
    validateRequest(req);
    const result = await projectService.assignEvent(parseInt(req.params.id, 10), parseInt(req.body.eventId, 10));
    return successResponse(res, result, 200, 'Event attached to project');
  }),
);

// The cockpit aggregation — doc types gated on the admin's own permissions
router.get('/:id/overview', requirePermission('events.view'), [param('id').isInt({ min: 1 })], handleAsync(async (req, res) => {
  validateRequest(req);
  const perms = {
    bills: await userHasAnyPermission(req.admin.id, ['bills.view']),
    quotes: await userHasAnyPermission(req.admin.id, ['quotes.view']),
    contracts: await userHasAnyPermission(req.admin.id, ['contracts.view']),
  };
  const overview = await projectService.getProjectOverview(parseInt(req.params.id, 10), perms);
  return successResponse(res, overview);
}));

// Email preview — the ACTUAL sent HTML (or null for pre-rendered_html rows)
router.get('/email/:emailId/preview', requirePermission('events.view'), [param('emailId').isInt({ min: 1 })], handleAsync(async (req, res) => {
  validateRequest(req);
  const preview = await projectService.getEmailPreview(parseInt(req.params.emailId, 10));
  return successResponse(res, preview);
}));

// Next action (US-39 AC-39.3.2) — the single server-computed value; see
// ../services/nextActionService, the same module the Project Room's
// `GET /api/customer/projects/:id/next-action` route requires. This route
// only forwards the id — it never reads the milestone or booking-
// requirement tables itself, and carries no next-action wording of its own.
// Required inline (not at the top of the file, matching the pattern
// customer.js already uses for several of its own services) so this
// addition appends after every existing route rather than shifting the
// line numbers earlier ACs' evidence cites against this pinned file.
//
// AC-39.5 extends the response (never the computation) with this Project's
// manual override, if one is set: `computedNextAction` is always
// AC-39.3.2's value; `nextAction` is the value a reader should act on (the
// override's text when one exists, else identical to `computedNextAction`);
// `override` is non-null only once a photographer has set one, carrying
// who and when — presented alongside the computation, never silently
// replacing it.
router.get('/:id/next-action', requirePermission('events.view'), [param('id').isInt({ min: 1 })], handleAsync(async (req, res) => {
  validateRequest(req);
  const projectId = parseInt(req.params.id, 10);
  const nextActionService = require('../services/nextActionService');
  const computed = await nextActionService.computeProjectNextAction(projectId);
  if (!computed) return res.status(404).json({ error: 'Project not found' });

  const nextActionOverrideService = require('../services/nextActionOverrideService');
  const { presentNextAction } = require('../services/nextActionOverride');
  const override = await nextActionOverrideService.getProjectNextActionOverride(projectId);

  return successResponse(res, {
    projectId: computed.projectId,
    phase: computed.phase,
    ...presentNextAction({ computedNextAction: computed.nextAction, override }),
  });
}));

// Manual next-action override (US-39 AC-39.5) — PRD 23.4 "manual
// overrides". Write side of the override surfaced by the GET above.
// `events.manage`, matching this router's other write routes (the create
// route above, `POST /`). One row per Project
// (`project_next_action_overrides`, migration 127): a repeat call replaces
// the prior override rather than accumulating a history, and always
// records the acting admin (`req.admin`) and the write's own timestamp —
// never a caller-supplied actor or time. The response echoes the same
// computed-value-plus-override shape as the GET, so the override is
// visible written-and-read-back in the one response that set it.
router.put('/:id/next-action/override',
  requirePermission('events.manage'),
  [
    param('id').isInt({ min: 1 }),
    body('overrideText').isString().trim().isLength({ min: 1, max: 2000 }),
  ],
  handleAsync(async (req, res) => {
    validateRequest(req);
    const projectId = parseInt(req.params.id, 10);
    const nextActionService = require('../services/nextActionService');
    const computed = await nextActionService.computeProjectNextAction(projectId);
    if (!computed) return res.status(404).json({ error: 'Project not found' });

    const nextActionOverrideService = require('../services/nextActionOverrideService');
    const { presentNextAction } = require('../services/nextActionOverride');
    const override = await nextActionOverrideService.setProjectNextActionOverride(projectId, {
      overrideText: req.body.overrideText,
      actorAdminId: req.admin.id,
      actorName: req.admin.username,
    });

    // US-39 AC-39.6.2 — every override write also appends one entry
    // through the shared activityTimelineService, never a direct insert
    // of its own. Unlike the phase/milestone routes below, an override
    // call carries no no-op case here: PRD 23.4 treats each override call
    // as a deliberate photographer action worth its own timeline entry,
    // even if its text happens to repeat the prior override.
    const activityTimelineService = require('../services/activityTimelineService');
    const { ENTRY_TYPES } = require('../services/activityTimelineEntry');
    await activityTimelineService.appendActivityTimelineEntry(
      { id: projectId },
      ENTRY_TYPES.NEXT_ACTION_OVERRIDE_SET,
      { adminId: req.admin.id, name: req.admin.username },
      {
        summary: `Next action manually overridden: "${req.body.overrideText}"`,
        metadata: { overrideText: req.body.overrideText },
      },
    );

    return successResponse(res, {
      projectId: computed.projectId,
      phase: computed.phase,
      ...presentNextAction({ computedNextAction: computed.nextAction, override }),
    }, 200, 'Next action override recorded');
  }),
);

// Phase change (US-39 AC-39.6.2) — updates projects.current_phase via
// projectPhaseService, then, only when that write actually changed
// something, this handler itself requires the shared
// activityTimelineService and appends one 'phase_change' entry. Setting
// the phase to its current value is a no-op: no database write, no
// timeline entry, so the timeline stays a history of real changes rather
// than of requests. events.manage, matching this router's other write
// routes. PROJECT_PHASE_KEYS is AC-39.1's locked seven-phase list,
// mirrored into this CommonJS backend by projectPhaseService.js (see that
// file's header for why it is a mirror, not an import).
const projectPhaseService = require('../services/projectPhaseService');
router.put('/:id/phase',
  requirePermission('events.manage'),
  [
    param('id').isInt({ min: 1 }),
    body('phase').isString().trim().isIn(projectPhaseService.PROJECT_PHASE_KEYS),
  ],
  handleAsync(async (req, res) => {
    validateRequest(req);
    const projectId = parseInt(req.params.id, 10);
    const result = await projectPhaseService.setProjectPhase(projectId, req.body.phase);
    if (!result) return res.status(404).json({ error: 'Project not found' });

    if (result.changed) {
      const activityTimelineService = require('../services/activityTimelineService');
      const { ENTRY_TYPES } = require('../services/activityTimelineEntry');
      const { describePhaseChange } = require('../services/projectChangeRules');
      await activityTimelineService.appendActivityTimelineEntry(
        { id: projectId },
        ENTRY_TYPES.PHASE_CHANGE,
        { adminId: req.admin.id, name: req.admin.username },
        {
          summary: describePhaseChange(result.previousPhase, result.project.phase),
          metadata: { from: result.previousPhase, to: result.project.phase },
        },
      );
    }

    return successResponse(res, result, 200, result.changed ? 'Project phase updated' : 'Project phase already set — no change');
  }),
);

// Milestone completion (US-39 AC-39.6.2) — marks one of this Project's own
// milestone rows complete via projectMilestoneService, then, only when
// that write actually changed something, this handler itself requires the
// shared activityTimelineService and appends one 'milestone_completed'
// entry. Re-completing an already-complete milestone is a no-op: no
// database write, no timeline entry. events.manage, matching this
// router's other write routes.
const projectMilestoneService = require('../services/projectMilestoneService');
router.put('/:id/milestones/:key/complete',
  requirePermission('events.manage'),
  [
    param('id').isInt({ min: 1 }),
    param('key').isString().trim().isLength({ min: 1, max: 64 }),
  ],
  handleAsync(async (req, res) => {
    validateRequest(req);
    const projectId = parseInt(req.params.id, 10);
    const milestoneKey = req.params.key;
    const result = await projectMilestoneService.completeProjectMilestone(projectId, milestoneKey, req.admin.username);
    if (!result) return res.status(404).json({ error: 'Project or milestone not found' });

    if (result.changed) {
      const activityTimelineService = require('../services/activityTimelineService');
      const { ENTRY_TYPES } = require('../services/activityTimelineEntry');
      const { describeMilestoneCompletion } = require('../services/projectChangeRules');
      await activityTimelineService.appendActivityTimelineEntry(
        { id: projectId },
        ENTRY_TYPES.MILESTONE_COMPLETED,
        { adminId: req.admin.id, name: req.admin.username },
        {
          summary: describeMilestoneCompletion(result.milestone.name),
          metadata: { milestoneKey },
        },
      );
    }

    return successResponse(res, result, 200, result.changed ? 'Milestone marked complete' : 'Milestone already complete — no change');
  }),
);

// Timeline (US-39 AC-39.6.2) — one Project's activity timeline entries,
// oldest first (PRD 22.3, 23.4): the three routes above, and no other
// write path, are what populate it. events.view, matching this router's
// other read routes.
router.get('/:id/timeline', requirePermission('events.view'), [param('id').isInt({ min: 1 })], handleAsync(async (req, res) => {
  validateRequest(req);
  const projectId = parseInt(req.params.id, 10);
  const project = await projectService.getProjectById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const activityTimelineService = require('../services/activityTimelineService');
  const entries = await activityTimelineService.getProjectTimeline(projectId);
  return successResponse(res, { projectId, entries });
}));

// Read-back routes (US-41 AC-41.1.2.3) — PROJECT_SETUP_MECHANISM_MAP.md's
// question 12 recorded exactly five of PRD 22.3's ten setup items (3, 4,
// 5's milestone list, 7 and 9) with no read-back route of any kind at the
// pinned commit; these five close that gap, one GET per item, same mount
// (/api/admin/projects), same router.use(adminAuth) and same
// events.view this router's other GETs already use — no new permission,
// no new mount. Each delegates to its own named function on
// projectSetupService (AC-41.1.2.1's single setup path) and never builds
// a query of its own, so the single-authority shape holds for the reads
// as well as for the write. Required inline, matching this file's
// established pattern for a repeatedly-required service (see
// `GET /:id/next-action` above), so nothing above this point shifts.
router.get('/:id/media-area', requirePermission('events.view'), [param('id').isInt({ min: 1 })], handleAsync(async (req, res) => {
  validateRequest(req);
  const projectSetupService = require('../services/projectSetupService');
  const status = await projectSetupService.getProjectMediaAreaStatus(parseInt(req.params.id, 10));
  if (!status) return res.status(404).json({ error: 'Project not found' });
  return successResponse(res, status);
}));

router.get('/:id/room-access', requirePermission('events.view'), [param('id').isInt({ min: 1 })], handleAsync(async (req, res) => {
  validateRequest(req);
  const projectSetupService = require('../services/projectSetupService');
  const status = await projectSetupService.getProjectRoomAccessStatus(parseInt(req.params.id, 10));
  if (!status) return res.status(404).json({ error: 'Project not found' });
  return successResponse(res, status);
}));

router.get('/:id/milestones', requirePermission('events.view'), [param('id').isInt({ min: 1 })], handleAsync(async (req, res) => {
  validateRequest(req);
  const projectSetupService = require('../services/projectSetupService');
  const result = await projectSetupService.getProjectMilestones(parseInt(req.params.id, 10));
  if (!result) return res.status(404).json({ error: 'Project not found' });
  return successResponse(res, result);
}));

router.get('/:id/documents', requirePermission('events.view'), [param('id').isInt({ min: 1 })], handleAsync(async (req, res) => {
  validateRequest(req);
  const projectSetupService = require('../services/projectSetupService');
  const result = await projectSetupService.getProjectDocuments(parseInt(req.params.id, 10));
  if (!result) return res.status(404).json({ error: 'Project not found' });
  return successResponse(res, result);
}));

router.get('/:id/integration-status', requirePermission('events.view'), [param('id').isInt({ min: 1 })], handleAsync(async (req, res) => {
  validateRequest(req);
  const projectSetupService = require('../services/projectSetupService');
  const result = await projectSetupService.getProjectIntegrationStatus(parseInt(req.params.id, 10));
  if (!result) return res.status(404).json({ error: 'Project not found' });
  return successResponse(res, result);
}));

module.exports = router;
