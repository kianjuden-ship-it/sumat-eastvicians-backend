const pool = require('../db/pool');

// Atomically increments the shared sequence so concurrent submissions never collide.
async function nextReportId() {
  const result = await pool.query(
    `UPDATE report_sequence SET current_value = current_value + 1 WHERE sequence_key = 1 RETURNING current_value`
  );
  const sequence = result.rows[0].current_value;
  const year = new Date().getFullYear();
  return `SUMAT-${year}-${String(sequence).padStart(6, '0')}`;
}

module.exports = { nextReportId };
