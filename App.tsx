import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
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

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10B981]" />
      </div>
    );
  }

  return (
    <HashRouter>
      <ReloadPrompt />
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

        {/* PROTECTED ROOT ROUTE: Redirects to /login if not authenticated */}
        <Route path="/" element={user ? <Layout><Home /></Layout> : <Navigate to="/login" />} />

        {/* Community Route */}
        <Route path="/community" element={user ? <Layout><Community /></Layout> : <Navigate to="/login" />} />

        <Route path="/pools/new" element={user ? <Layout><CreatePool /></Layout> : <Navigate to="/login" />} />
        <Route path="/pools/:id" element={<Layout><PoolDetails /></Layout>} />
        <Route path="/pools/:id/edit" element={user ? <Layout><EditPool /></Layout> : <Navigate to="/login" />} />
        <Route path="/my-pools" element={user ? <Layout><MyPools /></Layout> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <Layout><ProfilePage /></Layout> : <Navigate to="/login" />} />
        <Route path="/wallet" element={user ? <Layout><Wallet /></Layout> : <Navigate to="/login" />} />
        <Route path="/admin" element={user ? <Layout><AdminDashboard /></Layout> : <Navigate to="/login" />} />

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
