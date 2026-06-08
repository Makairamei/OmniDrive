# Search Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Search functionality by connecting the Header's search input to a new Search Page that displays results from the backend.

**Architecture:** We update the Header component to track local state for the search input and push to `/search?q=...` on Enter. A new `SearchPage` reads the URL parameter, fetches results from the backend via `api.searchFiles`, and displays them using the existing `FileGrid` component.

**Tech Stack:** React, React Router, Tailwind CSS, Zustand, Vitest

---

### Task 1: Add Search Navigation to Header

**Files:**
- Modify: `packages/web/src/components/layout/Header.tsx`
- Modify: `packages/web/src/components/layout/Header.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/web/src/components/layout/Header.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { Header } from './Header';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('Header', () => {
  it('renders OmniDrive branding', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText('OmniDrive')).toBeDefined();
  });

  it('navigates to search page on enter', () => {
    const mockNavigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('Search in Drive');
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/search?q=test+query');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && npx vitest run src/components/layout/Header.test.tsx`
Expected: FAIL due to mockNavigate not being called.

- [ ] **Step 3: Write minimal implementation**

```tsx
// packages/web/src/components/layout/Header.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Settings, HelpCircle, Grid3X3 } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';

export const Header: React.FC = () => {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="flex items-center justify-between px-2 py-2 bg-surface h-16 w-full gap-4">
      <div className="flex items-center min-w-[240px] px-2 gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-blue-500 to-green-500 flex-shrink-0 opacity-90" />
          <span className="text-xl text-gray-700 font-medium tracking-wide">OmniDrive</span>
        </div>
      </div>
      
      <div className="flex-1 max-w-[720px]">
        <div className="bg-[#e9eef6] hover:bg-white hover:shadow-md focus-within:bg-white focus-within:shadow-md rounded-full h-12 flex items-center px-4 transition-all">
          <Search size={20} className="text-gray-600 mr-3" />
          <input 
            type="text" 
            placeholder="Search in Drive" 
            className="bg-transparent outline-none w-full text-gray-800 placeholder-gray-600" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2 px-2 text-gray-600">
        <button className="p-2 hover:bg-gray-200 rounded-full transition-colors hidden sm:block">
          <HelpCircle size={24} />
        </button>
        <button className="p-2 hover:bg-gray-200 rounded-full transition-colors hidden sm:block">
          <Settings size={24} />
        </button>
        <button className="p-2 hover:bg-gray-200 rounded-full transition-colors hidden sm:block mr-2">
          <Grid3X3 size={24} />
        </button>
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium cursor-pointer hover:bg-blue-700">
          U
        </div>
      </div>
    </header>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && npx vitest run src/components/layout/Header.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Run: `rtk git add packages/web/src/components/layout/Header.tsx packages/web/src/components/layout/Header.test.tsx && rtk git commit -m "feat: add search navigation to header"`

### Task 2: Create Search Page & App Route

**Files:**
- Create: `packages/web/src/pages/SearchPage.tsx`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Write the component**

```tsx
// packages/web/src/pages/SearchPage.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDriveStore } from '../stores/driveStore';
import { useSharedStore } from '../stores/sharedStore';
import { useToastStore } from '../stores/toastStore';
import { FileGrid } from '../components/files/FileGrid';
import { ShareModal } from '../components/ShareModal';
import { MoveDriveModal } from '../components/MoveDriveModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { api } from '../lib/api';
import type { FileEntry } from '../types';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const { drives } = useDriveStore();
  const { isTargetShared } = useSharedStore();
  const { addToast } = useToastStore();
  
  const [results, setResults] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [shareTarget, setShareTarget] = useState<{ id: string, type: 'file' | 'folder' } | null>(null);
  const [moveFileTarget, setMoveFileTarget] = useState<FileEntry | null>(null);
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);

  const fetchResults = async (q: string) => {
    if (!q) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.searchFiles(q);
      setResults(data.files);
    } catch (error) {
      addToast('error', 'Failed to perform search');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(query);
  }, [query]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Search results for "{query}"</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : results.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <FileGrid
            files={results}
            subfolders={[]}
            getDriveInfo={(driveAccountId) => {
              if (!driveAccountId) return { drive: null, index: 0 };
              const index = drives.findIndex((d) => d.id === driveAccountId);
              if (index === -1) return { drive: drives[0] || null, index: 0 };
              return { drive: drives[index], index };
            }}
            onShare={(id, type) => setShareTarget({ id, type })}
            onMoveDrive={setMoveFileTarget}
            onPreviewFile={setPreviewFile}
            isTargetShared={isTargetShared}
            viewMode="list"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <p className="text-lg">No files found matching '{query}'.</p>
        </div>
      )}

      {shareTarget && (
        <ShareModal
          targetType={shareTarget.type}
          targetId={shareTarget.id}
          onClose={() => setShareTarget(null)}
        />
      )}

      {moveFileTarget && (
        <MoveDriveModal
          file={moveFileTarget}
          onClose={() => setMoveFileTarget(null)}
          onSuccess={() => {
            setMoveFileTarget(null);
            fetchResults(query);
            addToast('success', 'File moved successfully');
          }}
          onError={(msg) => addToast('error', msg)}
        />
      )}

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add route to App.tsx**

```tsx
// packages/web/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import { AppLayout } from './components/layout/AppLayout';
import { ToastContainer } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FilesPage } from './pages/FilesPage';
import { SettingsPage } from './pages/SettingsPage';
import { SharedLinksPage } from './pages/SharedLinksPage';
import { PublicSharedPage } from './pages/PublicSharedPage';
import { AutomationsPage } from './pages/AutomationsPage';
import { SearchPage } from './pages/SearchPage';

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/shared/:id" element={<PublicSharedPage />} />
        <Route
          element={
            <AuthGuard>
              <AppLayout />
              <ToastContainer />
            </AuthGuard>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/files/:folderId" element={<FilesPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/automations" element={<AutomationsPage />} />
          <Route path="/settings/drives" element={<SettingsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/shared" element={<SharedLinksPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
```

- [ ] **Step 3: Commit**

Run: `rtk git add packages/web/src/pages/SearchPage.tsx packages/web/src/App.tsx && rtk git commit -m "feat: add search page and route"`
