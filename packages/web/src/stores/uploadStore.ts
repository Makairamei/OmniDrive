import { create } from 'zustand';
import { api } from '../lib/api';

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'confirming' | 'done' | 'error';
  error?: string;
}

interface UploadState {
  queue: UploadItem[];
  isUploading: boolean;
  showModal: boolean;
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  clearQueue: () => void;
  startUpload: (driveAccountId?: string, workspaceFolderId?: string) => Promise<void>;
  setShowModal: (show: boolean) => void;
}

export const useUploadStore = create<UploadState>((set, get) => ({
  queue: [],
  isUploading: false,
  showModal: false,

  addFiles: (files: File[]) => {
    const items: UploadItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'pending',
    }));
    set((state) => ({ queue: [...state.queue, ...items], showModal: true }));
  },

  removeFile: (id: string) => {
    set((state) => ({ queue: state.queue.filter((item) => item.id !== id) }));
  },

  clearQueue: () => set({ queue: [], isUploading: false }),

  startUpload: async (driveAccountId?: string, workspaceFolderId?: string) => {
    set({ isUploading: true });
    const { queue } = get();

    for (const item of queue) {
      if (item.status !== 'pending') continue;

      try {
        // Update status
        set((state) => ({
          queue: state.queue.map((q) => (q.id === item.id ? { ...q, status: 'uploading' as const } : q)),
        }));

        // 1. Initiate upload
        const response = await api.initiateUpload({
          name: item.file.name,
          mimeType: item.file.type || 'application/octet-stream',
          size: item.file.size,
          driveAccountId,
          workspaceFolderId,
        }) as any;

        let uploadResponse: any;

        if (response.isTelegram) {
          // 2. Upload to Telegram Helper
          uploadResponse = await uploadToTelegram(
            response.uploadUrl,
            item.file,
            response.telegramBotToken,
            response.telegramChannelId,
            (progress) => {
              set((state) => ({
                queue: state.queue.map((q) => (q.id === item.id ? { ...q, progress } : q)),
              }));
            }
          );

          // 3. Confirm upload with Worker
          set((state) => ({
            queue: state.queue.map((q) => (q.id === item.id ? { ...q, status: 'confirming' as const, progress: 100 } : q)),
          }));

          await api.confirmUpload({
            telegramMessageId: uploadResponse.messageId,
            telegramFileId: uploadResponse.fileId,
            name: item.file.name,
            size: item.file.size,
            mimeType: item.file.type || 'application/octet-stream',
            driveAccountId: response.driveAccountId,
            workspaceFolderId,
          } as any);
        } else {
          // 2. Upload directly to Google Drive
          uploadResponse = await uploadToGoogleDrive(response.uploadUrl, item.file, (progress) => {
            set((state) => ({
              queue: state.queue.map((q) => (q.id === item.id ? { ...q, progress } : q)),
            }));
          });

          // 3. Confirm upload with Worker
          set((state) => ({
            queue: state.queue.map((q) => (q.id === item.id ? { ...q, status: 'confirming' as const, progress: 100 } : q)),
          }));

          await api.confirmUpload({
            googleFileId: uploadResponse.id,
            driveAccountId: response.driveAccountId,
            workspaceFolderId,
          });
        }

        set((state) => ({
          queue: state.queue.map((q) => (q.id === item.id ? { ...q, status: 'done' as const } : q)),
        }));
      } catch (err) {
        set((state) => ({
          queue: state.queue.map((q) =>
            q.id === item.id ? { ...q, status: 'error' as const, error: (err as Error).message } : q
          ),
        }));
      }
    }

    set({ isUploading: false });
  },

  setShowModal: (show: boolean) => set({ showModal: show }),
}));

async function uploadToTelegram(
  uploadUrl: string,
  file: File,
  botToken: string,
  channelId: string,
  onProgress: (percent: number) => void
): Promise<{ messageId: number; fileId: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Telegram upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Telegram upload network error')));

    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${botToken}`);
    xhr.setRequestHeader('X-Channel-ID', channelId);
    xhr.setRequestHeader('X-File-Name', file.name);
    xhr.send(file);
  });
}

async function uploadToGoogleDrive(
  uploadUrl: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<{ id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload network error')));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}
