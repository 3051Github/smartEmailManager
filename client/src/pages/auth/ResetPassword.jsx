import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Le password non coincidono');
    setLoading(true);
    try {
      await authApi.resetPassword({ token: params.get('token'), password: form.password });
      navigate('/login', { state: { message: 'Password aggiornata! Puoi accedere.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Errore durante il reset');
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
        <h5 className="mb-1 fw-bold">Nuova password</h5>
        <p className="text-muted small mb-4">Scegli una nuova password per il tuo account.</p>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Nuova password</label>
            <input type="password" className="form-control" required minLength={8}
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="mb-4">
            <label className="form-label small fw-semibold">Conferma password</label>
            <input type="password" className="form-control" required
              value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
          </div>
          <button className="btn btn-primary w-100" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-2" />Salvataggio...</> : 'Salva password'}
          </button>
        </form>
      </div>
    </div>
  );
}
