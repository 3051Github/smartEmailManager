import logger from '../utils/logger.js';

const APP_URL     = process.env.APP_URL         || 'http://localhost:5173';
const BREVO_KEY   = process.env.BREVO_API_KEY;
const SENDER_NAME = process.env.BREVO_SENDER_NAME  || 'Smart Email Manager';
const SENDER_MAIL = process.env.BREVO_SENDER_EMAIL || 'noreply@example.com';

async function sendViaBrevo({ to, toName, subject, html }) {
  if (!BREVO_KEY) throw new Error('BREVO_API_KEY non configurata nel file .env');

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key':      BREVO_KEY,
      'Content-Type': 'application/json',
      'Accept':       'application/json',
    },
    body: JSON.stringify({
      sender:      { name: SENDER_NAME, email: SENDER_MAIL },
      to:          [{ email: to, name: toName || to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Brevo API error ${res.status}`);
  }

  return res.json();
}

export async function sendVerificationEmail(email, nome, token) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  await sendViaBrevo({
    to:      email,
    toName:  nome,
    subject: 'Conferma il tuo account — Smart Email Manager',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#0d6efd;margin-bottom:8px">Smart Email Manager</h2>
        <p>Ciao <strong>${nome}</strong>,</p>
        <p>Grazie per esserti registrato! Clicca il bottone qui sotto per verificare il tuo indirizzo email e attivare l'account.</p>
        <p style="margin:28px 0">
          <a href="${url}"
             style="background:#0d6efd;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
            Verifica email
          </a>
        </p>
        <p style="color:#888;font-size:13px">Il link è valido per 24 ore.<br>Se non hai creato un account, ignora questa email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin-top:32px">
        <p style="color:#aaa;font-size:11px">Smart Email Manager · ${SENDER_MAIL}</p>
      </div>
    `,
  });
  logger.info(`[Brevo] Verification email → ${email}`);
}

export async function sendPasswordResetEmail(email, nome, token) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  await sendViaBrevo({
    to:      email,
    toName:  nome,
    subject: 'Reset password — Smart Email Manager',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#0d6efd;margin-bottom:8px">Smart Email Manager</h2>
        <p>Ciao <strong>${nome}</strong>,</p>
        <p>Hai richiesto il reset della password. Clicca il bottone qui sotto per impostarne una nuova.</p>
        <p style="margin:28px 0">
          <a href="${url}"
             style="background:#0d6efd;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
            Reset password
          </a>
        </p>
        <p style="color:#888;font-size:13px">Il link è valido per 1 ora.<br>Se non hai richiesto il reset, ignora questa email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin-top:32px">
        <p style="color:#aaa;font-size:11px">Smart Email Manager · ${SENDER_MAIL}</p>
      </div>
    `,
  });
  logger.info(`[Brevo] Password reset email → ${email}`);
}
