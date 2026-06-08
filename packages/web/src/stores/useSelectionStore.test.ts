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
