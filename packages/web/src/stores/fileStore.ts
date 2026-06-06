import { create } from 'zustand';
import type { VirtualFolder, FileEntry, BreadcrumbItem } from '../types';
import { api } from '../lib/api';

interface FileState {
  currentFolder: VirtualFolder | null;
  subfolders: VirtualFolder[];
  files: FileEntry[];
  breadcrumb: BreadcrumbItem[];
  isLoading: boolean;
  searchResults: FileEntry[] | null;
  fetchContents: (folderId?: string) => Promise<void>;
  createFolder: (name: string, parentId?: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveFile: (fileId: string, folderId: string | null) => Promise<void>;
  renameFile: (fileId: string, name: string) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  searchFiles: (query: string) => Promise<void>;
  clearSearch: () => void;
}

export const useFileStore = create<FileState>((set) => ({
  currentFolder: null,
  subfolders: [],
  files: [],
  breadcrumb: [{ id: null, name: 'Root' }],
  isLoading: false,
  searchResults: null,

  fetchContents: async (folderId?: string) => {
    set({ isLoading: true, searchResults: null });
    try {
      const data = folderId ? await api.getFolderContents(folderId) : await api.getRootContents();
      set({
        currentFolder: data.folder,
        subfolders: data.subfolders,
        files: data.files,
        breadcrumb: data.breadcrumb,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  createFolder: async (name: string, parentId?: string) => {
    const { folder } = await api.createFolder(name, parentId);
    set((state) => ({ subfolders: [...state.subfolders, folder] }));
  },

  deleteFolder: async (id: string) => {
    await api.deleteFolder(id);
    set((state) => ({ subfolders: state.subfolders.filter((f) => f.id !== id) }));
  },

  moveFile: async (fileId: string, folderId: string | null) => {
    await api.moveFile(fileId, folderId);
    set((state) => ({ files: state.files.filter((f) => f.id !== fileId) }));
  },

  renameFile: async (fileId: string, name: string) => {
    await api.renameFile(fileId, name);
    set((state) => ({
      files: state.files.map((f) => (f.id === fileId ? { ...f, name } : f)),
    }));
  },

  deleteFile: async (fileId: string) => {
    await api.deleteFile(fileId);
    set((state) => ({ files: state.files.filter((f) => f.id !== fileId) }));
  },

  searchFiles: async (query: string) => {
    const { files } = await api.searchFiles(query);
    set({ searchResults: files });
  },

  clearSearch: () => set({ searchResults: null }),
}));
