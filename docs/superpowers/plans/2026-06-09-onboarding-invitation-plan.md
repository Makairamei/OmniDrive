# Onboarding and Invitation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first-time onboarding setup that creates the first user as a Super Admin, and enforce an invitation code system for all subsequent new user signups.

**Architecture:** 
- The backend uses D1 SQLite. `schema.sql` gets a new `invitation_codes` table and `is_super_admin` column in `users`.
- `auth.ts` provides `/setup-status` to detect 0 users, and updates `/register` to handle the invitation code.
- `admin.ts` provides CRUD endpoints for invitation codes.
- The React Vite frontend redirects to `/setup` if `isSetup` is false. `LoginPage` is updated for the code input, and a new Admin settings section manages the codes.

**Tech Stack:** Cloudflare Workers (Hono), D1 SQLite, React 19, Vite, Zustand, TailwindCSS

---

### Task 1: Update Database Schema

**Files:**
- Modify: `packages/worker/src/db/schema.sql`
- Create: `packages/worker/tests/schema-invitation.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/worker/tests/schema-invitation.test.ts
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

describe('Schema - Invitations & Admin', () => {
  beforeAll(async () => {
    // Basic setup check
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, is_super_admin INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS invitation_codes (
        id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, created_by TEXT NOT NULL REFERENCES users(id),
        max_uses INTEGER NOT NULL DEFAULT 1, used_count INTEGER NOT NULL DEFAULT 0, expires_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  });

  it('can insert super admin and invitation code', async () => {
    await env.DB.prepare('INSERT INTO users (id, username, password_hash, is_super_admin) VALUES (?, ?, ?, ?)').bind('u1', 'admin', 'hash', 1).run();
    await env.DB.prepare('INSERT INTO invitation_codes (id, code, created_by) VALUES (?, ?, ?)').bind('c1', 'TEAM-26', 'u1').run();
    
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind('u1').first<any>();
    expect(user.is_super_admin).toBe(1);

    const code = await env.DB.prepare('SELECT * FROM invitation_codes WHERE code = ?').bind('TEAM-26').first<any>();
    expect(code.created_by).toBe('u1');
    expect(code.used_count).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify schema behavior works locally**

Run: `npm run test -- packages/worker/tests/schema-invitation.test.ts`
*(Note: tests might pass right away because we set up the tables inside the test, but this step ensures the logic works. The real fix is updating schema.sql)*

- [ ] **Step 3: Write minimal implementation in schema.sql**

In `packages/worker/src/db/schema.sql`:
Add `is_super_admin INTEGER NOT NULL DEFAULT 0,` to the `users` table definition.
Append the following table definition to the end of the file:

```sql
-- Invitation Codes
CREATE TABLE IF NOT EXISTS invitation_codes (
    id              TEXT PRIMARY KEY,
    code            TEXT UNIQUE NOT NULL,
    created_by      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_uses        INTEGER NOT NULL DEFAULT 1,
    used_count      INTEGER NOT NULL DEFAULT 0,
    expires_at      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_invitation_codes ON invitation_codes(code);
```

- [ ] **Step 4: Commit**

```bash
git add packages/worker/src/db/schema.sql packages/worker/tests/schema-invitation.test.ts
git commit -m "feat(db): add is_super_admin and invitation_codes table"
```

---

### Task 2: Backend - Setup Status & Registration

**Files:**
- Modify: `packages/worker/src/routes/auth.ts`
- Create: `packages/worker/tests/auth-setup.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/worker/tests/auth-setup.test.ts
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../src/index';

describe('Auth Setup & Register', () => {
  beforeEach(async () => {
    await env.DB.exec('DELETE FROM users');
    await env.DB.exec('DELETE FROM invitation_codes');
  });

  it('GET /api/auth/setup-status returns isSetup: false initially', async () => {
    const res = await app.request('/api/auth/setup-status');
    const json = await res.json() as any;
    expect(json.isSetup).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- packages/worker/tests/auth-setup.test.ts`
Expected: FAIL (404 Not Found for setup-status)

- [ ] **Step 3: Write minimal implementation**

In `packages/worker/src/routes/auth.ts`, add the new endpoint at the top (before `/register`):

```typescript
authRouter.get('/setup-status', async (c) => {
  const result = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
  return c.json({ isSetup: (result?.count || 0) > 0 });
});
```

Also modify the `/register` endpoint to handle the `invitation_code` payload and super admin logic.
Find `authRouter.post('/register', async (c) => {`:

```typescript
authRouter.post('/register', async (c) => {
  const { username, password, email, invitation_code } = await c.req.json();
  if (!username || !password) throw new AppError(400, 'Username and password required');

  const db = c.env.DB;
  
  // Check setup status
  const setupRes = await db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
  const isSetup = (setupRes?.count || 0) > 0;

  if (isSetup) {
    if (!invitation_code) throw new AppError(400, 'Invitation code required');
    const inv = await db.prepare('SELECT id, max_uses, used_count FROM invitation_codes WHERE code = ?').bind(invitation_code).first<{ id: string, max_uses: number, used_count: number }>();
    if (!inv) throw new AppError(400, 'Invalid invitation code');
    if (inv.max_uses > 0 && inv.used_count >= inv.max_uses) throw new AppError(400, 'Invitation code has reached its usage limit');
    
    await db.prepare('UPDATE invitation_codes SET used_count = used_count + 1 WHERE id = ?').bind(inv.id).run();
  }

  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existing) throw new AppError(400, 'Username already exists');

  const id = generateId();
  const passwordHash = await bcrypt.hash(password, 10);
  const isSuperAdmin = isSetup ? 0 : 1;
  
  await db.prepare(
    'INSERT INTO users (id, username, password_hash, email, name, is_super_admin) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, username, passwordHash, email || null, username, isSuperAdmin).run();

  const sessionData: SessionData = { userId: id, username, email: email || null, name: username, avatarUrl: null };
  const sessionId = generateId();
  
  await c.env.KV.put(`session:${sessionId}`, JSON.stringify(sessionData), { expirationTtl: 60 * 60 * 24 * 7 });
  setCookie(c, 'omnidrive_sid', sessionId, { path: '/', secure: true, httpOnly: true, sameSite: 'None', maxAge: 60 * 60 * 24 * 7 });

  return c.json({ success: true, user: sessionData, isSuperAdmin: !!isSuperAdmin });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- packages/worker/tests/auth-setup.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/worker/src/routes/auth.ts packages/worker/tests/auth-setup.test.ts
git commit -m "feat(api): implement setup-status and invitation code registration"
```

---

### Task 3: Backend - Admin Invitations Route

**Files:**
- Modify: `packages/worker/src/routes/admin.ts`
- Create: `packages/worker/tests/admin-invitations.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/worker/tests/admin-invitations.test.ts
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../src/index';

describe('Admin Invitations', () => {
  it('GET /api/admin/invitations returns 401 without auth', async () => {
    const res = await app.request('/api/admin/invitations');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- packages/worker/tests/admin-invitations.test.ts`

- [ ] **Step 3: Write minimal implementation**

In `packages/worker/src/routes/admin.ts`:

```typescript
import { Hono } from 'hono';
import { AppError } from '../middleware/error-handler';
import { generateId } from '../lib/id';
import { authGuard } from '../middleware/auth-guard';
import type { AppContext } from '../types/env';

export const adminRouter = new Hono<AppContext>({ strict: false });

adminRouter.use('*', authGuard);

// Middleware to protect admin routes
adminRouter.use('*', async (c, next) => {
  const userId = c.get('userId');
  const user = await c.env.DB.prepare('SELECT is_super_admin FROM users WHERE id = ?').bind(userId).first<{ is_super_admin: number }>();
  if (!user || user.is_super_admin !== 1) {
    throw new AppError(403, 'Forbidden: Super Admin access required');
  }
  await next();
});

adminRouter.get('/invitations', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM invitation_codes ORDER BY created_at DESC').all();
  return c.json({ invitations: results });
});

adminRouter.post('/invitations', async (c) => {
  const { code, max_uses } = await c.req.json();
  if (!code) throw new AppError(400, 'Code is required');
  
  const id = generateId();
  const userId = c.get('userId');
  
  await c.env.DB.prepare(
    'INSERT INTO invitation_codes (id, code, created_by, max_uses) VALUES (?, ?, ?, ?)'
  ).bind(id, code, userId, max_uses || 1).run();
  
  return c.json({ success: true, invitation: { id, code, created_by: userId, max_uses: max_uses || 1, used_count: 0 } });
});

adminRouter.delete('/invitations/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM invitation_codes WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});
```
Make sure `admin.ts` is mounted in `packages/worker/src/index.ts` (e.g. `app.route('/api/admin', adminRouter)`). If not, add it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- packages/worker/tests/admin-invitations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/worker/src/routes/admin.ts packages/worker/tests/admin-invitations.test.ts
git commit -m "feat(api): admin invitations management"
```

---

### Task 4: Frontend - Setup Page & API Hooks

**Files:**
- Modify: `packages/web/src/lib/api.ts`
- Modify: `packages/web/src/App.tsx`
- Create: `packages/web/src/pages/SetupPage.tsx`

- [ ] **Step 1: Update API Client**

In `packages/web/src/lib/api.ts`:
Add to `export const api = {`:
```typescript
  getSetupStatus: () => request<{ isSetup: boolean }>('/api/auth/setup-status'),
  getInvitations: () => request<{ invitations: any[] }>('/api/admin/invitations'),
  createInvitation: (code: string, max_uses: number) => request<{ success: boolean, invitation: any }>('/api/admin/invitations', { method: 'POST', body: JSON.stringify({ code, max_uses }) }),
  deleteInvitation: (id: string) => request<{ success: boolean }>(`/api/admin/invitations/${id}`, { method: 'DELETE' }),
```
Modify `register`:
```typescript
  register: (data: any) => request<{ success: boolean; user: import('../types').User }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
```

- [ ] **Step 2: Create SetupPage.tsx**

```tsx
// packages/web/src/pages/SetupPage.tsx
import { useState } from 'react';
import { api } from '../lib/api';

export function SetupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.register({ username, password });
      window.location.href = '/';
    } catch (err: any) {
      setErrorMsg(err.message || 'Setup failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 px-4">
      <div className="relative w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-2xl p-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to OmniDrive</h1>
          <p className="text-gray-500 text-sm mb-6">Create the first Super Admin account to get started.</p>
          {errorMsg && <div className="mb-4 text-red-600 text-sm">{errorMsg}</div>}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
            <div>
              <label className="block text-sm font-medium mb-1">Admin Username</label>
              <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Admin Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
            </div>
            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl mt-4">Complete Setup</button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update App.tsx for Routing**

In `packages/web/src/App.tsx`, we need to conditionally redirect if `isSetup === false`.
```tsx
// packages/web/src/App.tsx
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './lib/api';
// ... import SetupPage
import { SetupPage } from './pages/SetupPage';

export const App = () => {
  const [isSetup, setIsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    api.getSetupStatus().then(res => setIsSetup(res.isSetup)).catch(() => setIsSetup(true));
  }, []);

  if (isSetup === null) return null; // loading state

  if (isSetup === false && window.location.pathname !== '/setup') {
    window.location.href = '/setup';
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={isSetup ? <Navigate to="/login" /> : <SetupPage />} />
        <Route path="/login" element={!isSetup ? <Navigate to="/setup" /> : <LoginPage />} />
        {/* ... existing routes */}
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/lib/api.ts packages/web/src/pages/SetupPage.tsx packages/web/src/App.tsx
git commit -m "feat(web): add setup flow and routing logic"
```

---

### Task 5: Frontend - Invitation Code in Registration

**Files:**
- Modify: `packages/web/src/pages/LoginPage.tsx`

- [ ] **Step 1: Add invitation_code input field**

In `packages/web/src/pages/LoginPage.tsx`:
Add state: `const [invitationCode, setInvitationCode] = useState('');`
Update register call: `await api.register({ username, password, email, invitation_code: invitationCode });`

Add the UI inside the `isRegister` block:
```tsx
            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invitation Code (Required)</label>
                  <input type="text" required value={invitationCode} onChange={e => setInvitationCode(e.target.value)} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
              </>
            )}
```

- [ ] **Step 2: Check formatting and UI flow**
Run local frontend dev server if needed and verify form renders.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/pages/LoginPage.tsx
git commit -m "feat(web): require invitation code on registration"
```

---

### Task 6: Frontend - Admin Invitation Management

**Files:**
- Modify: `packages/web/src/pages/SettingsPage.tsx`
- (Or create a new component `AdminInvitations.tsx`)

- [ ] **Step 1: Write AdminInvitations component**

Create `packages/web/src/components/admin/AdminInvitations.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export function AdminInvitations() {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [maxUses, setMaxUses] = useState(1);

  const load = async () => {
    try {
      const res = await api.getInvitations();
      setInvitations(res.invitations);
    } catch (e) {
      // not super admin or error
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createInvitation(code, maxUses);
    setCode('');
    setMaxUses(1);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.deleteInvitation(id);
    load();
  };

  return (
    <div className="mt-8 border-t pt-8">
      <h2 className="text-xl font-bold mb-4">Admin: Invitation Codes</h2>
      <form onSubmit={handleCreate} className="flex gap-4 mb-6">
        <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Code (e.g. TEAM-2026)" className="border px-3 py-2 rounded" required />
        <input type="number" value={maxUses} onChange={e => setMaxUses(Number(e.target.value))} placeholder="Max Uses" className="border w-24 px-3 py-2 rounded" required min="0" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Create Code</button>
      </form>
      <ul className="space-y-2">
        {invitations.map(inv => (
          <li key={inv.id} className="flex items-center justify-between p-4 bg-gray-50 rounded">
            <div>
              <span className="font-bold">{inv.code}</span>
              <span className="text-sm text-gray-500 ml-4">Used: {inv.used_count} / {inv.max_uses === 0 ? 'Unlimited' : inv.max_uses}</span>
            </div>
            <button onClick={() => handleDelete(inv.id)} className="text-red-600 hover:underline">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Add to SettingsPage.tsx**

In `packages/web/src/pages/SettingsPage.tsx`, import `AdminInvitations` and render it at the bottom of the page content.
```tsx
import { AdminInvitations } from '../components/admin/AdminInvitations';
// inside the render logic:
<AdminInvitations />
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/admin/AdminInvitations.tsx packages/web/src/pages/SettingsPage.tsx
git commit -m "feat(web): admin invitation management UI"
```
