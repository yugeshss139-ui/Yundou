import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import MainLayout from './pages/MainLayout';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import PlaylistPage from './pages/PlaylistPage';
import PlaylistDetailPage from './pages/PlaylistDetailPage';
import AdminLayout from './pages/AdminLayout';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminUserDetailPage from './pages/AdminUserDetailPage';
import AdminPlaylistDetailPage from './pages/AdminPlaylistDetailPage';
import './App.css';

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-secondary)',
      fontSize: '0.9rem',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <div style={{
        fontSize: '2rem',
        fontWeight: 700,
        letterSpacing: '8px',
        color: 'var(--text-primary)',
        textShadow: '0 0 40px rgba(168, 85, 247, 0.35)',
      }}>
        YUNDO
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
         <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="playlists" element={<PlaylistPage />} />
          <Route path="playlists/:playlistId" element={<PlaylistDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route element={<ProtectedRoute requireStaff />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminUsersPage />} />
            <Route path="users/:uid" element={<AdminUserDetailPage />} />
            <Route path="users/:uid/playlists/:playlistId" element={<AdminPlaylistDetailPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PlayerProvider>
        <AppRoutes />
      </PlayerProvider>
    </AuthProvider>
  );
};

export default App;
