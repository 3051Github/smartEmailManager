import logger from '../utils/logger.js';

export function notFound(req, res) {
  res.status(404).json({ success: false, error: `Route non trovata: ${req.method} ${req.path}` });
}

export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Errore interno del server';

  if (status >= 500) {
    logger.error(`${req.method} ${req.path} → ${message}`, { stack: err.stack });
  }

  res.status(status).json({ success: false, error: message });
}
