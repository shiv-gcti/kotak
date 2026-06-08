const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
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
app.use(morgan('combined'));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
