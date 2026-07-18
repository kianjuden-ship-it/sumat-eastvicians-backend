require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

// Kian Jude is the System Operator / Platform Administrator (technical administration only).
// He is intentionally NOT the SSLG President — that is a separate account below.
const accounts = [
  { full_name: 'Kian Jude', username: 'KianJude1', password: 'kianjuden14344', role: 'SYSTEM_OPERATOR' },
  { full_name: 'School Principal', username: 'principal', password: 'Principal@2026', role: 'PRINCIPAL' },
  { full_name: 'Guidance Counselor', username: 'guidance01', password: 'Guidance@2026', role: 'GUIDANCE_COUNSELOR' },
  { full_name: 'Child Protection Committee', username: 'cpc01', password: 'ChildProtect@2026', role: 'CHILD_PROTECTION_COMMITTEE' },
  { full_name: 'ICT Administrator', username: 'ictadmin', password: 'ICTAdmin@2026', role: 'ICT_ADMINISTRATOR' },
  { full_name: 'SSLG Administrator', username: 'admin01', password: 'Admin@2026', role: 'SSLG_PRESIDENT' }
];

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await pool.query(schema);

  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    await pool.query(
      `INSERT INTO users (full_name, username, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         status = 'ACTIVE'`,
      [account.full_name, account.username, passwordHash, account.role]
    );
    console.log(`Seeded ${account.username} (${account.role})`);
  }

  console.log('\nDone. Change these default passwords after first login in a production deployment.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
