# Google Drive UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Google Drive Material Design 3 UI overhaul using Tailwind CSS, Shadcn UI, and Zustand.

**Architecture:** Initialize Tailwind and Shadcn, setup Zustand stores, create layout skeletons (header, sidebar, main area, right panel), and finally implement the interactive components (views, context menus).

**Tech Stack:** React, Tailwind CSS, Shadcn UI, Zustand, Lucide React, react-dropzone, Vitest (for TDD)

---

### Task 1: Foundation Setup (Tailwind, Shadcn, Vitest)

**Files:**
- Modify: `packages/web/package.json`
- Create: `packages/web/tailwind.config.js`
- Create: `packages/web/postcss.config.js`
- Modify: `packages/web/src/index.css`
- Create: `packages/web/vite.config.ts` (Update for testing)
- Create: `packages/web/components.json` (Shadcn config)

- [ ] **Step 1: Install Dependencies**

```bash
cd packages/web
npm install -D tailwindcss postcss autoprefixer vitest jsdom @testing-library/react @testing-library/dom
npx tailwindcss init -p
```

- [ ] **Step 2: Configure Tailwind and Testing**

Modify `packages/web/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(0, 0%, 100%)",
        foreground: "hsl(222.2, 84%, 4.9%)",
        primary: {
          DEFAULT: "#0B57D0",
          foreground: "hsl(210, 40%, 98%)",
        },
        surface: "#F0F4F9",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      }
    },
  },
  plugins: [],
}
```

Modify `packages/web/vite.config.ts` to include Vitest (add testing types and config):
```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  }
})
```

Modify `packages/web/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-background text-foreground m-0 p-0 font-sans;
  }
}
```

- [ ] **Step 3: Setup Shadcn Configuration**

Create `packages/web/components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": false,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 4: Verify test runner works (empty suite is fine for now, we just want to ensure it runs without crashing)**

Run: `cd packages/web && npx vitest run`
Expected: PASS (or "No test files found, exiting with code 0")

- [ ] **Step 5: Commit**

```bash
cd /home/bilfid/projects/omnidrive
git add packages/web
git commit -m "chore(web): setup tailwind, shadcn config, and vitest"
```

---

### Task 2: Setup Zustand Stores

**Files:**
- Create: `packages/web/src/stores/useUIStore.ts`
- Create: `packages/web/src/stores/useSelectionStore.ts`
- Create: `packages/web/src/stores/useUIStore.test.ts`
- Create: `packages/web/src/stores/useSelectionStore.test.ts`

- [ ] **Step 1: Write failing test for UI Store**

Create `packages/web/src/stores/useUIStore.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './useUIStore';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({ isSidebarOpen: true, isInfoPanelOpen: false, viewMode: 'list', theme: 'light' });
  });

  it('toggles sidebar', () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().isSidebarOpen).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && npx vitest run src/stores/useUIStore.test.ts`
Expected: FAIL (Cannot find module './useUIStore')

- [ ] **Step 3: Write UI Store implementation**

Create `packages/web/src/stores/useUIStore.ts`:
```typescript
import { create } from 'zustand';

type ViewMode = 'list' | 'grid';
type Theme = 'light' | 'dark';

interface UIState {
  isSidebarOpen: boolean;
  isInfoPanelOpen: boolean;
  viewMode: ViewMode;
  theme: Theme;
  toggleSidebar: () => void;
  toggleInfoPanel: () => void;
  setViewMode: (mode: ViewMode) => void;
  setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isInfoPanelOpen: false,
  viewMode: 'list',
  theme: 'light',
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleInfoPanel: () => set((state) => ({ isInfoPanelOpen: !state.isInfoPanelOpen })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setTheme: (theme) => set({ theme }),
}));
```

- [ ] **Step 4: Write test and implementation for Selection Store**

Create `packages/web/src/stores/useSelectionStore.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useSelectionStore } from './useSelectionStore';

describe('useSelectionStore', () => {
  beforeEach(() => {
    useSelectionStore.setState({ selectedIds: [] });
  });

  it('adds and removes selection', () => {
    useSelectionStore.getState().addSelection('file-1');
    expect(useSelectionStore.getState().selectedIds).toContain('file-1');
    
    useSelectionStore.getState().removeSelection('file-1');
    expect(useSelectionStore.getState().selectedIds).not.toContain('file-1');
  });
});
```

Create `packages/web/src/stores/useSelectionStore.ts`:
```typescript
import { create } from 'zustand';

interface SelectionState {
  selectedIds: string[];
  addSelection: (id: string) => void;
  removeSelection: (id: string) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedIds: [],
  addSelection: (id) => set((state) => ({ selectedIds: [...state.selectedIds, id] })),
  removeSelection: (id) => set((state) => ({ selectedIds: state.selectedIds.filter(itemId => itemId !== id) })),
  clearSelection: () => set({ selectedIds: [] }),
}));
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/web && npx vitest run src/stores/`
Expected: PASS for both test files.

- [ ] **Step 6: Commit**

```bash
cd /home/bilfid/projects/omnidrive
git add packages/web/src/stores
git commit -m "feat(web): add zustand stores for UI and Selection state"
```

---

### Task 3: Base Layout Skeletons

**Files:**
- Create: `packages/web/src/components/layout/Header.tsx`
- Create: `packages/web/src/components/layout/Sidebar.tsx`
- Create: `packages/web/src/components/layout/Header.test.tsx`

- [ ] **Step 1: Write test for Header**

Create `packages/web/src/components/layout/Header.test.tsx`:
```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Header } from './Header';

describe('Header', () => {
  it('renders OmniDrive branding', () => {
    render(<Header />);
    expect(screen.getByText('OmniDrive')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd packages/web && npx vitest run src/components/layout/Header.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Header and Sidebar**

Create `packages/web/src/components/layout/Header.tsx`:
```tsx
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-surface h-16 w-full">
      <div className="flex items-center gap-2">
        <span className="text-xl text-primary">OmniDrive</span>
      </div>
      <div className="flex-1 max-w-2xl px-4">
        <div className="bg-white rounded-full h-12 flex items-center px-4 shadow-sm">
          <input type="text" placeholder="Search in Drive" className="bg-transparent outline-none w-full" />
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
        U
      </div>
    </header>
  );
};
```

Create `packages/web/src/components/layout/Sidebar.tsx`:
```tsx
import React from 'react';
import { useUIStore } from '../../stores/useUIStore';

export const Sidebar: React.FC = () => {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);

  if (!isSidebarOpen) return null;

  return (
    <aside className="w-64 bg-surface h-full flex flex-col p-4 gap-4">
      <button className="bg-white text-primary rounded-full px-6 py-4 shadow-sm w-max hover:shadow-md transition-shadow">
        + New
      </button>
      <nav className="flex flex-col gap-1">
        <div className="px-4 py-2 bg-blue-100 text-primary rounded-full font-medium">My Drive</div>
        <div className="px-4 py-2 hover:bg-gray-100 rounded-full cursor-pointer">Computers</div>
        <div className="px-4 py-2 hover:bg-gray-100 rounded-full cursor-pointer">Shared with me</div>
        <div className="px-4 py-2 hover:bg-gray-100 rounded-full cursor-pointer">Trash</div>
      </nav>
    </aside>
  );
};
```

- [ ] **Step 4: Run test to verify pass**

Run: `cd packages/web && npx vitest run src/components/layout/Header.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/bilfid/projects/omnidrive
git add packages/web/src/components/layout
git commit -m "feat(web): create Header and Sidebar layout components"
```

---

### Task 4: Main Content Area & App Integration

**Files:**
- Create: `packages/web/src/components/layout/MainContent.tsx`
- Modify: `packages/web/src/App.tsx` (or whatever the root component is, assuming `App.tsx` exists, we will create/modify it)

- [ ] **Step 1: Write MainContent Component**

Create `packages/web/src/components/layout/MainContent.tsx`:
```tsx
import React from 'react';
import { useUIStore } from '../../stores/useUIStore';

export const MainContent: React.FC = () => {
  const isInfoPanelOpen = useUIStore((state) => state.isInfoPanelOpen);

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-surface">
      <main className="flex-1 bg-white rounded-xl m-2 p-4 shadow-sm overflow-y-auto">
        <h1 className="text-2xl mb-4">My Drive</h1>
        <div className="text-gray-500">File grid will go here...</div>
      </main>
      
      {isInfoPanelOpen && (
        <aside className="w-80 bg-white border-l border-gray-200 p-4">
          <h2 className="text-lg">Details</h2>
        </aside>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Integrate into Root Application Layout**

Check if `App.tsx` exists, if not, create it. Replace its contents with:
Modify `packages/web/src/App.tsx`:
```tsx
import React from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MainContent } from './components/layout/MainContent';

function App() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-surface">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainContent />
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Test App runs**

Run: `cd packages/web && npm run build`
Expected: Success

- [ ] **Step 4: Commit**

```bash
cd /home/bilfid/projects/omnidrive
git add packages/web/src/components/layout/MainContent.tsx packages/web/src/App.tsx
git commit -m "feat(web): integrate main app layout structure"
```
