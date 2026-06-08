const express = require('express');
const router = express.Router();
const kotakNeoAPI = require('../services/kotakNeoAPI');
const squareoffService = require('../services/squareoffService');

/**
 * POST /api/orders/manual
 * Place manual order
 */
router.post('/manual', async (req, res) => {
  try {
    const { symbol, quantity, side, price } = req.body;

    if (!symbol || !quantity || !side) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: symbol, quantity, side' 
      });
    }

    const orderResult = await kotakNeoAPI.placeOrder({
      symbol,
      quantity: parseInt(quantity),
      side,
      price: parseFloat(price) || 0,
      orderType: price ? 'LIMIT' : 'MARKET',
    });

    res.json({ success: true, data: orderResult });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/orders
 * Get all orders from Kotak Neo
 */
router.get('/', async (req, res) => {
  try {
    const orders = await kotakNeoAPI.getOrders();
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/orders/:orderId
 * Get order status
 */
router.get('/:orderId', async (req, res) => {
  try {
    const orderStatus = await kotakNeoAPI.getOrderStatus(req.params.orderId);
    res.json({ success: true, data: orderStatus });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/orders/:orderId
 * Cancel order
 */
router.delete('/:orderId', async (req, res) => {
  try {
    const result = await kotakNeoAPI.cancelOrder(req.params.orderId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/orders/monitoring/status
 * Get squareoff monitoring status
 */
router.get('/monitoring/status', (req, res) => {
  const status = squareoffService.getMonitoringStatus();
  res.json({ success: true, data: status });
});

module.exports = router;
