import { useState, useEffect, useCallback } from 'react';
import { Folder, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { FileCard } from './FileCard';
import { getDriveColor } from '../lib/utils';
import { useToastStore } from '../stores/toastStore';
import { useDriveStore } from '../stores/driveStore';
import type { DriveFolder, FileEntry } from '../types';

interface BreadcrumbEntry {
  googleFolderId: string;
  name: string;
}

interface DriveFolderBrowserProps {
  driveId: string;
  driveEmail: string;
  driveIndex: number;
}

export function DriveFolderBrowser({ driveId, driveEmail, driveIndex }: DriveFolderBrowserProps) {
  const { drives } = useDriveStore();
  const { addToast } = useToastStore();

  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([
    { googleFolderId: 'root', name: 'My Drive' },
  ]);
  const [subfolders, setSubfolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorFolders, setErrorFolders] = useState<Set<string>>(new Set());

  const currentFolderId = breadcrumb[breadcrumb.length - 1].googleFolderId;

  const loadFolder = useCallback(async (googleFolderId: string) => {
    setIsLoading(true);
    try {
      const data = await api.getDriveFolderContents(driveId, googleFolderId);
      setSubfolders(data.subfolders);
      setFiles(data.files as unknown as FileEntry[]);
    } catch {
      addToast('error', 'Gagal memuat folder');
    } finally {
      setIsLoading(false);
    }
  }, [driveId, addToast]);

  useEffect(() => {
    loadFolder(currentFolderId);
  }, [currentFolderId, loadFolder]);

  const handleOpenFolder = async (folder: DriveFolder) => {
    if (errorFolders.has(folder.googleFolderId)) return;

    if (!folder.isSynced) {
      // Lazy sync
      setIsLoading(true);
      try {
        const data = await api.syncDriveFolder(driveId, folder.googleFolderId);
        setBreadcrumb(prev => [...prev, { googleFolderId: folder.googleFolderId, name: folder.name }]);
        setSubfolders(data.subfolders);
        setFiles(data.files as unknown as FileEntry[]);
      } catch {
        addToast('error', `Gagal memuat folder "${folder.name}", coba lagi`);
        setErrorFolders(prev => new Set(prev).add(folder.googleFolderId));
      } finally {
        setIsLoading(false);
      }
    } else {
      setBreadcrumb(prev => [...prev, { googleFolderId: folder.googleFolderId, name: folder.name }]);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === breadcrumb.length - 1) return; // Already at this level
    setBreadcrumb(prev => prev.slice(0, index + 1));
  };

  const driveColor = getDriveColor(driveIndex);

  return (
    <div className="drive-folder-browser">
      {/* Header */}
      <div className="dfb-header">
        <div className="dfb-drive-tag" style={{ borderColor: driveColor, color: driveColor }}>
          {driveEmail}
        </div>
        {/* Breadcrumb */}
        <nav className="dfb-breadcrumb" aria-label="Folder navigation">
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.googleFolderId} className="dfb-breadcrumb-item">
              {i > 0 && <ChevronRight size={14} className="dfb-breadcrumb-sep" />}
              <button
                className={`dfb-breadcrumb-btn${i === breadcrumb.length - 1 ? ' active' : ''}`}
                onClick={() => handleBreadcrumbClick(i)}
                disabled={i === breadcrumb.length - 1}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>
      </div>

      {isLoading && (
        <div className="dfb-loading">
          <Loader2 size={18} className="dfb-spinner" />
          <span>Memuat...</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Subfolders */}
          {subfolders.length > 0 && (
            <div className="dfb-folder-grid">
              {subfolders.map(folder => (
                <button
                  key={folder.googleFolderId}
                  className={`dfb-folder-card${!folder.isSynced ? ' unsynced' : ''}${errorFolders.has(folder.googleFolderId) ? ' error' : ''}`}
                  onClick={() => handleOpenFolder(folder)}
                  title={!folder.isSynced ? 'Click to load folder contents' : folder.name}
                >
                  <span className="dfb-folder-icon">
                    {errorFolders.has(folder.googleFolderId) ? (
                      <AlertTriangle size={20} color="var(--accent-warning)" />
                    ) : (
                      <Folder size={20} />
                    )}
                  </span>
                  <span className="dfb-folder-name truncate">{folder.name}</span>
                  {!folder.isSynced && !errorFolders.has(folder.googleFolderId) && (
                    <span className="dfb-unsynced-dot" title="Not yet loaded" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          {subfolders.length > 0 && files.length > 0 && (
            <div className="dfb-divider" />
          )}

          {/* Files */}
          {files.map(file => {
            const driveIdx = drives.findIndex(d => d.id === file.driveAccountId);
            return (
              <FileCard
                key={file.id ?? file.googleFileId}
                file={file}
                driveColor={getDriveColor(driveIdx >= 0 ? driveIdx : driveIndex)}
              />
            );
          })}

          {/* Empty state */}
          {subfolders.length === 0 && files.length === 0 && (
            <div className="dfb-empty">
              <span>📂</span>
              <p>This folder is empty</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
