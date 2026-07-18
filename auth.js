const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { canListReports, categoryFilterFor } = require('../utils/permissions');

const router = express.Router();

// GET /api/analytics/summary - counts only, safe for every role including SSLG (stats-only)
router.get('/summary', requireAuth, async (req, res) => {
  const { role } = req.admin;
  if (!canListReports(role)) {
    return res.status(403).json({ error: 'Your role does not have access to report statistics.' });
  }

  const categoryFilter = categoryFilterFor(role);
  try {
    const rows = categoryFilter
      ? (await pool.query('SELECT status, priority FROM reports WHERE category_key = ANY($1)', [categoryFilter])).rows
      : (await pool.query('SELECT status, priority FROM reports')).rows;

    const summary = {
      total: rows.length,
      pending: rows.filter((r) => r.status === 'Pending').length,
      underReview: rows.filter((r) => r.status === 'Under Review').length,
      resolved: rows.filter((r) => r.status === 'Resolved' || r.status === 'Closed').length,
      highPriority: rows.filter((r) => r.priority === 'High').length,
      byStatus: {}
    };
    for (const status of ['Pending', 'Under Review', 'Forwarded', 'Waiting for Student', 'Resolved', 'Closed', 'Rejected']) {
      summary.byStatus[status] = rows.filter((r) => r.status === status).length;
    }

    res.json(summary);
  } catch (error) {
    console.error('Analytics error', error);
    res.status(500).json({ error: 'Analytics could not be loaded right now.' });
  }
});

module.exports = router;
