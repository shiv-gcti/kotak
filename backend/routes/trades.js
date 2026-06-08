const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const orderService = require('../services/orderService');
const { formatCurrency, formatPercentage, formatTimestamp } = require('../utils/helpers');

/**
 * GET /api/trades
 * Get all trades with pagination
 */
router.get('/', async (req, res) => {
  let connection;
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    connection = await pool.connect();

    const tradesResult = await connection.query(
      `SELECT * FROM trades ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await connection.query(`SELECT COUNT(*) as total FROM trades`);

    const formattedTrades = tradesResult.rows.map((trade) => ({
      ...trade,
      entryPrice: formatCurrency(trade.entry_price),
      targetPrice: formatCurrency(trade.target_price),
      stopLoss: formatCurrency(trade.stop_loss),
      ltp: formatCurrency(trade.ltp),
      pnl: formatCurrency(trade.pnl),
      pnlPercentage: formatPercentage(trade.pnl_percentage),
      createdAt: formatTimestamp(trade.created_at),
      updatedAt: formatTimestamp(trade.updated_at),
    }));

    res.json({
      success: true,
      data: formattedTrades,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total, 10),
        pages: Math.ceil(parseInt(countResult.rows[0].total, 10) / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

/**
 * GET /api/trades/active/list
 * Get active trades
 */
router.get('/active/list', async (req, res) => {
  try {
    const trades = await orderService.getActiveTrades();

    const formattedTrades = trades.map((trade) => ({
      ...trade,
      entryPrice: formatCurrency(trade.entry_price),
      targetPrice: formatCurrency(trade.target_price),
      stopLoss: formatCurrency(trade.stop_loss),
      ltp: formatCurrency(trade.ltp),
      pnl: formatCurrency(trade.pnl),
      pnlPercentage: formatPercentage(trade.pnl_percentage),
    }));

    res.json({ success: true, data: formattedTrades });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trades/stats/summary
 * Get trading statistics
 */
router.get('/stats/summary', async (req, res) => {
  let connection;
  try {
    connection = await pool.connect();

    const statsResult = await connection.query(`
      SELECT
        COUNT(*) as totalTrades,
        SUM(CASE WHEN squareoff_status = 'EXECUTED' THEN 1 ELSE 0 END) as closedTrades,
        SUM(CASE WHEN squareoff_status = 'PENDING' THEN 1 ELSE 0 END) as openTrades,
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winningTrades,
        SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losingTrades,
        COALESCE(SUM(pnl), 0) as totalPnL,
        COALESCE(AVG(pnl_percentage), 0) as avgPnLPercentage,
        COALESCE(MAX(pnl), 0) as maxPnL,
        COALESCE(MIN(pnl), 0) as minPnL
      FROM trades
    `);

    const stats = statsResult.rows[0];
    const totalTrades = parseInt(stats.totaltrades, 10) || 0;
    const winRate = totalTrades > 0 ? ((parseInt(stats.winningtrades, 10) / totalTrades) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        totalTrades,
        closedTrades: parseInt(stats.closedtrades, 10) || 0,
        openTrades: parseInt(stats.opentrades, 10) || 0,
        winningTrades: parseInt(stats.winningtrades, 10) || 0,
        losingTrades: parseInt(stats.losingtrades, 10) || 0,
        winRate: `${winRate}%`,
        totalPnL: formatCurrency(stats.totalpnl),
        avgPnLPercentage: formatPercentage(stats.avgpnlpercentage),
        maxPnL: formatCurrency(stats.maxpnl),
        minPnL: formatCurrency(stats.minpnl),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

/**
 * GET /api/trades/:id
 * Get single trade details
 */
router.get('/:id', async (req, res) => {
  let connection;
  try {
    const tradeId = req.params.id;
    connection = await pool.connect();

    const tradesResult = await connection.query(`SELECT * FROM trades WHERE id = $1`, [tradeId]);
    if (tradesResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Trade not found' });
    }

    const priceHistoryResult = await connection.query(
      `SELECT * FROM price_tracking WHERE trade_id = $1 ORDER BY timestamp ASC`,
      [tradeId]
    );

    const trade = tradesResult.rows[0];
    res.json({
      success: true,
      data: {
        ...trade,
        entryPrice: formatCurrency(trade.entry_price),
        targetPrice: formatCurrency(trade.target_price),
        stopLoss: formatCurrency(trade.stop_loss),
        ltp: formatCurrency(trade.ltp),
        pnl: formatCurrency(trade.pnl),
        pnlPercentage: formatPercentage(trade.pnl_percentage),
        createdAt: formatTimestamp(trade.created_at),
        updatedAt: formatTimestamp(trade.updated_at),
        priceHistory: priceHistoryResult.rows.map((p) => ({
          ...p,
          ltp: formatCurrency(p.ltp),
          pnl: formatCurrency(p.pnl),
          pnlPercentage: formatPercentage(p.pnl_percentage),
          timestamp: formatTimestamp(p.timestamp),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
