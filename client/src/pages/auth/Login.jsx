import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <i className="bi bi-envelope-check-fill text-primary" />
          Smart Email
        </div>

        <h5 className="mb-1 fw-bold">Accedi al tuo account</h5>
        <p className="text-muted small mb-4">Bentornato! Inserisci le tue credenziali.</p>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Email</label>
            <input
              type="email" className="form-control" required autoFocus
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="mb-1">
            <label className="form-label small fw-semibold">Password</label>
            <input
              type="password" className="form-control" required
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>
          <div className="text-end mb-3">
            <Link to="/forgot-password" className="small text-primary">Password dimenticata?</Link>
          </div>

          <button className="btn btn-primary w-100" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-2" />Accesso...</> : 'Accedi'}
          </button>
        </form>

        <hr className="my-3" />

        <div className="text-center small text-muted">
          Non hai un account? <Link to="/register" className="text-primary fw-semibold">Registrati</Link>
        </div>
      </div>
    </div>
  );
}
