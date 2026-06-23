import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/app/Dashboard';
import EmailDetail from './pages/app/EmailDetail';
import Progetti from './pages/app/Progetti';
import ProgettoDetail from './pages/app/ProgettoDetail';
import Clienti from './pages/app/Clienti';
import Impostazioni from './pages/app/Impostazioni';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner-overlay"><div className="spinner-border text-primary" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner-overlay"><div className="spinner-border text-primary" /></div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/verify-email"    element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password"  element={<PublicRoute><ResetPassword /></PublicRoute>} />

          {/* Protected */}
          <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"          element={<Dashboard />} />
            <Route path="email/:id"          element={<EmailDetail />} />
            <Route path="progetti"           element={<Progetti />} />
            <Route path="progetti/:id"       element={<ProgettoDetail />} />
            <Route path="clienti"            element={<Clienti />} />
            <Route path="impostazioni"       element={<Impostazioni />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
