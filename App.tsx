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
// import ReloadPrompt from './components/ReloadPrompt';
import NotificationGuard from './src/components/NotificationGuard';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
  const bootRef = React.useRef(false);

  React.useEffect(() => {
    const f = (window as any).Forensic;
    if (!bootRef.current) {
      if (f) f.save("APP: v1.2 Bootei! Loading=" + loading + " User=" + (user ? "Sim" : "Não"));
      bootRef.current = true;
    } else {
      if (f) f.save("APP: Update de Estado. Loading=" + loading + " User=" + (user ? "Sim" : "Não"));
    }
  }, [user, loading]);

  // Simplest loader: No spinners to avoid GPU stress during boot
  if (loading) {
    return <div style={{ background: '#0A0A0B', height: '100vh' }} />;
  }

  return (
    <HashRouter>
      {/* Bypass Guard for now to stabilize iOS */}
      {(() => {
        if ((window as any).Forensic) (window as any).Forensic.save("APP: Renderizando Root... User=" + (user ? 'Sim' : 'Não'));
        return (
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
            <Route path="/pools/:id" element={<Layout><PoolDetails /></Layout>} />
            <Route path="/pools/:id/edit" element={user ? <Layout><EditPool /></Layout> : <Navigate to="/" />} />
            <Route path="/my-pools" element={user ? <Layout><MyPools /></Layout> : <Navigate to="/" />} />
            <Route path="/profile" element={user ? <Layout><ProfilePage /></Layout> : <Navigate to="/" />} />
            <Route path="/wallet" element={user ? <Layout><Wallet /></Layout> : <Navigate to="/" />} />
            <Route path="/admin" element={user ? <Layout><AdminDashboard /></Layout> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        );
      })()}
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
