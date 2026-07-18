const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');
const upload = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');
const { nextReportId } = require('../utils/reportId');
const { CATEGORIES, CATEGORY_DETAIL_FIELDS } = require('../utils/categories');
const { getPermissions, canListReports, categoryFilterFor, shouldMaskIdentity } = require('../utils/permissions');

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this device. Please try again later.' }
});

const PRIVACY_MODE_MAP = {
  'Confidential Report': 'confidential_report',
  'Confidential Identity - Initial Review': 'confidential_identity'
};

function toPublicReport(row) {
  return {
    report_id: row.report_id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function toAdminReport(row, role) {
  const masked = shouldMaskIdentity(role, row);
  const permissions = getPermissions(role);
  const base = {
    report_id: row.report_id,
    category_key: row.category_key,
    category_label: row.category_label,
    priority: row.priority,
    status: row.status,
    assigned_office: row.assigned_office,
    assigned_personnel: row.assigned_personnel,
    created_at: row.created_at,
    updated_at: row.updated_at,
    report_date: row.report_date,
    report_location: row.report_location
  };

  if (permissions.statsOnly) {
    // SSLG-level roles never see identity, descriptions, or internal notes.
    return base;
  }

  return {
    ...base,
    reporter_full_name: masked ? 'Confidential identity' : row.reporter_full_name,
    reporter_grade_level: row.reporter_grade_level,
    reporter_section: masked ? 'Restricted' : row.reporter_section,
    reporter_student_id: masked ? 'Restricted' : row.reporter_student_id,
    privacy_mode: row.privacy_mode,
    title: row.title,
    description: row.description,
    details: row.details,
    attachments: row.attachments,
    internal_notes: row.internal_notes
  };
}

// POST /api/reports - public submission from the verification+reporting form
router.post('/', submitLimiter, upload.array('evidence_files[]', 10), async (req, res) => {
  const body = req.body || {};
  const files = req.files || [];

  const requiredFields = ['reporter_full_name', 'reporter_grade_level', 'reporter_section', 'report_category', 'privacy_mode'];
  for (const field of requiredFields) {
    if (!body[field] || !String(body[field]).trim()) {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }

  const categoryKey = body.report_category;
  const category = CATEGORIES[categoryKey];
  if (!category) {
    return res.status(400).json({ error: 'Unknown report category.' });
  }

  const privacyMode = PRIVACY_MODE_MAP[body.privacy_mode];
  if (!privacyMode) {
    return res.status(400).json({ error: 'Please choose a reporter privacy option.' });
  }

  const description = (body.report_description || '').trim();
  const recognitionReason = (body.recognition_reason || '').trim();
  const hasDescription = description.length > 0 || (categoryKey === 'appreciation' && recognitionReason.length > 0);
  if (!hasDescription) {
    return res.status(400).json({ error: 'Please provide a clear description of the report or a recognition reason.' });
  }

  const hasUpload = files.length > 0;
  const hasWitness = Boolean((body.witnesses || '').trim());
  const hasDateAndLocation = Boolean(body.report_date) && Boolean((body.report_location || '').trim());
  if (!hasUpload && !hasWitness && !hasDateAndLocation) {
    return res.status(400).json({ error: 'Please provide at least one supporting item: a file, a witness, or both a date and location.' });
  }

  const details = {};
  for (const key of CATEGORY_DETAIL_FIELDS[categoryKey] || []) {
    if (body[key] !== undefined) details[key] = body[key];
  }

  const attachments = files.map((file) => ({
    original_name: file.originalname,
    stored_name: file.filename,
    size_bytes: file.size,
    mime_type: file.mimetype
  }));

  try {
    const reportId = await nextReportId();
    const result = await pool.query(
      `INSERT INTO reports (
        report_id, reporter_full_name, reporter_grade_level, reporter_section, reporter_student_id,
        privacy_mode, category_key, category_label, priority, title, report_date, report_location,
        description, details, attachments, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'Pending')
      RETURNING report_id, status, created_at`,
      [
        reportId,
        body.reporter_full_name.trim(),
        body.reporter_grade_level.trim(),
        body.reporter_section.trim(),
        body.reporter_student_id ? body.reporter_student_id.trim() : null,
        privacyMode,
        categoryKey,
        category.label,
        category.priority,
        (body.report_title || category.label).trim(),
        body.report_date || null,
        body.report_location ? body.report_location.trim() : null,
        description || recognitionReason,
        JSON.stringify(details),
        JSON.stringify(attachments)
      ]
    );

    await pool.query(
      `INSERT INTO report_history (report_id, previous_status, new_status, changed_by, remarks)
       VALUES ($1, NULL, 'Pending', 'System', 'Report submitted by student')`,
      [reportId]
    );

    res.status(201).json({ report_id: result.rows[0].report_id, status: result.rows[0].status, created_at: result.rows[0].created_at });
  } catch (error) {
    console.error('Report submission error', error);
    res.status(500).json({ error: 'Your report could not be submitted right now. Please try again.' });
  }
});

// GET /api/reports/track/:reportId - public status lookup, no identity or description exposed
router.get('/track/:reportId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT report_id, status, created_at, updated_at FROM reports WHERE report_id = $1',
      [req.params.reportId.trim().toUpperCase()]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'No report found with that Report ID.' });

    const history = await pool.query(
      'SELECT new_status AS status, timestamp FROM report_history WHERE report_id = $1 ORDER BY timestamp ASC',
      [result.rows[0].report_id]
    );

    res.json({ ...toPublicReport(result.rows[0]), timeline: history.rows });
  } catch (error) {
    console.error('Tracking error', error);
    res.status(500).json({ error: 'Report status could not be retrieved right now.' });
  }
});

// GET /api/reports - admin list, filtered by role permissions
router.get('/', requireAuth, async (req, res) => {
  const { role } = req.admin;
  if (!canListReports(role)) {
    return res.status(403).json({ error: 'Your role does not have access to report data.' });
  }

  const categoryFilter = categoryFilterFor(role);
  try {
    const result = categoryFilter
      ? await pool.query('SELECT * FROM reports WHERE category_key = ANY($1) ORDER BY created_at DESC', [categoryFilter])
      : await pool.query('SELECT * FROM reports ORDER BY created_at DESC');

    res.json({ reports: result.rows.map((row) => toAdminReport(row, role)) });
  } catch (error) {
    console.error('List reports error', error);
    res.status(500).json({ error: 'Reports could not be loaded right now.' });
  }
});

// GET /api/reports/:reportId - admin detail view
router.get('/:reportId', requireAuth, async (req, res) => {
  const { role } = req.admin;
  const categoryFilter = categoryFilterFor(role);

  try {
    const result = await pool.query('SELECT * FROM reports WHERE report_id = $1', [req.params.reportId]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Report not found.' });

    const permissions = getPermissions(role);
    const allowed = permissions.viewAll || (categoryFilter && categoryFilter.includes(row.category_key));
    if (!allowed) return res.status(403).json({ error: 'This report is outside your assigned permission scope.' });

    const history = await pool.query(
      'SELECT previous_status, new_status, changed_by, remarks, timestamp FROM report_history WHERE report_id = $1 ORDER BY timestamp ASC',
      [row.report_id]
    );

    await pool.query('INSERT INTO admin_activity_logs (admin_name, role, action) VALUES ($1, $2, $3)', [
      req.admin.fullName, permissions.label, `Viewed report ${row.report_id}`
    ]);

    res.json({ ...toAdminReport(row, role), timeline: history.rows });
  } catch (error) {
    console.error('Report detail error', error);
    res.status(500).json({ error: 'Report details could not be loaded right now.' });
  }
});

// PATCH /api/reports/:reportId - update status, assignment, and internal notes
router.patch('/:reportId', requireAuth, async (req, res) => {
  const { role, fullName } = req.admin;
  const permissions = getPermissions(role);
  if (permissions.statsOnly || (!permissions.viewAll && permissions.categories.length === 0)) {
    return res.status(403).json({ error: 'Your role cannot update case records.' });
  }

  const { status, assigned_office: assignedOffice, assigned_personnel: assignedPersonnel, internal_notes: internalNotes } = req.body || {};
  const allowedStatuses = ['Pending', 'Under Review', 'Forwarded', 'Waiting for Student', 'Resolved', 'Closed', 'Rejected'];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  try {
    const existing = await pool.query('SELECT * FROM reports WHERE report_id = $1', [req.params.reportId]);
    const row = existing.rows[0];
    if (!row) return res.status(404).json({ error: 'Report not found.' });

    const categoryFilter = categoryFilterFor(role);
    const allowed = permissions.viewAll || (categoryFilter && categoryFilter.includes(row.category_key));
    if (!allowed) return res.status(403).json({ error: 'This report is outside your assigned permission scope.' });

    const nextStatus = status || row.status;
    const updated = await pool.query(
      `UPDATE reports SET status = $1, assigned_office = $2, assigned_personnel = $3, internal_notes = $4, updated_at = NOW()
       WHERE report_id = $5 RETURNING *`,
      [nextStatus, assignedOffice ?? row.assigned_office, assignedPersonnel ?? row.assigned_personnel, internalNotes ?? row.internal_notes, row.report_id]
    );

    if (nextStatus !== row.status) {
      await pool.query(
        `INSERT INTO report_history (report_id, previous_status, new_status, changed_by, remarks)
         VALUES ($1,$2,$3,$4,$5)`,
        [row.report_id, row.status, nextStatus, fullName, internalNotes || null]
      );
    }

    await pool.query('INSERT INTO admin_activity_logs (admin_name, role, action) VALUES ($1, $2, $3)', [
      fullName, permissions.label, `Updated report ${row.report_id}`
    ]);

    res.json(toAdminReport(updated.rows[0], role));
  } catch (error) {
    console.error('Report update error', error);
    res.status(500).json({ error: 'The case update could not be saved right now.' });
  }
});

// GET /api/reports/:reportId/attachments/:storedName - authenticated evidence download,
// never publicly reachable so confidentiality is preserved.
router.get('/:reportId/attachments/:storedName', requireAuth, async (req, res) => {
  const { role } = req.admin;
  const categoryFilter = categoryFilterFor(role);
  const permissions = getPermissions(role);

  try {
    const result = await pool.query('SELECT category_key, attachments FROM reports WHERE report_id = $1', [req.params.reportId]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Report not found.' });

    const allowed = permissions.viewAll || (categoryFilter && categoryFilter.includes(row.category_key));
    if (!allowed || permissions.statsOnly) return res.status(403).json({ error: 'This report is outside your assigned permission scope.' });

    const attachment = (row.attachments || []).find((item) => item.stored_name === req.params.storedName);
    if (!attachment) return res.status(404).json({ error: 'Attachment not found.' });

    const filePath = path.join(process.env.UPLOAD_DIR || './uploads', attachment.stored_name);
    res.download(filePath, attachment.original_name);
  } catch (error) {
    console.error('Attachment download error', error);
    res.status(500).json({ error: 'The attachment could not be retrieved right now.' });
  }
});

module.exports = router;
