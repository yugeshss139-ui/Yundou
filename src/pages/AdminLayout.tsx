import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import LogoutDialog from '../components/LogoutDialog';
import { logout } from '../services/authService';
import '../styles/Admin.css';

const AdminLayout: React.FC = () => {
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuthContext();

  const handleLogout = async () => {
    setShowLogout(false);
    try {
      await logout();
      navigate('/');
    } catch {
      // Logout failed silently
    }
  };

  return (
    <div className="admin-layout">
      <nav className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="admin-brand-text">YUNDO</span>
          <span className="admin-brand-sub">ADMIN</span>
        </div>

        <div className="admin-sidebar-nav">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span>Users</span>
          </NavLink>

          <button
            className="admin-nav-item admin-nav-logout"
            onClick={() => setShowLogout(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Logout</span>
          </button>
        </div>

        <div className="admin-sidebar-footer">
          <button
            className="admin-back-btn"
            onClick={() => navigate('/')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            Back to Yundo
          </button>
          {profile && (
            <div className="admin-sidebar-user">
              <span className="admin-sidebar-username">{profile.username}</span>
              <span className="admin-sidebar-role">Admin</span>
            </div>
          )}
        </div>
      </nav>

      <main className="admin-main">
        <Outlet />
      </main>

      <LogoutDialog
        open={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default AdminLayout;
