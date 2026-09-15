import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { listUsers, type UserProfile } from '../services/userService';
import EmptyState from '../components/EmptyState';

const YUGESH_UID = '10a7pcG65SPw5q1mO7ULSP9Hh6V2';

function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const AdminUsersPage: React.FC = () => {
  const { isAdmin, user: currentUser } = useAuthContext();
  const isYugesh = currentUser?.uid === YUGESH_UID;
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [copied, setCopied] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteCopied, setDeleteCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await listUsers();
        setUsers(data);
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const getInteractiveScript = (): string => {
    return `cd D:\\Yundo_New\nnode scripts/create-user.js\n\nThen enter:\n  Username: ${newUsername.trim().toLowerCase()}\n  Password: ${'*'.repeat(newPassword.length)}\n  Role: ${newRole}`;
  };

  const getDeleteScript = (uid: string): string => {
    return `cd D:\\Yundo_New\nnode scripts/delete-user.js ${uid}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getInteractiveScript());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed silently
    }
  };

  const handleCreateSubmit = () => {
    if (!newUsername.trim() || !newPassword.trim()) return;
    handleCopy();
  };

  const resetForm = () => {
    setNewUsername('');
    setNewPassword('');
    setNewRole('user');
    setShowCreate(false);
    setCopied(false);
  };

  const handleDeleteClick = (user: UserProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(user);
    setDeleteCopied(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await navigator.clipboard.writeText(getDeleteScript(deleteTarget.uid));
      setDeleteCopied(true);
      setTimeout(() => {
        setDeleteTarget(null);
        setDeleteCopied(false);
      }, 2000);
    } catch {
      // Clipboard write failed silently
    }
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Users</h1>
      </div>

      {isAdmin && !showCreate && (
        <button
          className="admin-action-btn"
          onClick={() => setShowCreate(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          New User
        </button>
      )}

      {isAdmin && showCreate && (
        <div className="admin-create-form">
          <div className="admin-create-form-header">
            <h3>Create New User</h3>
            <p className="admin-create-note">
              This generates the CLI command. Run it in your terminal to create the user securely.
            </p>
          </div>

          <div className="admin-form-group">
            <label className="admin-label">Username</label>
            <input
              type="text"
              className="admin-input"
              placeholder="e.g. john_doe"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-label">Password</label>
            <input
              type="password"
              className="admin-input"
              placeholder="Min 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-label">Role</label>
            <select
              className="admin-select"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value="user">User</option>
              <option value="subadmin">Subadmin</option>
            </select>
          </div>

          <div className="admin-create-command">
            <label className="admin-label">Command to run in terminal</label>
            <pre className="admin-command-block">
              {getInteractiveScript()}
            </pre>
          </div>

          <div className="admin-create-actions">
            <button
              className="admin-btn-secondary"
              onClick={resetForm}
            >
              Cancel
            </button>
            <button
              className="admin-btn-primary"
              onClick={handleCreateSubmit}
              disabled={!newUsername.trim() || !newPassword.trim() || newPassword.length < 8}
            >
              {copied ? 'Copied!' : 'Copy & Close'}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          Loading users...
        </div>
      )}

      {!loading && users.length === 0 && (
        <EmptyState
          icon={
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          }
          title="No users found"
          description="No user accounts exist yet."
        />
      )}

      {!loading && users.length > 0 && (
        <div className="admin-list">
          {users.map((user) => (
            <div
              key={user.uid}
              className="admin-list-item"
              onClick={() => navigate(`/admin/users/${user.uid}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate(`/admin/users/${user.uid}`);
                }
              }}
            >
              <div className="admin-list-avatar">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="admin-list-info">
                <span className="admin-list-name">{user.username}</span>
                <span className="admin-list-meta">
                  {user.email}
                  {user.createdAt && (
                    <span className="admin-list-date"> · {formatDate(user.createdAt)}</span>
                  )}
                </span>
              </div>
              <span className={`admin-list-badge ${user.role === 'admin' ? 'admin' : user.role === 'subadmin' ? 'subadmin' : 'user'}`}>
                {user.role}
              </span>
              {isYugesh && user.uid !== YUGESH_UID && (
                <button
                  className="admin-delete-user-btn"
                  onClick={(e) => handleDeleteClick(user, e)}
                  title="Delete user"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3,6 5,6 21,6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="admin-dialog-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="admin-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete User Account</h3>
            <p className="admin-dialog-desc">
              Are you sure you want to permanently delete this account? This action cannot be undone.
            </p>

            <div className="admin-delete-info">
              <div className="admin-delete-info-row">
                <span className="admin-delete-info-label">Username:</span>
                <span className="admin-delete-info-value">{deleteTarget.username}</span>
              </div>
              <div className="admin-delete-info-row">
                <span className="admin-delete-info-label">Role:</span>
                <span className={`admin-list-badge ${deleteTarget.role === 'admin' ? 'admin' : deleteTarget.role === 'subadmin' ? 'subadmin' : 'user'}`}>
                  {deleteTarget.role}
                </span>
              </div>
              <div className="admin-delete-info-row">
                <span className="admin-delete-info-label">UID:</span>
                <span className="admin-delete-info-value admin-delete-uid">{deleteTarget.uid}</span>
              </div>
            </div>

            <p className="admin-dialog-desc admin-delete-warning">
              This will remove the user's Firebase Authentication account and all their Yundo data including playlists and songs.
            </p>

            <div className="admin-create-command">
              <label className="admin-label">Command to run in terminal</label>
              <pre className="admin-command-block">
                {getDeleteScript(deleteTarget.uid)}
              </pre>
            </div>

            <div className="admin-dialog-actions">
              <button
                className="admin-btn-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className="admin-btn-danger"
                onClick={handleDeleteConfirm}
              >
                {deleteCopied ? 'Copied!' : 'Copy Command'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
