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

// Create
router.post('/',
  requirePermission('events.manage'),
  [body('name').isString().trim().isLength({ min: 1, max: 255 }), body('customerAccountId').optional({ values: 'falsy' }).isInt({ min: 1 })],
  handleAsync(async (req, res) => {
    validateRequest(req);
    const project = await projectService.createProject(
      { name: req.body.name, customerAccountId: req.body.customerAccountId || null },
      req.admin.id,
    );
    return successResponse(res, { project }, 201, 'Project created');
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

    return successResponse(res, {
      projectId: computed.projectId,
      phase: computed.phase,
      ...presentNextAction({ computedNextAction: computed.nextAction, override }),
    }, 200, 'Next action override recorded');
  }),
);

module.exports = router;
