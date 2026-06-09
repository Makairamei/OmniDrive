# Team Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing "Virtual Folder" feature into a fully collaborative "Workspace" feature for teams with role-based access control.

**Architecture:** We will replace the `virtual_folders` table with `workspaces`, `workspace_members`, and `workspace_folders`. We will build a new `/api/workspaces` Hono router for the backend and update the React frontend to use these new structures. Files will be linked to workspaces and use the existing auto-upload mechanism.

**Tech Stack:** Cloudflare Workers, Hono, SQLite (D1), React, Zustand.

---

### Task 1: Database Schema & Core Types

**Files:**
- Create: `packages/worker/tests/schema.test.ts`
- Modify: `packages/worker/src/db/schema.sql`
- Modify: `packages/web/src/types/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/worker/tests/schema.test.ts
import { describe, it, expect } from 'vitest';

describe('Database Schema', () => {
  it('should have new workspace tables defined in schema', async () => {
    const fs = await import('fs/promises');
    const schema = await fs.readFile('./src/db/schema.sql', 'utf-8');
    
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS workspaces');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS workspace_members');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS workspace_folders');
    expect(schema).not.toContain('CREATE TABLE IF NOT EXISTS virtual_folders');
    expect(schema).toContain('workspace_id');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/worker && npm run test tests/schema.test.ts`
Expected: FAIL (does not contain workspaces)

- [ ] **Step 3: Write minimal implementation**

Modify `packages/worker/src/db/schema.sql`:
Remove the `virtual_folders` block and replace it with:
```sql
-- Workspaces (Team collaborative folders)
CREATE TABLE IF NOT EXISTS workspaces (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    created_by      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    icon            TEXT,
    color           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    joined_at       TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS workspace_folders (
    id              TEXT PRIMARY KEY,
    workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_id       TEXT REFERENCES workspace_folders(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Also modify the `files` table in `schema.sql`:
Remove `virtual_folder_id TEXT REFERENCES virtual_folders(id) ON DELETE SET NULL,`
Add:
```sql
    workspace_id      TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
    workspace_folder_id TEXT REFERENCES workspace_folders(id) ON DELETE SET NULL,
```

Modify `packages/web/src/types/index.ts`:
Remove `VirtualFolder` interface. Add:
```typescript
export type WorkspaceRole = 'owner' | 'editor' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  createdBy: string;
  icon: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user?: { name: string; email: string };
}

export interface WorkspaceFolder {
  id: string;
  workspaceId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
}
```
Update `FileEntry` in `packages/web/src/types/index.ts`:
Remove `virtualFolderId`. Add `workspaceId: string | null;` and `workspaceFolderId: string | null;`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/worker && npm run test tests/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/worker/tests/schema.test.ts packages/worker/src/db/schema.sql packages/web/src/types/index.ts
git commit -m "feat: setup database schema and types for workspaces"
```

---

### Task 2: Backend Workspace CRUD

**Files:**
- Create: `packages/worker/tests/workspaces.test.ts`
- Create: `packages/worker/src/routes/workspaces.ts`
- Modify: `packages/worker/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/worker/tests/workspaces.test.ts
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { workspacesRouter } from '../src/routes/workspaces';

describe('Workspaces API', () => {
  it('should list workspaces', async () => {
    const app = new Hono().route('/workspaces', workspacesRouter);
    const res = await app.request('/workspaces');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/worker && npm run test tests/workspaces.test.ts`
Expected: FAIL (Cannot find module)

- [ ] **Step 3: Write minimal implementation**

Create `packages/worker/src/routes/workspaces.ts`:
```typescript
import { Hono } from 'hono';
import { AppContext } from '../types/env';
import { authGuard } from '../middleware/auth-guard';
import { generateId } from '../lib/id';
import { AppError } from '../middleware/error-handler';

export const workspacesRouter = new Hono<AppContext>();
workspacesRouter.use('*', authGuard);

workspacesRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const db = c.env.DB;
  const { results } = await db.prepare(`
    SELECT w.*, m.role FROM workspaces w
    JOIN workspace_members m ON w.id = m.workspace_id
    WHERE m.user_id = ?
  `).bind(userId).all();
  return c.json({ workspaces: results });
});

workspacesRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const { name, icon, color } = await c.req.json();
  const db = c.env.DB;
  const id = generateId();
  
  await db.prepare(
    'INSERT INTO workspaces (id, name, created_by, icon, color) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, name, userId, icon || null, color || null).run();
  
  await db.prepare(
    'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)'
  ).bind(id, userId, 'owner').run();
  
  return c.json({ id, name, role: 'owner' });
});
```

Modify `packages/worker/src/index.ts`:
Add `import { workspacesRouter } from './routes/workspaces';`
Add `app.route('/api/workspaces', workspacesRouter);`

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/worker && npm run test tests/workspaces.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/worker/tests/workspaces.test.ts packages/worker/src/routes/workspaces.ts packages/worker/src/index.ts
git commit -m "feat: implement workspace CRUD API"
```

---

### Task 3: Backend Members Management

**Files:**
- Modify: `packages/worker/tests/workspaces.test.ts`
- Modify: `packages/worker/src/routes/workspaces.ts`

- [ ] **Step 1: Write the failing test**

Add to `packages/worker/tests/workspaces.test.ts`:
```typescript
  it('should have members endpoints', async () => {
    const app = new Hono().route('/workspaces', workspacesRouter);
    const req = new Request('http://localhost/workspaces/123/members', { method: 'POST' });
    const res = await app.request(req);
    expect(res.status).not.toBe(404);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/worker && npm run test tests/workspaces.test.ts`
Expected: FAIL (404 expected for new endpoint)

- [ ] **Step 3: Write minimal implementation**

Add to `packages/worker/src/routes/workspaces.ts`:
```typescript
workspacesRouter.post('/:id/members', async (c) => {
  const userId = c.get('userId');
  const workspaceId = c.req.param('id');
  const { email, role } = await c.req.json();
  const db = c.env.DB;

  const member = await db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').bind(workspaceId, userId).first<{role: string}>();
  if (!member || member.role !== 'owner') throw new AppError(403, 'Only owners can invite members');

  const targetUser = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{id: string}>();
  if (!targetUser) throw new AppError(404, 'User not found');

  await db.prepare('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)')
    .bind(workspaceId, targetUser.id, role).run();
  
  return c.json({ success: true });
});

workspacesRouter.delete('/:id/members/:userId', async (c) => {
  const currentUserId = c.get('userId');
  const workspaceId = c.req.param('id');
  const targetUserId = c.req.param('userId');
  const db = c.env.DB;

  const member = await db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').bind(workspaceId, currentUserId).first<{role: string}>();
  if (!member || member.role !== 'owner') throw new AppError(403, 'Only owners can remove members');

  await db.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?').bind(workspaceId, targetUserId).run();
  return c.json({ success: true });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/worker && npm run test tests/workspaces.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/worker/tests/workspaces.test.ts packages/worker/src/routes/workspaces.ts
git commit -m "feat: implement workspace members API"
```

---

### Task 4: Frontend UI Updates

**Files:**
- Modify: `packages/web/src/components/layout/Sidebar.tsx`
- Modify: `packages/web/src/App.tsx`
- Rename & Modify: `packages/web/src/pages/VirtualFoldersPage.tsx` -> `packages/web/src/pages/WorkspacesPage.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/web/src/components/layout/Sidebar.test.tsx
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('Sidebar', () => {
  it('should contain Workspaces link', () => {
    const code = readFileSync('./src/components/layout/Sidebar.tsx', 'utf-8');
    expect(code).toContain('Workspaces');
    expect(code).not.toContain('Virtual Folders');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && npx vitest run src/components/layout/Sidebar.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

In `packages/web/src/components/layout/Sidebar.tsx`, change `Virtual Folders` to `Workspaces` and `/virtual-folders` to `/workspaces`.
In `packages/web/src/App.tsx`, rename `VirtualFoldersPage` imports and route to `WorkspacesPage`.
Rename `packages/web/src/pages/VirtualFoldersPage.tsx` to `WorkspacesPage.tsx` and change its component name. Replace state logic to fetch from `/api/workspaces`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && npx vitest run src/components/layout/Sidebar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web
git commit -m "feat: replace virtual folders with workspaces in frontend UI"
```
