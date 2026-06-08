const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
require('dotenv').config();

const webhookRoutes = require('./routes/webhook');
const tradesRoutes = require('./routes/trades');
const ordersRoutes = require('./routes/orders');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(morgan('combined', {
  skip: (req) => {
    const ua = req.headers['user-agent'] || '';
    return /mozilla|chrome|firefox|safari/i.test(ua);
  },
}));
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000'],
  methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve frontend static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Store io instance for use in routes
app.set('io', io);

// Routes
app.use('/api/webhook', webhookRoutes);
app.use('/api/trades', tradesRoutes);
app.use('/api/orders', ordersRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Fallback to frontend app for non-API GET requests
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io globally accessible
global.io = io;

const PORT = process.env.SERVER_PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Trading Algorithm Server running on port ${PORT}`);
  console.log(`📊 WebSocket listening for real-time updates`);
});

module.exports = { app, io };
