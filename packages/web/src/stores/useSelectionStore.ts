import { create } from 'zustand';
import type { FileEntry, DriveFolder, VirtualFolder } from '../types';

export type SelectedItem = 
  | { type: 'file'; item: FileEntry }
  | { type: 'folder'; item: DriveFolder | VirtualFolder };

interface SelectionState {
  selectedItems: SelectedItem[];
  toggleSelection: (item: SelectedItem) => void;
  selectAll: (items: SelectedItem[]) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedItems: [],
  toggleSelection: (item) => set((state) => {
    const exists = state.selectedItems.some(i => i.item.id === item.item.id);
    if (exists) {
      return { selectedItems: state.selectedItems.filter(i => i.item.id !== item.item.id) };
    }
    return { selectedItems: [...state.selectedItems, item] };
  }),
  selectAll: (items) => set({ selectedItems: items }),
  clearSelection: () => set({ selectedItems: [] }),
}));
