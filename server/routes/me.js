import express from 'express';
import { body, validationResult } from 'express-validator';
import { queryOne, insert, update } from '../config/db.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { requireAuth } from '../middleware/auth.js';
import { sendVerificationEmail } from '../services/mailerService.js';
import { ImapFlow } from 'imapflow';

const router = express.Router();
router.use(requireAuth);

// GET /api/me/config-email
router.get('/config-email', async (req, res, next) => {
  try {
    const config = await queryOne(
      `SELECT id, nome_display, email_address, imap_host, imap_port, imap_secure,
              imap_user, smtp_host, smtp_port, smtp_secure, smtp_user,
              attiva, sync_interval_min
       FROM config_email_utente WHERE utente_id = ?`,
      [req.user.id]
    );
    res.json({ success: true, data: config || null });
  } catch (err) { next(err); }
});

// PUT /api/me/config-email
router.put('/config-email', [
  body('email_address').isEmail(),
  body('imap_host').notEmpty(),
  body('imap_port').isInt({ min: 1, max: 65535 }),
  body('imap_user').notEmpty(),
  body('smtp_host').notEmpty(),
  body('smtp_port').isInt({ min: 1, max: 65535 }),
  body('smtp_user').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const {
      nome_display, email_address, imap_host, imap_port, imap_secure, imap_user, imap_pass,
      smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, sync_interval_min,
    } = req.body;

    const existing = await queryOne('SELECT id, imap_pass_enc, smtp_pass_enc FROM config_email_utente WHERE utente_id = ?', [req.user.id]);

    const imapPassEnc = imap_pass ? encrypt(imap_pass) : (existing?.imap_pass_enc || '');
    const smtpPassEnc = smtp_pass ? encrypt(smtp_pass) : (existing?.smtp_pass_enc || '');

    if (existing) {
      await update(
        `UPDATE config_email_utente SET
          nome_display=?, email_address=?, imap_host=?, imap_port=?, imap_secure=?, imap_user=?, imap_pass_enc=?,
          smtp_host=?, smtp_port=?, smtp_secure=?, smtp_user=?, smtp_pass_enc=?, sync_interval_min=?
         WHERE utente_id=?`,
        [nome_display || null, email_address, imap_host, imap_port, imap_secure ? 1 : 0, imap_user, imapPassEnc,
         smtp_host, smtp_port, smtp_secure ? 1 : 0, smtp_user, smtpPassEnc, sync_interval_min || 5, req.user.id]
      );
    } else {
      await insert(
        `INSERT INTO config_email_utente
          (utente_id, nome_display, email_address, imap_host, imap_port, imap_secure, imap_user, imap_pass_enc, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc, sync_interval_min)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, nome_display || null, email_address, imap_host, imap_port, imap_secure ? 1 : 0, imap_user, imapPassEnc,
         smtp_host, smtp_port, smtp_secure ? 1 : 0, smtp_user, smtpPassEnc, sync_interval_min || 5]
      );
    }

    res.json({ success: true, message: 'Configurazione salvata' });
  } catch (err) { next(err); }
});

// POST /api/me/config-email/test
// Accetta parametri inline (test live dal form) o usa la config salvata
router.post('/config-email/test', async (req, res, next) => {
  try {
    const { imap_host, imap_port, imap_secure, imap_user, imap_pass } = req.body;

    let host, port, secure, user, pass;

    if (imap_host && imap_user && imap_pass) {
      // Test con valori dal form (prima del salvataggio)
      host   = imap_host;
      port   = parseInt(imap_port) || 993;
      secure = imap_secure === true || imap_secure === 'true' || imap_secure === 1;
      user   = imap_user;
      pass   = imap_pass;
    } else {
      // Test con config già salvata
      const config = await queryOne('SELECT * FROM config_email_utente WHERE utente_id = ?', [req.user.id]);
      if (!config) return res.status(400).json({ success: false, error: 'Nessuna configurazione salvata. Compila i campi IMAP e riprova.' });
      host   = config.imap_host;
      port   = config.imap_port;
      secure = !!config.imap_secure;
      user   = config.imap_user;
      pass   = decrypt(config.imap_pass_enc);
    }

    const client = new ImapFlow({
      host, port, secure,
      auth: { user, pass },
      logger: false,
      tls: { rejectUnauthorized: false },
    });

    await client.connect();
    const status = await client.status('INBOX', { messages: true });
    await client.logout();

    res.json({ success: true, message: `Connessione IMAP riuscita — ${status.messages ?? '?'} messaggi in INBOX` });
  } catch (err) {
    res.status(400).json({ success: false, error: `Connessione fallita: ${err.message}` });
  }
});

// POST /api/me/test-brevo
// Invia una email di prova a sé stessi per verificare la configurazione Brevo
router.post('/test-brevo', async (req, res, next) => {
  try {
    await sendVerificationEmail(req.user.email, req.user.nome, 'TOKEN_DI_TEST');
    res.json({ success: true, message: `Email di test inviata a ${req.user.email}` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
