import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { ListIcon, MusicIcon, PlusIcon } from '../components/Icons';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  listPlaylists,
  createPlaylist,
  deletePlaylist,
  type Playlist,
} from '../services/playlistService';
import '../styles/Playlist.css';

const PlaylistPage: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletePlaylistId, setDeletePlaylistId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const data = await listPlaylists(user!.uid);
      setPlaylists(data);
      setLoading(false);
    }

    load();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !newPlaylistName.trim()) return;

    setCreating(true);
    try {
      await createPlaylist(user!.uid, newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreate(false);
      // Reload playlists
      const data = await listPlaylists(user!.uid);
      setPlaylists(data);
    } catch {
      // Handle error silently
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (playlistId: string) => {
    if (!user) return;

    setDeleting(true);
    try {
      await deletePlaylist(user.uid, playlistId);
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    } catch {
      // Handle error silently
    } finally {
      setDeleting(false);
      setDeletePlaylistId(null);
    }
  };

  return (
    <div className="playlist-page">
      <div className="page-header">
        <h1>Playlists</h1>
      </div>

      {!showCreate && (
        <button
          className="playlist-action-btn primary"
          onClick={() => setShowCreate(true)}
        >
          <PlusIcon />
          New Playlist
        </button>
      )}

      {showCreate && (
        <div className="playlist-create">
          <input
            type="text"
            className="playlist-create-input"
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
          <div className="playlist-create-actions">
            <button
              className="dialog-btn dialog-btn-cancel"
              onClick={() => {
                setShowCreate(false);
                setNewPlaylistName('');
              }}
              disabled={creating}
            >
              Cancel
            </button>
            <button
              className="dialog-btn dialog-btn-confirm playlist-create-btn"
              onClick={handleCreate}
              disabled={creating || !newPlaylistName.trim()}
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          Loading playlists...
        </div>
      )}

      {!loading && playlists.length === 0 && !showCreate && (
        <EmptyState
          icon={<ListIcon />}
          title="No playlists yet"
          description="Create your first playlist to start organizing your music."
        />
      )}

      {!loading && playlists.length > 0 && (
        <div className="playlist-list">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="playlist-item"
              onClick={() => navigate(`/playlists/${playlist.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate(`/playlists/${playlist.id}`);
                }
              }}
            >
              <div className="playlist-item-icon">
                <MusicIcon />
              </div>
              <div className="playlist-item-info">
                <span className="playlist-item-name">{playlist.name}</span>
                <span className="playlist-item-count">
                  {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}
                </span>
              </div>
              <button
                className="playlist-item-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletePlaylistId(playlist.id);
                }}
                title="Delete playlist"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3,6 5,6 21,6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deletePlaylistId !== null}
        title="Delete playlist?"
        message="This will permanently remove the playlist and all of its songs."
        loading={deleting}
        onCancel={() => setDeletePlaylistId(null)}
        onConfirm={() => {
          if (deletePlaylistId) void handleDelete(deletePlaylistId);
        }}
      />
    </div>
  );
};

export default PlaylistPage;
