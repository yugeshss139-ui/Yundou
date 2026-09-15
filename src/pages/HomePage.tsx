import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { ListIcon, SearchIcon, MusicIcon } from '../components/Icons';
import { listPlaylists, type Playlist } from '../services/playlistService';
import '../styles/Home.css';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuthContext();
  const [recentPlaylists, setRecentPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    if (!user) return;
    listPlaylists(user.uid).then((pls) => setRecentPlaylists(pls.slice(0, 5)));
  }, [user]);

  return (
    <div className="home-page">
      <h1 className="home-greeting">
        {profile ? `Hello, ${profile.username}` : 'Welcome'}
      </h1>
      <p className="home-subtitle">Your music, your way.</p>

      <div className="home-section">
        <div className="home-cards">
          <button className="home-card" onClick={() => navigate('/search')}>
            <div className="home-card-icon">
              <SearchIcon />
            </div>
            <span className="home-card-label">Search</span>
            <span className="home-card-desc">Find songs across your playlists</span>
          </button>
          <button className="home-card" onClick={() => navigate('/playlists')}>
            <div className="home-card-icon" style={{ background: 'var(--accent-magenta-dim)' }}>
              <ListIcon />
            </div>
            <span className="home-card-label">My Playlists</span>
            <span className="home-card-desc">Browse and organize your music</span>
          </button>
        </div>
      </div>

      {recentPlaylists.length > 0 && (
        <div className="home-section">
          <h2 className="home-section-title">Your Playlists</h2>
          <div className="home-playlists">
            {recentPlaylists.map((pl) => (
              <div
                key={pl.id}
                className="home-playlist-item"
                onClick={() => navigate(`/playlists/${pl.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate(`/playlists/${pl.id}`);
                }}
              >
                <div className="home-playlist-item-icon">
                  <MusicIcon size={16} />
                </div>
                <div className="home-playlist-item-info">
                  <span className="home-playlist-item-name">{pl.name}</span>
                  <span className="home-playlist-item-count">
                    {pl.songCount} {pl.songCount === 1 ? 'song' : 'songs'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="home-atmosphere">
        <MusicIcon />
        <span className="home-atmosphere-text">Your music journey starts here</span>
      </div>
    </div>
  );
};

export default HomePage;
