import jwt from 'jsonwebtoken';
import { queryOne } from '../config/db.js';

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'Non autenticato' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const utente = await queryOne(
      'SELECT id, nome, cognome, email, email_verified, attivo FROM utenti WHERE id = ?',
      [payload.id]
    );
    if (!utente || !utente.attivo) return res.status(401).json({ success: false, error: 'Utente non trovato o disabilitato' });

    req.user = utente;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token non valido' });
  }
}

export async function requireVerified(req, res, next) {
  await requireAuth(req, res, () => {
    if (!req.user.email_verified) {
      return res.status(403).json({ success: false, error: 'Email non verificata' });
    }
    next();
  });
}
