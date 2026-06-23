import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../../services/api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('Token mancante'); return; }

    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(err => { setStatus('error'); setMessage(err.response?.data?.error || 'Verifica fallita'); });
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card text-center">
        {status === 'loading' && (
          <>
            <div className="spinner-border text-primary mb-3" />
            <p>Verifica in corso...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <i className="bi bi-check-circle-fill text-success mb-3" style={{ fontSize: '3rem' }} />
            <h5 className="fw-bold">Email verificata!</h5>
            <p className="text-muted">Il tuo account è attivo. Puoi accedere.</p>
            <Link to="/login" className="btn btn-primary mt-2">Accedi</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <i className="bi bi-x-circle-fill text-danger mb-3" style={{ fontSize: '3rem' }} />
            <h5 className="fw-bold">Verifica fallita</h5>
            <p className="text-muted">{message}</p>
            <Link to="/login" className="btn btn-outline-secondary mt-2">Torna al login</Link>
          </>
        )}
      </div>
    </div>
  );
}
