const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getPermissions } = require('../utils/permissions');

const router = express.Router();

// Full account creation/editing is intentionally out of scope for this pass — accounts are
// provisioned via backend/scripts/seed-admins.js so passwords are never handled by the browser.
// This route only lists accounts for the roles allowed to manage users.
router.get('/', requireAuth, requireRole('PRINCIPAL', 'SYSTEM_OPERATOR'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, username, role, status, created_at, last_login FROM users ORDER BY created_at ASC'
    );
    const users = result.rows.map((row) => ({
      ...row,
      role_label: getPermissions(row.role)?.label || row.role
    }));
    res.json({ users });
  } catch (error) {
    console.error('User list error', error);
    res.status(500).json({ error: 'Administrator accounts could not be loaded right now.' });
  }
});

module.exports = router;
