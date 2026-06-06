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
