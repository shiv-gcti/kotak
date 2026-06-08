# Kotak Neo Trading Algorithm

A comprehensive trading algorithm system for Kotak Neo broker with TradingView webhook integration, real-time P&L tracking, and automated square-off functionality.

## Features

- ✅ **TradingView Webhook Integration** - Receive signals from TradingView alerts
- ✅ **Automated Order Placement** - Place orders directly on Kotak Neo terminal
- ✅ **Duplicate Order Prevention** - Prevent same orders within 45 seconds
- ✅ **Real-time Price Tracking** - Monitor LTP and P&L live
- ✅ **Automatic Square-off** - Close trades at target or stop-loss
- ✅ **Database Persistence** - Store all trades in MySQL
- ✅ **React Dashboard** - Real-time monitoring dashboard
- ✅ **WebSocket Updates** - Live price and trade updates
- ✅ **Trade Analytics** - Win rate, P&L statistics, trade history

## Project Structure

```
kotakneo-trading-algo/
├── backend/              # Node.js/Express server
│   ├── config/          # Database configuration
│   ├── services/        # Business logic
│   ├── routes/          # API routes
│   ├── utils/           # Helper functions
│   ├── server.js        # Main server file
│   ├── package.json
│   └── .env.example
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API & Socket services
│   │   ├── App.jsx
│   │   └── index.js
│   ├── public/          # Static files
│   └── package.json
└── database/            # Database scripts
    └── migrate.js       # Database migration
```

## Prerequisites

- **Node.js** v14+ and npm
- **MySQL** 5.7+
- **TradingView Pro** (for webhooks)
- **Kotak Neo** account with API access

## Installation

### 1. Clone and Setup

```bash
cd kotakneo-trading-algo
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your credentials
# KOTAK_API_KEY, KOTAK_API_SECRET, DB credentials, etc.
```

### 3. Database Setup

```bash
# From backend directory
node ../database/migrate.js
```

This will:
- Create the `kotakneo_trading` database
- Create all required tables
- Setup proper indexes

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

## Configuration

### Backend (.env)

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=kotakneo_trading

# Server
SERVER_PORT=5000
NODE_ENV=development

# Kotak Neo API
KOTAK_API_KEY=your_api_key
KOTAK_API_SECRET=your_api_secret
KOTAK_USERNAME=your_username
KOTAK_PASSWORD=your_password
KOTAK_TWO_FA=your_2fa_pin
KOTAK_BASE_URL=https://api.kotakneosecurities.com

# TradingView
TRADINGVIEW_WEBHOOK_SECRET=your_secret

# Order Settings
DUPLICATE_ORDER_INTERVAL=45000      # 45 seconds
SQUAREOFF_CHECK_INTERVAL=10000      # 10 seconds
```

## Running the Application

### 1. Start Backend Server

```bash
cd backend
npm start
```

Server will start on `http://localhost:5000`

### 2. Start Frontend (in another terminal)

```bash
cd frontend
npm start
```

Frontend will open on `http://localhost:3000`

### 3. Check Health

```bash
curl http://localhost:5000/health
```

## TradingView Webhook Setup

### 1. Create Alert in TradingView

```
Condition: Your trading strategy
Notification: Webhook URL
```

### 2. Webhook URL

```
http://your-server:5000/api/webhook
```

### 3. Message Format

Use this format in TradingView alert:

```
symbol=RELIANCE
signalType=BUY
quantity=1
entryPrice=2500.00
targetPrice=2600.00
stopLoss=2450.00
```

Or JSON format:

```json
{
  "symbol": "RELIANCE",
  "signalType": "BUY",
  "quantity": 1,
  "entryPrice": 2500.00,
  "targetPrice": 2600.00,
  "stopLoss": 2450.00
}
```

## API Endpoints

### Webhooks

- `POST /api/webhook` - Receive signal from TradingView
- `GET /api/webhook/status` - Get webhook stats

### Trades

- `GET /api/trades` - Get all trades (paginated)
- `GET /api/trades/:id` - Get trade details with price history
- `GET /api/trades/active/list` - Get active trades
- `GET /api/trades/stats/summary` - Get trading statistics

### Orders

- `POST /api/orders/manual` - Place manual order
- `GET /api/orders` - Get all orders
- `GET /api/orders/:orderId` - Get order status
- `DELETE /api/orders/:orderId` - Cancel order
- `GET /api/orders/monitoring/status` - Get monitoring status

## Database Schema

### trades
- Main trade information
- Entry/exit prices and times
- P&L tracking
- Order and squareoff status

### order_cache
- Duplicate order prevention
- Signal hash for deduplication
- 45-second window check

### price_tracking
- Historical LTP data
- P&L calculations
- Tracking points in time

### squareoff_logs
- Squareoff execution records
- Final P&L
- Exit reason (TARGET/STOPLOSS)

### webhook_logs
- Incoming webhook data
- Processing status
- Error tracking

## Duplicate Order Prevention

The system prevents duplicate orders by:

1. **Signal Hashing** - Creates MD5 hash of symbol+side+quantity+price
2. **Time Window** - Checks last 45 seconds
3. **Auto-Cache** - Removes old entries automatically

This prevents accidental duplicate signals within 45 seconds.

## Automatic Square-off Logic

When order is placed:

1. **Monitoring Starts** - Track LTP in 10-second intervals
2. **Target Check** - If LTP >= target (BUY) or <= target (SELL)
3. **Stoploss Check** - If LTP <= SL (BUY) or >= SL (SELL)
4. **Execution** - Place opposite order immediately
5. **Logging** - Record final P&L and reason

## Real-time Updates

Dashboard updates via WebSocket:

- Price updates every 10 seconds
- P&L recalculation in real-time
- Trade closure notifications
- New order alerts

## Troubleshooting

### Backend won't start
```bash
# Check port 5000 is available
netstat -an | grep 5000

# Restart server
npm start
```

### Database connection error
```bash
# Check MySQL is running
mysql -u root -p

# Verify credentials in .env
# Re-run migration
node ../database/migrate.js
```

### Orders not executing
1. Check Kotak Neo API credentials in .env
2. Verify TradingView webhook URL is correct
3. Check webhook logs: `GET /api/webhook/status`

### P&L not tracking
1. Ensure MySQL database is active
2. Check price_tracking table has data
3. Verify LTP updates are coming through

## Security Notes

⚠️ **Important:**
- Never commit .env file with real credentials
- Use environment variables in production
- Implement rate limiting for API endpoints
- Add authentication for production deployment
- Use HTTPS for webhook URL in production

## Performance Tips

1. **Batch Updates** - Use pagination for trade lists
2. **Index Database** - Ensure all indexes are created
3. **Connection Pool** - MySQL connection pooling is enabled
4. **Caching** - Implement Redis for frequently accessed data
5. **Monitoring** - Set up alerts for failed orders

## Testing

### Test Signal

```bash
curl -X POST http://localhost:5000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "INFY",
    "signalType": "BUY",
    "quantity": 1,
    "entryPrice": 1500.00,
    "targetPrice": 1600.00,
    "stopLoss": 1450.00
  }'
```

### Check Active Trades

```bash
curl http://localhost:5000/api/trades/active/list
```

### Get Statistics

```bash
curl http://localhost:5000/api/trades/stats/summary
```

## Production Deployment

### Using PM2

```bash
npm install -g pm2

# Backend
cd backend
pm2 start server.js --name "kotak-trading-backend"

# Frontend
cd frontend
npm run build
pm2 serve build 3000 --name "kotak-trading-frontend"

pm2 save
pm2 startup
```

### Using Docker

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY backend .
RUN npm install
EXPOSE 5000
CMD ["node", "server.js"]
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

ISC

## Support

For issues and questions:
1. Check the logs: `backend/logs/`
2. Review database with: `mysql> SELECT * FROM trades;`
3. Test webhooks manually with curl

---

**Happy Trading! 📊📈**
