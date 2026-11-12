const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function migrate() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'config', 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ Migration complete: saari tables ban gayi');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();