import React from 'react';
import '../styles/Dialog.css';

interface LogoutDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const LogoutDialog: React.FC<LogoutDialogProps> = ({ open, onCancel, onConfirm }) => {
  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Logout</h2>
        <p className="dialog-message">Are you sure you want to logout?</p>
        <div className="dialog-actions">
          <button className="dialog-btn dialog-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="dialog-btn dialog-btn-confirm" onClick={onConfirm}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutDialog;
