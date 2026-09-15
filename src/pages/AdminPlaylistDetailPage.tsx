import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { getUser, type UserProfile } from '../services/userService';
import {
  getPlaylist,
  listSongs,
  addSong,
  updateSong,
  deleteSong,
  renamePlaylist,
  type Playlist,
  type Song,
} from '../services/playlistService';
import { uploadAudio, deleteAudio, isAudioFile } from '../services/storageService';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import '../styles/Playlist.css';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface SongFormData {
  title: string;
  artist: string;
  album: string;
  duration: string;
  audioUrl: string;
}

const emptySongForm: SongFormData = {
  title: '',
  artist: '',
  album: '',
  duration: '',
  audioUrl: '',
};

const AdminPlaylistDetailPage: React.FC = () => {
  const { uid, playlistId } = useParams<{ uid: string; playlistId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuthContext();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renamingLoading, setRenamingLoading] = useState(false);

  const [showAddSong, setShowAddSong] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [songForm, setSongForm] = useState<SongFormData>(emptySongForm);
  const [songLoading, setSongLoading] = useState(false);
  const [songError, setSongError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { currentSong, isPlaying, playSong } = usePlayer();

  const canManageSongs = isAdmin || (targetUser?.role === 'subadmin' && targetUser?.permissions?.manageSongs);
  const canManagePlaylists = isAdmin || (targetUser?.role === 'subadmin' && targetUser?.permissions?.managePlaylists);

  useEffect(() => {
    if (!uid || !playlistId) return;

    async function load() {
      try {
        const userData = await getUser(uid!);
        setTargetUser(userData);

        const playlistData = await getPlaylist(uid!, playlistId!);
        if (!playlistData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setPlaylist(playlistData);
        const songsData = await listSongs(uid!, playlistId!);
        setSongs(songsData);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [uid, playlistId]);

  const reloadSongs = async () => {
    if (!uid || !playlistId) return;
    const songsData = await listSongs(uid, playlistId);
    setSongs(songsData);
    const playlistData = await getPlaylist(uid, playlistId);
    if (playlistData) setPlaylist(playlistData);
  };

  const handleRename = async () => {
    if (!uid || !playlistId || !renameValue.trim()) return;
    setRenamingLoading(true);
    try {
      await renamePlaylist(uid, playlistId, renameValue.trim());
      setPlaylist((prev) => (prev ? { ...prev, name: renameValue.trim() } : prev));
      setIsRenaming(false);
      setRenameValue('');
    } catch {
    } finally {
      setRenamingLoading(false);
    }
  };

  const resetSongForm = () => {
    setSongForm(emptySongForm);
    setEditingSongId(null);
    setSongError('');
    setShowAddSong(false);
    setSelectedFile(null);
    setUploadStatus('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEditForm = (song: Song) => {
    setSongForm({
      title: song.title,
      artist: song.artist,
      album: song.album ?? '',
      duration: song.duration > 0 ? String(song.duration) : '',
      audioUrl: song.audioUrl ?? '',
    });
    setEditingSongId(song.id);
    setShowAddSong(false);
    setSongError('');
    setSelectedFile(null);
    setUploadStatus('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSongSubmit = async () => {
    if (!uid || !playlistId) return;
    if (!songForm.title.trim() || !songForm.artist.trim()) {
      setSongError('Title and artist are required.');
      return;
    }

    setSongLoading(true);
    setSongError('');
    setUploadStatus('');

    const durationNum = songForm.duration ? parseInt(songForm.duration, 10) : 0;
    if (songForm.duration && (isNaN(durationNum) || durationNum < 0)) {
      setSongError('Duration must be a valid number (seconds).');
      setSongLoading(false);
      return;
    }

    let uploadedObjectKey: string | undefined;

    try {
      if (!selectedFile) {
        setSongError('Please select an audio file.');
        return;
      }

      uploadedObjectKey = await uploadAudio(selectedFile, (status) => setUploadStatus(status));

      if (editingSongId) {
        await updateSong(uid, playlistId, editingSongId, {
          title: songForm.title,
          artist: songForm.artist,
          album: songForm.album,
          duration: durationNum,
          audioUrl: songForm.audioUrl || undefined,
          audioObjectKey: uploadedObjectKey,
        });
      } else {
        await addSong(uid, playlistId, {
          title: songForm.title,
          artist: songForm.artist,
          album: songForm.album,
          duration: durationNum,
          audioUrl: songForm.audioUrl || undefined,
          audioObjectKey: uploadedObjectKey,
        });
      }

      resetSongForm();
      await reloadSongs();
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      setSongError(`Save failed [${err.code || 'unknown'}]: ${err.message || 'Unknown error'}`);

      if (uploadedObjectKey && !editingSongId) {
        try {
          await deleteAudio(uploadedObjectKey);
        } catch {
        }
      }
    } finally {
      setSongLoading(false);
      setUploadStatus('');
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!uid || !playlistId) return;

    setSongLoading(true);
    setSongError('');
    try {
      const song = songs.find((item) => item.id === songId);
      if (song?.audioObjectKey) await deleteAudio(song.audioObjectKey);

      await deleteSong(uid, playlistId, songId);
      setDeleteConfirmId(null);
      await reloadSongs();
    } catch {
      setSongError('Failed to delete song. Check permissions.');
    } finally {
      setSongLoading(false);
    }
  };

  const canPlaySong = (s: Song) => !!s.audioObjectKey;

  if (loading) {
    return (
      <div className="admin-page admin-music-page">
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          Loading playlist...
        </div>
      </div>
    );
  }

  if (notFound || !playlist || !uid) {
    return (
      <div className="admin-page admin-music-page">
        <button className="admin-back-link" onClick={() => navigate(`/admin/users/${uid || ''}`)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6" />
          </svg>
          Back to user
        </button>
        <EmptyState
          icon={
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          }
          title="Playlist not found"
          description="This playlist may have been deleted."
        />
      </div>
    );
  }

  return (
    <div className="admin-page admin-music-page">
      <button className="admin-back-link" onClick={() => navigate(`/admin/users/${uid}`)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15,18 9,12 15,6" />
        </svg>
        Back to user
      </button>

      <div className="admin-playlist-hero">
        <div className="admin-playlist-hero-art">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>

        <div className="admin-playlist-hero-meta">
          {isRenaming ? (
            <div className="admin-rename-form">
              <input
                type="text"
                className="admin-input admin-rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') {
                    setIsRenaming(false);
                    setRenameValue('');
                  }
                }}
                autoFocus
                disabled={renamingLoading}
              />
              <div className="admin-rename-actions">
                <button
                  className="admin-btn-secondary"
                  onClick={() => {
                    setIsRenaming(false);
                    setRenameValue('');
                  }}
                  disabled={renamingLoading}
                >
                  Cancel
                </button>
                <button
                  className="admin-btn-primary"
                  onClick={handleRename}
                  disabled={renamingLoading || !renameValue.trim()}
                >
                  {renamingLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="admin-playlist-hero-title-row">
                <h1 className="admin-playlist-title">{playlist.name}</h1>
                {canManagePlaylists && (
                  <button
                    className="admin-hero-action"
                    title="Edit playlist"
                    onClick={() => {
                      setRenameValue(playlist.name);
                      setIsRenaming(true);
                    }}
                    disabled={renamingLoading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="admin-playlist-hero-sub">
                <span className="admin-playlist-count">{playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}</span>
              </div>
            </>
          )}
        </div>

        <div className="admin-playlist-hero-actions">
          {canManageSongs && !showAddSong && !editingSongId && (
            <button
              className="admin-btn-primary admin-hero-addbtn"
              onClick={() => {
                resetSongForm();
                setShowAddSong(true);
              }}
              disabled={songLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Song
            </button>
          )}
        </div>
      </div>

      <div className="admin-music-content">
        <div className="admin-section">
          <div className="admin-section-header">
            <h2 className="admin-section-title">Songs</h2>
          </div>

          {songError && <div className="admin-error">{songError}</div>}

          {(showAddSong || editingSongId) && (
            <div className="admin-create-form admin-create-form--modal" role="dialog" aria-modal="true">
              <div className="admin-create-form-header">
                <h3>{editingSongId ? 'Edit Song' : 'Add New Song'}</h3>
                <button className="admin-icon-close" type="button" onClick={resetSongForm} disabled={songLoading} aria-label="Close">
                  ×
                </button>
              </div>

              <div className="admin-song-form-grid">
                <div className="admin-form-group">
                  <label className="admin-label">Title *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Song title"
                    value={songForm.title}
                    onChange={(e) => setSongForm({ ...songForm, title: e.target.value })}
                    autoFocus
                    disabled={songLoading}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Artist *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Artist name"
                    value={songForm.artist}
                    onChange={(e) => setSongForm({ ...songForm, artist: e.target.value })}
                    disabled={songLoading}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Album</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Album name (optional)"
                    value={songForm.album}
                    onChange={(e) => setSongForm({ ...songForm, album: e.target.value })}
                    disabled={songLoading}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Duration (seconds)</label>
                  <input
                    type="number"
                    className="admin-input"
                    placeholder="e.g. 240"
                    value={songForm.duration}
                    onChange={(e) => setSongForm({ ...songForm, duration: e.target.value })}
                    disabled={songLoading}
                    min="0"
                  />
                </div>

                <div className="admin-form-group admin-form-full-width">
                  <label className="admin-label">Audio File</label>

                  <div
                    className="admin-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (!f) return;
                    if (!isAudioFile(f)) {
                      setSongError('Invalid file type. Please select an mp3, wav, m4a, or flac audio file.');
                      return;
                    }
                    setSelectedFile(f);
                    setSongError('');
                  }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="admin-dropzone-input"
                      accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/flac,audio/x-flac,audio/mp4,audio/x-m4a,.mp3,.wav,.m4a,.flac"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!isAudioFile(file)) {
                          setSongError('Invalid file type. Please select an mp3, wav, m4a, or flac audio file.');
                          e.target.value = '';
                          return;
                        }
                        setSelectedFile(file);
                        setSongError('');
                      }}
                      disabled={songLoading}
                    />

                    <div className="admin-dropzone-inner">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <div>
                        <div className="admin-dropzone-title">Drop audio here</div>
                        <div className="admin-dropzone-sub">or click to choose a file</div>
                      </div>
                    </div>

                    {selectedFile && (
                      <div className="admin-file-pill">
                        <span className="admin-file-pill-name">{selectedFile.name}</span>
                        <button
                          type="button"
                          className="admin-file-pill-remove"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          disabled={songLoading}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>

                  {uploadStatus && <div className="admin-upload-status">{uploadStatus}</div>}
                </div>
              </div>

              <div className="admin-create-actions">
                <button className="admin-btn-secondary" onClick={resetSongForm} disabled={songLoading}>Cancel</button>
                <button
                  className="admin-btn-primary"
                  onClick={handleSongSubmit}
                  disabled={songLoading || !songForm.title.trim() || !songForm.artist.trim() || !selectedFile}
                >
                  {songLoading ? uploadStatus || 'Saving...' : editingSongId ? 'Save Changes' : 'Add Song'}
                </button>
              </div>
            </div>
          )}

          {!loading && songs.length === 0 && !showAddSong && !editingSongId && (
            <EmptyState
              icon={<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16" fill="currentColor" /></svg>}
              title="No songs yet"
              description={canManageSongs ? 'Add songs to this playlist to get started.' : 'No songs have been added to this playlist yet.'}
            />
          )}

          {songs.length > 0 && (
            <div className="admin-song-table-wrap">
              <table className="admin-song-table">
                <thead>
                  <tr>
                    <th className="col-track">#</th>
                    <th className="col-title">Title</th>
                    <th className="col-artist">Artist</th>
                    <th className="col-album">Album</th>
                    <th className="col-duration">Duration</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {songs.map((song, index) => {
                    const isCurrent = currentSong?.id === song.id;
                    const canPlay = canPlaySong(song);
                    return (
                      <tr key={song.id} className={`admin-song-row ${isCurrent ? 'is-current' : ''}`}> 
                        <td className="col-track">{index + 1}</td>
                        <td className="col-title">
                          <div className="cell-title">
                            <div className="cell-title-main">{song.title}</div>
                          </div>
                        </td>
                        <td className="col-artist">{song.artist}</td>
                        <td className="col-album">{song.album || '—'}</td>
                        <td className="col-duration">{formatDuration(song.duration)}</td>
                        <td className="col-actions">
                          <div className="cell-actions">
                            <button
                              className={`admin-song-playbtn ${isCurrent && isPlaying ? 'is-playing' : ''}`}
                              onClick={() => playSong(song, songs)}
                              disabled={songLoading || !canPlay}
                              aria-label={isCurrent && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
                              title={isCurrent && isPlaying ? 'Pause' : 'Play'}
                            >
                              {isCurrent && isPlaying ? 'Pause' : 'Play'}
                            </button>

                            {canManageSongs && (
                              <>
                                <button
                                  className="admin-song-iconbtn"
                                  onClick={() => openEditForm(song)}
                                  title="Edit song"
                                  disabled={songLoading || showAddSong || editingSongId !== null}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                                <button
                                  className="admin-song-iconbtn admin-song-iconbtn--danger"
                                  onClick={() => setDeleteConfirmId(song.id)}
                                  title="Delete song"
                                  disabled={songLoading || showAddSong || editingSongId !== null}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3,6 5,6 21,6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        title="Delete song?"
        message={songError || 'This action permanently removes the song and its Cloudinary audio.'}
        loading={songLoading}
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) void handleDeleteSong(deleteConfirmId);
        }}
      />
    </div>
  );
};

export default AdminPlaylistDetailPage;
