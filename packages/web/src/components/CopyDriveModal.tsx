import { useState } from 'react';
import { HardDrive, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useDriveStore } from '../stores/driveStore';
import { api } from '../lib/api';
import { FileEntry, DriveAccount } from '../types';
import { formatFileSize } from '../lib/utils';
import { useToastStore } from '../stores/toastStore';

interface CopyDriveModalProps {
  files: FileEntry[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: any) => void;
}

export function CopyDriveModal({ files, onClose, onSuccess, onError }: CopyDriveModalProps) {
  const { drives } = useDriveStore();
  const addToast = useToastStore((s) => s.addToast);
  const [isCopying, setIsCopying] = useState(false);
  const [copyingToDriveId, setCopyingToDriveId] = useState<string | null>(null);

  // Consider all drives that are not the source of EVERY file.
  const availableDrives = files.length === 1 
    ? drives.filter(d => d.id !== files[0].driveAccountId)
    : drives;

  const handleCopy = async (drive: DriveAccount) => {
    if (files.length === 0) return;
    try {
      setIsCopying(true);
      setCopyingToDriveId(drive.id);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const file of files) {
        if (file.driveAccountId === drive.id) {
          // Skip if already in this drive
          continue;
        }
        try {
          // Call copy API instead of move API
          await api.copyFileToDrive(file.id, drive.id);
          successCount++;
        } catch (e) {
          failCount++;
        }
      }
      
      if (failCount === 0 && successCount > 0) {
        addToast('success', `✅ Copied ${successCount} item(s) to ${drive.email}`);
      } else if (failCount > 0) {
        addToast('error', `⚠️ Copied ${successCount} item(s), ${failCount} failed`);
      } else if (successCount === 0 && failCount === 0) {
        addToast('info', 'Items are already in the selected drive');
      }
      
      if (successCount > 0) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (err) {
      onError(err);
    } finally {
      setIsCopying(false);
      setCopyingToDriveId(null);
    }
  };

  return (
    <Dialog open={files.length > 0} onOpenChange={(open) => !open && !isCopying && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Copy to Another Drive</DialogTitle>
          <DialogDescription>
            Select a destination drive to copy {files.length} item(s) (Backup). The original file will not be deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {availableDrives.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-4">
              No other drives available. Please connect another Google Drive account.
            </p>
          ) : (
            availableDrives.map(drive => (
              <button
                key={drive.id}
                onClick={() => handleCopy(drive)}
                disabled={isCopying}
                className={`flex items-center p-3 border rounded-lg transition-colors text-left ${
                  isCopying && copyingToDriveId !== drive.id 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-accent hover:text-accent-foreground'
                } ${isCopying && copyingToDriveId === drive.id ? 'ring-2 ring-primary border-primary bg-accent' : ''}`}
              >
                <div className="flex-shrink-0 mr-4">
                  {isCopying && copyingToDriveId === drive.id ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <HardDrive className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {drive.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Free space: {formatFileSize(drive.freeSpace)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
