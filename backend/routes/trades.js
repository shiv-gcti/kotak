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
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    const [trades] = await connection.query(
      `SELECT * FROM trades ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await connection.query(
      `SELECT COUNT(*) as total FROM trades`
    );

    connection.release();

    // Format response
    const formattedTrades = trades.map((trade) => ({
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
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trades/:id
 * Get single trade details
 */
router.get('/:id', async (req, res) => {
  try {
    const tradeId = req.params.id;
    const connection = await pool.getConnection();

    const [trades] = await connection.query(
      `SELECT * FROM trades WHERE id = ?`,
      [tradeId]
    );

    if (trades.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, error: 'Trade not found' });
    }

    const [priceHistory] = await connection.query(
      `SELECT * FROM price_tracking WHERE trade_id = ? ORDER BY timestamp ASC`,
      [tradeId]
    );

    connection.release();

    const trade = trades[0];
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
        priceHistory: priceHistory.map((p) => ({
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
 * GET /api/trades/stats
 * Get trading statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [stats] = await connection.query(`
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

    connection.release();

    const totalTrades = stats[0].totalTrades || 0;
    const winRate = totalTrades > 0 ? ((stats[0].winningTrades / totalTrades) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        totalTrades: stats[0].totalTrades,
        closedTrades: stats[0].closedTrades,
        openTrades: stats[0].openTrades,
        winningTrades: stats[0].winningTrades,
        losingTrades: stats[0].losingTrades,
        winRate: `${winRate}%`,
        totalPnL: formatCurrency(stats[0].totalPnL),
        avgPnLPercentage: formatPercentage(stats[0].avgPnLPercentage),
        maxPnL: formatCurrency(stats[0].maxPnL),
        minPnL: formatCurrency(stats[0].minPnL),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
