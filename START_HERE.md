# Start Here! 🚀

This is your Kotak Neo Trading Algorithm system. Here's what you need to know:

## 📌 Quick Navigation

**I want to...**

### Start Trading ASAP
→ Read: [QUICK_START.md](QUICK_START.md) (5 minutes)

### Understand How It Works
→ Read: [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)

### See All Files Created
→ Read: [FILE_MANIFEST.md](FILE_MANIFEST.md)

### Deploy to Production
→ Read: [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)

### Advanced Configuration
→ Read: [ADVANCED_CONFIG.md](ADVANCED_CONFIG.md)

### Full Documentation
→ Read: [README.md](README.md)

---

## ⚡ 5-Minute Summary

### What You Have
✅ **Backend:** Node.js/Express server (port 5000)
✅ **Frontend:** React dashboard (port 3000)
✅ **Database:** MySQL with complete schema
✅ **API:** 11 endpoints for trading operations
✅ **Webhooks:** TradingView integration ready
✅ **Features:** Auto square-off, P&L tracking, duplicate prevention

### What You Need to Do
1. Edit `backend/.env` with your Kotak Neo credentials
2. Run: `cd backend && npm start`
3. Run: `cd frontend && npm start`
4. Open: `http://localhost:3000`
5. Configure TradingView webhook to: `http://your-server:5000/api/webhook`

### Signal Format for TradingView
```
symbol=RELIANCE
signalType=BUY
quantity=1
entryPrice=2500.00
targetPrice=2600.00
stopLoss=2450.00
```

---

## 🔑 Key Features

| Feature | Status | How |
|---------|--------|-----|
| TradingView Signals | ✅ | POST webhook |
| Duplicate Prevention | ✅ | 45-second window |
| Auto Squareoff | ✅ | Monitor every 10s |
| P&L Tracking | ✅ | Real-time updates |
| Trade History | ✅ | MySQL database |
| Dashboard | ✅ | React with WebSocket |
| Manual Orders | ✅ | REST API |

---

## 📊 System Architecture

```
TradingView Alert
    ↓
POST /api/webhook
    ↓
Validate & Check Duplicates
    ↓
Place Order on Kotak Neo
    ↓
Save to MySQL
    ↓
Monitor Price (WebSocket)
    ↓
Target/SL Hit → Square Off
    ↓
Update Dashboard (Real-time)
```

---

## 📁 Key Directories

| Path | Purpose |
|------|---------|
| `backend/` | Express API server |
| `frontend/src/` | React components |
| `database/` | SQL migration scripts |
| `backend/services/` | Business logic |
| `frontend/src/components/` | UI components |
| `frontend/src/services/` | API/WebSocket clients |

---

## 🛠️ Technology Stack

**Backend:** Node.js + Express + MySQL + Socket.io
**Frontend:** React + Tailwind CSS + Socket.io Client
**Database:** MySQL 5.7+
**DevOps:** PM2, Docker, Nginx

---

## 📈 API Endpoints (Quick Reference)

```
POST   /api/webhook              # TradingView signal
GET    /api/trades              # All trades
GET    /api/trades/:id          # Trade details
GET    /api/trades/active/list  # Active trades
GET    /api/trades/stats/summary# Statistics
POST   /api/orders/manual       # Place order
GET    /api/orders              # List orders
```

Full reference in [README.md](README.md#api-endpoints)

---

## 🐛 Troubleshooting

### Backend won't start?
```bash
# Check port 5000
netstat -an | grep 5000

# Check MySQL
mysql -u root -p

# Check logs
npm start
```

### Database error?
```bash
# Run migration
node database/migrate.js

# Check connection in .env
# Restart backend
```

### Trades not executing?
1. Check `.env` credentials
2. Test with manual order
3. Check `GET /api/orders/monitoring/status`

See full troubleshooting in [QUICK_START.md](QUICK_START.md#troubleshooting)

---

## 📚 Documentation Map

```
START HERE
    ↓
QUICK_START.md (setup)
    ↓
IMPLEMENTATION_GUIDE.md (understand)
    ↓
README.md (full details)
    ↓
ADVANCED_CONFIG.md (optimize)
    ↓
PRODUCTION_DEPLOYMENT.md (scale)
```

---

## ✅ Pre-flight Checklist

- [ ] Node.js 14+ installed
- [ ] MySQL 5.7+ installed and running
- [ ] `.env` configured with Kotak Neo credentials
- [ ] Database migration run (`node database/migrate.js`)
- [ ] Backend npm packages installed (`npm install`)
- [ ] Frontend npm packages installed (`npm install`)
- [ ] TradingView webhook URL configured

Once all checked, run:
```bash
cd backend && npm start
# In another terminal:
cd frontend && npm start
```

---

## 🎯 Next Steps

1. **Right Now:** Read [QUICK_START.md](QUICK_START.md)
2. **In 5 min:** Configure credentials in `backend/.env`
3. **In 10 min:** Start backend and frontend
4. **In 15 min:** Open dashboard at localhost:3000
5. **In 20 min:** Test with a demo trade
6. **In 30 min:** Configure TradingView webhook

---

## 🚀 Ready?

Let's go! Start with [QUICK_START.md](QUICK_START.md)

**Happy Trading! 📊📈💰**

---

### Need Help?
- **Setup Issues?** → [QUICK_START.md](QUICK_START.md#troubleshooting)
- **How it works?** → [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
- **Going live?** → [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
- **Need details?** → [README.md](README.md)
- **File listing?** → [FILE_MANIFEST.md](FILE_MANIFEST.md)

### Files in This Project
- 23 source code files
- 40+ total files (including config & docs)
- 6000+ lines of code
- 5 comprehensive guides
- Production-ready system

Everything is ready to use. Just configure and deploy! 🎉
