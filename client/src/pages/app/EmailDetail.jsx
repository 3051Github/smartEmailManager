import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { emailsApi, statiApi, progettiApi, clientiApi } from '../../services/api';

export default function EmailDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const iframeRef = useRef(null);

  const [email, setEmail] = useState(null);
  const [stati, setStati] = useState([]);
  const [progetti, setProgetti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nota, setNota] = useState('');
  const [notaSaving, setNotaSaving] = useState(false);

  // Modal nuovo progetto
  const [showProgettoModal, setShowProgettoModal] = useState(false);
  const [newProgetto, setNewProgetto] = useState({ nome: '', cliente_id: '', colore: '#0d6efd' });
  const [clienti, setClienti] = useState([]);

  useEffect(() => {
    Promise.all([
      emailsApi.get(id),
      statiApi.list(),
      progettiApi.list(),
    ]).then(([eRes, sRes, pRes]) => {
      setEmail(eRes.data.data);
      setNota(eRes.data.data.nota || '');
      setStati(sRes.data.data);
      setProgetti(pRes.data.data);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (email?.html) {
      const iframe = iframeRef.current;
      if (!iframe) return;
      const doc = iframe.contentDocument;
      doc.open();
      doc.write(email.html);
      doc.close();
      iframe.style.height = doc.body.scrollHeight + 40 + 'px';
    }
  }, [email]);

  const handleStato = async (stato_id) => {
    await emailsApi.setStato(id, stato_id || null);
    setEmail(e => ({ ...e, stato_id, stato_nome: stati.find(s => s.id == stato_id)?.nome }));
  };

  const handleProgetto = async (progetto_id) => {
    await emailsApi.setProgetto(id, progetto_id || null);
    const p = progetti.find(p => p.id == progetto_id);
    setEmail(e => ({ ...e, progetto_id, progetto_nome: p?.nome }));
  };

  const handleArchivia = async () => {
    const newVal = !email.archiviata;
    await emailsApi.archivia(id, newVal);
    setEmail(e => ({ ...e, archiviata: newVal }));
  };

  const saveNota = async () => {
    setNotaSaving(true);
    await emailsApi.setNota(id, nota).finally(() => setNotaSaving(false));
  };

  const handleNewProgetto = async () => {
    const { data } = await progettiApi.create(newProgetto);
    const created = data.data;
    setProgetti(p => [...p, created]);
    await handleProgetto(created.id);
    setShowProgettoModal(false);
    setNewProgetto({ nome: '', cliente_id: '', colore: '#0d6efd' });
  };

  const loadClienti = () => {
    clientiApi.list().then(r => setClienti(r.data.data)).catch(() => {});
    setShowProgettoModal(true);
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  if (!email) return <div className="alert alert-danger">Email non trovata</div>;

  const currentStato = stati.find(s => s.id == email.stato_id);

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left" />
        </button>
        <h6 className="mb-0 flex-grow-1 text-truncate fw-semibold">{email.oggetto}</h6>
        <button
          className={`btn btn-sm ${email.archiviata ? 'btn-secondary' : 'btn-outline-secondary'}`}
          onClick={handleArchivia}
          title={email.archiviata ? 'Ripristina' : 'Archivia'}
        >
          <i className={`bi bi-${email.archiviata ? 'inbox' : 'archive'}`} />
        </button>
      </div>

      <div className="row g-3">
        {/* Colonna email */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <div className="fw-semibold">{email.mittente_nome || email.mittente}</div>
                  <div className="small text-muted">{email.mittente}</div>
                  <div className="small text-muted">A: {email.destinatari}</div>
                  {email.cc && <div className="small text-muted">CC: {email.cc}</div>}
                </div>
                <div className="text-muted small flex-shrink-0 ms-2">
                  {new Date(email.ora_ricezione).toLocaleString('it-IT')}
                </div>
              </div>

              {email.attachments?.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {email.attachments.map(att => (
                    <span key={att.id} className="badge bg-light text-dark border">
                      <i className="bi bi-paperclip me-1" />
                      {att.filename}
                      <span className="ms-1 text-muted" style={{ fontSize: 10 }}>
                        ({Math.round(att.size / 1024)} KB)
                      </span>
                    </span>
                  ))}
                </div>
              )}

              <hr />

              {email.html ? (
                <iframe ref={iframeRef} className="email-body-frame" title="Corpo email" sandbox="allow-same-origin" />
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{email.text || '(nessun contenuto)'}</pre>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="card mt-3">
            <div className="card-body">
              <label className="form-label small fw-semibold">Note interne</label>
              <textarea className="form-control form-control-sm" rows={3} value={nota}
                onChange={e => setNota(e.target.value)} placeholder="Aggiungi una nota..." />
              <button className="btn btn-sm btn-outline-primary mt-2" onClick={saveNota} disabled={notaSaving}>
                {notaSaving ? 'Salvataggio...' : 'Salva nota'}
              </button>
            </div>
          </div>
        </div>

        {/* Colonna azioni */}
        <div className="col-lg-4">
          {/* Stato */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="fw-semibold small mb-2">Stato</div>
              <div className="d-flex flex-wrap gap-1">
                {stati.map(s => (
                  <button
                    key={s.id}
                    className={`btn btn-sm ${email.stato_id == s.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                    style={email.stato_id == s.id ? { background: s.colore, borderColor: s.colore } : {}}
                    onClick={() => handleStato(s.id)}
                  >
                    <i className={`bi bi-${s.icona || 'circle'} me-1`} />
                    {s.nome}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Progetto */}
          <div className="card">
            <div className="card-body">
              <div className="fw-semibold small mb-2">Progetto</div>
              <select
                className="form-select form-select-sm mb-2"
                value={email.progetto_id || ''}
                onChange={e => handleProgetto(e.target.value)}
              >
                <option value="">— Nessun progetto —</option>
                {progetti.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}{p.cliente_nome ? ` (${p.cliente_nome})` : ''}</option>
                ))}
              </select>
              <button className="btn btn-sm btn-outline-primary w-100" onClick={loadClienti}>
                <i className="bi bi-plus me-1" /> Nuovo progetto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal nuovo progetto */}
      {showProgettoModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Nuovo progetto</h6>
                <button className="btn-close" onClick={() => setShowProgettoModal(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Nome progetto *</label>
                  <input type="text" className="form-control form-control-sm" required
                    value={newProgetto.nome} onChange={e => setNewProgetto(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Cliente</label>
                  <select className="form-select form-select-sm"
                    value={newProgetto.cliente_id} onChange={e => setNewProgetto(p => ({ ...p, cliente_id: e.target.value }))}>
                    <option value="">— Nessun cliente —</option>
                    {clienti.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}{c.cognome ? ` ${c.cognome}` : ''}{c.ragione_sociale ? ` (${c.ragione_sociale})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">Colore</label>
                  <input type="color" className="form-control form-control-color"
                    value={newProgetto.colore} onChange={e => setNewProgetto(p => ({ ...p, colore: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowProgettoModal(false)}>Annulla</button>
                <button className="btn btn-primary btn-sm" onClick={handleNewProgetto} disabled={!newProgetto.nome}>
                  Crea e assegna
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
