import express from 'express';
import { body, validationResult } from 'express-validator';
import { query, queryOne, insert, update } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/clienti
router.get('/', async (req, res, next) => {
  try {
    const { q, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE utente_id = ? AND attivo = 1';
    const params = [req.user.id];

    if (q) {
      where += ' AND (nome LIKE ? OR cognome LIKE ? OR ragione_sociale LIKE ? OR email LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    const clienti = await query(
      `SELECT * FROM clienti ${where} ORDER BY nome ASC LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );
    const total = await queryOne(`SELECT COUNT(*) as c FROM clienti ${where}`, params);

    res.json({ success: true, data: clienti, total: total?.c || 0 });
  } catch (err) { next(err); }
});

// GET /api/clienti/:id
router.get('/:id', async (req, res, next) => {
  try {
    const cliente = await queryOne('SELECT * FROM clienti WHERE id = ? AND utente_id = ?', [req.params.id, req.user.id]);
    if (!cliente) return res.status(404).json({ success: false, error: 'Cliente non trovato' });
    res.json({ success: true, data: cliente });
  } catch (err) { next(err); }
});

// POST /api/clienti
router.post('/', [
  body('nome').trim().notEmpty().withMessage('Nome obbligatorio'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { nome, cognome, ragione_sociale, email, telefono, sito_web, indirizzo, citta, note } = req.body;
    const id = await insert(
      `INSERT INTO clienti (utente_id, nome, cognome, ragione_sociale, email, telefono, sito_web, indirizzo, citta, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, nome, cognome || null, ragione_sociale || null, email || null, telefono || null, sito_web || null, indirizzo || null, citta || null, note || null]
    );

    res.status(201).json({ success: true, data: await queryOne('SELECT * FROM clienti WHERE id = ?', [id]) });
  } catch (err) { next(err); }
});

// PUT /api/clienti/:id
router.put('/:id', [
  body('nome').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const cliente = await queryOne('SELECT id FROM clienti WHERE id = ? AND utente_id = ?', [req.params.id, req.user.id]);
    if (!cliente) return res.status(404).json({ success: false, error: 'Cliente non trovato' });

    const { nome, cognome, ragione_sociale, email, telefono, sito_web, indirizzo, citta, note } = req.body;
    await update(
      'UPDATE clienti SET nome=?, cognome=?, ragione_sociale=?, email=?, telefono=?, sito_web=?, indirizzo=?, citta=?, note=? WHERE id=?',
      [nome, cognome || null, ragione_sociale || null, email || null, telefono || null, sito_web || null, indirizzo || null, citta || null, note || null, cliente.id]
    );

    res.json({ success: true, data: await queryOne('SELECT * FROM clienti WHERE id = ?', [cliente.id]) });
  } catch (err) { next(err); }
});

// DELETE /api/clienti/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const cliente = await queryOne('SELECT id FROM clienti WHERE id = ? AND utente_id = ?', [req.params.id, req.user.id]);
    if (!cliente) return res.status(404).json({ success: false, error: 'Cliente non trovato' });
    await update('UPDATE clienti SET attivo = 0 WHERE id = ?', [cliente.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
