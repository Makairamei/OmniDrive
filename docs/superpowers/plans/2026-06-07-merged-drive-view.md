# Merged Drive View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dual-tab file view with a single, unified interface that merges files from all connected Google Drive accounts at the root level, featuring dynamic Gmail badges.

**Architecture:** A new custom hook `useMergedDrive` will fetch and merge contents from all drives when at the root, and fetch from a specific drive when navigating sub-folders. The UI will render updated cards with glassmorphism account badges and entirely remove the old Virtual Folders system.

**Tech Stack:** React, Zustand, React Router (SearchParams), CSS (Glassmorphism)

---

### Task 1: Component Upgrades (Badges & Glassmorphism)

**Files:**
- Modify: `packages/web/src/components/FileCard.tsx`
- Create: `packages/web/src/components/DriveFolderCard.tsx`

- [ ] **Step 1: Update FileCard with Avatar Badge**
Add `driveEmail` to `FileCardProps` and render a glassmorphism avatar in the card.

```tsx
// Edit packages/web/src/components/FileCard.tsx
// Add driveEmail to FileCardProps
interface FileCardProps {
  file: FileEntry;
  driveColor: string;
  driveEmail?: string;
  onDelete?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  onPreview?: (file: FileEntry) => void;
}

// Inside the component, add the badge right after the actions or in the top right corner
export function FileCard({ file, driveColor, driveEmail, onDelete, onRename, onPreview }: FileCardProps) {
  // ... existing code
  const initial = driveEmail ? driveEmail.charAt(0).toUpperCase() : '?';
  
  return (
    <div className="file-card" onClick={handleClick} style={{ position: 'relative' }}>
      {driveEmail && (
        <div className="account-badge" style={{ backgroundColor: `${driveColor}40`, color: driveColor, borderColor: `${driveColor}60` }} title={driveEmail}>
          {initial}
        </div>
      )}
      {/* existing JSX */}
// ...
```

- [ ] **Step 2: Add Glassmorphism CSS**
Append the CSS styles to `FileCard.tsx`'s `<style>` block.

```tsx
// Append to <style> block in packages/web/src/components/FileCard.tsx
          .account-badge {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid;
            z-index: 2;
            transition: opacity 0.2s;
            cursor: help;
          }
```

- [ ] **Step 3: Create DriveFolderCard Component**
Create a new generic component for rendering Drive Folders.

```tsx
// Create packages/web/src/components/DriveFolderCard.tsx
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
```

### Task 2: Core Data Fetching Hook

**Files:**
- Create: `packages/web/src/hooks/useMergedDrive.ts`

- [ ] **Step 1: Write `useMergedDrive` hook**

```ts
// Create packages/web/src/hooks/useMergedDrive.ts
import { useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import { useDriveStore } from '../stores/driveStore';
import { useToastStore } from '../stores/toastStore';
import type { DriveFolder, FileEntry } from '../types';

export function useMergedDrive(folderId: string, driveIdParam: string | null) {
  const { drives } = useDriveStore();
  const { addToast } = useToastStore();
  
  const [subfolders, setSubfolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorDrives, setErrorDrives] = useState<Set<string>>(new Set());

  const fetchContents = useCallback(async () => {
    if (drives.length === 0) {
      setSubfolders([]);
      setFiles([]);
      return;
    }

    setIsLoading(true);
    setSubfolders([]);
    setFiles([]);

    try {
      if (folderId === 'root' || !driveIdParam) {
        // Fetch all drives concurrently at root
        const promises = drives.map(drive => 
          api.getDriveFolderContents(drive.id, 'root')
            .catch(err => {
              addToast('error', `Failed to load drive: ${drive.email}`);
              setErrorDrives(prev => new Set(prev).add(drive.id));
              return { subfolders: [], files: [] };
            })
        );
        
        const results = await Promise.all(promises);
        
        const mergedFolders = results.flatMap(r => r.subfolders);
        const mergedFiles = results.flatMap(r => r.files as FileEntry[]);
        
        setSubfolders(mergedFolders);
        setFiles(mergedFiles);
      } else {
        // Fetch specific sub-folder for a specific drive
        const data = await api.getDriveFolderContents(driveIdParam, folderId);
        setSubfolders(data.subfolders);
        setFiles(data.files as FileEntry[]);
      }
    } catch (err) {
      addToast('error', 'Failed to load folder contents');
    } finally {
      setIsLoading(false);
    }
  }, [folderId, driveIdParam, drives, addToast]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  return { subfolders, files, isLoading, errorDrives, refresh: fetchContents };
}
```

### Task 3: Refactor Upload Modal & Store Dependencies

**Files:**
- Modify: `packages/web/src/components/UploadModal.tsx`

- [ ] **Step 1: Remove `fileStore` Dependency from UploadModal**
Pass an `onSuccess` callback to `UploadModal` instead of hardcoding `fileStore.fetchContents`.

```tsx
// Edit packages/web/src/components/UploadModal.tsx
// 1. Remove `import { useFileStore } from '../stores/fileStore';`
// 2. Add `onSuccess` to props
interface UploadModalProps {
  folderId?: string;
  driveId?: string; // Optional: prepopulate if in a specific drive
  onClose: () => void;
  onSuccess: () => void;
}

// 3. Remove `const { fetchContents } = useFileStore();`
// 4. Update the UploadModal signature
export function UploadModal({ folderId, driveId, onClose, onSuccess }: UploadModalProps) {
// 5. Use driveId in useState: `const [selectedDriveId, setSelectedDriveId] = useState<string>(driveId || '');`
// 6. Call `onSuccess()` inside `handleUpload` instead of `fetchContents()`
```

### Task 4: Refactor FilesPage.tsx

**Files:**
- Modify: `packages/web/src/pages/FilesPage.tsx`

- [ ] **Step 1: Overhaul `FilesPage.tsx`**
Replace `ViewMode` logic entirely. Use the `useMergedDrive` hook and standard layout.

```tsx
// Overwrite packages/web/src/pages/FilesPage.tsx
import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useUploadStore } from '../stores/uploadStore';
import { useDriveStore } from '../stores/driveStore';
import { useMergedDrive } from '../hooks/useMergedDrive';
import { FileCard } from '../components/FileCard';
import { DriveFolderCard } from '../components/DriveFolderCard';
import { DropZone } from '../components/DropZone';
import { UploadModal } from '../components/UploadModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { Upload, ChevronRight, Loader2 } from 'lucide-react';
import { getDriveColor } from '../lib/utils';
import type { FileEntry } from '../types';

export function FilesPage() {
  const { folderId = 'root' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const driveIdParam = searchParams.get('driveId');
  
  const { drives } = useDriveStore();
  const { showModal, setShowModal, addFiles } = useUploadStore();
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);

  const { subfolders, files, isLoading, refresh } = useMergedDrive(folderId, driveIdParam);

  const handleOpenFolder = (googleFolderId: string, accountId: string) => {
    navigate(`/files/${googleFolderId}?driveId=${accountId}`);
  };

  const handleGoRoot = () => {
    navigate('/files');
  };

  return (
    <DropZone>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
        <nav className="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontWeight: 500 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleGoRoot} style={folderId === 'root' ? { pointerEvents: 'none', color: 'var(--text-primary)' } : {}}>All Drives</button>
          {folderId !== 'root' && (
             <>
               <ChevronRight size={16} color="var(--text-tertiary)" />
               <span>Sub-folder</span>
             </>
          )}
        </nav>
        
        <button className="btn btn-primary btn-sm" onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.onchange = () => { if (input.files?.length) addFiles(Array.from(input.files)); };
          input.click();
        }}>
          <Upload size={16} /> Upload
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}><Loader2 className="spinning" size={24} /></div>
      ) : drives.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
           <p>No Google Drives connected.</p>
           <button className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }} onClick={() => navigate('/settings/drives')}>Connect Drive</button>
        </div>
      ) : (
        <>
          {subfolders.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
              {subfolders.map(folder => {
                const dIdx = drives.findIndex(d => d.id === folder.driveAccountId);
                const dEmail = drives[dIdx]?.email || 'Unknown';
                return (
                  <DriveFolderCard
                    key={folder.googleFolderId}
                    folder={folder}
                    driveEmail={dEmail}
                    driveColor={getDriveColor(dIdx)}
                    onClick={() => handleOpenFolder(folder.googleFolderId, folder.driveAccountId)}
                  />
                );
              })}
            </div>
          )}

          {files.map(file => {
             const dIdx = drives.findIndex(d => d.id === file.driveAccountId);
             const dEmail = drives[dIdx]?.email || 'Unknown';
             return (
               <FileCard
                 key={file.id ?? file.googleFileId}
                 file={file}
                 driveEmail={dEmail}
                 driveColor={getDriveColor(dIdx)}
                 onPreview={setPreviewFile}
               />
             );
          })}

          {subfolders.length === 0 && files.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-tertiary)' }}>
              <p>This folder is empty</p>
            </div>
          )}
        </>
      )}

      {showModal && <UploadModal folderId={folderId} driveId={driveIdParam || undefined} onClose={() => setShowModal(false)} onSuccess={refresh} />}
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </DropZone>
  );
}
```

### Task 5: Clean Up Dead Code

**Files:**
- Delete: `packages/web/src/stores/fileStore.ts`
- Delete: `packages/web/src/components/DriveFolderBrowser.tsx`
- Delete: `packages/web/src/components/FolderCard.tsx`

- [ ] **Step 1: Delete fileStore.ts**
Run: `rm packages/web/src/stores/fileStore.ts`

- [ ] **Step 2: Delete DriveFolderBrowser.tsx**
Run: `rm packages/web/src/components/DriveFolderBrowser.tsx`

- [ ] **Step 3: Delete FolderCard.tsx**
Run: `rm packages/web/src/components/FolderCard.tsx`

- [ ] **Step 4: Commit changes**
Run: `git add . && git commit -m "feat: implement merged drive view and cleanup dead code"`
