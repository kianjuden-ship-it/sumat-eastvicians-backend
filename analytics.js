const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Activity logs are a system/administration concern, not a case-content concern,
// so this is open to the roles that manage the platform.
router.get(
  '/',
  requireAuth,
  requireRole('PRINCIPAL', 'ICT_ADMINISTRATOR', 'SYSTEM_OPERATOR', 'DESIGNATED_SCHOOL_ADMINISTRATOR'),
  async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT admin_name, role, action, created_at FROM admin_activity_logs ORDER BY created_at DESC LIMIT 200'
      );
      res.json({ activity: result.rows });
    } catch (error) {
      console.error('Activity log error', error);
      res.status(500).json({ error: 'Activity logs could not be loaded right now.' });
    }
  }
);

module.exports = router;
