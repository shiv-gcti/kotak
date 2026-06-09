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
      console.error('orderService.processSignal received:', signalData);
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
      const orderPayload = {
        symbol,
        quantity,
        side: signalType,
        orderType: signalData.orderType || 'MARKET',
        productType: signalData.productType || 'MIS',
        exchange: signalData.exchange || 'NSE',
        remarks: `Signal-${signalId}`,
      };
      if (entryPrice && entryPrice > 0) {
        orderPayload.price = entryPrice;
      }

      const orderResult = await kotakNeoAPI.placeOrder(orderPayload);

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
    let connection;
    try {
      connection = await pool.connect();

      const signalHash = generateSignalHash(symbol, signalType, quantity, entryPrice);
      const cutoffTime = new Date(Date.now() - parseInt(process.env.DUPLICATE_ORDER_INTERVAL || 45000, 10));

      const result = await connection.query(
        `SELECT id FROM order_cache WHERE signal_hash = $1 AND timestamp > $2`,
        [signalHash, cutoffTime]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('✗ Error checking duplicate order:', error.message);
      return false;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Cache signal to prevent duplicates
   */
  async cacheSignal(symbol, signalType, quantity, entryPrice) {
    let connection;
    try {
      connection = await pool.connect();
      const signalHash = generateSignalHash(symbol, signalType, quantity, entryPrice);

      await connection.query(
        `INSERT INTO order_cache (signal_hash, symbol, signal_type, quantity, entry_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [signalHash, symbol, signalType, quantity, entryPrice]
      );
    } catch (error) {
      console.error('✗ Error caching signal:', error.message);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Save trade to database
   */
  async saveTrade(tradeData) {
    let connection;
    try {
      connection = await pool.connect();

      const result = await connection.query(
        `INSERT INTO trades (
          order_id, symbol, signal_type, quantity, entry_price,
          target_price, stop_loss, order_status, signal_id, webhook_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
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

      return result.rows[0]?.id;
    } catch (error) {
      console.error('✗ Error saving trade:', error.message);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Update trade with execution details
   */
  async updateTradeExecution(tradeId, executionData) {
    let connection;
    try {
      connection = await pool.connect();

      await connection.query(
        `UPDATE trades SET
          order_status = $1,
          entry_price = $2,
          entry_time = $3
         WHERE id = $4`,
        [executionData.status, executionData.executionPrice, new Date(), tradeId]
      );

      console.log(`✓ Trade ${tradeId} execution updated`);
    } catch (error) {
      console.error('✗ Error updating trade execution:', error.message);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Update LTP and calculate P&L
   */
  async updateLTPAndPnL(tradeId, currentPrice) {
    let connection;
    try {
      connection = await pool.connect();

      const tradesResult = await connection.query(
        `SELECT * FROM trades WHERE id = $1`,
        [tradeId]
      );

      if (tradesResult.rows.length === 0) {
        return;
      }

      const trade = tradesResult.rows[0];
      const multiplier = trade.signal_type === 'BUY' ? 1 : -1;
      const pnl = (currentPrice - parseFloat(trade.entry_price)) * trade.quantity * multiplier;
      const pnlPercentage = ((pnl / (parseFloat(trade.entry_price) * trade.quantity)) * 100).toFixed(2);

      await connection.query(
        `UPDATE trades SET ltp = $1, pnl = $2, pnl_percentage = $3
         WHERE id = $4`,
        [currentPrice, pnl.toFixed(2), pnlPercentage, tradeId]
      );

      await connection.query(
        `INSERT INTO price_tracking (trade_id, symbol, ltp, pnl, pnl_percentage)
         VALUES ($1, $2, $3, $4, $5)`,
        [tradeId, trade.symbol, currentPrice, pnl.toFixed(2), pnlPercentage]
      );

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
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get all active trades
   */
  async getActiveTrades() {
    let connection;
    try {
      connection = await pool.connect();

      const result = await connection.query(
        `SELECT * FROM trades
         WHERE order_status = 'EXECUTED' AND squareoff_status = 'PENDING'
         ORDER BY entry_time DESC`
      );

      return result.rows;
    } catch (error) {
      console.error('✗ Error fetching active trades:', error.message);
      return [];
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get trade by ID
   */
  async getTradeById(tradeId) {
    let connection;
    try {
      connection = await pool.connect();

      const result = await connection.query(
        `SELECT * FROM trades WHERE id = $1`,
        [tradeId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('✗ Error fetching trade:', error.message);
      return null;
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = new OrderService();
