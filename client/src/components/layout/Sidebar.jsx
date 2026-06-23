import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { emailsApi, statiApi } from '../../services/api';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [badges, setBadges] = useState({ stati: [], non_lette: 0 });

  useEffect(() => {
    emailsApi.badges().then(r => setBadges(r.data.data)).catch(() => {});
    const t = setInterval(() => {
      emailsApi.badges().then(r => setBadges(r.data.data)).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-sidebar">
      <NavLink to="/dashboard" className="sidebar-brand">
        <i className="bi bi-envelope-check-fill me-2" />
        Smart Email
      </NavLink>

      <nav className="sidebar-nav py-2 flex-grow-1">
        <div className="sidebar-section-label">Email</div>

        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <i className="bi bi-inbox" />
          Inbox
          {badges.non_lette > 0 && (
            <span className="badge bg-primary">{badges.non_lette}</span>
          )}
        </NavLink>

        {badges.stati?.map(s => (
          <NavLink
            key={s.id}
            to={`/dashboard?stato_id=${s.id}`}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <i className={`bi bi-${s.icona || 'circle'}`} style={{ color: s.colore }} />
            {s.nome}
            {s.count > 0 && <span className="badge" style={{ background: s.colore, marginLeft: 'auto' }}>{s.count}</span>}
          </NavLink>
        ))}

        <div className="sidebar-section-label mt-2">Lavoro</div>

        <NavLink to="/progetti" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <i className="bi bi-kanban" /> Progetti
        </NavLink>

        <NavLink to="/clienti" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <i className="bi bi-people" /> Clienti
        </NavLink>

        <div className="sidebar-section-label mt-2">Account</div>

        <NavLink to="/impostazioni" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <i className="bi bi-gear" /> Impostazioni
        </NavLink>
      </nav>

      <div className="p-2 border-top border-secondary">
        <div className="d-flex align-items-center gap-2 px-2 py-1">
          <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white"
               style={{ width: 32, height: 32, fontSize: 13, flexShrink: 0 }}>
            {user?.nome?.[0]}{user?.cognome?.[0]}
          </div>
          <div className="flex-grow-1 overflow-hidden">
            <div className="text-white small fw-semibold text-truncate">{user?.nome} {user?.cognome}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>{user?.email}</div>
          </div>
          <button className="btn btn-sm btn-link text-muted p-0" onClick={handleLogout} title="Esci">
            <i className="bi bi-box-arrow-right" />
          </button>
        </div>
      </div>
    </div>
  );
}
