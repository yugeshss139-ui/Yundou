import React from 'react';
import '../styles/EmptyState.css';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description }) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {icon}
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
};

export default EmptyState;
