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
      <div style={{ background: '#0A0A0B', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '30px', height: '30px', border: '2px solid #10B981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
              ? <NotificationGuard><Layout><Home /></Layout></NotificationGuard>
              : (isStandalone ? <Navigate to="/login" replace /> : <Gateway />)
          }
        />
        <Route path="/community" element={user ? <NotificationGuard><Layout><Community /></Layout></NotificationGuard> : <Navigate to="/" />} />
        <Route path="/pools/new" element={user ? <NotificationGuard><Layout><CreatePool /></Layout></NotificationGuard> : <Navigate to="/" />} />
        {/* Deep Link para Bolão (Híbrido) */}
        <Route path="/pools/:id" element={
          user
            ? <NotificationGuard><Layout><PoolDetails /></Layout></NotificationGuard>
            : <PoolDetails />
        } />
        <Route path="/pools/:id/edit" element={user ? <NotificationGuard><Layout><EditPool /></Layout></NotificationGuard> : <Navigate to="/" />} />
        <Route path="/my-pools" element={user ? <NotificationGuard><Layout><MyPools /></Layout></NotificationGuard> : <Navigate to="/" />} />
        <Route path="/profile" element={user ? <NotificationGuard><Layout><ProfilePage /></Layout></NotificationGuard> : <Navigate to="/" />} />
        <Route path="/wallet" element={user ? <NotificationGuard><Layout><Wallet /></Layout></NotificationGuard> : <Navigate to="/" />} />
        <Route path="/admin" element={user ? <NotificationGuard><Layout><AdminDashboard /></Layout></NotificationGuard> : <Navigate to="/" />} />
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
