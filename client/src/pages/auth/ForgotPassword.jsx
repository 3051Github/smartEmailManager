import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Errore durante l\'invio. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card text-center">
          <i className="bi bi-envelope-paper text-primary mb-3" style={{ fontSize: '3rem' }} />
          <h5 className="fw-bold">Controlla la tua email</h5>
          <p className="text-muted">Se <strong>{email}</strong> è registrata, riceverai un link per il reset della password.</p>
          <Link to="/login" className="btn btn-outline-secondary mt-2">Torna al login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <i className="bi bi-envelope-check-fill text-primary" />
          Smart Email
        </div>
        <h5 className="mb-1 fw-bold">Reset password</h5>
        <p className="text-muted small mb-4">Inserisci la tua email e ti invieremo le istruzioni.</p>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Email</label>
            <input type="email" className="form-control" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button className="btn btn-primary w-100" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-2" />Invio...</> : 'Invia link di reset'}
          </button>
        </form>

        <div className="text-center mt-3 small">
          <Link to="/login" className="text-muted">Torna al login</Link>
        </div>
      </div>
    </div>
  );
}
