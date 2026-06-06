import { useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useUploadStore } from '../stores/uploadStore';
import { useDriveStore } from '../stores/driveStore';
import { FileCard } from '../components/FileCard';
import { DriveFolderCard } from '../components/DriveFolderCard';
import { DropZone } from '../components/DropZone';
import { UploadModal } from '../components/UploadModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { Upload, ArrowLeft, FolderPlus, X } from 'lucide-react';
import { getDriveColor } from '../lib/utils';
import { useToastStore } from '../stores/toastStore';
import { useMergedDrive } from '../hooks/useMergedDrive';
import { api } from '../lib/api';
import type { FileEntry } from '../types';

export function FilesPage() {
  const { folderId = 'root' } = useParams<{ folderId: string }>();
  const [searchParams] = useSearchParams();
  const driveIdParam = searchParams.get('driveId');
  const navigate = useNavigate();
  
  const drives = useDriveStore(state => state.drives);
  const { showModal, setShowModal } = useUploadStore();
  const { addToast } = useToastStore();
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { subfolders, files, isLoading, errorDrives, refresh } = useMergedDrive(folderId, driveIdParam);

  const handleDeleteFile = async (id: string) => {
    if (confirm('Delete this file permanently from Google Drive?')) {
      try {
        await api.deleteFile(id);
        addToast('success', 'File deleted');
        refresh();
      } catch {
        addToast('error', 'Failed to delete file');
      }
    }
  };

  const handleRenameFile = async (id: string, name: string) => {
    try {
      await api.renameFile(id, name);
      addToast('success', 'File renamed');
      refresh();
    } catch {
      addToast('error', 'Failed to rename file');
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt('New folder name:');
    if (name?.trim()) {
      try {
        await api.createFolder(name.trim(), folderId === 'root' ? undefined : folderId);
        refresh();
      } catch {
        addToast('error', 'Failed to create folder');
      }
    }
  };

  const getDriveInfo = (driveAccountId?: string) => {
    if (!driveAccountId) return { drive: null, index: 0 };
    const index = drives.findIndex(d => d.id === driveAccountId);
    if (index === -1) return { drive: drives[0] || null, index: 0 };
    return { drive: drives[index], index };
  };

  const isRoot = folderId === 'root';

  return (
    <DropZone>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {!isRoot && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginRight: 'var(--space-xs)' }}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>
            {isRoot ? 'All Files' : 'Folder'}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Filter files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 200, paddingRight: 28 }}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleCreateFolder}>
            <FolderPlus size={16} /> New Folder
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Upload size={16} /> Upload
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
          <div className="spinner" />
        </div>
      ) : drives.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-tertiary)' }}>
          <p style={{ marginBottom: 'var(--space-sm)' }}>No drives connected yet</p>
          <Link to="/settings" className="btn btn-primary">
            Connect Google Drive
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 'var(--space-sm)' }}>
          {subfolders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map((folder) => {
            const { drive, index } = getDriveInfo(folder.driveAccountId);
            return (
              <DriveFolderCard
                key={folder.googleFolderId}
                folder={folder}
                driveColor={getDriveColor(index)}
                driveEmail={drive?.email || ''}
                hasError={drive ? errorDrives.has(drive.id) : false}
                onClick={() => {
                  if (!folder.isSynced) return;
                  const targetDriveId = folder.driveAccountId;
                  navigate(`/files/${folder.googleFolderId}${targetDriveId ? `?driveId=${targetDriveId}` : ''}`);
                }}
              />
            );
          })}

          {subfolders.length > 0 && files.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-xs) var(--space-md)' }} />
          )}

          {files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map((file) => {
            const { drive, index } = getDriveInfo(file.driveAccountId);
            return (
              <FileCard
                key={file.id}
                file={file}
                driveColor={getDriveColor(index)}
                driveEmail={drive?.email || ''}
                onDelete={handleDeleteFile}
                onRename={handleRenameFile}
                onPreview={setPreviewFile}
              />
            );
          })}

          {subfolders.length === 0 && files.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-tertiary)' }}>
              <p style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-sm)' }}>📂</p>
              <p>This folder is empty</p>
              <p style={{ fontSize: 'var(--font-size-sm)' }}>Drag &amp; drop files here or click Upload</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showModal && <UploadModal folderId={folderId} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); refresh(); }} />}
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </DropZone>
  );
}
