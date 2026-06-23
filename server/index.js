import 'dotenv/config';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';

import logger from './utils/logger.js';
import { initSocket } from './services/socketService.js';
import { syncAllUsers } from './services/imapService.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import authRoutes     from './routes/auth.js';
import meRoutes       from './routes/me.js';
import emailsRoutes   from './routes/emails.js';
import clientiRoutes  from './routes/clienti.js';
import progettiRoutes from './routes/progetti.js';
import statiRoutes    from './routes/stati.js';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const app        = express();
const httpServer = http.createServer(app);
const PORT       = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: CLIENT_URL, credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'] }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, error: 'Troppi tentativi, riprova tra 15 minuti' },
}));

app.use('/api/auth',     authRoutes);
app.use('/api/me',       meRoutes);
app.use('/api/emails',   emailsRoutes);
app.use('/api/clienti',  clientiRoutes);
app.use('/api/progetti', progettiRoutes);
app.use('/api/stati',    statiRoutes);

// Serve React build in produzione
const clientBuild = path.join(__dirname, '../client/dist');
if (existsSync(path.join(clientBuild, 'index.html'))) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(clientBuild, 'index.html'), err => { if (err) next(err); });
  });
}

app.use(notFound);
app.use(errorHandler);

initSocket(httpServer);

// Cron sync IMAP ogni minuto (il service decide quali utenti sincronizzare in base all'intervallo configurato)
cron.schedule('* * * * *', () => {
  syncAllUsers().catch(err => logger.error(`Cron sync: ${err.message}`));
});

httpServer.listen(PORT, () => {
  logger.info(`Server avviato su http://localhost:${PORT}`);
  logger.info(`Client URL: ${CLIENT_URL}`);
});

process.on('SIGTERM', () => { httpServer.close(() => process.exit(0)); });
process.on('uncaughtException', err => {
  if (err.code === 'ECONNRESET' || err.code === 'EPIPE') return;
  console.error('[uncaughtException]', err);
  logger.error(`uncaughtException: ${err.message}\n${err.stack}`);
});
process.on('unhandledRejection', reason => {
  console.error('[unhandledRejection]', reason);
  logger.error(`unhandledRejection: ${reason?.message || String(reason)}\n${reason?.stack || ''}`);
});
