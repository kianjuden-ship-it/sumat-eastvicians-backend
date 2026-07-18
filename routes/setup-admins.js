const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

const router = express.Router();

const accounts = [
  { full_name: 'Kian Jude', username: 'KianJude1', password: 'kianjuden14344', role: 'SYSTEM_OPERATOR' },
  { full_name: 'School Principal', username: 'principal', password: 'Principal@2026', role: 'PRINCIPAL' },
  { full_name: 'Guidance Counselor', username: 'guidance01', password: 'Guidance@2026', role: 'GUIDANCE_COUNSELOR' },
  { full_name: 'Child Protection Committee', username: 'cpc01', password: 'ChildProtect@2026', role: 'CHILD_PROTECTION_COMMITTEE' },
  { full_name: 'ICT Administrator', username: 'ictadmin', password: 'ICTAdmin@2026', role: 'ICT_ADMINISTRATOR' },
  { full_name: 'SSLG Administrator', username: 'admin01', password: 'Admin@2026', role: 'SSLG_PRESIDENT' }
];

router.get('/', async (req, res) => {
  try {
    for (const account of accounts) {
      const passwordHash = await bcrypt.hash(account.password, 12);

      await pool.query(
        `INSERT INTO users (full_name, username, password_hash, role)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (username)
         DO UPDATE SET password_hash=$3, role=$4`,
        [
          account.full_name,
          account.username,
          passwordHash,
          account.role
        ]
      );
    }

    res.send("Admin accounts created successfully.");
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

module.exports = router;
