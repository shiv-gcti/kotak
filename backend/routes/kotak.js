const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const kotakNeoAPI = require('../services/kotakNeoAPI');

/**
 * POST /api/kotak/login
 * Store Kotak TOTP code and attempt manual login.
 */
router.post('/login', async (req, res) => {
  const { totpCode } = req.body;
  if (!totpCode) {
    return res.status(400).json({ success: false, error: 'Missing required field: totpCode' });
  }

  let connection;
  try {
    const authResult = await kotakNeoAPI.authenticate(totpCode);

    connection = await pool.connect();
    const insertResult = await connection.query(
      `INSERT INTO kotak_access_codes (access_code) VALUES ($1) RETURNING id, access_code, created_at`,
      [totpCode]
    );

    res.json({
      success: true,
      message: 'TOTP code stored and Kotak login attempted',
      auth: authResult,
      totpCode: insertResult.rows[0],
    });
  } catch (error) {
    console.error('✗ Kotak login error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) connection?.release();
  }
});

/**
 * GET /api/kotak/access-code
 * Return the most recently stored access code.
 */
router.get('/access-code', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, access_code, created_at FROM kotak_access_codes ORDER BY created_at DESC LIMIT 1`
    );

    res.json({
      success: true,
      data: result.rows[0] || null,
    });
  } catch (error) {
    console.error('✗ Kotak access-code fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
