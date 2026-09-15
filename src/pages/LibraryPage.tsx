import React from 'react';
import { LibraryIcon } from '../components/Icons';
import EmptyState from '../components/EmptyState';

const LibraryPage: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <h1>Library</h1>
      </div>
      <EmptyState
        icon={<LibraryIcon />}
        title="Your library is empty"
        description="Songs and albums you save will appear here. Start building your collection."
      />
    </div>
  );
};

export default LibraryPage;
