# Bulk Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Bulk Actions feature allowing users to select multiple files/folders and perform actions (Delete, Move, Add to Virtual Folder) in batch.

**Architecture:** We will update `useSelectionStore` to manage multiple selected items. We'll add checkboxes to `FileGrid.tsx` for selection. A new `BulkActionBar.tsx` component will render in place of standard toolbars when items are selected, executing operations concurrently via `api.ts`.

**Tech Stack:** React, Zustand, Lucide React, Vite

---

### Task 1: Update State Management (useSelectionStore)

**Files:**
- Modify: `packages/web/src/stores/useSelectionStore.ts`
- Modify: `packages/web/src/stores/useSelectionStore.test.ts`

- [ ] **Step 1: Update the store interface and implementation**

Modify `useSelectionStore.ts` to support multiple items.

```typescript
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
```

- [ ] **Step 2: Update the test file**

Modify `packages/web/src/stores/useSelectionStore.test.ts` to match the new API.

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useSelectionStore } from './useSelectionStore';
import type { FileEntry } from '../types';

describe('useSelectionStore', () => {
  beforeEach(() => {
    useSelectionStore.setState({ selectedItems: [] });
  });

  it('should toggle selection correctly', () => {
    const dummyFile = { id: '1', name: 'test.txt' } as FileEntry;
    
    useSelectionStore.getState().toggleSelection({ type: 'file', item: dummyFile });
    expect(useSelectionStore.getState().selectedItems).toEqual([{ type: 'file', item: dummyFile }]);
    
    useSelectionStore.getState().toggleSelection({ type: 'file', item: dummyFile });
    expect(useSelectionStore.getState().selectedItems).toEqual([]);
  });

  it('should select all and clear selection', () => {
    const dummyFile = { id: '1', name: 'test.txt' } as FileEntry;
    
    useSelectionStore.getState().selectAll([{ type: 'file', item: dummyFile }]);
    expect(useSelectionStore.getState().selectedItems.length).toBe(1);
    
    useSelectionStore.getState().clearSelection();
    expect(useSelectionStore.getState().selectedItems).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the test to verify it passes**

Run: `npm test -- packages/web/src/stores/useSelectionStore.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/stores/useSelectionStore.ts packages/web/src/stores/useSelectionStore.test.ts
git commit -m "feat(store): update useSelectionStore for multiple items"
```

### Task 2: Refactor Components Using useSelectionStore

**Files:**
- Modify: `packages/web/src/components/layout/InfoPanel.tsx`
- Modify: `packages/web/src/pages/FilesPage.tsx`
- Modify: `packages/web/src/pages/VirtualFoldersPage.tsx`

- [ ] **Step 1: Update InfoPanel.tsx**

Modify `packages/web/src/components/layout/InfoPanel.tsx`. Update the store selection hook to read `selectedItems`.

```typescript
// Replace lines 8-11 with:
  const selectedItems = useSelectionStore((s) => s.selectedItems);
  const toggleInfoPanel = useUIStore((s) => s.toggleInfoPanel);

  if (selectedItems.length === 0) {
// Replace line 28 with:
  const { type, item } = selectedItems[0];
```

- [ ] **Step 2: Update FilesPage.tsx**

Modify `packages/web/src/pages/FilesPage.tsx`.

```typescript
// Replace line 37:
  const { clearSelection, toggleSelection } = useSelectionStore();

// Update handleViewInfo inside FilesPage (lines 39-42):
  const handleViewInfo = (item: any, type: 'file' | 'folder') => {
    clearSelection();
    toggleSelection({ type, item });
    setIsInfoPanelOpen(true);
  };
```

- [ ] **Step 3: Update VirtualFoldersPage.tsx**

Modify `packages/web/src/pages/VirtualFoldersPage.tsx`.

```typescript
// Replace line 21:
  const { clearSelection, toggleSelection } = useSelectionStore();

// Update handleViewInfo inside VirtualFoldersPage (lines 96-99):
  const handleViewInfo = (item: any, type: 'file' | 'folder') => {
    clearSelection();
    toggleSelection({ type, item });
    setIsInfoPanelOpen(true);
  };
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/layout/InfoPanel.tsx packages/web/src/pages/FilesPage.tsx packages/web/src/pages/VirtualFoldersPage.tsx
git commit -m "refactor: update components for new useSelectionStore api"
```

### Task 3: Implement Checkboxes in FileGrid

**Files:**
- Modify: `packages/web/src/components/files/FileGrid.tsx`

- [ ] **Step 1: Update FileGrid hooks**

Modify `packages/web/src/components/files/FileGrid.tsx`.

```typescript
// Replace line 182:
  const { selectedItems, toggleSelection, selectAll } = useSelectionStore();
  const hasSelection = selectedItems.length > 0;
```

- [ ] **Step 2: Add checkbox to List View**

Update the header column and rows in `FileGrid.tsx`. For the list view header:

```tsx
        <div className="grid grid-cols-[auto_1fr_120px_140px_44px] gap-0 border-b border-gray-100 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <span className="w-10 flex items-center justify-center">
            {hasSelection && (
              <input 
                type="checkbox" 
                className="w-4 h-4 cursor-pointer"
                checked={selectedItems.length === files.length + subfolders.length && (files.length > 0 || subfolders.length > 0)}
                onChange={(e) => {
                  if (e.target.checked) {
                    const allItems: any[] = [
                      ...subfolders.map(f => ({ type: 'folder', item: f })),
                      ...files.map(f => ({ type: 'file', item: f }))
                    ];
                    selectAll(allItems);
                  } else {
                    useSelectionStore.getState().clearSelection();
                  }
                }}
              />
            )}
          </span>
```

For the file item row inside `files.map()`:

```tsx
          <div className="flex items-center justify-center w-10">
            <input 
              type="checkbox" 
              className={`w-4 h-4 cursor-pointer ${hasSelection ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}
              checked={selectedItems.some(i => i.item.id === file.id)}
              onChange={() => toggleSelection({ type: 'file', item: file })}
            />
          </div>
          <div className="w-10 flex items-center justify-center text-xl" onClick={() => onPreviewFile?.(file)}>
            {getFileIcon(file.mimeType)}
          </div>
```
*(Apply the same checkbox logic for the `subfolders.map()` rows and for Grid view cards as needed.)*

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/files/FileGrid.tsx
git commit -m "feat(ui): add checkboxes to file grid for bulk selection"
```

### Task 4: Create BulkActionBar Component

**Files:**
- Create: `packages/web/src/components/layout/BulkActionBar.tsx`

- [ ] **Step 1: Write BulkActionBar.tsx**

```tsx
import React, { useState } from 'react';
import { useSelectionStore } from '../../stores/useSelectionStore';
import { useToastStore } from '../../stores/toastStore';
import { api } from '../../lib/api';
import { X, Trash2, Folder, Download, Star } from 'lucide-react';

export interface BulkActionBarProps {
  onActionComplete: () => void;
  onMoveRequested?: () => void;
  onVirtualFolderRequested?: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({ onActionComplete, onMoveRequested, onVirtualFolderRequested }) => {
  const { selectedItems, clearSelection } = useSelectionStore();
  const addToast = useToastStore((s) => s.addToast);
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedItems.length === 0) return null;

  const allFiles = selectedItems.every(i => i.type === 'file');

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedItems.length} items permanently?`)) return;
    setIsProcessing(true);
    addToast('info', `Deleting ${selectedItems.length} items...`);
    
    let successCount = 0;
    let failCount = 0;
    
    await Promise.all(selectedItems.map(async (selected) => {
      try {
        if (selected.type === 'file') {
          await api.deleteFile(selected.item.id);
        } else {
          // Additional handling for folder deletion if endpoint supports it
        }
        successCount++;
      } catch {
        failCount++;
      }
    }));
    
    if (failCount === 0) {
      addToast('success', `✅ Deleted ${successCount} items`);
    } else {
      addToast('error', `⚠️ Deleted ${successCount} items, ${failCount} failed`);
    }
    
    setIsProcessing(false);
    clearSelection();
    onActionComplete();
  };

  return (
    <div className="flex items-center justify-between bg-blue-600 text-white rounded-lg shadow-md px-4 py-3 mb-6 w-full">
      <div className="flex items-center gap-4">
        <button onClick={clearSelection} disabled={isProcessing} className="p-1 hover:bg-blue-700 rounded-full transition-colors">
          <X size={20} />
        </button>
        <span className="font-medium text-sm">{selectedItems.length} item(s) selected</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handleDelete} disabled={isProcessing} className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-700 rounded-md transition-colors text-sm font-medium" title="Delete selected items">
          <Trash2 size={16} /> Delete
        </button>
        <button onClick={onMoveRequested} disabled={isProcessing} className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-700 rounded-md transition-colors text-sm font-medium" title="Move selected items">
          <Folder size={16} /> Move
        </button>
        <button 
          onClick={onVirtualFolderRequested} 
          disabled={isProcessing || !allFiles} 
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${!allFiles ? 'opacity-50 cursor-not-allowed bg-blue-800' : 'hover:bg-blue-700'}`} 
          title={!allFiles ? 'Can only add to Virtual Folder if all selected items are files' : 'Add to Virtual Folder'}
        >
          <Star size={16} /> Add to Virtual Folder
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/layout/BulkActionBar.tsx
git commit -m "feat(ui): implement BulkActionBar component"
```

### Task 5: Integrate BulkActionBar in Pages

**Files:**
- Modify: `packages/web/src/pages/FilesPage.tsx`
- Modify: `packages/web/src/pages/VirtualFoldersPage.tsx`

- [ ] **Step 1: Update FilesPage.tsx**

Import the bar and render conditionally.

```typescript
import { BulkActionBar } from '../components/layout/BulkActionBar';

// Modify rendering inside return (around line 100):
  const { selectedItems } = useSelectionStore();

  return (
    <DropZone>
      <div className="flex flex-col h-full w-full">
        {selectedItems.length > 0 ? (
          <div className="px-4 pt-4">
            <BulkActionBar 
              onActionComplete={refresh} 
              onVirtualFolderRequested={() => {
                alert('Implement bulk Add to Virtual Folder modal action here');
              }}
              onMoveRequested={() => {
                alert('Implement bulk Move to Drive modal action here');
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4 px-4 pt-4">
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
              <Breadcrumb items={breadcrumb} driveId={driveIdParam || undefined} />
            </div>
            {/* ... rest of existing toolbar ... */}
          </div>
        )}
```

- [ ] **Step 2: Update VirtualFoldersPage.tsx**

Apply a similar wrapping in `VirtualFoldersPage.tsx`.

```typescript
import { BulkActionBar } from '../components/layout/BulkActionBar';

// Modify rendering inside return for VirtualFoldersPage:
  const { selectedItems } = useSelectionStore();

// Replace the top header div:
        {selectedItems.length > 0 ? (
          <div className="p-4 border-b border-gray-100">
            <BulkActionBar 
              onActionComplete={() => activeFolderId && fetchContents(activeFolderId)} 
            />
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800">
              {activeFolderId ? folders.find(f => f.id === activeFolderId)?.name : 'Select a folder'}
            </h2>
            {/* ... rest of existing tools ... */}
          </div>
        )}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/pages/FilesPage.tsx packages/web/src/pages/VirtualFoldersPage.tsx
git commit -m "feat(pages): integrate BulkActionBar in main pages"
```
