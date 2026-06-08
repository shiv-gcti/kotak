import io from 'socket.io-client';

let socket = null;

export const initSocket = () => {
  if (!socket) {
    socket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('✓ WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('✗ WebSocket disconnected');
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const subscribeToPrice = (callback) => {
  const sock = getSocket();
  sock.on('price_update', callback);
  return () => sock.off('price_update', callback);
};

export const subscribeToClosed = (callback) => {
  const sock = getSocket();
  sock.on('trade_closed', callback);
  return () => sock.off('trade_closed', callback);
};
