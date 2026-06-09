import React, { useState } from 'react';
import { useSelectionStore } from '../../stores/useSelectionStore';
import { useToastStore } from '../../stores/toastStore';
import { api } from '../../lib/api';
import { X, Trash2, Folder, Star } from 'lucide-react';

export interface BulkActionBarProps {
  onActionComplete: () => void;
  onMoveRequested?: () => void;
  onWorkspaceRequested?: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({ onActionComplete, onMoveRequested, onWorkspaceRequested }) => {
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
    
    for (const selected of selectedItems) {
      try {
        if (selected.type !== 'file') {
          throw new Error('Only files can be deleted via bulk action');
        }
        await api.deleteFile(selected.item.id);
        successCount++;
      } catch (error) {
        console.error('Deletion failed for item:', selected, error);
        failCount++;
      }
    }
    
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
          onClick={onWorkspaceRequested} 
          disabled={isProcessing || !allFiles} 
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${!allFiles ? 'opacity-50 cursor-not-allowed bg-blue-800' : 'hover:bg-blue-700'}`} 
          title={!allFiles ? 'Can only add to Workspace if all selected items are files' : 'Add to Workspace'}
        >
          <Star size={16} /> Add to Workspace
        </button>
      </div>
    </div>
  );
};
