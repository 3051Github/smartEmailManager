import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { emailsApi, statiApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function StatoBadge({ nome, colore, icona }) {
  return (
    <span className="stato-badge" style={{ background: colore + '22', color: colore }}>
      {icona && <i className={`bi bi-${icona}`} />}
      {nome}
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [emails, setEmails] = useState([]);
  const [total, setTotal] = useState(0);
  const [stati, setStati] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const statoId = searchParams.get('stato_id') || '';
  const archiviata = searchParams.get('archiviata') || '0';

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50, archiviata };
      if (statoId) params.stato_id = statoId;
      if (q) params.q = q;
      const { data } = await emailsApi.list(params);
      setEmails(data.data);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [statoId, archiviata, q, page]);

  useEffect(() => {
    statiApi.list().then(r => setStati(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data } = await emailsApi.sync();
      if (data.data?.synced > 0) fetchEmails();
    } finally {
      setSyncing(false);
    }
  };

  const hasFocus = (email) => !email.letta;
  const LIMIT = 50;
  const totalPages = Math.ceil(total / LIMIT);

  const currentStato = stati.find(s => s.id == statoId);

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h5 className="mb-0 fw-bold">
            {currentStato ? (
              <><i className={`bi bi-${currentStato.icona || 'circle'} me-2`} style={{ color: currentStato.colore }} />{currentStato.nome}</>
            ) : archiviata === '1' ? (
              <><i className="bi bi-archive me-2" />Archivio</>
            ) : (
              <><i className="bi bi-inbox me-2" />Inbox</>
            )}
          </h5>
          <small className="text-muted">{total} email</small>
        </div>
        <div className="d-flex gap-2">
          {!user?.has_email_config && (
            <button className="btn btn-warning btn-sm" onClick={() => navigate('/impostazioni')}>
              <i className="bi bi-gear me-1" /> Configura email
            </button>
          )}
          <button className="btn btn-outline-secondary btn-sm" onClick={handleSync} disabled={syncing}>
            <i className={`bi bi-arrow-repeat me-1 ${syncing ? 'spin' : ''}`} />
            {syncing ? 'Sync...' : 'Sincronizza'}
          </button>
        </div>
      </div>

      {/* Filtri tab */}
      <div className="d-flex gap-1 mb-3 flex-wrap">
        <button
          className={`btn btn-sm ${!statoId && archiviata === '0' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => { setSearchParams({}); setPage(1); }}
        >Tutte</button>
        {stati.filter(s => !s.is_archivio).map(s => (
          <button
            key={s.id}
            className={`btn btn-sm ${statoId == s.id ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => { setSearchParams({ stato_id: s.id }); setPage(1); }}
          >
            <i className={`bi bi-${s.icona || 'circle'} me-1`} style={{ color: statoId == s.id ? '#fff' : s.colore }} />
            {s.nome}
          </button>
        ))}
        <button
          className={`btn btn-sm ${archiviata === '1' ? 'btn-secondary' : 'btn-outline-secondary'}`}
          onClick={() => { setSearchParams({ archiviata: '1' }); setPage(1); }}
        >
          <i className="bi bi-archive me-1" /> Archivio
        </button>
      </div>

      {/* Search */}
      <div className="mb-3">
        <div className="input-group input-group-sm">
          <span className="input-group-text"><i className="bi bi-search" /></span>
          <input
            type="text" className="form-control" placeholder="Cerca per mittente, oggetto..."
            value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
          />
          {q && <button className="btn btn-outline-secondary" onClick={() => setQ('')}><i className="bi bi-x" /></button>}
        </div>
      </div>

      {/* Lista email */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : emails.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-inbox display-4 d-block mb-2" />
          Nessuna email
        </div>
      ) : (
        <div className="card">
          <div className="list-group list-group-flush">
            {emails.map(email => (
              <button
                key={email.id}
                className={`list-group-item list-group-item-action text-start email-row ${!email.letta ? 'unread' : ''}`}
                onClick={() => navigate(`/email/${email.id}`)}
              >
                <div className="d-flex align-items-start gap-2">
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-truncate" style={{ maxWidth: 200 }}>
                        {email.mittente_nome || email.mittente}
                      </span>
                      <small className="text-muted ms-2 flex-shrink-0">
                        {new Date(email.ora_ricezione).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                      </small>
                    </div>
                    <div className="text-truncate small" style={{ maxWidth: '100%' }}>{email.oggetto}</div>
                    <div className="d-flex gap-1 mt-1 flex-wrap">
                      {email.stato_nome && (
                        <StatoBadge nome={email.stato_nome} colore={email.stato_colore} icona={email.stato_icona} />
                      )}
                      {email.progetto_nome && (
                        <span className="stato-badge" style={{ background: (email.progetto_colore || '#0d6efd') + '22', color: email.progetto_colore || '#0d6efd' }}>
                          <i className="bi bi-kanban" /> {email.progetto_nome}
                        </span>
                      )}
                      {email.has_attachments ? <i className="bi bi-paperclip text-muted small" /> : null}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <i className="bi bi-chevron-left" />
          </button>
          <span className="btn btn-sm disabled">Pag. {page} di {totalPages}</span>
          <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <i className="bi bi-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
}
