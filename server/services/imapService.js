import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { query, queryOne, insert, update } from '../config/db.js';
import { decrypt } from '../utils/crypto.js';
import { notifyUser } from './socketService.js';
import logger from '../utils/logger.js';

const activeConnections = new Map();

async function getConfig(utenteId) {
  return queryOne(
    'SELECT * FROM config_email_utente WHERE utente_id = ? AND attiva = 1',
    [utenteId]
  );
}

async function getOrCreateSyncState(utenteId, folder = 'INBOX') {
  const state = await queryOne(
    'SELECT * FROM imap_sync_state WHERE utente_id = ? AND folder = ?',
    [utenteId, folder]
  );
  if (!state) {
    await insert(
      'INSERT INTO imap_sync_state (utente_id, folder, last_uid) VALUES (?, ?, 0)',
      [utenteId, folder]
    );
    return { last_uid: 0 };
  }
  return state;
}

export async function syncUserEmails(utenteId) {
  const config = await getConfig(utenteId);
  if (!config) return { synced: 0, skipped: 0 };

  const key = `${utenteId}`;
  if (activeConnections.get(key)) return { synced: 0, skipped: 0, reason: 'already_running' };

  activeConnections.set(key, true);
  let synced = 0;
  let client = null;

  try {
    await update(
      'UPDATE imap_sync_state SET sync_status = ? WHERE utente_id = ? AND folder = ?',
      ['RUNNING', utenteId, 'INBOX']
    );

    const password = decrypt(config.imap_pass_enc);
    client = new ImapFlow({
      host:   config.imap_host,
      port:   config.imap_port,
      secure: !!config.imap_secure,
      auth: { user: config.imap_user, pass: password },
      logger: false,
    });

    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    const state = await getOrCreateSyncState(utenteId, 'INBOX');
    const since = state.last_uid || 1;

    let maxUid = state.last_uid || 0;

    for await (const msg of client.fetch({ uid: `${since}:*` }, { envelope: true, uid: true, flags: true, bodyStructure: true })) {
      if (msg.uid <= (state.last_uid || 0)) continue;

      const exists = await queryOne(
        'SELECT id FROM emails WHERE utente_id = ? AND imap_uid = ? AND imap_folder = ?',
        [utenteId, msg.uid, 'INBOX']
      );
      if (exists) { if (msg.uid > maxUid) maxUid = msg.uid; continue; }

      const env = msg.envelope;
      const mittente = env.from?.[0]?.address || '';
      const mittentNome = env.from?.[0]?.name || null;
      const destinatari = env.to?.map(a => a.address).join(', ') || null;
      const cc = env.cc?.map(a => a.address).join(', ') || null;

      const statoDefault = await queryOne(
        'SELECT id FROM stati_email WHERE utente_id = ? AND is_default = 1 ORDER BY ordine ASC LIMIT 1',
        [utenteId]
      );

      await insert(
        `INSERT INTO emails
          (utente_id, imap_uid, imap_message_id, imap_folder, mittente, mittente_nome, destinatari, cc, oggetto, ora_ricezione, has_attachments, letta, stato_id)
         VALUES (?, ?, ?, 'INBOX', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          utenteId, msg.uid, env.messageId || null, mittente, mittentNome,
          destinatari, cc,
          env.subject || '(senza oggetto)',
          env.date ? new Date(env.date) : new Date(),
          msg.bodyStructure?.childNodes?.length > 0 ? 1 : 0,
          msg.flags?.has('\\Seen') ? 1 : 0,
          statoDefault?.id || null,
        ]
      );

      if (msg.uid > maxUid) maxUid = msg.uid;
      synced++;
    }

    lock.release();
    await client.logout();

    if (maxUid > (state.last_uid || 0)) {
      await update(
        'UPDATE imap_sync_state SET last_uid = ?, last_sync = NOW(), sync_status = ?, error_msg = NULL WHERE utente_id = ? AND folder = ?',
        [maxUid, 'OK', utenteId, 'INBOX']
      );
    } else {
      await update(
        'UPDATE imap_sync_state SET last_sync = NOW(), sync_status = ? WHERE utente_id = ? AND folder = ?',
        ['OK', utenteId, 'INBOX']
      );
    }

    if (synced > 0) {
      notifyUser(utenteId, 'email:new', { count: synced });
    }

    return { synced };
  } catch (err) {
    logger.error(`IMAP sync error for user ${utenteId}: ${err.message}`);
    await update(
      'UPDATE imap_sync_state SET sync_status = ?, error_msg = ? WHERE utente_id = ? AND folder = ?',
      ['ERROR', err.message, utenteId, 'INBOX']
    ).catch(() => {});
    return { synced: 0, error: err.message };
  } finally {
    activeConnections.delete(key);
    try { if (client) await client.logout(); } catch {}
  }
}

export async function syncAllUsers() {
  const utenti = await query(
    `SELECT c.utente_id, c.sync_interval_min,
            COALESCE(s.last_sync, '2000-01-01') AS last_sync,
            s.sync_status
     FROM config_email_utente c
     LEFT JOIN imap_sync_state s ON s.utente_id = c.utente_id AND s.folder = 'INBOX'
     WHERE c.attiva = 1`
  );

  for (const u of utenti) {
    if (u.sync_status === 'RUNNING') continue;
    const minutesSinceLast = (Date.now() - new Date(u.last_sync).getTime()) / 60000;
    if (minutesSinceLast >= u.sync_interval_min) {
      syncUserEmails(u.utente_id).catch(err =>
        logger.error(`Cron sync user ${u.utente_id}: ${err.message}`)
      );
    }
  }
}

export async function fetchEmailBody(utenteId, emailId) {
  const email = await queryOne(
    'SELECT * FROM emails WHERE id = ? AND utente_id = ?',
    [emailId, utenteId]
  );
  if (!email) throw Object.assign(new Error('Email non trovata'), { status: 404 });

  if (email.body_cached_at) return { text: email.body_text_cache, html: email.body_html_cache };

  const config = await getConfig(utenteId);
  if (!config) throw Object.assign(new Error('Config email non trovata'), { status: 400 });

  const password = decrypt(config.imap_pass_enc);
  const client = new ImapFlow({
    host:   config.imap_host,
    port:   config.imap_port,
    secure: !!config.imap_secure,
    auth: { user: config.imap_user, pass: password },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(email.imap_folder);
    const msg = await client.fetchOne(String(email.imap_uid), { source: true }, { uid: true });
    lock.release();
    await client.logout();

    if (!msg?.source) return { text: null, html: null };

    const parsed = await simpleParser(msg.source);
    await update(
      'UPDATE emails SET body_text_cache = ?, body_html_cache = ?, body_cached_at = NOW() WHERE id = ?',
      [parsed.text || null, parsed.html || null, emailId]
    );

    return { text: parsed.text || null, html: parsed.html || null };
  } catch (err) {
    try { await client.logout(); } catch {}
    throw err;
  }
}
