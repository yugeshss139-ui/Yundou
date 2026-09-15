import React, { useState } from 'react';
import { CompassIcon } from '../components/Icons';
import EmptyState from '../components/EmptyState';
import '../styles/Discover.css';

const categories = ['All', 'Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical', 'R&B', 'Indie'];

const DiscoverPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="discover-page">
      <div className="page-header">
        <h1>Discover</h1>
      </div>

      <div className="discover-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search songs, artists, albums..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="discover-categories">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`discover-category ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <EmptyState
        icon={<CompassIcon />}
        title="Nothing to discover yet"
        description="Recommendations and trending music will appear here once songs are added to your account."
      />
    </div>
  );
};

export default DiscoverPage;
