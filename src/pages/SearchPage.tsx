import React, { useState, useCallback } from 'react';
import { SearchIcon, MusicIcon, PlayIcon } from '../components/Icons';
import EmptyState from '../components/EmptyState';
import { useAuthContext } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { searchSongs, type SongWithPlaylist } from '../services/playlistService';
import '../styles/Search.css';

const SearchPage: React.FC = () => {
  const { user } = useAuthContext();
  const { playSong } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SongWithPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !user) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const data = await searchSongs(user.uid, query);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return (
    <div className="search-page">
      <div className="page-header">
        <h1>Search</h1>
      </div>

      <div className="search-input-wrapper">
        <SearchIcon />
        <input
          type="text"
          className="search-input"
          placeholder="Search songs, artists, albums..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {loading && (
        <div className="search-loading">Searching...</div>
      )}

      {!loading && hasSearched && results.length > 0 && (
        <div className="search-results">
          {results.map((song) => {
            const hasAudio = !!(song.audioObjectKey || song.audioUrl);
            return (
              <div key={`${song.playlistId}-${song.id}`} className="search-result-item">
                <div className="search-result-icon">
                  <MusicIcon />
                </div>
                <div className="search-result-info">
                  <span className="search-result-title">{song.title}</span>
                  <span className="search-result-subtitle">{song.artist}{song.album ? ` · ${song.album}` : ''}</span>
                  <span className="search-result-playlist-tag">{song.playlistName}</span>
                </div>
                {hasAudio && (
                  <button
                    className="search-result-play-btn"
                    onClick={() => playSong(song)}
                    title="Play"
                  >
                    <PlayIcon size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <EmptyState
          icon={<MusicIcon />}
          title="No songs found"
          description="No songs match your search. Try different keywords."
        />
      )}

      {!hasSearched && (
        <EmptyState
          icon={<SearchIcon />}
          title="Search your music"
          description="Find songs across all your playlists. Start typing to search."
        />
      )}
    </div>
  );
};

export default SearchPage;
