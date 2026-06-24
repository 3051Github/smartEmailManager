import { useState, useEffect } from 'react';
import { meApi, statiApi, authApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const BREVO_KEY_SET = !!import.meta.env.VITE_BREVO_CONFIGURED;

export default function Impostazioni() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('email');

  // Config email
  const [config, setConfig] = useState(null);
  const [emailForm, setEmailForm] = useState({
    nome_display: '', email_address: '',
    imap_host: '', imap_port: 993, imap_secure: true, imap_user: '', imap_pass: '',
    smtp_host: '', smtp_port: 587, smtp_secure: false, smtp_user: '', smtp_pass: '',
    sync_interval_min: 5,
  });
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testingBrevo, setTestingBrevo] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState(null);

  // Stati
  const [stati, setStati] = useState([]);
  const [statiLoading, setStatiLoading] = useState(false);
  const [newStato, setNewStato] = useState({ nome: '', colore: '#0d6efd', icona: '', is_archivio: false });
  const [statiMsg, setStatiMsg] = useState(null);

  useEffect(() => {
    meApi.getConfigEmail().then(r => {
      if (r.data.data) {
        setConfig(r.data.data);
        setEmailForm(f => ({ ...f, ...r.data.data, imap_pass: '', smtp_pass: '' }));
      }
    }).catch(() => {});
    statiApi.list().then(r => setStati(r.data.data)).catch(() => {});
  }, []);

  const setEF = k => e => setEmailForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const saveEmail = async e => {
    e.preventDefault();
    setEmailSaving(true); setEmailMsg(null);
    try {
      await meApi.saveConfigEmail(emailForm);
      setEmailMsg({ type: 'success', text: 'Configurazione salvata!' });
      refreshUser();
    } catch (err) {
      setEmailMsg({ type: 'danger', text: err.response?.data?.error || 'Errore durante il salvataggio' });
    } finally {
      setEmailSaving(false);
    }
  };

  const testBrevo = async () => {
    setTestingBrevo(true); setEmailMsg(null);
    try {
      const { data } = await meApi.testBrevo();
      setEmailMsg({ type: 'success', text: `✓ Brevo OK — ${data.message}` });
    } catch (err) {
      setEmailMsg({ type: 'danger', text: `Brevo: ${err.response?.data?.error || 'Errore sconosciuto'}` });
    } finally {
      setTestingBrevo(false);
    }
  };

  const testConnection = async () => {
    setTesting(true); setEmailMsg(null);
    try {
      // Passa i valori correnti del form — la password live è disponibile solo se l'utente l'ha inserita
      const payload = {
        imap_host:   emailForm.imap_host,
        imap_port:   emailForm.imap_port,
        imap_secure: emailForm.imap_secure,
        imap_user:   emailForm.imap_user,
        imap_pass:   emailForm.imap_pass || undefined,
      };
      const { data } = await meApi.testConfigEmail(payload);
      setEmailMsg({ type: 'success', text: data.message });
    } catch (err) {
      setEmailMsg({ type: 'danger', text: err.response?.data?.error || 'Connessione fallita' });
    } finally {
      setTesting(false);
    }
  };

  const addStato = async () => {
    if (!newStato.nome) return;
    setStatiLoading(true); setStatiMsg(null);
    try {
      await statiApi.create(newStato);
      const r = await statiApi.list();
      setStati(r.data.data);
      setNewStato({ nome: '', colore: '#0d6efd', icona: '', is_archivio: false });
      setStatiMsg({ type: 'success', text: 'Stato aggiunto!' });
    } catch (err) {
      setStatiMsg({ type: 'danger', text: err.response?.data?.error || 'Errore' });
    } finally {
      setStatiLoading(false);
    }
  };

  const deleteStato = async (id) => {
    if (!confirm('Eliminare lo stato?')) return;
    await statiApi.delete(id);
    setStati(s => s.filter(x => x.id !== id));
  };

  const ICONS = ['envelope', 'hourglass-split', 'clock', 'check-circle', 'archive', 'star', 'flag', 'bookmark', 'lightning', 'exclamation-circle'];

  return (
    <div>
      <h5 className="fw-bold mb-4"><i className="bi bi-gear me-2" />Impostazioni</h5>

      {!user?.email_verified && (
        <div className="alert alert-warning mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span>
            <i className="bi bi-exclamation-triangle me-2" />
            Email non verificata. Controlla la tua casella di posta.
            {resendMsg && (
              <span className={`ms-2 small fw-semibold text-${resendMsg.type === 'success' ? 'success' : 'danger'}`}>
                {resendMsg.text}
              </span>
            )}
          </span>
          <button
            className="btn btn-sm btn-warning"
            disabled={resending}
            onClick={async () => {
              setResending(true); setResendMsg(null);
              try {
                await authApi.resendVerification();
                setResendMsg({ type: 'success', text: 'Email inviata!' });
              } catch (err) {
                setResendMsg({ type: 'danger', text: err.response?.data?.error || 'Errore invio' });
              } finally {
                setResending(false);
              }
            }}
          >
            {resending
              ? <><span className="spinner-border spinner-border-sm me-1" />Invio...</>
              : <><i className="bi bi-envelope-arrow-up me-1" />Reinvia verifica</>}
          </button>
        </div>
      )}

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${tab === 'email' ? 'active' : ''}`} onClick={() => setTab('email')}>
            <i className="bi bi-envelope-at me-1" /> Configurazione email
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'stati' ? 'active' : ''}`} onClick={() => setTab('stati')}>
            <i className="bi bi-tags me-1" /> Stati email
          </button>
        </li>
      </ul>

      {/* Tab: config email */}
      {tab === 'email' && (
        <div style={{ maxWidth: 600 }}>
          {emailMsg && (
            <div className={`alert alert-${emailMsg.type} py-2 small`}>{emailMsg.text}</div>
          )}
          <form onSubmit={saveEmail}>
            <div className="card mb-3">
              <div className="card-header fw-semibold small">Identità mittente</div>
              <div className="card-body">
                <div className="row g-2">
                  <div className="col">
                    <label className="form-label small fw-semibold">Nome display</label>
                    <input type="text" className="form-control form-control-sm" value={emailForm.nome_display} onChange={setEF('nome_display')} placeholder="Mario Rossi" />
                  </div>
                  <div className="col">
                    <label className="form-label small fw-semibold">Indirizzo email *</label>
                    <input type="email" className="form-control form-control-sm" required value={emailForm.email_address} onChange={setEF('email_address')} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card mb-3">
              <div className="card-header fw-semibold small">IMAP (ricezione)</div>
              <div className="card-body">
                <div className="row g-2 mb-2">
                  <div className="col">
                    <label className="form-label small fw-semibold">Host *</label>
                    <input type="text" className="form-control form-control-sm" required value={emailForm.imap_host} onChange={setEF('imap_host')} placeholder="imap.gmail.com" />
                  </div>
                  <div className="col-3">
                    <label className="form-label small fw-semibold">Porta</label>
                    <input type="number" className="form-control form-control-sm" value={emailForm.imap_port} onChange={setEF('imap_port')} />
                  </div>
                  <div className="col-auto d-flex align-items-end pb-1">
                    <div className="form-check">
                      <input type="checkbox" className="form-check-input" id="imapSecure"
                        checked={!!emailForm.imap_secure} onChange={setEF('imap_secure')} />
                      <label className="form-check-label small" htmlFor="imapSecure">SSL</label>
                    </div>
                  </div>
                </div>
                <div className="row g-2">
                  <div className="col">
                    <label className="form-label small fw-semibold">Utente *</label>
                    <input type="text" className="form-control form-control-sm" required value={emailForm.imap_user} onChange={setEF('imap_user')} />
                  </div>
                  <div className="col">
                    <label className="form-label small fw-semibold">Password {config ? '(lascia vuoto per non cambiare)' : '*'}</label>
                    <input type="password" className="form-control form-control-sm" required={!config} value={emailForm.imap_pass} onChange={setEF('imap_pass')} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card mb-3">
              <div className="card-header fw-semibold small">SMTP (invio)</div>
              <div className="card-body">
                <div className="row g-2 mb-2">
                  <div className="col">
                    <label className="form-label small fw-semibold">Host *</label>
                    <input type="text" className="form-control form-control-sm" required value={emailForm.smtp_host} onChange={setEF('smtp_host')} placeholder="smtp.gmail.com" />
                  </div>
                  <div className="col-3">
                    <label className="form-label small fw-semibold">Porta</label>
                    <input type="number" className="form-control form-control-sm" value={emailForm.smtp_port} onChange={setEF('smtp_port')} />
                  </div>
                  <div className="col-auto d-flex align-items-end pb-1">
                    <div className="form-check">
                      <input type="checkbox" className="form-check-input" id="smtpSecure"
                        checked={!!emailForm.smtp_secure} onChange={setEF('smtp_secure')} />
                      <label className="form-check-label small" htmlFor="smtpSecure">SSL</label>
                    </div>
                  </div>
                </div>
                <div className="row g-2">
                  <div className="col">
                    <label className="form-label small fw-semibold">Utente *</label>
                    <input type="text" className="form-control form-control-sm" required value={emailForm.smtp_user} onChange={setEF('smtp_user')} />
                  </div>
                  <div className="col">
                    <label className="form-label small fw-semibold">Password {config ? '(lascia vuoto per non cambiare)' : '*'}</label>
                    <input type="password" className="form-control form-control-sm" required={!config} value={emailForm.smtp_pass} onChange={setEF('smtp_pass')} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold">Intervallo sync (minuti)</label>
              <input type="number" className="form-control form-control-sm" style={{ maxWidth: 100 }}
                min={1} max={60} value={emailForm.sync_interval_min} onChange={setEF('sync_interval_min')} />
            </div>

            <div className="d-flex gap-2 flex-wrap">
              <button type="submit" className="btn btn-primary btn-sm" disabled={emailSaving}>
                {emailSaving ? <><span className="spinner-border spinner-border-sm me-1" />Salvataggio...</> : 'Salva configurazione'}
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={testConnection}
                disabled={testing || !emailForm.imap_host || !emailForm.imap_user}
                title="Testa la connessione IMAP con i valori inseriti">
                {testing
                  ? <><span className="spinner-border spinner-border-sm me-1" />Test IMAP...</>
                  : <><i className="bi bi-plug me-1" />Testa IMAP</>}
              </button>
              <button type="button" className="btn btn-outline-info btn-sm" onClick={testBrevo}
                disabled={testingBrevo}
                title="Invia un'email di prova tramite Brevo al tuo indirizzo">
                {testingBrevo
                  ? <><span className="spinner-border spinner-border-sm me-1" />Invio...</>
                  : <><i className="bi bi-send me-1" />Test Brevo</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: stati */}
      {tab === 'stati' && (
        <div style={{ maxWidth: 600 }}>
          {statiMsg && <div className={`alert alert-${statiMsg.type} py-2 small`}>{statiMsg.text}</div>}

          <div className="card mb-3">
            <div className="card-header fw-semibold small">Stati attuali</div>
            <div className="list-group list-group-flush">
              {stati.map(s => (
                <div key={s.id} className="list-group-item d-flex align-items-center gap-2">
                  <span className="rounded-circle d-inline-block flex-shrink-0" style={{ width: 12, height: 12, background: s.colore }} />
                  <i className={`bi bi-${s.icona || 'circle'} text-muted`} style={{ fontSize: 13 }} />
                  <span className="flex-grow-1">{s.nome}</span>
                  {s.is_default ? <span className="badge bg-secondary" style={{ fontSize: 10 }}>default</span> : null}
                  {s.is_archivio ? <span className="badge bg-light text-dark" style={{ fontSize: 10 }}>archivio</span> : null}
                  {!s.is_default && (
                    <button className="btn btn-sm btn-outline-danger p-1" onClick={() => deleteStato(s.id)}>
                      <i className="bi bi-trash" style={{ fontSize: 12 }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header fw-semibold small">Aggiungi stato</div>
            <div className="card-body">
              <div className="row g-2 mb-2">
                <div className="col">
                  <label className="form-label small fw-semibold">Nome *</label>
                  <input type="text" className="form-control form-control-sm"
                    value={newStato.nome} onChange={e => setNewStato(s => ({ ...s, nome: e.target.value }))} />
                </div>
                <div className="col-auto">
                  <label className="form-label small fw-semibold">Colore</label>
                  <input type="color" className="form-control form-control-color"
                    value={newStato.colore} onChange={e => setNewStato(s => ({ ...s, colore: e.target.value }))} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Icona</label>
                <div className="d-flex flex-wrap gap-2">
                  {ICONS.map(icon => (
                    <button key={icon} type="button"
                      className={`btn btn-sm ${newStato.icona === icon ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setNewStato(s => ({ ...s, icona: icon }))}
                      title={icon}
                    >
                      <i className={`bi bi-${icon}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-check mb-3">
                <input type="checkbox" className="form-check-input" id="isArchivio"
                  checked={!!newStato.is_archivio} onChange={e => setNewStato(s => ({ ...s, is_archivio: e.target.checked }))} />
                <label className="form-check-label small" htmlFor="isArchivio">Comportamento archivio (nasconde dalla inbox principale)</label>
              </div>
              <button className="btn btn-primary btn-sm" onClick={addStato} disabled={statiLoading || !newStato.nome}>
                {statiLoading ? 'Aggiunta...' : 'Aggiungi stato'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
