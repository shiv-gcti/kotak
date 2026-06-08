const axios = require('axios');
require('dotenv').config();

class KotakNeoAPI {
  constructor() {
    this.baseURL = process.env.KOTAK_BASE_URL;
    this.apiKey = process.env.KOTAK_API_KEY;
    this.apiSecret = process.env.KOTAK_API_SECRET;
    this.accessToken = null;
    this.sessionId = null;
  }

  /**
   * Authenticate with Kotak Neo API
   */
  async authenticate() {
    try {
      const payload = {
        userId: process.env.KOTAK_USERNAME,
        password: process.env.KOTAK_PASSWORD,
        twoFactorCode: process.env.KOTAK_TWO_FA,
      };

      const response = await axios.post(
        `${this.baseURL}/auth/login`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.accessToken = response.data.accessToken;
      this.sessionId = response.data.sessionId;
      console.log('✓ Kotak Neo authentication successful');
      return { accessToken: this.accessToken, sessionId: this.sessionId };
    } catch (error) {
      console.error('✗ Kotak Neo authentication failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Place an order on Kotak Neo
   */
  async placeOrder(orderData) {
    try {
      // Test mode: skip external Kotak API calls when SKIP_KOTAK_API is set
      if (process.env.SKIP_KOTAK_API === 'true') {
        const fake = { orderId: `TEST-${Date.now()}`, status: 'PLACED' };
        console.log(`✓ (Test) Order simulated: ${fake.orderId}`);
        return fake;
      }
      if (!this.accessToken) {
        await this.authenticate();
      }

      const payload = {
        symbol: orderData.symbol,
        quantity: orderData.quantity,
        orderType: orderData.orderType || 'MARKET',
        price: orderData.price || 0,
        pricetype: orderData.priceType || 'MKT',
        productType: orderData.productType || 'MIS',
        side: orderData.side.toUpperCase(), // BUY or SELL
        triggerPrice: orderData.triggerPrice || 0,
        exchange: 'NSE',
        remarks: orderData.remarks || `Auto Order - ${Date.now()}`,
      };

      const response = await axios.post(
        `${this.baseURL}/order/place`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✓ Order placed on Kotak Neo: ${response.data.orderId}`);
      return response.data;
    } catch (error) {
      console.error('✗ Failed to place order:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await axios.get(
        `${this.baseURL}/order/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('✗ Failed to get order status:', error.message);
      throw error;
    }
  }

  /**
   * Get all orders for today
   */
  async getOrders() {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await axios.get(
        `${this.baseURL}/orders`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data || [];
    } catch (error) {
      console.error('✗ Failed to get orders:', error.message);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await axios.post(
        `${this.baseURL}/order/${orderId}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✓ Order cancelled: ${orderId}`);
      return response.data;
    } catch (error) {
      console.error('✗ Failed to cancel order:', error.message);
      throw error;
    }
  }

  /**
   * Get LTP for a symbol
   */
  async getLTP(symbol) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await axios.get(
        `${this.baseURL}/quote/${symbol}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data.ltp || 0;
    } catch (error) {
      console.error(`✗ Failed to get LTP for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Get holdings
   */
  async getHoldings() {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await axios.get(
        `${this.baseURL}/holdings`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data || [];
    } catch (error) {
      console.error('✗ Failed to get holdings:', error.message);
      return [];
    }
  }
}

module.exports = new KotakNeoAPI();
