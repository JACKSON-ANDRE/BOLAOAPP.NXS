import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import Home from './pages/HomePremium'; // Alterado para a versão Premium
import Gateway from './pages/Gateway'; // Import Gateway
import ProfilePage from './pages/Profile';
import Wallet from './pages/Wallet';
import CreatePool from './pages/CreatePool';
import EditPool from './pages/EditPool';
import PoolDetails from './pages/PoolDetails';
import AdminDashboard from './pages/AdminDashboard';
import MyPools from './pages/MyPools';
import Community from './pages/Community';

// Components
import Layout from './components/Layout';
import ReloadPrompt from './components/ReloadPrompt';
import NotificationGuard from './src/components/NotificationGuard';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
  const bootRef = React.useRef(false);
  const [booting, setBooting] = React.useState(true);

  React.useEffect(() => {
    // 🥽 ATOMIC BOOT SEQUENCE
    if (loading) return;

    // 1. HASH RESCUE
    const currentHash = window.location.hash;
    if (currentHash && currentHash.length > 2) {
      const sanitizedHash = currentHash.trim().replace(/[() ]+$/, '');
      if (sanitizedHash !== currentHash) {
        window.location.hash = sanitizedHash;
      }
    }

    // 2. DEEP LINK CAPTURE (Visitor only)
    if (!user && window.location.hash.includes('/pools/')) {
      sessionStorage.setItem('intended_path', window.location.hash);
    }

    // 3. BOOT FINALIZATION
    if (!bootRef.current) {
      bootRef.current = true;
      setBooting(false);
    }
  }, [user, loading]);

  // Visual feedback during initial boot only
  if (loading || booting) {
    return (
      <div style={{ background: '#0A0A0B', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div className="loading-spinner" />
        <span style={{ color: '#52525B', fontFamily: 'monospace', fontSize: '12px', animation: 'pulse 2s infinite' }}>Carregando...</span>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  return (
    <HashRouter>
      <ReloadPrompt />
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route
          path="/"
          element={
            user
              ? <Layout><Home /></Layout>
              : (isStandalone ? <Navigate to="/login" replace /> : <Gateway />)
          }
        />
        <Route path="/community" element={user ? <Layout><Community /></Layout> : <Navigate to="/" />} />
        <Route path="/pools/new" element={user ? <Layout><CreatePool /></Layout> : <Navigate to="/" />} />
        {/* Deep Link para Bolão (Híbrido) */}
        <Route path="/pools/:id" element={
          user
            ? <Layout><PoolDetails /></Layout>
            : <PoolDetails />
        } />
        <Route path="/pools/:id/edit" element={user ? <Layout><EditPool /></Layout> : <Navigate to="/" />} />
        <Route path="/my-pools" element={user ? <Layout><MyPools /></Layout> : <Navigate to="/" />} />
        <Route path="/profile" element={user ? <Layout><ProfilePage /></Layout> : <Navigate to="/" />} />
        <Route path="/wallet" element={user ? <Layout><Wallet /></Layout> : <Navigate to="/" />} />
        <Route path="/admin" element={user ? <Layout><AdminDashboard /></Layout> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
