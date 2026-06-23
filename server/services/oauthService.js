import https from 'https';
import { queryOne, insert } from '../config/db.js';
import { createDefaultStati } from './statiService.js';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

export async function findOrCreateOAuthUser({ provider, providerId, email, nome, cognome, avatarUrl }) {
  let utente = await queryOne(
    `SELECT u.* FROM utenti u
     JOIN oauth_providers op ON op.utente_id = u.id
     WHERE op.provider = ? AND op.provider_id = ?`,
    [provider, providerId]
  );

  if (!utente && email) {
    utente = await queryOne('SELECT * FROM utenti WHERE email = ?', [email]);
    if (utente) {
      await insert(
        'INSERT IGNORE INTO oauth_providers (utente_id, provider, provider_id) VALUES (?, ?, ?)',
        [utente.id, provider, providerId]
      );
    }
  }

  if (!utente) {
    const utenteId = await insert(
      `INSERT INTO utenti (nome, cognome, email, email_verified, avatar_url)
       VALUES (?, ?, ?, 1, ?)`,
      [nome, cognome || '', email || '', avatarUrl || null]
    );
    await insert(
      'INSERT INTO oauth_providers (utente_id, provider, provider_id) VALUES (?, ?, ?)',
      [utenteId, provider, providerId]
    );
    await createDefaultStati(utenteId);
    utente = await queryOne('SELECT * FROM utenti WHERE id = ?', [utenteId]);
  }

  return utente;
}

export async function verifyGoogleToken(accessToken) {
  const data = await httpsGet(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
  if (!data.id) throw new Error('Token Google non valido');
  return {
    provider:   'google',
    providerId: data.id,
    email:      data.email,
    nome:       data.given_name || data.name?.split(' ')[0] || '',
    cognome:    data.family_name || data.name?.split(' ').slice(1).join(' ') || '',
    avatarUrl:  data.picture || null,
  };
}
