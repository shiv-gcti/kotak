const crypto = require('crypto');

/**
 * Generate hash for signal to detect duplicates
 */
function generateSignalHash(symbol, signalType, quantity, entryPrice) {
  const data = `${symbol}-${signalType}-${quantity}-${entryPrice}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Validate TradingView webhook signature
 */
function validateWebhookSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return hash === signature;
}

/**
 * Parse TradingView alert message
 */
function normalizeSignalData(signalData) {
  const normalized = {
    symbol: signalData.symbol || signalData.Symbol || signalData.symbol?.toString(),
    signalType: (signalData.signalType || signalData.signaltype || signalData.side || '').toUpperCase(),
    quantity: parseInt(signalData.quantity || signalData.Quantity || signalData.qty || 0, 10),
    entryPrice: parseFloat(signalData.entryPrice || signalData.entryprice || signalData.entry || 0),
    targetPrice: parseFloat(signalData.targetPrice || signalData.targetprice || signalData.target || 0),
    stopLoss: parseFloat(signalData.stopLoss || signalData.stoploss || signalData.stop || 0),
  };

  return {
    ...normalized,
    Symbol: normalized.symbol,
    signaltype: normalized.signalType,
    side: normalized.signalType,
    Quantity: normalized.quantity,
    qty: normalized.quantity,
    entryprice: normalized.entryPrice,
    targetprice: normalized.targetPrice,
    stopprice: normalized.stopLoss,
    stoploss: normalized.stopLoss,
  };
}

function parseTradingViewAlert(messageText) {
  if (typeof messageText === 'object' && messageText !== null) {
    return normalizeSignalData(messageText);
  }

  try {
    const parsed = JSON.parse(messageText);
    return normalizeSignalData(parsed);
  } catch (error) {
    // If not JSON, try parsing key=value format
    const result = {};
    const lines = messageText.split('\n');
    lines.forEach((line) => {
      const [key, value] = line.split('=').map((s) => s.trim());
      if (key && value) {
        result[key.toLowerCase()] = value;
      }
    });
    return normalizeSignalData(result);
  }
}

/**
 * Calculate risk-reward ratio
 */
function calculateRiskReward(entryPrice, targetPrice, stopLoss) {
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(targetPrice - entryPrice);
  return (reward / risk).toFixed(2);
}

/**
 * Format currency
 */
function formatCurrency(amount, decimals = 2) {
  return parseFloat(amount).toFixed(decimals);
}

/**
 * Format percentage
 */
function formatPercentage(value, decimals = 2) {
  return `${parseFloat(value).toFixed(decimals)}%`;
}

/**
 * Convert timestamp to readable format
 */
function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validate trade data
 */
function validateTradeData(data) {
  const required = ['symbol', 'signalType', 'quantity', 'entryPrice', 'targetPrice', 'stopLoss'];
  const missing = required.filter((field) => !data[field]);

  if (missing.length > 0) {
    return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
  }

  if (data.quantity <= 0) {
    return { valid: false, error: 'Quantity must be greater than 0' };
  }

  if (data.entryPrice <= 0 || data.targetPrice <= 0 || data.stopLoss <= 0) {
    return { valid: false, error: 'Prices must be greater than 0' };
  }

  // Validate target and stop loss are on opposite sides
  const isBuy = data.signalType.toUpperCase() === 'BUY';
  if (isBuy && data.stopLoss >= data.entryPrice) {
    return { valid: false, error: 'For BUY, stop loss must be below entry price' };
  }
  if (!isBuy && data.stopLoss <= data.entryPrice) {
    return { valid: false, error: 'For SELL, stop loss must be above entry price' };
  }

  return { valid: true };
}

module.exports = {
  generateSignalHash,
  validateWebhookSignature,
  parseTradingViewAlert,
  calculateRiskReward,
  formatCurrency,
  formatPercentage,
  formatTimestamp,
  sleep,
  validateTradeData,
};
