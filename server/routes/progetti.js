import express from 'express';
import { body, validationResult } from 'express-validator';
import { query, queryOne, insert, update } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/progetti
router.get('/', async (req, res, next) => {
  try {
    const { stato, cliente_id, q } = req.query;
    let where = 'WHERE p.utente_id = ? AND p.attivo = 1';
    const params = [req.user.id];

    if (stato) { where += ' AND p.stato = ?'; params.push(stato); }
    if (cliente_id) { where += ' AND p.cliente_id = ?'; params.push(cliente_id); }
    if (q) { where += ' AND p.nome LIKE ?'; params.push(`%${q}%`); }

    const progetti = await query(
      `SELECT p.*, c.nome AS cliente_nome, c.cognome AS cliente_cognome, c.ragione_sociale,
              (SELECT COUNT(*) FROM emails e WHERE e.progetto_id = p.id) AS email_count
       FROM progetti p
       LEFT JOIN clienti c ON c.id = p.cliente_id
       ${where}
       ORDER BY p.created_at DESC`,
      params
    );

    res.json({ success: true, data: progetti });
  } catch (err) { next(err); }
});

// GET /api/progetti/:id
router.get('/:id', async (req, res, next) => {
  try {
    const progetto = await queryOne(
      `SELECT p.*, c.nome AS cliente_nome, c.cognome AS cliente_cognome, c.ragione_sociale, c.email AS cliente_email, c.telefono AS cliente_telefono
       FROM progetti p LEFT JOIN clienti c ON c.id = p.cliente_id
       WHERE p.id = ? AND p.utente_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!progetto) return res.status(404).json({ success: false, error: 'Progetto non trovato' });

    const emails = await query(
      `SELECT e.id, e.mittente, e.mittente_nome, e.oggetto, e.ora_ricezione, e.letta, s.nome AS stato_nome, s.colore AS stato_colore
       FROM emails e LEFT JOIN stati_email s ON s.id = e.stato_id
       WHERE e.progetto_id = ? AND e.utente_id = ? AND e.archiviata = 0
       ORDER BY e.ora_ricezione DESC LIMIT 50`,
      [req.params.id, req.user.id]
    );

    res.json({ success: true, data: { ...progetto, emails } });
  } catch (err) { next(err); }
});

// POST /api/progetti
router.post('/', [
  body('nome').trim().notEmpty().withMessage('Nome obbligatorio'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { nome, descrizione, cliente_id, colore, stato, data_scadenza } = req.body;

    if (cliente_id) {
      const cli = await queryOne('SELECT id FROM clienti WHERE id = ? AND utente_id = ?', [cliente_id, req.user.id]);
      if (!cli) return res.status(400).json({ success: false, error: 'Cliente non trovato' });
    }

    const id = await insert(
      `INSERT INTO progetti (utente_id, cliente_id, nome, descrizione, colore, stato, data_scadenza)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, cliente_id || null, nome, descrizione || null, colore || '#0d6efd', stato || 'APERTO', data_scadenza || null]
    );

    res.status(201).json({ success: true, data: await queryOne('SELECT * FROM progetti WHERE id = ?', [id]) });
  } catch (err) { next(err); }
});

// PUT /api/progetti/:id
router.put('/:id', [
  body('nome').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const progetto = await queryOne('SELECT id FROM progetti WHERE id = ? AND utente_id = ?', [req.params.id, req.user.id]);
    if (!progetto) return res.status(404).json({ success: false, error: 'Progetto non trovato' });

    const { nome, descrizione, cliente_id, colore, stato, data_scadenza } = req.body;
    await update(
      'UPDATE progetti SET nome=?, descrizione=?, cliente_id=?, colore=?, stato=?, data_scadenza=? WHERE id=?',
      [nome, descrizione || null, cliente_id || null, colore || '#0d6efd', stato || 'APERTO', data_scadenza || null, progetto.id]
    );

    res.json({ success: true, data: await queryOne('SELECT * FROM progetti WHERE id = ?', [progetto.id]) });
  } catch (err) { next(err); }
});

// DELETE /api/progetti/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const progetto = await queryOne('SELECT id FROM progetti WHERE id = ? AND utente_id = ?', [req.params.id, req.user.id]);
    if (!progetto) return res.status(404).json({ success: false, error: 'Progetto non trovato' });
    await update('UPDATE progetti SET attivo = 0 WHERE id = ?', [progetto.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
