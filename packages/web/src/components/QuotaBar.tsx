import { formatFileSize, getQuotaLevel } from '../lib/utils';

interface QuotaBarProps {
  used: number;
  total: number;
  color?: string;
  showLabel?: boolean;
}

export function QuotaBar({ used, total, color, showLabel = true }: QuotaBarProps) {
  const percent = total > 0 ? (used / total) * 100 : 0;
  const level = getQuotaLevel(percent);

  return (
    <div>
      <div className="quota-bar">
        <div
          className={`quota-bar-fill ${level}`}
          style={{
            width: `${Math.min(percent, 100)}%`,
            ...(color ? { background: color } : {}),
          }}
        />
      </div>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
          <span>{formatFileSize(used)} used</span>
          <span>{formatFileSize(total)} total</span>
        </div>
      )}
    </div>
  );
}
