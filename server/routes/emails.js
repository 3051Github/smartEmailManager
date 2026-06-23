import express from 'express';
import { body, validationResult } from 'express-validator';
import { query, queryOne, insert, update, scalar } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { fetchEmailBody, syncUserEmails } from '../services/imapService.js';
import nodemailer from 'nodemailer';
import { decrypt } from '../utils/crypto.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/emails
router.get('/', async (req, res, next) => {
  try {
    const { stato_id, progetto_id, archiviata = 0, letta, q, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE e.utente_id = ?';
    const params = [req.user.id];

    where += ' AND e.archiviata = ?';
    params.push(parseInt(archiviata));

    if (stato_id === 'null') {
      where += ' AND e.stato_id IS NULL';
    } else if (stato_id) {
      where += ' AND e.stato_id = ?';
      params.push(stato_id);
    }

    if (progetto_id === 'null') {
      where += ' AND e.progetto_id IS NULL';
    } else if (progetto_id) {
      where += ' AND e.progetto_id = ?';
      params.push(progetto_id);
    }

    if (letta !== undefined) { where += ' AND e.letta = ?'; params.push(parseInt(letta)); }
    if (q) { where += ' AND (e.oggetto LIKE ? OR e.mittente LIKE ? OR e.mittente_nome LIKE ?)'; const like = `%${q}%`; params.push(like, like, like); }

    const emails = await query(
      `SELECT e.id, e.mittente, e.mittente_nome, e.destinatari, e.oggetto, e.ora_ricezione,
              e.has_attachments, e.letta, e.archiviata, e.nota, e.progetto_id, e.stato_id,
              s.nome AS stato_nome, s.colore AS stato_colore, s.icona AS stato_icona,
              p.nome AS progetto_nome, p.colore AS progetto_colore
       FROM emails e
       LEFT JOIN stati_email s ON s.id = e.stato_id
       LEFT JOIN progetti p ON p.id = e.progetto_id
       ${where}
       ORDER BY e.ora_ricezione DESC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );

    const totalParams = [...params];
    const total = await scalar(`SELECT COUNT(*) FROM emails e ${where}`, totalParams);

    res.json({ success: true, data: emails, total: total || 0 });
  } catch (err) { next(err); }
});

// GET /api/emails/badges
router.get('/badges', async (req, res, next) => {
  try {
    const uid = req.user.id;
    const stati = await query(
      `SELECT s.id, s.nome, s.colore, s.icona, COUNT(e.id) AS count
       FROM stati_email s
       LEFT JOIN emails e ON e.stato_id = s.id AND e.utente_id = ? AND e.archiviata = 0
       WHERE s.utente_id = ?
       GROUP BY s.id ORDER BY s.ordine`,
      [uid, uid]
    );
    const nonLette = await scalar('SELECT COUNT(*) FROM emails WHERE utente_id = ? AND letta = 0 AND archiviata = 0', [uid]);
    res.json({ success: true, data: { stati, non_lette: nonLette || 0 } });
  } catch (err) { next(err); }
});

// GET /api/emails/:id
router.get('/:id', async (req, res, next) => {
  try {
    const email = await queryOne(
      `SELECT e.*, s.nome AS stato_nome, s.colore AS stato_colore,
              p.nome AS progetto_nome, p.colore AS progetto_colore
       FROM emails e
       LEFT JOIN stati_email s ON s.id = e.stato_id
       LEFT JOIN progetti p ON p.id = e.progetto_id
       WHERE e.id = ? AND e.utente_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!email) return res.status(404).json({ success: false, error: 'Email non trovata' });

    // Segna come letta
    if (!email.letta) {
      await update('UPDATE emails SET letta = 1 WHERE id = ?', [email.id]);
      email.letta = 1;
    }

    // Recupera il corpo
    const body = await fetchEmailBody(req.user.id, email.id);

    // Allegati (solo metadati)
    const attachments = await query(
      'SELECT id, filename, mime_type, size FROM email_attachments WHERE email_id = ?',
      [email.id]
    );

    res.json({ success: true, data: { ...email, ...body, attachments } });
  } catch (err) { next(err); }
});

// PATCH /api/emails/:id/stato
router.patch('/:id/stato', async (req, res, next) => {
  try {
    const { stato_id } = req.body;
    const email = await queryOne('SELECT * FROM emails WHERE id = ? AND utente_id = ?', [req.params.id, req.user.id]);
    if (!email) return res.status(404).json({ success: false, error: 'Email non trovata' });

    if (stato_id) {
      const stato = await queryOne('SELECT id FROM stati_email WHERE id = ? AND utente_id = ?', [stato_id, req.user.id]);
      if (!stato) return res.status(400).json({ success: false, error: 'Stato non valido' });
    }

    await insert(
      'INSERT INTO email_stato_log (email_id, utente_id, stato_da_id, stato_a_id) VALUES (?, ?, ?, ?)',
      [email.id, req.user.id, email.stato_id, stato_id || null]
    );

    await update('UPDATE emails SET stato_id = ? WHERE id = ?', [stato_id || null, email.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PATCH /api/emails/:id/progetto
router.patch('/:id/progetto', async (req, res, next) => {
  try {
    const { progetto_id } = req.body;
    const email = await queryOne('SELECT * FROM emails WHERE id = ? AND utente_id = ?', [req.params.id, req.user.id]);
    if (!email) return res.status(404).json({ success: false, error: 'Email non trovata' });

    if (progetto_id) {
      const progetto = await queryOne('SELECT id FROM progetti WHERE id = ? AND utente_id = ?', [progetto_id, req.user.id]);
      if (!progetto) return res.status(400).json({ success: false, error: 'Progetto non valido' });
    }

    await insert(
      'INSERT INTO email_stato_log (email_id, utente_id, progetto_da_id, progetto_a_id) VALUES (?, ?, ?, ?)',
      [email.id, req.user.id, email.progetto_id, progetto_id || null]
    );

    await update('UPDATE emails SET progetto_id = ? WHERE id = ?', [progetto_id || null, email.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PATCH /api/emails/:id/archivia
router.patch('/:id/archivia', async (req, res, next) => {
  try {
    const { archiviata } = req.body;
    const email = await queryOne('SELECT id FROM emails WHERE id = ? AND utente_id = ?', [req.params.id, req.user.id]);
    if (!email) return res.status(404).json({ success: false, error: 'Email non trovata' });
    await update('UPDATE emails SET archiviata = ? WHERE id = ?', [archiviata ? 1 : 0, email.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PATCH /api/emails/:id/nota
router.patch('/:id/nota', async (req, res, next) => {
  try {
    const { nota } = req.body;
    const email = await queryOne('SELECT id FROM emails WHERE id = ? AND utente_id = ?', [req.params.id, req.user.id]);
    if (!email) return res.status(404).json({ success: false, error: 'Email non trovata' });
    await update('UPDATE emails SET nota = ? WHERE id = ?', [nota || null, email.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/emails/send
router.post('/send', [
  body('destinatari').notEmpty(),
  body('oggetto').notEmpty(),
  body('corpo').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const config = await queryOne('SELECT * FROM config_email_utente WHERE utente_id = ?', [req.user.id]);
    if (!config) return res.status(400).json({ success: false, error: 'Configura prima la tua email' });

    const { destinatari, cc, oggetto, corpo, in_reply_to_id, progetto_id } = req.body;
    const smtpPass = decrypt(config.smtp_pass_enc);

    const transporter = nodemailer.createTransport({
      host: config.smtp_host, port: config.smtp_port, secure: !!config.smtp_secure,
      auth: { user: config.smtp_user, pass: smtpPass },
    });

    await transporter.sendMail({
      from: config.nome_display ? `${config.nome_display} <${config.smtp_user}>` : config.smtp_user,
      to: destinatari, cc: cc || undefined, subject: oggetto, html: corpo,
    });

    await insert(
      'INSERT INTO email_sent (utente_id, in_reply_to_id, progetto_id, destinatari, cc, oggetto, corpo) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, in_reply_to_id || null, progetto_id || null, destinatari, cc || null, oggetto, corpo]
    );

    res.json({ success: true, message: 'Email inviata' });
  } catch (err) { next(err); }
});

// POST /api/emails/sync
router.post('/sync', async (req, res, next) => {
  try {
    const result = await syncUserEmails(req.user.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

export default router;
