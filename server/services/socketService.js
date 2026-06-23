import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Non autenticato'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.utenteId = payload.id;
      next();
    } catch {
      next(new Error('Token non valido'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.utenteId}`);
    socket.on('disconnect', () => {});
  });

  return io;
}

export function getIO() { return io; }

export function notifyUser(utenteId, event, data) {
  io?.to(`user:${utenteId}`).emit(event, data);
}
