import { useEffect, useState } from 'react';
import { useDriveStore } from '../stores/driveStore';
import { QuotaBar } from '../components/QuotaBar';
import { FileCard } from '../components/FileCard';
import { formatFileSize, getDriveColor } from '../lib/utils';
import { api } from '../lib/api';
import { HardDrive, RefreshCw, TrendingUp } from 'lucide-react';
import type { FileEntry } from '../types';

export function DashboardPage() {
  const { drives, aggregate, isLoading, fetchDrives } = useDriveStore();
  const [recentFiles, setRecentFiles] = useState<FileEntry[]>([]);

  useEffect(() => {
    fetchDrives();
    api.getRecentFiles().then((data) => setRecentFiles(data.files.slice(0, 10))).catch(() => {});
  }, [fetchDrives]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Dashboard</h1>
        <button className="btn btn-secondary btn-sm" onClick={() => fetchDrives()}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Aggregate Quota */}
      {aggregate.driveCount > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <TrendingUp size={18} color="var(--accent-primary)" />
            <span style={{ fontWeight: 600 }}>Total Storage</span>
          </div>
          <QuotaBar used={aggregate.totalUsed} total={aggregate.totalQuota} />
          <div style={{ display: 'flex', gap: 'var(--space-xl)', marginTop: 'var(--space-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            <span>{formatFileSize(aggregate.totalFree)} free</span>
            <span>{aggregate.driveCount} drive{aggregate.driveCount > 1 ? 's' : ''} connected</span>
          </div>
        </div>
      )}

      {/* Per-Drive Quota */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {drives.map((drive, i) => (
          <div key={drive.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              <div className="drive-dot" style={{ backgroundColor: getDriveColor(i), width: 10, height: 10 }} />
              <HardDrive size={16} />
              <span className="truncate" style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{drive.email}</span>
              {drive.isPrimary && <span className="badge" style={{ background: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)' }}>Primary</span>}
            </div>
            <QuotaBar used={drive.usedQuota} total={drive.totalQuota} color={getDriveColor(i)} />
          </div>
        ))}
      </div>

      {/* Recent Files */}
      {recentFiles.length > 0 && (
        <div>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Recent Files</h2>
          <div className="card" style={{ padding: 'var(--space-sm)' }}>
            {recentFiles.map((file) => {
              const driveIndex = drives.findIndex((d) => d.id === file.driveAccountId);
              return (
                <FileCard
                  key={file.id}
                  file={file}
                  driveColor={getDriveColor(driveIndex >= 0 ? driveIndex : 0)}
                />
              );
            })}
          </div>
        </div>
      )}

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}
