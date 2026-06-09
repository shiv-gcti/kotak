const axios = require('axios');
require('dotenv').config();

class KotakNeoAPI {
  constructor() {
    this.baseURL = process.env.KOTAK_BASE_URL || null;
    this.accessToken = process.env.KOTAK_ACCESS_TOKEN || process.env.KOTAK_NEO_ACCESS_TOKEN || null;
    this.sid = process.env.KOTAK_SESSION_ID || null;
    this.mobile = process.env.KOTAK_MOBILE || null;
    this.ucc = process.env.KOTAK_UCC || null;
    this.mpin = process.env.KOTAK_MPIN || null;
    this.totpSecret = process.env.KOTAK_TOTP_SECRET || null;
    this.sessionToken = this.accessToken;
    this.apiBaseUrl = process.env.KOTAK_API_BASE_URL || this.baseURL;

    if (!this.baseURL) {
      console.error('✗ Kotak Neo base URL is not configured. Set KOTAK_BASE_URL in backend/.env to your broker API endpoint.');
    }
  }

  /**
   * Authenticate with Kotak Neo API
   */
  async authenticate(totpCode = null) {
    try {
      if (!this.baseURL) {
        throw new Error('Kotak Neo base URL is missing. Set KOTAK_BASE_URL in backend/.env.');
      }

      if (this.sessionToken) {
        console.log('✓ Using existing Kotak access token from environment');
        return {
          sessionToken: this.sessionToken,
          sid: this.sid,
          apiBaseUrl: this.apiBaseUrl,
        };
      }

      if (!this.mobile || !this.ucc || !this.mpin) {
        throw new Error('Missing Kotak login configuration: set KOTAK_MOBILE, KOTAK_UCC, and KOTAK_MPIN in backend/.env');
      }

      if (!totpCode && !this.totpSecret) {
        throw new Error('Missing TOTP code. Provide totpCode to /api/kotak/login or set KOTAK_TOTP_SECRET in backend/.env');
      }

      const authPayload = {
        userId: this.mobile,
        password: this.mpin,
        oneTimePassword: totpCode || undefined,
        authType: 'TOTP',
        clientName: process.env.CLIENT_NAME || 'Kotak Neo Client',
      };

      const headers = {
        Accept: 'application/json',
        NeoFinKey: 'neotradeapi',
      };
      if (this.accessToken) {
        headers.Authorization = this.accessToken;
      }

      const response = await axios.post(
        `${this.baseURL}/login/1.0/tradeApiLogin`,
        authPayload,
        {
          headers,
        }
      );

      const loginResult = response.data?.result || response.data;
      this.sessionToken = loginResult?.token || loginResult?.sessionToken || null;
      this.sid = loginResult?.sid || this.sid;
      this.apiBaseUrl = loginResult?.baseUrl || this.apiBaseUrl;

      if (!this.sessionToken) {
        throw new Error('Kotak login did not return a session token');
      }

      console.log('✓ Kotak Neo authentication successful');
      return {
        sessionToken: this.sessionToken,
        sid: this.sid,
        apiBaseUrl: this.apiBaseUrl,
      };
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

      if (!this.baseURL) {
        throw new Error('Kotak Neo base URL is missing. Set KOTAK_BASE_URL in backend/.env.');
      }

      if (!this.sessionToken) {
        await this.authenticate();
      }

      const agoraBaseUrl = this.apiBaseUrl || this.baseURL;
      const jData = {
        symbol: orderData.symbol,
        quantity: orderData.quantity,
        ordertype: (orderData.orderType || 'MARKET').toUpperCase(),
        price: orderData.price || 0,
        triggerprice: orderData.triggerPrice || 0,
        producttype: orderData.productType || 'MIS',
        exchange: orderData.exchange || 'NSE',
        profileid: `${this.ucc || ''}_${this.mobile || ''}`,
        transactiontype: orderData.side.toUpperCase(),
        orderaction: orderData.side.toUpperCase(),
        token: this.sessionToken,
        symboltoken: orderData.symbolToken || '',
        remarks: orderData.remarks || `Auto Order - ${Date.now()}`,
      };

      const body = new URLSearchParams({
        jData: JSON.stringify(jData),
        jKey: this.sessionToken,
      });

      const response = await axios.post(
        `${agoraBaseUrl}/quick/order/rule/ms/place`,
        body.toString(),
        {
          headers: {
            Accept: 'application/json',
            Authorization: this.sessionToken,
            Sid: this.sid || '',
            NeoFinKey: 'neotradeapi',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      console.log(`✓ Kotak order request successful for ${orderData.symbol}`);
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
      if (!this.sessionToken) {
        await this.authenticate();
      }

      const statusBaseUrl = this.apiBaseUrl || this.baseURL;
      const response = await axios.get(
        `${statusBaseUrl}/order/${orderId}`,
        {
          headers: {
            Authorization: this.sessionToken,
            Sid: this.sid || '',
            NeoFinKey: 'neotradeapi',
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
      if (!this.sessionToken) {
        await this.authenticate();
      }

      const ordersBaseUrl = this.apiBaseUrl || this.baseURL;
      const response = await axios.get(
        `${ordersBaseUrl}/orders`,
        {
          headers: {
            Authorization: this.sessionToken,
            Sid: this.sid || '',
            NeoFinKey: 'neotradeapi',
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
      if (!this.sessionToken) {
        await this.authenticate();
      }

      const cancelBaseUrl = this.apiBaseUrl || this.baseURL;
      const response = await axios.post(
        `${cancelBaseUrl}/order/${orderId}/cancel`,
        {},
        {
          headers: {
            Authorization: this.sessionToken,
            Sid: this.sid || '',
            NeoFinKey: 'neotradeapi',
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
      if (!this.sessionToken) {
        await this.authenticate();
      }

      const ltpBaseUrl = this.apiBaseUrl || this.baseURL;
      if (!ltpBaseUrl) {
        throw new Error('Kotak Neo API base URL is not configured for LTP lookup.');
      }

      const response = await axios.get(
        `${ltpBaseUrl}/marketwatch/getLTP`,
        {
          params: { symbol },
          headers: {
            Accept: 'application/json',
            Authorization: this.sessionToken,
            Sid: this.sid || '',
            NeoFinKey: 'neotradeapi',
          },
        }
      );

      return response.data?.ltp || null;
    } catch (error) {
      console.error(`✗ Failed to get LTP for ${symbol}:`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Get holdings
   */
  async getHoldings() {
    try {
      if (!this.sessionToken) {
        await this.authenticate();
      }

      const holdingsBaseUrl = this.apiBaseUrl || this.baseURL;
      const response = await axios.get(
        `${holdingsBaseUrl}/holdings`,
        {
          headers: {
            Authorization: this.sessionToken,
            Sid: this.sid || '',
            NeoFinKey: 'neotradeapi',
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
