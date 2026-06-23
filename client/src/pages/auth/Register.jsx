import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Le password non coincidono');
    setLoading(true);
    try {
      await authApi.register({ nome: form.nome, cognome: form.cognome, email: form.email, password: form.password });
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Errore durante la registrazione';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card text-center">
          <div className="mb-3"><i className="bi bi-envelope-check text-success" style={{ fontSize: '3rem' }} /></div>
          <h5 className="fw-bold">Controlla la tua email!</h5>
          <p className="text-muted">Ti abbiamo inviato un link di verifica a <strong>{form.email}</strong>.</p>
          <Link to="/login" className="btn btn-primary mt-2">Vai al login</Link>
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

        <h5 className="mb-1 fw-bold">Crea il tuo account</h5>
        <p className="text-muted small mb-4">Inizia a gestire le email in modo intelligente.</p>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="row g-2 mb-3">
            <div className="col">
              <label className="form-label small fw-semibold">Nome</label>
              <input type="text" className="form-control" required value={form.nome} onChange={set('nome')} />
            </div>
            <div className="col">
              <label className="form-label small fw-semibold">Cognome</label>
              <input type="text" className="form-control" required value={form.cognome} onChange={set('cognome')} />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Email</label>
            <input type="email" className="form-control" required value={form.email} onChange={set('email')} />
          </div>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Password</label>
            <input type="password" className="form-control" required minLength={8} value={form.password} onChange={set('password')} />
            <div className="form-text">Minimo 8 caratteri</div>
          </div>
          <div className="mb-4">
            <label className="form-label small fw-semibold">Conferma password</label>
            <input type="password" className="form-control" required value={form.confirm} onChange={set('confirm')} />
          </div>

          <button className="btn btn-primary w-100" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-2" />Registrazione...</> : 'Registrati'}
          </button>
        </form>

        <div className="text-center mt-3 small text-muted">
          Hai già un account? <Link to="/login" className="text-primary fw-semibold">Accedi</Link>
        </div>
      </div>
    </div>
  );
}
