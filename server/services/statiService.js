import { insert } from '../config/db.js';

const STATI_DEFAULT = [
  { nome: 'Nuova',          colore: '#6c757d', icona: 'envelope',          ordine: 0, is_default: 1, is_archivio: 0 },
  { nome: 'In lavorazione', colore: '#0d6efd', icona: 'hourglass-split',   ordine: 1, is_default: 0, is_archivio: 0 },
  { nome: 'In attesa',      colore: '#fd7e14', icona: 'clock',              ordine: 2, is_default: 0, is_archivio: 0 },
  { nome: 'Fatto',          colore: '#198754', icona: 'check-circle',       ordine: 3, is_default: 0, is_archivio: 0 },
  { nome: 'Archiviata',     colore: '#adb5bd', icona: 'archive',            ordine: 4, is_default: 0, is_archivio: 1 },
];

export async function createDefaultStati(utenteId) {
  for (const s of STATI_DEFAULT) {
    await insert(
      `INSERT IGNORE INTO stati_email (utente_id, nome, colore, icona, ordine, is_default, is_archivio)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [utenteId, s.nome, s.colore, s.icona, s.ordine, s.is_default, s.is_archivio]
    );
  }
}
