import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import type { WorkspaceFolder, FileEntry, DriveFolder, BreadcrumbItem } from '../types';
import { WorkspaceSidebar } from '../components/workspaces/WorkspaceSidebar';
import { WorkspaceMainView } from '../components/workspaces/WorkspaceMainView';
import { useToastStore } from '../stores/toastStore';
import { useSelectionStore, type SelectedItem } from '../stores/useSelectionStore';
import { useUIStore } from '../stores/useUIStore';

export function WorkspacesPage() {
  const [folders, setFolders] = useState<WorkspaceFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [subfolders, setSubfolders] = useState<WorkspaceFolder[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const addToast = useToastStore(state => state.addToast);
  const { clearSelection, toggleSelection } = useSelectionStore();
  const setIsInfoPanelOpen = useUIStore(s => s.setIsInfoPanelOpen);

  const fetchTree = async () => {
    try {
      const res = await api.getWorkspaceTree();
      setFolders(res.folders);
    } catch {
      addToast('error', 'Failed to load workspaces');
    }
  };

  const fetchContents = async (folderId: string) => {
    try {
      const res = await api.getFolderContents(folderId);
      setFiles(res.files);
      setSubfolders(res.subfolders);
    } catch {
      addToast('error', 'Failed to load folder contents');
    }
  };

  useEffect(() => { fetchTree(); }, []);

  useEffect(() => {
    if (activeFolderId) fetchContents(activeFolderId);
    else { setFiles([]); setSubfolders([]); }
    clearSelection();
  }, [activeFolderId, clearSelection]);

  const handleCreateFolder = async (parentId?: string) => {
    const name = prompt('New workspace name:');
    if (name?.trim()) {
      try {
        await api.createFolder(name.trim(), parentId || activeFolderId || undefined);
        fetchTree();
      } catch { addToast('error', 'Failed to create workspace'); }
    }
  };

  const handleRename = async (id: string) => {
    const folder = folders.find(f => f.id === id);
    if (!folder) return;
    const name = prompt('Rename workspace:', folder.name);
    if (name?.trim() && name.trim() !== folder.name) {
      try {
        await api.updateFolder(id, { name: name.trim() });
        fetchTree();
      } catch { addToast('error', 'Failed to rename workspace'); }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this workspace?')) {
      try {
        await api.deleteFolder(id);
        if (activeFolderId === id) setActiveFolderId(null);
        fetchTree();
      } catch { addToast('error', 'Failed to delete workspace'); }
    }
  };

  const handleSync = async () => {
    if (!activeFolderId) return;
    setIsSyncing(true);
    try {
      await api.syncWorkspace(activeFolderId);
      addToast('success', 'Sync started.');
      setTimeout(() => fetchContents(activeFolderId), 2000);
    } catch { addToast('error', 'Failed to start sync'); } finally { setIsSyncing(false); }
  };

  const handleViewInfo = (item: FileEntry | WorkspaceFolder | DriveFolder, type: 'file' | 'folder') => {
    clearSelection();
    toggleSelection({ type, item } as SelectedItem);
    setIsInfoPanelOpen(true);
  };

  const activeFolder = useMemo(() => folders.find(f => f.id === activeFolderId) || null, [folders, activeFolderId]);

  const breadcrumbPath = useMemo(() => {
    const path: BreadcrumbItem[] = [];
    let current = activeFolder;
    while (current) {
      path.unshift({ id: current.id, name: current.name });
      current = folders.find(f => f.id === current!.parentId) || null;
    }
    return path;
  }, [activeFolder, folders]);

  const fileTabProps = {
    files, subfolders,
    getDriveInfo: () => ({ drive: null as any, index: 0 }),
    onNavigateFolder: setActiveFolderId,
    onPreviewFile: () => {}, onShare: () => {}, onRenameFile: () => {},
    onDeleteFile: async (id: string) => {
      try {
        await api.moveFile(id, null);
        addToast('success', 'Removed');
        if (activeFolderId) fetchContents(activeFolderId);
      } catch { addToast('error', 'Failed'); }
    },
    onMoveDrive: () => {}, isTargetShared: () => false, errorDrives: new Set<string>(),
    onViewInfo: handleViewInfo
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">
      <WorkspaceSidebar 
        folders={folders} activeFolderId={activeFolderId} onSelect={setActiveFolderId} 
        onRename={handleRename} onDelete={handleDelete} onNewSubfolder={handleCreateFolder}
      />
      <WorkspaceMainView
        activeFolder={activeFolder}
        path={breadcrumbPath}
        onCreateFolder={() => handleCreateFolder()}
        onSync={handleSync}
        isSyncing={isSyncing}
        fileTabProps={fileTabProps}
      />
    </div>
  );
}
