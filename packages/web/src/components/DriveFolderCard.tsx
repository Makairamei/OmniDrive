import { Folder, AlertTriangle, Loader2, Share2 } from 'lucide-react';
import type { DriveFolder } from '../types';

interface DriveFolderCardProps {
  folder: DriveFolder;
  driveColor: string;
  driveEmail: string;
  hasError?: boolean;
  isSyncing?: boolean;
  onClick: () => void;
  onShare?: () => void;
  isShared?: boolean;
}

export function DriveFolderCard({ folder, driveColor, driveEmail, hasError, isSyncing, onClick, onShare, isShared }: DriveFolderCardProps) {
  const initial = driveEmail ? driveEmail.charAt(0).toUpperCase() : '?';

  return (
    <button
      className={`folder-card ${!folder.isSynced ? 'unsynced' : ''} ${hasError ? 'error' : ''}`}
      onClick={onClick}
      disabled={isSyncing}
      title={!folder.isSynced ? 'Click to load folder contents' : folder.name}
    >
      <div className="account-badge" style={{ backgroundColor: `color-mix(in srgb, ${driveColor} 20%, transparent)`, color: driveColor, borderColor: `color-mix(in srgb, ${driveColor} 40%, transparent)` }} title={driveEmail}>
        {initial}
      </div>
      
      <span className="folder-icon">
        {isSyncing ? (
          <Loader2 size={20} className="dfb-spinner" />
        ) : hasError ? (
          <AlertTriangle size={20} color="var(--accent-warning)" />
        ) : (
          <Folder size={20} />
        )}
      </span>
      <span className="folder-name truncate">
        {folder.name}
        {isShared && <span className="file-badge" style={{ background: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)', marginLeft: 8, padding: '2px 6px', fontSize: 10, borderRadius: 10 }} title="Shared via Public Link"><Share2 size={10} style={{ display: 'inline', marginRight: 2, marginBottom: -1 }} /> Shared</span>}
      </span>
      
      {!folder.isSynced && !hasError && !isSyncing && (
        <span className="unsynced-dot" title="Not yet loaded" />
      )}

      {onShare && (
        <button
          className="btn btn-ghost btn-sm folder-share-btn"
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          title="Share Folder"
        >
          <Share2 size={14} />
        </button>
      )}

      <style>{`
        .folder-card {
          position: relative;
        }
        .folder-share-btn {
          position: absolute;
          right: var(--space-xs);
          top: 50%;
          transform: translateY(-50%);
          opacity: 0;
          transition: opacity var(--transition-fast);
        }
        .folder-card:hover .folder-share-btn {
          opacity: 1;
        }
      `}</style>
    </button>
  );
}
