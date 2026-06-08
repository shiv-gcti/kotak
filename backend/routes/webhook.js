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
  let connection;
  try {
    const webhookData = req.body;

    connection = await pool.connect();
    await connection.query(
      `INSERT INTO webhook_logs (webhook_data, processed) VALUES ($1, $2)`,
      [JSON.stringify(webhookData), false]
    );

    const signalData = parseTradingViewAlert(webhookData.message || JSON.stringify(webhookData));

    console.log('Incoming signalData:', signalData);

    const mappedSignal = {
      symbol: signalData.symbol || signalData.Symbol || (signalData.symbol && signalData.symbol.toString()),
      signalType: (signalData.signalType || signalData.signaltype || signalData.side || '').toString(),
      quantity: parseInt(signalData.quantity || signalData.Quantity || signalData.qty || 0, 10),
      entryPrice: parseFloat(signalData.entryPrice || signalData.entryprice || signalData.entry || 0),
      targetPrice: parseFloat(signalData.targetPrice || signalData.targetprice || signalData.target || 0),
      stopLoss: parseFloat(signalData.stopLoss || signalData.stoploss || signalData.stop || 0),
      signalId: `${Date.now()}-${signalData.symbol || signalData.Symbol || 'signal'}`,
    };

    // Normalize and ensure types
    if (mappedSignal.signalType) mappedSignal.signalType = mappedSignal.signalType.toUpperCase();

    console.error('Mapped signal before validation/processSignal:', mappedSignal);

    const validation = validateTradeData(mappedSignal);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const result = await orderService.processSignal(mappedSignal);

    if (result.success && result.tradeId) {
      squareoffService.startMonitoring(result.tradeId);
    }

    res.json(result);
  } catch (error) {
    console.error('✗ Webhook error:', error);
    res.status(500).json({ success: false, error: error.message || String(error) });
  } finally {
    if (connection) connection.release();
  }
});

/**
 * GET /api/webhook/status
 * Check webhook processing status
 */
router.get('/status', async (req, res) => {
  let connection;
  try {
    connection = await pool.connect();
    const logsResult = await connection.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN processed THEN 1 ELSE 0 END) as processed
       FROM webhook_logs WHERE created_at > NOW() - INTERVAL '1 day'`
    );

    const monitoringStatus = squareoffService.getMonitoringStatus();

    res.json({
      webhookStats: logsResult.rows[0],
      monitoring: monitoringStatus,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
