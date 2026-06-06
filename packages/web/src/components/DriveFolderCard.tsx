import { Folder, AlertTriangle } from 'lucide-react';
import type { DriveFolder } from '../types';

interface DriveFolderCardProps {
  folder: DriveFolder;
  driveColor: string;
  driveEmail: string;
  hasError?: boolean;
  onClick: () => void;
}

export function DriveFolderCard({ folder, driveColor, driveEmail, hasError, onClick }: DriveFolderCardProps) {
  const initial = driveEmail.charAt(0).toUpperCase();

  return (
    <button
      className={`folder-card ${!folder.isSynced ? 'unsynced' : ''} ${hasError ? 'error' : ''}`}
      onClick={onClick}
      title={!folder.isSynced ? 'Click to load folder contents' : folder.name}
    >
      <div className="account-badge" style={{ backgroundColor: `${driveColor}40`, color: driveColor, borderColor: `${driveColor}60` }} title={driveEmail}>
        {initial}
      </div>
      
      <span className="folder-icon">
        {hasError ? <AlertTriangle size={20} color="var(--accent-warning)" /> : <Folder size={20} />}
      </span>
      <span className="folder-name truncate">{folder.name}</span>
      
      {!folder.isSynced && !hasError && (
        <span className="unsynced-dot" title="Not yet loaded" />
      )}

      <style>{`
        .folder-card {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-md);
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          text-align: left;
        }
        .folder-card:hover { border-color: var(--border-strong); transform: translateY(-1px); }
        .folder-card.unsynced { background: var(--bg-body); border-style: dashed; }
        .folder-card.error { border-color: var(--accent-warning); }
        .folder-icon { color: var(--text-tertiary); display: flex; }
        .folder-name { font-weight: 500; font-size: var(--font-size-sm); flex: 1; }
        .unsynced-dot { width: 8px; height: 8px; background: var(--accent-primary); border-radius: 50%; }
        
        .account-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </button>
  );
}
