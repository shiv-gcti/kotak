const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');
const squareoffService = require('../services/squareoffService');
const { validateTradeData, parseTradingViewAlert } = require('../utils/helpers');
const pool = require('../config/database');

/**
 * POST /api/webhook
 * Receive signal from TradingView
 */
router.post('/', async (req, res) => {
  try {
    const webhookData = req.body;

    // Log webhook
    const connection = await pool.getConnection();
    await connection.query(
      `INSERT INTO webhook_logs (webhook_data, processed) VALUES (?, ?)`,
      [JSON.stringify(webhookData), false]
    );
    connection.release();

    // Parse signal
    const signalData = parseTradingViewAlert(webhookData.message || JSON.stringify(webhookData));

    // Validate signal data
    const validation = validateTradeData(signalData);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    // Process signal
    const result = await orderService.processSignal({
      symbol: signalData.symbol,
      signalType: signalData.signaltype || signalData.side,
      quantity: parseInt(signalData.quantity),
      entryPrice: parseFloat(signalData.entryprice),
      targetPrice: parseFloat(signalData.targetprice),
      stopLoss: parseFloat(signalData.stoploss),
      signalId: `${Date.now()}-${signalData.symbol}`,
    });

    if (result.success) {
      // Start monitoring squareoff
      if (result.tradeId) {
        squareoffService.startMonitoring(result.tradeId);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('✗ Webhook error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/webhook/status
 * Check webhook processing status
 */
router.get('/status', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [logs] = await connection.query(
      `SELECT COUNT(*) as total, SUM(IF(processed=1, 1, 0)) as processed 
       FROM webhook_logs WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)`
    );
    connection.release();

    const monitoringStatus = squareoffService.getMonitoringStatus();

    res.json({
      webhookStats: logs[0],
      monitoring: monitoringStatus,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
