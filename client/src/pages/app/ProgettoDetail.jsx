import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { progettiApi } from '../../services/api';

export default function ProgettoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [progetto, setProgetto] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    progettiApi.get(id).then(r => setProgetto(r.data.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  if (!progetto) return <div className="alert alert-danger">Progetto non trovato</div>;

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/progetti')}>
          <i className="bi bi-arrow-left" />
        </button>
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className="rounded-circle d-inline-block" style={{ width: 12, height: 12, background: progetto.colore }} />
            <h5 className="mb-0 fw-bold">{progetto.nome}</h5>
          </div>
          {progetto.cliente_nome && (
            <small className="text-muted"><i className="bi bi-person me-1" />{progetto.cliente_nome}</small>
          )}
        </div>
      </div>

      {progetto.descrizione && (
        <div className="alert alert-light mb-4">{progetto.descrizione}</div>
      )}

      <h6 className="fw-semibold mb-3">Email collegate ({progetto.emails?.length || 0})</h6>

      {!progetto.emails?.length ? (
        <div className="text-center py-4 text-muted">
          <i className="bi bi-envelope display-5 d-block mb-2" />
          Nessuna email collegata a questo progetto
        </div>
      ) : (
        <div className="card">
          <div className="list-group list-group-flush">
            {progetto.emails.map(email => (
              <button
                key={email.id}
                className={`list-group-item list-group-item-action text-start email-row ${!email.letta ? 'unread' : ''}`}
                onClick={() => navigate(`/email/${email.id}`)}
              >
                <div className="d-flex justify-content-between">
                  <span className="text-truncate">{email.mittente_nome || email.mittente}</span>
                  <small className="text-muted ms-2">
                    {new Date(email.ora_ricezione).toLocaleDateString('it-IT')}
                  </small>
                </div>
                <div className="small text-truncate">{email.oggetto}</div>
                {email.stato_nome && (
                  <span className="stato-badge mt-1" style={{ background: email.stato_colore + '22', color: email.stato_colore }}>
                    {email.stato_nome}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
