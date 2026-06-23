import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { progettiApi, clientiApi } from '../../services/api';

const STATI = ['APERTO', 'IN_CORSO', 'COMPLETATO', 'ARCHIVIATO'];
const STATI_COLORS = { APERTO: '#0d6efd', IN_CORSO: '#fd7e14', COMPLETATO: '#198754', ARCHIVIATO: '#adb5bd' };

export default function Progetti() {
  const navigate = useNavigate();
  const [progetti, setProgetti] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: '', descrizione: '', cliente_id: '', colore: '#0d6efd', stato: 'APERTO', data_scadenza: '' });
  const [filtroStato, setFiltroStato] = useState('');

  const load = () => {
    const params = {};
    if (filtroStato) params.stato = filtroStato;
    progettiApi.list(params).then(r => setProgetti(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    clientiApi.list().then(r => setClienti(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [filtroStato]);

  const openModal = (progetto = null) => {
    setEditing(progetto);
    setForm(progetto ? {
      nome: progetto.nome, descrizione: progetto.descrizione || '', cliente_id: progetto.cliente_id || '',
      colore: progetto.colore || '#0d6efd', stato: progetto.stato, data_scadenza: progetto.data_scadenza || '',
    } : { nome: '', descrizione: '', cliente_id: '', colore: '#0d6efd', stato: 'APERTO', data_scadenza: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nome) return;
    if (editing) await progettiApi.update(editing.id, form);
    else await progettiApi.create(form);
    setShowModal(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare il progetto?')) return;
    await progettiApi.delete(id);
    load();
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0 fw-bold"><i className="bi bi-kanban me-2" />Progetti</h5>
        <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
          <i className="bi bi-plus me-1" /> Nuovo progetto
        </button>
      </div>

      <div className="d-flex gap-2 mb-3 flex-wrap">
        <button className={`btn btn-sm ${!filtroStato ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFiltroStato('')}>Tutti</button>
        {STATI.map(s => (
          <button key={s} className={`btn btn-sm ${filtroStato === s ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFiltroStato(s)}>{s}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : progetti.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-kanban display-4 d-block mb-2" />
          Nessun progetto
        </div>
      ) : (
        <div className="row g-3">
          {progetti.map(p => (
            <div key={p.id} className="col-md-6 col-lg-4">
              <div className="card h-100" style={{ borderTop: `3px solid ${p.colore}` }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <h6 className="mb-1 fw-semibold">{p.nome}</h6>
                    <div className="d-flex gap-1">
                      <button className="btn btn-sm btn-outline-secondary p-1" onClick={() => openModal(p)} title="Modifica">
                        <i className="bi bi-pencil" style={{ fontSize: 12 }} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger p-1" onClick={() => handleDelete(p.id)} title="Elimina">
                        <i className="bi bi-trash" style={{ fontSize: 12 }} />
                      </button>
                    </div>
                  </div>
                  {(p.cliente_nome || p.ragione_sociale) && (
                    <div className="small text-muted mb-1">
                      <i className="bi bi-person me-1" />
                      {p.cliente_nome} {p.ragione_sociale ? `(${p.ragione_sociale})` : ''}
                    </div>
                  )}
                  {p.descrizione && <p className="small text-muted mb-2">{p.descrizione}</p>}
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <span className="badge" style={{ background: STATI_COLORS[p.stato] + '22', color: STATI_COLORS[p.stato] }}>
                      {p.stato}
                    </span>
                    <span className="small text-muted">
                      <i className="bi bi-envelope me-1" />{p.email_count || 0}
                    </span>
                  </div>
                </div>
                <div className="card-footer bg-transparent border-0 pt-0">
                  <button className="btn btn-sm btn-outline-primary w-100" onClick={() => navigate(`/progetti/${p.id}`)}>
                    Apri
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">{editing ? 'Modifica progetto' : 'Nuovo progetto'}</h6>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Nome *</label>
                  <input type="text" className="form-control form-control-sm"
                    value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Descrizione</label>
                  <textarea className="form-control form-control-sm" rows={2}
                    value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Cliente</label>
                  <select className="form-select form-select-sm"
                    value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
                    <option value="">— Nessuno —</option>
                    {clienti.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}{c.cognome ? ` ${c.cognome}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="row g-2">
                  <div className="col">
                    <label className="form-label small fw-semibold">Stato</label>
                    <select className="form-select form-select-sm"
                      value={form.stato} onChange={e => setForm(f => ({ ...f, stato: e.target.value }))}>
                      {STATI.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-auto">
                    <label className="form-label small fw-semibold">Colore</label>
                    <input type="color" className="form-control form-control-color"
                      value={form.colore} onChange={e => setForm(f => ({ ...f, colore: e.target.value }))} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="form-label small fw-semibold">Data scadenza</label>
                  <input type="date" className="form-control form-control-sm"
                    value={form.data_scadenza} onChange={e => setForm(f => ({ ...f, data_scadenza: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowModal(false)}>Annulla</button>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!form.nome}>Salva</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
