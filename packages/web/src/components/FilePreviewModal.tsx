import { X, ExternalLink, Download } from 'lucide-react';
import type { FileEntry } from '../types';
import { formatFileSize, formatRelativeTime, getFileIcon } from '../lib/utils';

interface FilePreviewModalProps {
  file: FileEntry;
  onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const isImage = file.mimeType?.startsWith('image/');
  const isGoogleDoc = file.mimeType?.startsWith('application/vnd.google-apps.');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', minWidth: 0 }}>
            <span style={{ fontSize: '2rem' }}>{getFileIcon(file.mimeType)}</span>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }} className="truncate">{file.name}</h2>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                {file.driveEmail}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Preview */}
        {isImage && file.thumbnailUrl && (
          <div style={{ marginBottom: 'var(--space-lg)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
            <img
              src={file.thumbnailUrl.replace('=s220', '=s600')}
              alt={file.name}
              style={{ width: '100%', maxHeight: 400, objectFit: 'contain' }}
            />
          </div>
        )}

        {!isImage && file.thumbnailUrl && (
          <div style={{ marginBottom: 'var(--space-lg)', display: 'flex', justifyContent: 'center', padding: 'var(--space-xl)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
            <img src={file.thumbnailUrl} alt={file.name} style={{ maxHeight: 200 }} />
          </div>
        )}

        {/* File Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', fontSize: 'var(--font-size-sm)' }}>
          <div>
            <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Size</div>
            <div>{formatFileSize(file.size)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Type</div>
            <div>{file.mimeType ?? 'Unknown'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Modified</div>
            <div>{file.googleModifiedAt ? formatRelativeTime(file.googleModifiedAt) : '—'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Created</div>
            <div>{file.googleCreatedAt ? formatRelativeTime(file.googleCreatedAt) : '—'}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
          {file.webViewLink && (
            <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              <ExternalLink size={16} /> Open in Drive
            </a>
          )}
          {file.webContentLink && !isGoogleDoc && (
            <a href={file.webContentLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              <Download size={16} /> Download
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
