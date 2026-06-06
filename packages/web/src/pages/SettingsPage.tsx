import { useEffect, useState } from 'react';
import { useDriveStore } from '../stores/driveStore';
import { DriveAccountCard } from '../components/DriveAccountCard';
import { useToastStore } from '../stores/toastStore';
import { Plus, Key } from 'lucide-react';

export function SettingsPage() {
  const { drives, fetchDrives, removeDrive, triggerSync } = useDriveStore();
  const { addToast } = useToastStore();
  const [showSaForm, setShowSaForm] = useState(false);
  const [saCredentials, setSaCredentials] = useState('');
  const [saFolderId, setSaFolderId] = useState('');

  useEffect(() => {
    fetchDrives();
  }, [fetchDrives]);

  const handleSync = async (id: string) => {
    try {
      await triggerSync(id);
      addToast('success', 'Sync completed');
      fetchDrives();
    } catch {
      addToast('error', 'Sync failed');
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await removeDrive(id);
      addToast('success', 'Drive disconnected');
      fetchDrives();
    } catch {
      addToast('error', 'Failed to disconnect drive');
    }
  };

  const handleAddServiceAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { api } = await import('../lib/api');
      await api.addServiceAccount(saCredentials, saFolderId);
      addToast('success', 'Service account added');
      setSaCredentials('');
      setSaFolderId('');
      setShowSaForm(false);
      fetchDrives();
    } catch {
      addToast('error', 'Failed to add service account');
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--space-xl)' }}>Drive Settings</h1>

      {/* Drive Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {drives.map((drive, i) => (
          <DriveAccountCard
            key={drive.id}
            drive={drive}
            index={i}
            onSync={handleSync}
            onDisconnect={handleDisconnect}
          />
        ))}
      </div>

      {/* Add Drive Buttons */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <a href={`${import.meta.env.VITE_API_URL ?? ''}/api/drives/connect`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
          <Plus size={18} /> Add Google Drive
        </a>
        <button className="btn btn-secondary" onClick={() => setShowSaForm(!showSaForm)}>
          <Key size={18} /> Add Service Account
        </button>
      </div>

      {/* Service Account Form */}
      {showSaForm && (
        <form onSubmit={handleAddServiceAccount} className="card" style={{ marginTop: 'var(--space-lg)', maxWidth: 500 }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Add Service Account</h3>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
              Service Account JSON
            </label>
            <textarea
              value={saCredentials}
              onChange={(e) => setSaCredentials(e.target.value)}
              placeholder='Paste service account JSON key...'
              rows={6}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}
              required
            />
          </div>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
              Shared Folder ID
            </label>
            <input
              type="text"
              value={saFolderId}
              onChange={(e) => setSaFolderId(e.target.value)}
              placeholder="Google Drive folder ID shared with SA"
              style={{ width: '100%' }}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowSaForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add Account</button>
          </div>
        </form>
      )}
    </div>
  );
}
