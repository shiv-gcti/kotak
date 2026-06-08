const pool = require('../config/database');

(async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('OK', result.rows);
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('DBERR', err.message);
    process.exit(1);
  }
})();
