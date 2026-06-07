import { describe, it, expect, beforeEach } from 'vitest';
import { useSelectionStore } from './useSelectionStore';

describe('useSelectionStore', () => {
  beforeEach(() => {
    useSelectionStore.setState({ selectedIds: [] });
  });

  it('adds and removes selection', () => {
    useSelectionStore.getState().addSelection('file-1');
    expect(useSelectionStore.getState().selectedIds).toContain('file-1');
    
    useSelectionStore.getState().removeSelection('file-1');
    expect(useSelectionStore.getState().selectedIds).not.toContain('file-1');
  });

  it('clears selection', () => {
    useSelectionStore.getState().addSelection('file-1');
    useSelectionStore.getState().addSelection('file-2');
    useSelectionStore.getState().clearSelection();
    expect(useSelectionStore.getState().selectedIds).toEqual([]);
  });
});
