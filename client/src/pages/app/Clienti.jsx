import { useState, useEffect } from 'react';
import { clientiApi } from '../../services/api';

export default function Clienti() {
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: '', cognome: '', ragione_sociale: '', email: '', telefono: '', sito_web: '', indirizzo: '', citta: '', note: '' });

  const load = () => {
    const params = q ? { q } : {};
    clientiApi.list(params).then(r => setClienti(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [q]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const openModal = (cliente = null) => {
    setEditing(cliente);
    setForm(cliente ? {
      nome: cliente.nome || '', cognome: cliente.cognome || '', ragione_sociale: cliente.ragione_sociale || '',
      email: cliente.email || '', telefono: cliente.telefono || '', sito_web: cliente.sito_web || '',
      indirizzo: cliente.indirizzo || '', citta: cliente.citta || '', note: cliente.note || '',
    } : { nome: '', cognome: '', ragione_sociale: '', email: '', telefono: '', sito_web: '', indirizzo: '', citta: '', note: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nome) return;
    if (editing) await clientiApi.update(editing.id, form);
    else await clientiApi.create(form);
    setShowModal(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare il cliente?')) return;
    await clientiApi.delete(id);
    load();
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0 fw-bold"><i className="bi bi-people me-2" />Clienti</h5>
        <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
          <i className="bi bi-plus me-1" /> Nuovo cliente
        </button>
      </div>

      <div className="mb-3">
        <div className="input-group input-group-sm">
          <span className="input-group-text"><i className="bi bi-search" /></span>
          <input type="text" className="form-control" placeholder="Cerca cliente..."
            value={q} onChange={e => setQ(e.target.value)} />
          {q && <button className="btn btn-outline-secondary" onClick={() => setQ('')}><i className="bi bi-x" /></button>}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : clienti.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-people display-4 d-block mb-2" />
          {q ? 'Nessun cliente trovato' : 'Nessun cliente ancora'}
        </div>
      ) : (
        <div className="card">
          <div className="list-group list-group-flush">
            {clienti.map(c => (
              <div key={c.id} className="list-group-item d-flex align-items-center gap-3">
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0"
                     style={{ width: 38, height: 38, fontSize: 14 }}>
                  {c.nome?.[0]}{c.cognome?.[0] || ''}
                </div>
                <div className="flex-grow-1">
                  <div className="fw-semibold">{c.nome} {c.cognome || ''}</div>
                  {c.ragione_sociale && <div className="small text-muted">{c.ragione_sociale}</div>}
                  <div className="d-flex gap-3 small text-muted mt-1 flex-wrap">
                    {c.email && <span><i className="bi bi-envelope me-1" />{c.email}</span>}
                    {c.telefono && <span><i className="bi bi-telephone me-1" />{c.telefono}</span>}
                    {c.citta && <span><i className="bi bi-geo-alt me-1" />{c.citta}</span>}
                  </div>
                </div>
                <div className="d-flex gap-1">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => openModal(c)}>
                    <i className="bi bi-pencil" style={{ fontSize: 12 }} />
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.id)}>
                    <i className="bi bi-trash" style={{ fontSize: 12 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">{editing ? 'Modifica cliente' : 'Nuovo cliente'}</h6>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-2 mb-3">
                  <div className="col">
                    <label className="form-label small fw-semibold">Nome *</label>
                    <input type="text" className="form-control form-control-sm" value={form.nome} onChange={set('nome')} />
                  </div>
                  <div className="col">
                    <label className="form-label small fw-semibold">Cognome</label>
                    <input type="text" className="form-control form-control-sm" value={form.cognome} onChange={set('cognome')} />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Ragione sociale</label>
                  <input type="text" className="form-control form-control-sm" value={form.ragione_sociale} onChange={set('ragione_sociale')} />
                </div>
                <div className="row g-2 mb-3">
                  <div className="col">
                    <label className="form-label small fw-semibold">Email</label>
                    <input type="email" className="form-control form-control-sm" value={form.email} onChange={set('email')} />
                  </div>
                  <div className="col">
                    <label className="form-label small fw-semibold">Telefono</label>
                    <input type="text" className="form-control form-control-sm" value={form.telefono} onChange={set('telefono')} />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Sito web</label>
                  <input type="url" className="form-control form-control-sm" value={form.sito_web} onChange={set('sito_web')} />
                </div>
                <div className="row g-2 mb-3">
                  <div className="col">
                    <label className="form-label small fw-semibold">Indirizzo</label>
                    <input type="text" className="form-control form-control-sm" value={form.indirizzo} onChange={set('indirizzo')} />
                  </div>
                  <div className="col">
                    <label className="form-label small fw-semibold">Città</label>
                    <input type="text" className="form-control form-control-sm" value={form.citta} onChange={set('citta')} />
                  </div>
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">Note</label>
                  <textarea className="form-control form-control-sm" rows={2} value={form.note} onChange={set('note')} />
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
