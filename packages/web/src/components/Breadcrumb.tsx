import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { BreadcrumbItem } from '../types';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  driveId?: string;
}

export function Breadcrumb({ items, driveId }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb" aria-label="Folder navigation">
      {items.map((item, i) => {
        let linkTo = item.id === 'root' ? '/files' : `/files/${item.id}`;
        if (driveId && item.id !== 'root') {
          linkTo += `?driveId=${driveId}`;
        }

        return (
          <span key={item.id ?? `fallback-${i}`} className="breadcrumb-item">
            {i > 0 && <ChevronRight size={14} className="breadcrumb-separator" />}
            {i < items.length - 1 ? (
              <Link to={linkTo} className="breadcrumb-link">
                {item.name}
              </Link>
            ) : (
              <span className="breadcrumb-current">{item.name}</span>
            )}
          </span>
        );
      })}

      <style>{`
        .breadcrumb {
          display: flex;
          align-items: center;
          flex-wrap: nowrap;
          gap: 2px;
          font-size: var(--font-size-sm);
          overflow-x: auto;
          white-space: nowrap;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .breadcrumb::-webkit-scrollbar {
          display: none;
        }
        .breadcrumb-item { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
        .breadcrumb-separator { color: var(--text-tertiary); }
        .breadcrumb-link { color: var(--text-secondary); text-decoration: none; }
        .breadcrumb-link:hover { color: var(--text-primary); text-decoration: underline; }
        .breadcrumb-current { color: var(--text-primary); font-weight: 500; }
      `}</style>
    </nav>
  );
}
