const pool = require('../config/database');
const kotakNeoAPI = require('./kotakNeoAPI');
const orderService = require('./orderService');
require('dotenv').config();

class SquareoffService {
  constructor() {
    this.activeMonitoring = new Map();
  }

  /**
   * Start monitoring a trade for target/stoploss
   */
  async startMonitoring(tradeId) {
    try {
      if (this.activeMonitoring.has(tradeId)) {
        console.log(`ℹ️  Already monitoring trade ${tradeId}`);
        return;
      }

      const trade = await orderService.getTradeById(tradeId);
      if (!trade) {
        console.error(`✗ Trade ${tradeId} not found`);
        return;
      }

      console.log(`📊 Starting squareoff monitoring for trade ${tradeId} (${trade.symbol})`);

      const monitoringInterval = setInterval(async () => {
        await this.checkTargetAndStoploss(tradeId);
      }, parseInt(process.env.SQUAREOFF_CHECK_INTERVAL || 10000));

      this.activeMonitoring.set(tradeId, monitoringInterval);
    } catch (error) {
      console.error('✗ Error starting monitoring:', error.message);
    }
  }

  /**
   * Stop monitoring a trade
   */
  stopMonitoring(tradeId) {
    if (this.activeMonitoring.has(tradeId)) {
      clearInterval(this.activeMonitoring.get(tradeId));
      this.activeMonitoring.delete(tradeId);
      console.log(`⏹️  Stopped monitoring trade ${tradeId}`);
    }
  }

  /**
   * Check if target or stoploss hit
   */
  async checkTargetAndStoploss(tradeId) {
    try {
      const trade = await orderService.getTradeById(tradeId);
      if (!trade || trade.squareoff_status !== 'PENDING') {
        this.stopMonitoring(tradeId);
        return;
      }

      // Get current LTP
      const currentLTP = await kotakNeoAPI.getLTP(trade.symbol);
      if (!currentLTP) return;

      // Update LTP and P&L
      await orderService.updateLTPAndPnL(tradeId, currentLTP);

      const isTargetHit = this.checkTarget(trade, currentLTP);
      const isStoplossHit = this.checkStoploss(trade, currentLTP);

      if (isTargetHit) {
        console.log(`🎯 Target hit for trade ${tradeId}: ${trade.symbol} at ${currentLTP}`);
        await this.executeSquareoff(tradeId, currentLTP, 'TARGET_HIT');
      } else if (isStoplossHit) {
        console.log(`⛔ Stop loss hit for trade ${tradeId}: ${trade.symbol} at ${currentLTP}`);
        await this.executeSquareoff(tradeId, currentLTP, 'STOPLOSS_HIT');
      }
    } catch (error) {
      console.error(`✗ Error checking target/stoploss for trade ${tradeId}:`, error.message);
    }
  }

  /**
   * Check if target is hit
   */
  checkTarget(trade, currentLTP) {
    if (trade.signal_type === 'BUY') {
      return currentLTP >= trade.target_price;
    } else {
      return currentLTP <= trade.target_price;
    }
  }

  /**
   * Check if stoploss is hit
   */
  checkStoploss(trade, currentLTP) {
    if (trade.signal_type === 'BUY') {
      return currentLTP <= trade.stop_loss;
    } else {
      return currentLTP >= trade.stop_loss;
    }
  }

  /**
   * Execute squareoff order
   */
  async executeSquareoff(tradeId, squareoffPrice, reason) {
    try {
      const trade = await orderService.getTradeById(tradeId);
      if (!trade) return;

      // Determine opposite side
      const oppositeSide = trade.signal_type === 'BUY' ? 'SELL' : 'BUY';

      // Place squareoff order
      const squareoffResult = await kotakNeoAPI.placeOrder({
        symbol: trade.symbol,
        quantity: trade.quantity,
        side: oppositeSide,
        price: squareoffPrice,
        orderType: 'MARKET',
        remarks: `Squareoff-${tradeId}-${reason}`,
      });

      // Update trade
      const multiplier = trade.signal_type === 'BUY' ? 1 : -1;
      const finalPnL = (squareoffPrice - trade.entry_price) * trade.quantity * multiplier;
      const finalPnLPercentage = ((finalPnL / (trade.entry_price * trade.quantity)) * 100).toFixed(2);

      const connection = await pool.getConnection();

      await connection.query(
        `UPDATE trades SET 
          squareoff_status = 'EXECUTED', 
          squareoff_price = ?, 
          exit_time = ?,
          pnl = ?,
          pnl_percentage = ?
         WHERE id = ?`,
        [squareoffPrice, new Date(), finalPnL.toFixed(2), finalPnLPercentage, tradeId]
      );

      // Log squareoff
      await connection.query(
        `INSERT INTO squareoff_logs (trade_id, symbol, squareoff_price, final_pnl, final_pnl_percentage, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tradeId, trade.symbol, squareoffPrice, finalPnL.toFixed(2), finalPnLPercentage, reason]
      );

      connection.release();

      // Stop monitoring
      this.stopMonitoring(tradeId);

      // Emit real-time update
      if (global.io) {
        global.io.emit('trade_closed', {
          tradeId,
          symbol: trade.symbol,
          entryPrice: trade.entry_price,
          exitPrice: squareoffPrice,
          finalPnL: finalPnL.toFixed(2),
          finalPnLPercentage,
          reason,
        });
      }

      console.log(`✓ Squareoff executed for trade ${tradeId}: P&L = ${finalPnL.toFixed(2)}`);
    } catch (error) {
      console.error(`✗ Error executing squareoff for trade ${tradeId}:`, error.message);
    }
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus() {
    return {
      activeCount: this.activeMonitoring.size,
      trades: Array.from(this.activeMonitoring.keys()),
    };
  }
}

module.exports = new SquareoffService();
