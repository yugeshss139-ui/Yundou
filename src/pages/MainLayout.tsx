import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { HomeIcon, SearchIcon, ListIcon } from '../components/Icons';
import MusicPlayer from '../components/MusicPlayer';
import LogoutDialog from '../components/LogoutDialog';
import { logout } from '../services/authService';
import { useAuthContext } from '../contexts/AuthContext';
import '../styles/Layout.css';

const MainLayout: React.FC = () => {
  const [showLogout, setShowLogout] = useState(false);
  const { isStaff } = useAuthContext();

  const handleLogout = async () => {
    setShowLogout(false);
    try {
      await logout();
    } catch {
      // Logout failed silently
    }
  };

  return (
    <div className="main-layout">
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <HomeIcon />
          <span>Home</span>
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <SearchIcon />
          <span>Search</span>
        </NavLink>
        <NavLink to="/playlists" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ListIcon />
          <span>Playlists</span>
        </NavLink>
        {isStaff && (
          <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Admin</span>
          </NavLink>
        )}
        <button className="nav-item logout-btn" onClick={() => setShowLogout(true)} title="Logout">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16,17 21,12 16,7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Logout</span>
        </button>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>

      <MusicPlayer />

      <LogoutDialog
        open={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default MainLayout;
