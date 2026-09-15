import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { getUser, type UserProfile, type UserPermissions } from '../services/userService';
import {
  listPlaylists,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  type Playlist,
} from '../services/playlistService';
import {
  promoteToSubAdmin,
  demoteToUser,
  updateSubAdminPermissions,
  createPasswordResetLink,
  setUserPassword,
} from '../services/adminService';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import '../styles/Playlist.css';

import { MusicIcon, PlusIcon } from '../components/Icons';

const YUGESH_UID = '10a7pcG65SPw5q1mO7ULSP9Hh6V2';

function formatDate(date: Date | null | undefined): string {
  if (!date) return 'Unknown';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const AdminUserDetailPage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { isAdmin, user: currentUser, profile: currentProfile } = useAuthContext();

  const isYugesh = currentUser?.uid === YUGESH_UID;

  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [renamingPlaylistId, setRenamingPlaylistId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const [deletePlaylistId, setDeletePlaylistId] = useState<string | null>(null);
  const [deletingPlaylist, setDeletingPlaylist] = useState(false);

  const canManagePlaylists =
    isAdmin ||
    (targetUser?.role === 'subadmin' && targetUser?.permissions?.managePlaylists === true);

  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showDemoteDialog, setShowDemoteDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const [passwordResetLink, setPasswordResetLink] = useState('');
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [passwordResetError, setPasswordResetError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showSetPasswordDialog, setShowSetPasswordDialog] = useState(false);
  const [passwordSetLoading, setPasswordSetLoading] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteCopied, setDeleteCopied] = useState(false);

  const [editPermissions, setEditPermissions] = useState<UserPermissions>({
    manageUsers: false,
    managePlaylists: false,
    manageSongs: false,
  });

  useEffect(() => {
    if (!uid) return;

    async function load() {
      try {
        const userData = await getUser(uid!);
        if (!userData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setTargetUser(userData);
        const playlistData = await listPlaylists(uid!);
        setPlaylists(playlistData);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [uid]);

  const handleCreate = async () => {
    if (!uid || !newPlaylistName.trim()) return;

    setCreating(true);
    try {
      await createPlaylist(uid, newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreate(false);
      const playlistData = await listPlaylists(uid);
      setPlaylists(playlistData);
    } catch {
      // Handle error silently
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (playlistId: string) => {
    if (!uid || !renameValue.trim()) return;

    setRenaming(true);
    try {
      await renamePlaylist(uid, playlistId, renameValue.trim());
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlistId ? { ...p, name: renameValue.trim() } : p))
      );
      setRenamingPlaylistId(null);
      setRenameValue('');
    } catch {
      // Handle error silently
    } finally {
      setRenaming(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!uid) return;

    setDeletingPlaylist(true);
    try {
      await deletePlaylist(uid, playlistId);
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      setDeletePlaylistId(null);
    } catch {
      // Handle error silently
    } finally {
      setDeletingPlaylist(false);
    }
  };

  const handlePromote = async () => {
    if (!uid || !targetUser) return;

    setActionLoading(true);
    setActionError('');
    try {
      await promoteToSubAdmin(uid, editPermissions);
      setTargetUser({ ...targetUser, role: 'subadmin', permissions: editPermissions });
      setShowPromoteDialog(false);
    } catch {
      setActionError('Failed to promote user. Check Firestore rules.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDemote = async () => {
    if (!uid || !targetUser) return;

    setActionLoading(true);
    setActionError('');
    try {
      await demoteToUser(uid);
      setTargetUser({ ...targetUser, role: 'user', permissions: undefined });
      setShowDemoteDialog(false);
    } catch {
      setActionError('Failed to demote user. Check Firestore rules.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!uid || !targetUser) return;

    setActionLoading(true);
    setActionError('');
    try {
      await updateSubAdminPermissions(uid, editPermissions);
      setTargetUser({ ...targetUser, permissions: editPermissions });
      setShowPermissionsDialog(false);
    } catch {
      setActionError('Failed to update permissions. Check Firestore rules.');
    } finally {
      setActionLoading(false);
    }
  };

  const openPromoteDialog = () => {
    setEditPermissions({
      manageUsers: false,
      managePlaylists: true,
      manageSongs: true,
    });
    setActionError('');
    setShowPromoteDialog(true);
  };

  const openPermissionsDialog = () => {
    if (targetUser?.permissions) {
      setEditPermissions({ ...targetUser.permissions });
    }
    setActionError('');
    setShowPermissionsDialog(true);
  };

  const isSelf = uid === currentProfile?.uid;

  const handlePasswordReset = async () => {
    if (!uid) return;

    setPasswordResetLoading(true);
    setPasswordResetError('');
    setPasswordResetLink('');
    try {
      const link = await createPasswordResetLink(uid);
      setPasswordResetLink(link);
    } catch (error) {
      setPasswordResetError(error instanceof Error ? error.message : 'Unable to create reset link.');
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!uid || newPassword.length < 8 || newPassword !== confirmPassword) return;

    setPasswordSetLoading(true);
    setPasswordResetError('');
    try {
      await setUserPassword(uid, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setShowSetPasswordDialog(false);
    } catch (error) {
      setPasswordResetError(error instanceof Error ? error.message : 'Unable to set password.');
    } finally {
      setPasswordSetLoading(false);
    }
  };

  const getDeleteScript = (targetUid: string): string => {
    return `cd D:\\Yundo_New\nnode scripts/delete-user.js ${targetUid}`;
  };

  const handleDeleteClick = () => {
    setActionError('');
    setDeleteCopied(false);
    setShowDeleteDialog(true);
  };

  const handleDeleteCopy = async () => {
    if (!uid) return;
    try {
      await navigator.clipboard.writeText(getDeleteScript(uid));
      setDeleteCopied(true);
      setTimeout(() => {
        setShowDeleteDialog(false);
        setDeleteCopied(false);
        navigate('/admin');
      }, 2000);
    } catch {
      // Clipboard write failed silently
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading user...</div>
      </div>
    );
  }

  if (notFound || !targetUser) {
    return (
      <div className="admin-page">
        <div className="admin-user-detail-topnav">
          <button className="admin-back-link" onClick={() => navigate('/admin')}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="15,18 9,12 15,6" />
            </svg>
            Users
          </button>
          <EmptyState
            icon={
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            }
            title="User not found"
            description="This user may have been deleted."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-user-detail-topnav">
        <button className="admin-back-link" onClick={() => navigate('/admin')}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="15,18 9,12 15,6" />
          </svg>
          Users
        </button>
      </div>

      <div className="admin-user-header">
        <div className="admin-user-avatar-large" aria-hidden>
          <MusicIcon size={34} />
        </div>
        <div className="admin-user-info">
          <h1 className="admin-user-name">{targetUser.username}</h1>
          <span className="admin-user-email">{targetUser.email}</span>
          <span className="admin-user-date">Joined {formatDate(targetUser.createdAt)}</span>
          <span
            className={`admin-list-badge ${
              targetUser.role === 'admin' ? 'admin' : targetUser.role === 'subadmin' ? 'subadmin' : 'user'
            }`}
          >
            {targetUser.role === 'admin' ? 'Admin' : targetUser.role === 'subadmin' ? 'Subadmin' : 'User'}
          </span>
        </div>
      </div>

      {isAdmin && !isSelf && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>Password Management</h2>
          </div>
          <p className="admin-dialog-desc">
            Generate a one-time Firebase password reset link for this user. Existing passwords are never readable or returned.
          </p>
          {passwordResetError && <div className="admin-error">{passwordResetError}</div>}
          {passwordResetLink && (
            <div className="admin-create-command">
              <label className="admin-label">Password reset link</label>
              <div className="admin-command-block">{passwordResetLink}</div>
            </div>
          )}
          <button className="admin-btn-secondary" onClick={handlePasswordReset} disabled={passwordResetLoading}>
            {passwordResetLoading
              ? 'Generating...'
              : passwordResetLink
                ? 'Generate New Reset Link'
                : 'Generate Reset Link'}
          </button>

          <div className="admin-form-group" style={{ marginTop: 14 }}>
            <label className="admin-label">New password</label>
            <input
              className="admin-input"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-label">Confirm new password</label>
            <input
              className="admin-input"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              placeholder="Enter it again"
            />
          </div>

          <button
            className="admin-btn-primary"
            onClick={() => setShowSetPasswordDialog(true)}
            disabled={newPassword.length < 8 || newPassword !== confirmPassword || passwordSetLoading}
          >
            Set New Password
          </button>
        </div>
      )}

      {isAdmin && !isSelf && targetUser.role !== 'admin' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>Role Management</h2>
          </div>

          {actionError && <div className="admin-error">{actionError}</div>}

          <div className="admin-role-actions">
            {targetUser.role === 'user' && (
              <button className="admin-btn-primary" onClick={openPromoteDialog} disabled={actionLoading}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="18,15 12,9 6,15" />
                </svg>
                Promote to Subadmin
              </button>
            )}

            {targetUser.role === 'subadmin' && (
              <>
                <button className="admin-btn-secondary" onClick={openPermissionsDialog} disabled={actionLoading}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                  Edit Permissions
                </button>

                <button
                  className="admin-btn-danger"
                  onClick={() => {
                    setActionError('');
                    setShowDemoteDialog(true);
                  }}
                  disabled={actionLoading}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="6,9 12,15 18,9" />
                  </svg>
                  Demote to User
                </button>
              </>
            )}

            {isYugesh && !isSelf && (
              <button className="admin-btn-danger" onClick={handleDeleteClick} disabled={actionLoading}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="3,6 5,6 21,6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                Delete User
              </button>
            )}
          </div>

          {targetUser.role === 'subadmin' && targetUser.permissions && (
            <div className="admin-permissions-display">
              <span className="admin-permissions-label">Current permissions:</span>
              <div className="admin-permissions-list">
                <span className={`admin-perm-badge ${targetUser.permissions.manageUsers ? 'active' : ''}`}>manageUsers</span>
                <span className={`admin-perm-badge ${targetUser.permissions.managePlaylists ? 'active' : ''}`}>managePlaylists</span>
                <span className={`admin-perm-badge ${targetUser.permissions.manageSongs ? 'active' : ''}`}>manageSongs</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="admin-section">
        <div className="admin-section-header">
          <h2>Playlists</h2>
          {canManagePlaylists && !showCreate && (
            <button className="admin-action-btn" onClick={() => setShowCreate(true)}>
              <PlusIcon size={16} />
              New Playlist
            </button>
          )}
        </div>

        {showCreate && (
          <div className="admin-create-form">
            <input
              type="text"
              className="admin-input"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setShowCreate(false);
                  setNewPlaylistName('');
                }
              }}
              autoFocus
              disabled={creating}
            />
            <div className="admin-create-actions">
              <button
                className="admin-btn-secondary"
                onClick={() => {
                  setShowCreate(false);
                  setNewPlaylistName('');
                }}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                className="admin-btn-primary"
                onClick={handleCreate}
                disabled={creating || !newPlaylistName.trim()}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {!loading && playlists.length === 0 && !showCreate && (
          <EmptyState
            icon={
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            }
            title="No playlists"
            description="This user has no playlists yet."
          />
        )}

        {playlists.length > 0 && (
          <div className="admin-playlist-list">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="admin-playlist-item"
                onClick={() => {
                  if (renamingPlaylistId !== playlist.id) {
                    navigate(`/admin/users/${uid}/playlists/${playlist.id}`);
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/admin/users/${uid}/playlists/${playlist.id}`);
                  }
                }}
              >
                <div className="admin-playlist-icon">
                  <MusicIcon size={22} />
                </div>
                <div className="admin-playlist-info">
                  {renamingPlaylistId === playlist.id ? (
                    <div className="admin-rename-form">
                      <input
                        type="text"
                        className="admin-input admin-rename-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(playlist.id);
                          if (e.key === 'Escape') {
                            setRenamingPlaylistId(null);
                            setRenameValue('');
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        disabled={renaming}
                      />
                      <div className="admin-rename-actions">
                        <button
                          className="admin-btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingPlaylistId(null);
                            setRenameValue('');
                          }}
                          disabled={renaming}
                        >
                          Cancel
                        </button>
                        <button
                          className="admin-btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRename(playlist.id);
                          }}
                          disabled={renaming || !renameValue.trim()}
                        >
                          {renaming ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="admin-playlist-name">{playlist.name}</span>
                      <span className="admin-playlist-count">
                        {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}
                      </span>
                    </>
                  )}
                </div>

                {canManagePlaylists && renamingPlaylistId !== playlist.id && (
                  <div className="admin-playlist-actions">
                    <button
                      className="admin-song-action-btn"
                      title="Rename playlist"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingPlaylistId(playlist.id);
                        setRenameValue(playlist.name);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="admin-song-action-btn admin-song-action-delete"
                      title="Delete playlist"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletePlaylistId(playlist.id);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showPromoteDialog && (
        <div className="admin-dialog-overlay" onClick={() => !actionLoading && setShowPromoteDialog(false)}>
          <div className="admin-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Promote to Subadmin</h3>
            <p className="admin-dialog-desc">
              Grant <strong>{targetUser.username}</strong> subadmin access with selected permissions.
            </p>

            <div className="admin-permissions-form">
              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={editPermissions.manageUsers}
                  onChange={(e) => setEditPermissions({ ...editPermissions, manageUsers: e.target.checked })}
                  disabled={actionLoading}
                />
                <span className="admin-checkbox-text">
                  <strong>manageUsers</strong>
                  <span className="admin-checkbox-desc">View and manage user accounts</span>
                </span>
              </label>

              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={editPermissions.managePlaylists}
                  onChange={(e) => setEditPermissions({ ...editPermissions, managePlaylists: e.target.checked })}
                  disabled={actionLoading}
                />
                <span className="admin-checkbox-text">
                  <strong>managePlaylists</strong>
                  <span className="admin-checkbox-desc">Create, edit, and delete playlists</span>
                </span>
              </label>

              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={editPermissions.manageSongs}
                  onChange={(e) => setEditPermissions({ ...editPermissions, manageSongs: e.target.checked })}
                  disabled={actionLoading}
                />
                <span className="admin-checkbox-text">
                  <strong>manageSongs</strong>
                  <span className="admin-checkbox-desc">Add, edit, and remove songs</span>
                </span>
              </label>
            </div>

            {actionError && <div className="admin-error">{actionError}</div>}

            <div className="admin-dialog-actions">
              <button className="admin-btn-secondary" onClick={() => setShowPromoteDialog(false)} disabled={actionLoading}>
                Cancel
              </button>
              <button className="admin-btn-primary" onClick={handlePromote} disabled={actionLoading}>
                {actionLoading ? 'Promoting...' : 'Promote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDemoteDialog && (
        <div className="admin-dialog-overlay" onClick={() => !actionLoading && setShowDemoteDialog(false)}>
          <div className="admin-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Demote to User</h3>
            <p className="admin-dialog-desc">
              Remove <strong>{targetUser.username}</strong>'s subadmin access. They will become a normal user.
            </p>

            {actionError && <div className="admin-error">{actionError}</div>}

            <div className="admin-dialog-actions">
              <button className="admin-btn-secondary" onClick={() => setShowDemoteDialog(false)} disabled={actionLoading}>
                Cancel
              </button>
              <button className="admin-btn-danger" onClick={handleDemote} disabled={actionLoading}>
                {actionLoading ? 'Demoting...' : 'Demote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPermissionsDialog && (
        <div className="admin-dialog-overlay" onClick={() => !actionLoading && setShowPermissionsDialog(false)}>
          <div className="admin-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Permissions</h3>
            <p className="admin-dialog-desc">
              Update permissions for <strong>{targetUser.username}</strong>.
            </p>

            <div className="admin-permissions-form">
              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={editPermissions.manageUsers}
                  onChange={(e) => setEditPermissions({ ...editPermissions, manageUsers: e.target.checked })}
                  disabled={actionLoading}
                />
                <span className="admin-checkbox-text">
                  <strong>manageUsers</strong>
                  <span className="admin-checkbox-desc">View and manage user accounts</span>
                </span>
              </label>

              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={editPermissions.managePlaylists}
                  onChange={(e) => setEditPermissions({ ...editPermissions, managePlaylists: e.target.checked })}
                  disabled={actionLoading}
                />
                <span className="admin-checkbox-text">
                  <strong>managePlaylists</strong>
                  <span className="admin-checkbox-desc">Create, edit, and delete playlists</span>
                </span>
              </label>

              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={editPermissions.manageSongs}
                  onChange={(e) => setEditPermissions({ ...editPermissions, manageSongs: e.target.checked })}
                  disabled={actionLoading}
                />
                <span className="admin-checkbox-text">
                  <strong>manageSongs</strong>
                  <span className="admin-checkbox-desc">Add, edit, and remove songs</span>
                </span>
              </label>
            </div>

            {actionError && <div className="admin-error">{actionError}</div>}

            <div className="admin-dialog-actions">
              <button className="admin-btn-secondary" onClick={() => setShowPermissionsDialog(false)} disabled={actionLoading}>
                Cancel
              </button>
              <button className="admin-btn-primary" onClick={handleSavePermissions} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && targetUser && (
        <div className="admin-dialog-overlay" onClick={() => setShowDeleteDialog(false)}>
          <div className="admin-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete User Account</h3>
            <p className="admin-dialog-desc">
              Are you sure you want to permanently delete this account? This action cannot be undone.
            </p>

            <div className="admin-delete-info">
              <div className="admin-delete-info-row">
                <span className="admin-delete-info-label">Username:</span>
                <span className="admin-delete-info-value">{targetUser.username}</span>
              </div>
              <div className="admin-delete-info-row">
                <span className="admin-delete-info-label">Role:</span>
                <span
                  className={`admin-list-badge ${
                    targetUser.role === 'admin' ? 'admin' : targetUser.role === 'subadmin' ? 'subadmin' : 'user'
                  }`}
                >
                  {targetUser.role}
                </span>
              </div>
              <div className="admin-delete-info-row">
                <span className="admin-delete-info-label">UID:</span>
                <span className="admin-delete-info-value admin-delete-uid">{targetUser.uid}</span>
              </div>
            </div>

            <p className="admin-dialog-desc admin-delete-warning">
              This will remove the user's Firebase Authentication account and all their Yundo data including playlists and songs.
            </p>

            <div className="admin-create-command">
              <label className="admin-label">Command to run in terminal</label>
              <pre className="admin-command-block">{getDeleteScript(targetUser.uid)}</pre>
            </div>

            <div className="admin-dialog-actions">
              <button className="admin-btn-secondary" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </button>
              <button className="admin-btn-danger" onClick={handleDeleteCopy}>
                {deleteCopied ? 'Copied!' : 'Copy Command'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deletePlaylistId !== null}
        title="Delete playlist?"
        message="This will permanently remove the playlist and all of its songs."
        loading={deletingPlaylist}
        onCancel={() => setDeletePlaylistId(null)}
        onConfirm={() => {
          if (deletePlaylistId) void handleDeletePlaylist(deletePlaylistId);
        }}
      />

      <ConfirmDialog
        open={showSetPasswordDialog}
        title="Set new password for this user?"
        message="This will replace the user's current password."
        confirmLabel="Set Password"
        loading={passwordSetLoading}
        onCancel={() => !passwordSetLoading && setShowSetPasswordDialog(false)}
        onConfirm={() => void handleSetPassword()}
      />
    </div>
  );
};

export default AdminUserDetailPage;
