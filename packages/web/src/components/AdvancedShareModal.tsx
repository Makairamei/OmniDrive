import { useState } from 'react';
import { createSharedLink, updateSharedLink } from '../lib/api';

interface AdvancedShareModalProps {
  targetId: string;
  targetType: 'file' | 'folder';
  onClose: () => void;
  existingConfig?: any;
}

export function AdvancedShareModal({ targetId, targetType, onClose, existingConfig }: AdvancedShareModalProps) {
  const [config, setConfig] = useState(existingConfig || {
    allowDownloads: true,
    allowUploads: false,
    maxDownloads: '',
    webhookUrl: ''
  });

  const handleSave = async () => {
    const hasMaxDownloads = config.maxDownloads !== '' && config.maxDownloads !== null && config.maxDownloads !== undefined;
    const payload = {
      ...config,
      maxDownloads: hasMaxDownloads ? parseInt(config.maxDownloads.toString(), 10) : null
    };
    if (existingConfig) {
      await updateSharedLink(existingConfig.id, payload);
    } else {
      await createSharedLink({ targetId, targetType, ...payload });
    }
    onClose();
  };

  return (
    <div className="modal">
      <h3>{existingConfig ? 'Edit Share' : 'Create Share'}</h3>
      <label>
        <input type="checkbox" checked={config.allowDownloads} onChange={e => setConfig({...config, allowDownloads: e.target.checked})} />
        Allow Downloads
      </label>
      <label>
        <input type="number" placeholder="Max Downloads" value={config.maxDownloads} onChange={e => setConfig({...config, maxDownloads: e.target.value})} />
      </label>
      <label>
        <input type="url" placeholder="Webhook URL" value={config.webhookUrl} onChange={e => setConfig({...config, webhookUrl: e.target.value})} />
      </label>
      <button onClick={handleSave}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}
