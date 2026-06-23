import express from 'express';
import { body, validationResult } from 'express-validator';
import { query, queryOne, insert, update } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/stati
router.get('/', async (req, res, next) => {
  try {
    const stati = await query(
      'SELECT * FROM stati_email WHERE utente_id = ? ORDER BY ordine ASC, id ASC',
      [req.user.id]
    );
    res.json({ success: true, data: stati });
  } catch (err) { next(err); }
});

// POST /api/stati
router.post('/', [
  body('nome').trim().notEmpty(),
  body('colore').matches(/^#[0-9a-fA-F]{6}$/),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { nome, colore, icona, is_archivio } = req.body;
    const maxOrdine = await queryOne(
      'SELECT COALESCE(MAX(ordine), 0) as m FROM stati_email WHERE utente_id = ?',
      [req.user.id]
    );

    const id = await insert(
      'INSERT INTO stati_email (utente_id, nome, colore, icona, ordine, is_archivio) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, nome, colore, icona || null, (maxOrdine?.m || 0) + 1, is_archivio ? 1 : 0]
    );

    const stato = await queryOne('SELECT * FROM stati_email WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: stato });
  } catch (err) { next(err); }
});

// PUT /api/stati/:id
router.put('/:id', [
  body('nome').trim().notEmpty(),
  body('colore').matches(/^#[0-9a-fA-F]{6}$/),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const stato = await queryOne('SELECT * FROM stati_email WHERE id = ? AND utente_id = ?', [req.params.id, req.user.id]);
    if (!stato) return res.status(404).json({ success: false, error: 'Stato non trovato' });

    const { nome, colore, icona, ordine, is_archivio } = req.body;
    await update(
      'UPDATE stati_email SET nome=?, colore=?, icona=?, ordine=?, is_archivio=? WHERE id=?',
      [nome, colore, icona || null, ordine ?? stato.ordine, is_archivio ? 1 : 0, stato.id]
    );

    res.json({ success: true, data: await queryOne('SELECT * FROM stati_email WHERE id = ?', [stato.id]) });
  } catch (err) { next(err); }
});

// DELETE /api/stati/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const stato = await queryOne('SELECT * FROM stati_email WHERE id = ? AND utente_id = ?', [req.params.id, req.user.id]);
    if (!stato) return res.status(404).json({ success: false, error: 'Stato non trovato' });
    if (stato.is_default) return res.status(400).json({ success: false, error: 'Non puoi eliminare lo stato di default' });

    const defaultStato = await queryOne('SELECT id FROM stati_email WHERE utente_id = ? AND is_default = 1', [req.user.id]);
    if (defaultStato) {
      await update('UPDATE emails SET stato_id = ? WHERE stato_id = ? AND utente_id = ?', [defaultStato.id, stato.id, req.user.id]);
    }

    await update('DELETE FROM stati_email WHERE id = ?', [stato.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
