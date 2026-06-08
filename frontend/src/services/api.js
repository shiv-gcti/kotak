import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const tradesService = {
  // Get all trades with pagination
  getAllTrades: (page = 1, limit = 20) =>
    api.get('/trades', { params: { page, limit } }),

  // Get single trade with price history
  getTradeById: (id) => api.get(`/trades/${id}`),

  // Get active trades
  getActiveTrades: () => api.get('/trades/active/list'),

  // Get trading statistics
  getStats: () => api.get('/trades/stats/summary'),
};

export const ordersService = {
  // Place manual order
  placeOrder: (orderData) => api.post('/orders/manual', orderData),

  // Get all orders
  getOrders: () => api.get('/orders'),

  // Get order status
  getOrderStatus: (orderId) => api.get(`/orders/${orderId}`),

  // Cancel order
  cancelOrder: (orderId) => api.delete(`/orders/${orderId}`),

  // Get monitoring status
  getMonitoringStatus: () => api.get('/orders/monitoring/status'),
};

export const webhookService = {
  // Send test signal (for testing)
  sendTestSignal: (signalData) => api.post('/webhook', signalData),

  // Get webhook status
  getWebhookStatus: () => api.get('/webhook/status'),
};

export default api;
