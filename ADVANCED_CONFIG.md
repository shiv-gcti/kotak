# Kotak Neo Trading Algorithm - Advanced Configuration Guide

## Advanced Settings

### 1. Duplicate Order Prevention Tuning

**Current:** 45 seconds

Change in `.env`:
```env
DUPLICATE_ORDER_INTERVAL=45000  # milliseconds
```

**Recommendations:**
- Short trades: 30 seconds
- Swing trades: 120 seconds
- Long-term: 300 seconds

### 2. Price Monitoring Interval

**Current:** 10 seconds

Change in `.env`:
```env
SQUAREOFF_CHECK_INTERVAL=10000  # milliseconds
```

**Trade-offs:**
- Faster (5s): Higher accuracy but more CPU usage
- Slower (30s): Lower accuracy but better performance

### 3. Order Types

**Supported:** MARKET, LIMIT, STOP_LOSS

Modify in signal message:
```
orderType=LIMIT
price=2500.00
```

### 4. Product Type

**Supported:** MIS (Intraday), CNC (Delivery), NRML (Normal)

Default: MIS

### 5. Connection Pooling

Max connections in `config/database.js`:
```javascript
const config = {
  connectionLimit: 10,  // Increase for high volume
  queueLimit: 0,
};
```

## Performance Optimization

### 1. Database Optimization

```sql
-- Add composite index for faster queries
ALTER TABLE trades ADD INDEX idx_symbol_status (symbol, order_status);

-- Archive old trades (before deleting)
CREATE TABLE trades_archive LIKE trades;
INSERT INTO trades_archive SELECT * FROM trades WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);
DELETE FROM trades WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);
```

### 2. Redis Caching

For high-frequency traders, add Redis:

```bash
npm install redis
```

Update `config/database.js`:
```javascript
const redis = require('redis');
const client = redis.createClient();
```

### 3. Load Balancing

Deploy multiple backend instances:

```javascript
// cluster.js
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  require('./server.js');
}
```

## Security Hardening

### 1. API Authentication

Add JWT in `routes/webhook.js`:

```javascript
const jwt = require('jsonwebtoken');

router.post('/', authenticateToken, async (req, res) => {
  // ...
});

function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}
```

### 2. Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use('/api/', limiter);
```

### 3. Input Validation

```javascript
const Joi = require('joi');

const signalSchema = Joi.object({
  symbol: Joi.string().length(10).required(),
  signalType: Joi.string().valid('BUY', 'SELL').required(),
  quantity: Joi.number().min(1).max(1000).required(),
  entryPrice: Joi.number().positive().required(),
  targetPrice: Joi.number().positive().required(),
  stopLoss: Joi.number().positive().required(),
});
```

## Monitoring & Alerts

### 1. Health Check Endpoint

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    database: checkDatabase(),
    broker: checkBrokerConnection(),
  });
});
```

### 2. Error Logging

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### 3. Email Alerts

```javascript
const nodemailer = require('nodemailer');

async function sendAlert(subject, message) {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.ALERT_EMAIL,
      pass: process.env.ALERT_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.ALERT_EMAIL,
    to: process.env.ADMIN_EMAIL,
    subject,
    text: message,
  });
}
```

## Risk Management

### 1. Daily Loss Limit

```javascript
async function checkDailyLoss() {
  const [trades] = await connection.query(`
    SELECT SUM(pnl) as totalPnL FROM trades 
    WHERE DATE(created_at) = CURDATE()
  `);
  
  const dailyLoss = trades[0].totalPnL;
  if (dailyLoss < -process.env.MAX_DAILY_LOSS) {
    stopAllTrades();
    sendAlert('Daily Loss Limit Hit', dailyLoss);
  }
}
```

### 2. Position Sizing

```javascript
function calculatePositionSize(accountBalance, riskPercentage, stopLossPoints) {
  const riskAmount = accountBalance * (riskPercentage / 100);
  return Math.floor(riskAmount / stopLossPoints);
}
```

### 3. Max Concurrent Trades

```javascript
async function canPlaceOrder() {
  const [trades] = await connection.query(`
    SELECT COUNT(*) as count FROM trades 
    WHERE squareoff_status = 'PENDING'
  `);
  
  return trades[0].count < process.env.MAX_OPEN_TRADES;
}
```

## Backup & Recovery

### 1. Database Backup

```bash
# Daily backup
mysqldump -u root -p kotakneo_trading > backup_$(date +%Y%m%d).sql

# With cron (add to crontab)
0 2 * * * mysqldump -u root -p kotakneo_trading > /backups/backup_$(date +\%Y\%m\%d).sql
```

### 2. Recovery

```bash
mysql -u root -p kotakneo_trading < backup_20240101.sql
```

## Scaling Considerations

### 1. Message Queue

For high-frequency signals, add Redis queue:

```bash
npm install bull
```

### 2. WebSocket Server

Separate WebSocket server for scalability:

```javascript
// ws-server.js
const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });
```

### 3. Multi-instance Deployment

```bash
pm2 start server.js -i max  # Use all CPUs
```

## Testing

### 1. Unit Tests

```bash
npm install jest --save-dev
```

Create `tests/orderService.test.js`:

```javascript
describe('OrderService', () => {
  it('should prevent duplicate orders', async () => {
    const result = await orderService.checkDuplicateOrder(
      'INFY', 'BUY', 1, 1500
    );
    expect(result).toBe(true);
  });
});
```

### 2. Integration Tests

```javascript
describe('Webhook Integration', () => {
  it('should process TradingView signal', async () => {
    const response = await request(app)
      .post('/api/webhook')
      .send(testSignal);
    expect(response.status).toBe(200);
  });
});
```

### 3. Load Testing

```bash
npm install autocannon -D
autocannon http://localhost:5000/api/trades
```

---

**For more details, check README.md and QUICK_START.md**
