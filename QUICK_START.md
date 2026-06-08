# Kotak Neo Trading Algorithm - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Install Dependencies

**Windows:**
```bash
setup.bat
```

**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

### Step 2: Configure Credentials

Edit `backend/.env`:

```env
# Kotak Neo Credentials (from your Kotak Neo account)
KOTAK_API_KEY=your_api_key
KOTAK_API_SECRET=your_api_secret
KOTAK_USERNAME=your_login_username
KOTAK_PASSWORD=your_login_password
KOTAK_TWO_FA=your_2fa_pin

# MySQL Credentials
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
```

### Step 3: Start Backend

```bash
cd backend
npm start
```

Output should show:
```
✓ Kotak Neo authentication successful
🚀 Trading Algorithm Server running on port 5000
📊 WebSocket listening for real-time updates
```

### Step 4: Start Frontend (New Terminal)

```bash
cd frontend
npm start
```

Dashboard opens at: `http://localhost:3000`

### Step 5: Configure TradingView

1. Go to TradingView → Your Chart → Create Alert
2. Set **Webhook URL**: `http://your-server:5000/api/webhook`
3. Set **Message** format (see below)
4. Save alert

#### TradingView Message Format

```
symbol=RELIANCE
signalType=BUY
quantity=1
entryPrice=2500.00
targetPrice=2600.00
stopLoss=2450.00
```

**Or JSON:**
```json
{
  "symbol": "INFY",
  "signalType": "BUY",
  "quantity": 1,
  "entryPrice": 1500.00,
  "targetPrice": 1600.00,
  "stopLoss": 1450.00
}
```

## ✅ Testing

### Test Signal (using curl)

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

### Check Dashboard

1. Open `http://localhost:3000`
2. View active trades in real-time
3. Monitor P&L and LTP updates

## 📊 Dashboard Features

### Dashboard Tab
- **Statistics**: Total P&L, Open Trades, Win Rate
- **Active Trades**: Live tracking of open positions
- **Trade History**: All completed trades

### Trades Tab
- **Manual Order**: Place trades directly
- **Order Status**: Monitor live orders

### Settings Tab
- **Configuration**: View current settings
- **Webhook Info**: TradingView integration details

## 🔧 Key Features Explained

### 1. Duplicate Order Prevention
- **Prevents** same order within 45 seconds
- Uses signal hash (symbol + side + quantity + price)
- Configurable via `DUPLICATE_ORDER_INTERVAL`

### 2. Automatic Square-off
- **Monitors** price every 10 seconds
- **Exits** at target or stop-loss automatically
- Records exit price and final P&L

### 3. Real-time Updates
- **WebSocket** for live price updates
- **Dashboard** refreshes every second
- **Database** saves all history

### 4. P&L Tracking
- Entry and exit prices tracked
- Real-time P&L calculation
- Percentage returns displayed

## 📈 Understanding the Flow

```
TradingView Alert
    ↓
Webhook Received (POST /api/webhook)
    ↓
Validate & Check Duplicates
    ↓
Place Order on Kotak Neo
    ↓
Save Trade to MySQL
    ↓
Start Monitoring (Squareoff Service)
    ↓
Monitor Price Every 10 Seconds
    ↓
Target/SL Hit → Place Squareoff Order
    ↓
Update P&L & Close Trade
    ↓
Send WebSocket Update to Dashboard
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is busy
netstat -an | grep 5000

# Kill process on port 5000
# Windows: netstat -ano | findstr :5000 → taskkill /PID xxxxx /F
# Mac/Linux: lsof -i :5000 → kill -9 PID
```

### Database connection error
```bash
# Check MySQL is running
mysql -u root -p

# Verify .env credentials
# Restart backend
```

### Webhook not working
```bash
# Check webhook status
curl http://localhost:5000/api/webhook/status

# Look at backend logs
# Check TradingView alert history
```

### Orders not executing
```bash
# Check Kotak Neo API credentials
# Test manual order placement from dashboard
# Check order status: http://localhost:5000/api/orders
```

## 🔐 Security

⚠️ **Never:**
- Commit `.env` file with real credentials
- Share API keys publicly
- Use in production without HTTPS

## 📚 API Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhook` | POST | Receive signals |
| `/api/trades` | GET | List trades |
| `/api/trades/:id` | GET | Trade details |
| `/api/trades/active/list` | GET | Active trades |
| `/api/trades/stats/summary` | GET | Statistics |
| `/api/orders/manual` | POST | Place manual order |
| `/api/orders` | GET | List orders |

## 🎯 Pro Tips

1. **Test with small quantities** - Start with 1-share trades
2. **Set realistic targets** - Avoid very tight profit targets
3. **Monitor first day** - Watch real trades before leaving unattended
4. **Use alerts** - Enable price alerts for important trades
5. **Review daily** - Check P&L and winning/losing patterns

## 📞 Support

For issues:
1. Check `backend` console for errors
2. Review `frontend` browser console (F12)
3. Check MySQL: `SELECT * FROM trades;`
4. Verify TradingView alert in History tab

---

**Ready to trade? Start with small quantities and monitor carefully! 📊📈💰**
