const pool = require('../config/database');
const kotakNeoAPI = require('./kotakNeoAPI');
const { generateSignalHash } = require('../utils/helpers');
require('dotenv').config();

class OrderService {
  /**
   * Process incoming signal from TradingView
   */
  async processSignal(signalData) {
    try {
      const {
        symbol,
        signalType, // BUY or SELL
        quantity,
        entryPrice,
        targetPrice,
        stopLoss,
        signalId,
      } = signalData;

      // Check for duplicate orders
      const isDuplicate = await this.checkDuplicateOrder(
        symbol,
        signalType,
        quantity,
        entryPrice
      );

      if (isDuplicate) {
        console.log(`⚠️  Duplicate order prevented for ${symbol} ${signalType}`);
        return { success: false, message: 'Duplicate order detected' };
      }

      // Place order on Kotak Neo
      const orderResult = await kotakNeoAPI.placeOrder({
        symbol,
        quantity,
        side: signalType,
        price: entryPrice,
        orderType: 'MARKET',
        remarks: `Signal-${signalId}`,
      });

      // Save trade to database
      const tradeId = await this.saveTrade({
        orderId: orderResult.orderId,
        symbol,
        signalType,
        quantity,
        entryPrice,
        targetPrice,
        stopLoss,
        signalId,
        webhookData: signalData,
        orderStatus: 'PLACED',
      });

      // Cache signal to prevent duplicates
      await this.cacheSignal(symbol, signalType, quantity, entryPrice);

      console.log(`✓ Trade saved with ID: ${tradeId}`);

      return {
        success: true,
        message: 'Order placed successfully',
        tradeId,
        orderId: orderResult.orderId,
      };
    } catch (error) {
      console.error('✗ Error processing signal:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Check if order is duplicate within 45 seconds
   */
  async checkDuplicateOrder(symbol, signalType, quantity, entryPrice) {
    try {
      const connection = await pool.getConnection();

      const signalHash = generateSignalHash(symbol, signalType, quantity, entryPrice);
      const cutoffTime = new Date(Date.now() - parseInt(process.env.DUPLICATE_ORDER_INTERVAL || 45000));

      const [rows] = await connection.query(
        `SELECT id FROM order_cache 
         WHERE signal_hash = ? AND timestamp > ?`,
        [signalHash, cutoffTime]
      );

      connection.release();
      return rows.length > 0;
    } catch (error) {
      console.error('✗ Error checking duplicate order:', error.message);
      return false;
    }
  }

  /**
   * Cache signal to prevent duplicates
   */
  async cacheSignal(symbol, signalType, quantity, entryPrice) {
    try {
      const connection = await pool.getConnection();
      const signalHash = generateSignalHash(symbol, signalType, quantity, entryPrice);

      await connection.query(
        `INSERT INTO order_cache (signal_hash, symbol, signal_type, quantity, entry_price)
         VALUES (?, ?, ?, ?, ?)`,
        [signalHash, symbol, signalType, quantity, entryPrice]
      );

      connection.release();
    } catch (error) {
      console.error('✗ Error caching signal:', error.message);
    }
  }

  /**
   * Save trade to database
   */
  async saveTrade(tradeData) {
    try {
      const connection = await pool.getConnection();

      const [result] = await connection.query(
        `INSERT INTO trades (
          order_id, symbol, signal_type, quantity, entry_price, 
          target_price, stop_loss, order_status, signal_id, webhook_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tradeData.orderId,
          tradeData.symbol,
          tradeData.signalType,
          tradeData.quantity,
          tradeData.entryPrice,
          tradeData.targetPrice,
          tradeData.stopLoss,
          tradeData.orderStatus,
          tradeData.signalId,
          JSON.stringify(tradeData.webhookData),
        ]
      );

      connection.release();
      return result.insertId;
    } catch (error) {
      console.error('✗ Error saving trade:', error.message);
      throw error;
    }
  }

  /**
   * Update trade with execution details
   */
  async updateTradeExecution(tradeId, executionData) {
    try {
      const connection = await pool.getConnection();

      await connection.query(
        `UPDATE trades SET 
          order_status = ?, entry_price = ?, entry_time = ?
         WHERE id = ?`,
        [executionData.status, executionData.executionPrice, new Date(), tradeId]
      );

      connection.release();
      console.log(`✓ Trade ${tradeId} execution updated`);
    } catch (error) {
      console.error('✗ Error updating trade execution:', error.message);
    }
  }

  /**
   * Update LTP and calculate P&L
   */
  async updateLTPAndPnL(tradeId, currentPrice) {
    try {
      const connection = await pool.getConnection();

      // Get trade details
      const [trades] = await connection.query(
        `SELECT * FROM trades WHERE id = ?`,
        [tradeId]
      );

      if (trades.length === 0) {
        connection.release();
        return;
      }

      const trade = trades[0];
      const multiplier = trade.signal_type === 'BUY' ? 1 : -1;
      const pnl = (currentPrice - trade.entry_price) * trade.quantity * multiplier;
      const pnlPercentage = ((pnl / (trade.entry_price * trade.quantity)) * 100).toFixed(2);

      // Update trade LTP and P&L
      await connection.query(
        `UPDATE trades SET ltp = ?, pnl = ?, pnl_percentage = ?
         WHERE id = ?`,
        [currentPrice, pnl.toFixed(2), pnlPercentage, tradeId]
      );

      // Save price tracking
      await connection.query(
        `INSERT INTO price_tracking (trade_id, symbol, ltp, pnl, pnl_percentage)
         VALUES (?, ?, ?, ?, ?)`,
        [tradeId, trade.symbol, currentPrice, pnl.toFixed(2), pnlPercentage]
      );

      connection.release();

      // Emit real-time update
      if (global.io) {
        global.io.emit('price_update', {
          tradeId,
          symbol: trade.symbol,
          ltp: currentPrice,
          pnl: pnl.toFixed(2),
          pnlPercentage,
        });
      }

      return { pnl: pnl.toFixed(2), pnlPercentage };
    } catch (error) {
      console.error('✗ Error updating LTP and P&L:', error.message);
    }
  }

  /**
   * Get all active trades
   */
  async getActiveTrades() {
    try {
      const connection = await pool.getConnection();

      const [trades] = await connection.query(
        `SELECT * FROM trades 
         WHERE order_status = 'EXECUTED' AND squareoff_status = 'PENDING'
         ORDER BY entry_time DESC`
      );

      connection.release();
      return trades;
    } catch (error) {
      console.error('✗ Error fetching active trades:', error.message);
      return [];
    }
  }

  /**
   * Get trade by ID
   */
  async getTradeById(tradeId) {
    try {
      const connection = await pool.getConnection();

      const [trades] = await connection.query(
        `SELECT * FROM trades WHERE id = ?`,
        [tradeId]
      );

      connection.release();
      return trades[0] || null;
    } catch (error) {
      console.error('✗ Error fetching trade:', error.message);
      return null;
    }
  }
}

module.exports = new OrderService();
