import { RefreshCw, Trash2, ShieldCheck } from 'lucide-react';
import type { DriveAccount } from '../types';
import { QuotaBar } from './QuotaBar';
import { formatFileSize, getDriveColor } from '../lib/utils';
import { useState } from 'react';

const GoogleDriveIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 512 512" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M339.4 48H172.6L16 320l83.4 144 166.8-288 83.4 144" fill="#FFCC00"/>
    <path d="M172.6 320h323.4l-83.4 144H256" fill="#00A85D"/>
    <path d="M339.4 48L496 320 412.6 464 256 192" fill="#0066DA"/>
  </svg>
);

const TelegramIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-.97.53-1.35.52-.42 0-1.22-.23-1.82-.42-.73-.24-1.31-.37-1.26-.78.03-.21.32-.43.88-.66 3.44-1.5 5.74-2.49 6.88-2.97 3.28-1.37 3.96-1.61 4.4-.18z" fill="#0088cc"/>
  </svg>
);

interface DriveAccountCardProps {
  drive: DriveAccount;
  index: number;
  onSync: (id: string) => Promise<void>;
  onStopSync?: (id: string) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
}

export function DriveAccountCard({ drive, index, onSync, onStopSync, onDisconnect }: DriveAccountCardProps) {
  const [syncing, setSyncing] = useState(false);
  const color = getDriveColor(index);
  
  const isSyncing = syncing || drive.syncStatus === 'syncing';

  const handleSync = async () => {
    setSyncing(true);
    try { await onSync(drive.id); } finally { setSyncing(false); }
  };

  const isTelegram = drive.type === 'telegram';
  const isServiceAccount = drive.type === 'service_account';

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-5 hover:shadow-md hover:border-gray-300/85 transition-all duration-300 relative overflow-hidden group">
      {/* Premium accent bar */}
      <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: color }} />

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-50 border border-gray-100 shadow-sm"
          >
            {isTelegram ? (
              <TelegramIcon className="w-6 h-6" />
            ) : (
              <GoogleDriveIcon className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800 tracking-tight flex items-center gap-1.5">
              {drive.email}
              {isServiceAccount && (
                <span className="inline-flex items-center text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium border border-indigo-100/50">
                  SA
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 font-medium mt-0.5 flex items-center gap-1.5">
              <span>{isTelegram ? 'Telegram Channel' : isServiceAccount ? 'Service Account' : 'Google Drive (OAuth)'}</span>
              {drive.isPrimary && (
                <>
                  <span>·</span>
                  <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                    <ShieldCheck size={12} /> Primary
                  </span>
                </>
              )}
            </div>
            {drive.lastSyncedAt && (
              <div className="text-[10px] text-gray-400 mt-1">
                Last synced: {new Date(drive.lastSyncedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin text-blue-600' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
          {isSyncing && onStopSync && (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 active:scale-95 transition-all"
              onClick={() => onStopSync(drive.id)}
            >
              Stop
            </button>
          )}
          {!drive.isPrimary && (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 active:scale-95 transition-all"
              onClick={() => {
                if (confirm(`Disconnect ${drive.email}? Files from this drive will be removed from Omnidrive.`)) {
                  onDisconnect(drive.id);
                }
              }}
            >
              <Trash2 size={12} />
              Disconnect
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 pt-1">
        <QuotaBar used={drive.usedQuota} total={drive.totalQuota} color={color} showLabel={false} />
        <div className="flex justify-between mt-2.5 text-xs font-semibold text-gray-500">
          <span>{formatFileSize(drive.freeSpace)} free of {formatFileSize(drive.totalQuota)}</span>
          <span className="text-gray-700 font-bold">{drive.usagePercent}%</span>
        </div>
      </div>
    </div>
  );
}
