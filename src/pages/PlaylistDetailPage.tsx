import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { ListIcon, MusicIcon, PlayIcon, PauseIcon } from '../components/Icons';
import EmptyState from '../components/EmptyState';
import {
  getPlaylist,
  listSongs,
  type Playlist,
  type Song,
} from '../services/playlistService';
import '../styles/Playlist.css';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const PlaylistDetailPage: React.FC = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong } = usePlayer();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user || !playlistId) return;

    async function load() {
      try {
        const data = await getPlaylist(user!.uid, playlistId!);
        if (!data) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setPlaylist(data);
        const songsData = await listSongs(user!.uid, playlistId!);
        setSongs(songsData);
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, playlistId]);

  if (loading) {
    return (
      <div className="playlist-page">
        <div className="search-loading">Loading playlist...</div>
      </div>
    );
  }

  if (notFound || !playlist) {
    return (
      <div className="playlist-page">
        <button className="playlist-back-btn" onClick={() => navigate('/playlists')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6" />
          </svg>
          Playlists
        </button>
        <EmptyState
          icon={<ListIcon />}
          title="Playlist not found"
          description="This playlist may have been deleted."
        />
      </div>
    );
  }

  return (
    <div className="playlist-page">
      <button className="playlist-back-btn" onClick={() => navigate('/playlists')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15,18 9,12 15,6" />
        </svg>
        Playlists
      </button>

      <div className="playlist-detail-header">
        <div className="playlist-detail-icon">
          <MusicIcon size={32} />
        </div>
        <div className="playlist-detail-info">
          <h1 className="playlist-detail-name">{playlist.name}</h1>
          <span className="playlist-detail-count">
            {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}
          </span>
        </div>
      </div>

      {songs.length === 0 && (
        <EmptyState
          icon={<MusicIcon />}
          title="No songs yet"
          description="Add songs to this playlist to start listening."
        />
      )}

      {songs.length > 0 && (
        <div className="song-list">
          {songs.map((song, index) => {
            const isCurrentSong = currentSong?.id === song.id;
            const isCurrentPlaying = isCurrentSong && isPlaying;
            const hasAudio = Boolean(song.audioObjectKey);

            const handlePlayClick = (s: typeof song) => {
              playSong(s, songs);
            };

            return (
              <div
                key={song.id}
                className={`song-item ${isCurrentSong ? 'song-item-active' : ''}`}
              >
                <span className="song-item-number">
                  {isCurrentSong && isCurrentPlaying ? (
                    <span className="song-item-eq">
                      <span className="song-item-eq-bar" />
                      <span className="song-item-eq-bar" />
                      <span className="song-item-eq-bar" />
                    </span>
                  ) : isCurrentSong && hasAudio ? (
                    <button
                      className="song-item-play-btn"
                      onClick={() => handlePlayClick(song)}
                      title="Play"
                    >
                      <PlayIcon size={12} />
                    </button>
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="song-item-info">
                  <span className="song-item-title">{song.title}</span>
                  <span className="song-item-artist">{song.artist}</span>
                </div>
                <span className="song-item-duration">{formatDuration(song.duration)}</span>
                {hasAudio ? (
                  <button
                    className="song-item-play-side"
                    onClick={() => handlePlayClick(song)}
                    title={isCurrentPlaying ? 'Pause' : 'Play'}
                    aria-label={isCurrentPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
                  >
                    {isCurrentPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                  </button>
                ) : (
                  <span className="song-item-audio-unavailable">Audio unavailable</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlaylistDetailPage;
