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

  // NUCLEAR HANDBRAKE: Detect loop and stop
  const [isCrashed, setIsCrashed] = React.useState(false);
  React.useEffect(() => {
    // 1. NUCLEAR HANDBRAKE: Detect loop and stop
    const f = (window as any).Forensic;
    const now = Date.now();
    const lastRender = parseInt(sessionStorage.getItem('rn_last') || '0');
    const renderCount = parseInt(sessionStorage.getItem('rn_cnt') || '0');

    if (now - lastRender < 1000) {
      const newCount = renderCount + 1;
      sessionStorage.setItem('rn_cnt', newCount.toString());
      if (newCount > 15) {
        if (f) f.save("FATAL: Looping de Render detectado! Travando UI.");
        setIsCrashed(true);
        if (f) f.show();
      }
    } else {
      sessionStorage.setItem('rn_cnt', '0');
    }
    sessionStorage.setItem('rn_last', now.toString());

    // 🥽 ATOMIC BOOT SEQUENCE
    // The 'f' and 'now' variables are already defined above in this useEffect scope.

    if (loading) return; // Wait for Supabase

    // 1. HASH RESCUE
    const currentHash = window.location.hash;
    let sanitizedHash = currentHash;
    if (currentHash && currentHash.length > 2) {
      sanitizedHash = currentHash.trim().replace(/[() ]+$/, '');
      if (sanitizedHash !== currentHash) {
        if (f) f.save("APP: Limpando link mangulado: " + sanitizedHash);
        window.location.hash = sanitizedHash;
      }
    }

    // 2. DEEP LINK CAPTURE (Visitor only)
    if (!user && sanitizedHash.includes('/pools/')) {
      if (f) f.save("APP: Intended Path salvo: " + sanitizedHash);
      sessionStorage.setItem('intended_path', sanitizedHash);
    }

    // 3. BOOT FINALIZATION (Zero Delay)
    if (!bootRef.current) {
      bootRef.current = true;
      if (f) f.save("APP: Estabilização de Ciclo (v2.0). User=" + (user ? "Logado" : "Visitante"));

      // Clear safety counts
      localStorage.setItem('ios_reload_count', '0');
      sessionStorage.setItem('ios_reload_count', '0');

      // Fast transition
      setBooting(false);
    }

  }, [user, loading]);

  if (isCrashed) {
    return (
      <div style={{ background: 'red', color: 'white', padding: '100px 20px', textAlign: 'center', height: '100vh', zIndex: 99999999 }}>
        <h1 style={{ fontSize: '40px' }}>🛑 LOOP DETECTADO</h1>
        <p>O aplicativo parou para evitar que o celular trave.</p>
        <p>O painel de DEBUG deve ter aberto sozinho abaixo.</p>
        <button onClick={() => { sessionStorage.clear(); location.reload(); }} style={{ padding: '20px', background: 'white', color: 'red', fontWeight: 'bold', border: 'none', borderRadius: '10px' }}>RE TENTAR</button>
      </div>
    );
  }

  // Visual feedback during boot
  if (loading || booting) {
    return (
      <div style={{ background: '#0A0A0B', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', color: '#10B981', fontFamily: 'sans-serif' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #10B981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.6 }}>Iniciando...</span>
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
