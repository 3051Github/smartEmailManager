import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { query, queryOne, insert, update } from '../config/db.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/mailerService.js';
import { createDefaultStati } from '../services/statiService.js';
import { findOrCreateOAuthUser, verifyGoogleToken } from '../services/oauthService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function makeToken() { return crypto.randomBytes(48).toString('hex'); }
function signJwt(utente) {
  return jwt.sign({ id: utente.id, email: utente.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}
function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
}

// POST /api/auth/register
router.post('/register', [
  body('nome').trim().notEmpty().withMessage('Nome obbligatorio'),
  body('cognome').trim().notEmpty().withMessage('Cognome obbligatorio'),
  body('email').isEmail().normalizeEmail().withMessage('Email non valida'),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 caratteri'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { nome, cognome, email, password } = req.body;
    const exists = await queryOne('SELECT id FROM utenti WHERE email = ?', [email]);
    if (exists) return res.status(409).json({ success: false, error: 'Email già registrata' });

    const hash = await bcrypt.hash(password, 12);
    const utenteId = await insert(
      'INSERT INTO utenti (nome, cognome, email, password_hash) VALUES (?, ?, ?, ?)',
      [nome, cognome, email, hash]
    );

    await createDefaultStati(utenteId);

    const token = makeToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await insert(
      'INSERT INTO email_verification_tokens (utente_id, token, expires_at) VALUES (?, ?, ?)',
      [utenteId, token, expires]
    );

    await sendVerificationEmail(email, nome, token).catch(err => {
      logger.error(`[register] sendVerificationEmail failed: ${err.message}`);
    });

    res.status(201).json({ success: true, message: 'Registrazione completata. Controlla la tua email.' });
  } catch (err) { next(err); }
});

// GET /api/auth/verify-email?token=xxx
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, error: 'Token mancante' });

    // Cerca token valido (non usato, non scaduto)
    const rec = await queryOne(
      'SELECT * FROM email_verification_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    if (!rec) return res.status(400).json({ success: false, error: 'Token non valido o scaduto' });

    // Se già usato, controlla se l'utente è già verificato (doppia chiamata StrictMode)
    if (rec.used) {
      const utente = await queryOne('SELECT email_verified FROM utenti WHERE id = ?', [rec.utente_id]);
      if (utente?.email_verified) return res.json({ success: true, message: 'Email già verificata' });
      return res.status(400).json({ success: false, error: 'Token già utilizzato' });
    }

    await update('UPDATE utenti SET email_verified = 1 WHERE id = ?', [rec.utente_id]);
    await update('UPDATE email_verification_tokens SET used = 1 WHERE id = ?', [rec.id]);

    res.json({ success: true, message: 'Email verificata con successo' });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Dati non validi' });

    const { email, password } = req.body;
    const utente = await queryOne('SELECT * FROM utenti WHERE email = ? AND attivo = 1', [email]);
    if (!utente || !utente.password_hash) {
      return res.status(401).json({ success: false, error: 'Credenziali non valide' });
    }

    const ok = await bcrypt.compare(password, utente.password_hash);
    if (!ok) return res.status(401).json({ success: false, error: 'Credenziali non valide' });

    await update('UPDATE utenti SET last_login = NOW() WHERE id = ?', [utente.id]);

    const jwtToken = signJwt(utente);
    setAuthCookie(res, jwtToken);

    res.json({
      success: true,
      data: {
        token: jwtToken,
        utente: { id: utente.id, nome: utente.nome, cognome: utente.cognome, email: utente.email, email_verified: utente.email_verified },
      },
    });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res, next) => {
  try {
    const { email } = req.body;
    const utente = await queryOne('SELECT * FROM utenti WHERE email = ? AND attivo = 1', [email]);

    // Risposta sempre uguale per non rivelare se l'email esiste
    if (!utente) return res.json({ success: true, message: 'Se l\'email esiste, riceverai le istruzioni.' });

    const token = makeToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 ora
    await insert(
      'INSERT INTO password_reset_tokens (utente_id, token, expires_at) VALUES (?, ?, ?)',
      [utente.id, token, expires]
    );

    await sendPasswordResetEmail(email, utente.nome, token).catch(err => {
      logger.error(`[forgot-password] sendPasswordResetEmail failed: ${err.message}`);
    });
    res.json({ success: true, message: 'Se l\'email esiste, riceverai le istruzioni.' });
  } catch (err) { next(err); }
});

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { token, password } = req.body;
    const rec = await queryOne(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > NOW()',
      [token]
    );
    if (!rec) return res.status(400).json({ success: false, error: 'Token non valido o scaduto' });

    const hash = await bcrypt.hash(password, 12);
    await update('UPDATE utenti SET password_hash = ? WHERE id = ?', [hash, rec.utente_id]);
    await update('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [rec.id]);

    res.json({ success: true, message: 'Password aggiornata con successo' });
  } catch (err) { next(err); }
});

// POST /api/auth/oauth/google
// Riceve l'access_token dal frontend (Google One Tap o OAuth flow)
router.post('/oauth/google', async (req, res, next) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ success: false, error: 'Token mancante' });

    const profile = await verifyGoogleToken(access_token);
    const utente = await findOrCreateOAuthUser(profile);

    await update('UPDATE utenti SET last_login = NOW() WHERE id = ?', [utente.id]);
    const jwtToken = signJwt(utente);
    setAuthCookie(res, jwtToken);

    res.json({
      success: true,
      data: {
        token: jwtToken,
        utente: { id: utente.id, nome: utente.nome, cognome: utente.cognome, email: utente.email, email_verified: utente.email_verified },
      },
    });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const utente = await queryOne(
      'SELECT id, nome, cognome, email, email_verified, avatar_url, created_at FROM utenti WHERE id = ?',
      [req.user.id]
    );
    const hasConfig = !!(await queryOne('SELECT id FROM config_email_utente WHERE utente_id = ?', [req.user.id]));
    res.json({ success: true, data: { ...utente, has_email_config: hasConfig } });
  } catch (err) { next(err); }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', requireAuth, async (req, res, next) => {
  try {
    if (req.user.email_verified) return res.json({ success: true, message: 'Email già verificata' });
    const token = makeToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await insert(
      'INSERT INTO email_verification_tokens (utente_id, token, expires_at) VALUES (?, ?, ?)',
      [req.user.id, token, expires]
    );
    await sendVerificationEmail(req.user.email, req.user.nome, token).catch(err => {
      logger.error(`[resend-verification] sendVerificationEmail failed: ${err.message}`);
    });
    res.json({ success: true, message: 'Email di verifica inviata' });
  } catch (err) { next(err); }
});

export default router;
