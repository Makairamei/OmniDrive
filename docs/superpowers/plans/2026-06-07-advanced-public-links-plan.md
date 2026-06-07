# Advanced Public Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement advanced configuration and UI for public links (download limits, uploads, webhooks) and a dashboard to manage them.

**Architecture:** We will update the `shared_links` schema in Cloudflare D1 to hold new config options, modify the worker routes to respect these rules and increment counters, and update the React frontend with a new Share settings modal, an active links dashboard, and an enhanced public viewing page.

**Tech Stack:** Hono, Cloudflare D1, React, Vite.

---

### Task 1: Update Database Schema

**Files:**
- Modify: `packages/worker/src/db/schema.sql`

- [ ] **Step 1: Write the schema changes**
Modify the `shared_links` table in `packages/worker/src/db/schema.sql` to include new columns:

```sql
CREATE TABLE IF NOT EXISTS shared_links (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type     TEXT NOT NULL CHECK (target_type IN ('file', 'folder')),
    target_id       TEXT NOT NULL,
    password_hash   TEXT,
    expires_at      TEXT,
    allow_downloads INTEGER NOT NULL DEFAULT 1,
    allow_uploads   INTEGER NOT NULL DEFAULT 0,
    max_downloads   INTEGER,
    require_email   INTEGER NOT NULL DEFAULT 0,
    webhook_url     TEXT,
    view_count      INTEGER NOT NULL DEFAULT 0,
    download_count  INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shared_link_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    shared_link_id  TEXT NOT NULL REFERENCES shared_links(id) ON DELETE CASCADE,
    action          TEXT NOT NULL,
    visitor_email   TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- [ ] **Step 2: Commit**

```bash
git add packages/worker/src/db/schema.sql
git commit -m "feat(db): update shared_links schema for advanced features"
```

### Task 2: Update Worker Types

**Files:**
- Modify: `packages/worker/src/types/index.ts`

- [ ] **Step 1: Write minimal implementation**
Update `SharedLink` type and `mapSharedLinkRow` in `packages/worker/src/types/index.ts`. If the file does not contain these definitions, create them or update them where they exist.

```typescript
export interface SharedLink {
  id: string;
  userId: string;
  targetType: 'file' | 'folder';
  targetId: string;
  passwordHash?: string | null;
  expiresAt?: string | null;
  allowDownloads: boolean;
  allowUploads: boolean;
  maxDownloads?: number | null;
  requireEmail: boolean;
  webhookUrl?: string | null;
  viewCount: number;
  downloadCount: number;
  createdAt: string;
}

export function mapSharedLinkRow(row: Record<string, any>): SharedLink {
  return {
    id: row.id,
    userId: row.user_id,
    targetType: row.target_type,
    targetId: row.target_id,
    passwordHash: row.password_hash,
    expiresAt: row.expires_at,
    allowDownloads: Boolean(row.allow_downloads ?? 1),
    allowUploads: Boolean(row.allow_uploads ?? 0),
    maxDownloads: row.max_downloads,
    requireEmail: Boolean(row.require_email ?? 0),
    webhookUrl: row.webhook_url,
    viewCount: row.view_count || 0,
    downloadCount: row.download_count || 0,
    createdAt: row.created_at,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/worker/src/types/index.ts
git commit -m "feat(worker): update SharedLink types"
```

### Task 3: Update Worker POST Route (Create Link)

**Files:**
- Modify: `packages/worker/src/routes/shared.ts`

- [ ] **Step 1: Write minimal implementation**
Update the `POST /` route to parse and save the new config.

```typescript
// Inside POST /
  const { targetType, targetId, password, expiresAt, allowDownloads = true, allowUploads = false, maxDownloads = null, requireEmail = false, webhookUrl = null } = body;

// ... (in the insert query)
      await db.prepare(
        'INSERT INTO shared_links (id, user_id, target_type, target_id, password_hash, expires_at, allow_downloads, allow_uploads, max_downloads, require_email, webhook_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(id, userId, targetType, targetId, passwordHash, expiresAt || null, allowDownloads ? 1 : 0, allowUploads ? 1 : 0, maxDownloads, requireEmail ? 1 : 0, webhookUrl)
      .run();
```

- [ ] **Step 2: Commit**

```bash
git add packages/worker/src/routes/shared.ts
git commit -m "feat(worker): support advanced config in create link"
```

### Task 4: Add Worker PUT Route (Edit Link)

**Files:**
- Modify: `packages/worker/src/routes/shared.ts`

- [ ] **Step 1: Write minimal implementation**
Add `PUT /:id` route for editing existing links.

```typescript
sharedRouter.put('/:id', authGuard, async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { expiresAt, allowDownloads, allowUploads, maxDownloads, requireEmail, webhookUrl } = body;
  
  const db = c.env.DB;
  
  const result = await db.prepare(
    'UPDATE shared_links SET expires_at = ?, allow_downloads = ?, allow_uploads = ?, max_downloads = ?, require_email = ?, webhook_url = ? WHERE id = ? AND user_id = ?'
  )
  .bind(
    expiresAt || null,
    allowDownloads ? 1 : 0,
    allowUploads ? 1 : 0,
    maxDownloads || null,
    requireEmail ? 1 : 0,
    webhookUrl || null,
    id,
    userId
  )
  .run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Link not found or no changes made' }, 404);
  }

  return c.json({ success: true });
});
```

- [ ] **Step 2: Commit**

```bash
git add packages/worker/src/routes/shared.ts
git commit -m "feat(worker): add PUT route to edit shared links"
```

### Task 5: Enhance Worker GET /download Route

**Files:**
- Modify: `packages/worker/src/routes/shared.ts`

- [ ] **Step 1: Write minimal implementation**
Modify `GET /:id/download` to respect `allowDownloads` and `maxDownloads`. Add this after validation checks:

```typescript
// Inside sharedRouter.get('/:id/download', ...
  if (!link.allowDownloads) {
    return c.text('Downloads are disabled for this link', 403);
  }

  if (link.maxDownloads !== null && link.downloadCount >= link.maxDownloads) {
    return c.text('Maximum download limit reached', 403);
  }

  // Increment download count
  c.executionCtx.waitUntil(
    db.prepare('UPDATE shared_links SET download_count = download_count + 1 WHERE id = ?').bind(id).run()
  );

  // Trigger webhook async if exists
  if (link.webhookUrl) {
    c.executionCtx.waitUntil(
      fetch(link.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download', linkId: id })
      }).catch(() => {}) // Fire and forget
    );
  }
```

- [ ] **Step 2: Commit**

```bash
git add packages/worker/src/routes/shared.ts
git commit -m "feat(worker): enforce download rules and fire webhooks"
```

### Task 6: Frontend API Types

**Files:**
- Modify: `packages/web/src/lib/api.ts`

- [ ] **Step 1: Write minimal implementation**
Update `createSharedLink` payload interface and add `updateSharedLink`.

```typescript
export interface CreateSharedLinkPayload {
  targetType: 'file' | 'folder';
  targetId: string;
  password?: string;
  expiresAt?: string;
  allowDownloads?: boolean;
  allowUploads?: boolean;
  maxDownloads?: number | null;
  requireEmail?: boolean;
  webhookUrl?: string;
}

export async function updateSharedLink(id: string, payload: Partial<CreateSharedLinkPayload>) {
  return await fetchApi(`/api/shared/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/lib/api.ts
git commit -m "feat(web): add API methods for advanced sharing config"
```

### Task 7: Create AdvancedShareModal Component

**Files:**
- Create: `packages/web/src/components/AdvancedShareModal.tsx`

- [ ] **Step 1: Write minimal implementation**
```tsx
import { useState } from 'react';
import { createSharedLink, updateSharedLink } from '../lib/api';

export function AdvancedShareModal({ targetId, targetType, onClose, existingConfig }: any) {
  const [config, setConfig] = useState(existingConfig || {
    allowDownloads: true,
    allowUploads: false,
    maxDownloads: '',
    webhookUrl: ''
  });

  const handleSave = async () => {
    const payload = {
      ...config,
      maxDownloads: config.maxDownloads ? parseInt(config.maxDownloads) : null
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/AdvancedShareModal.tsx
git commit -m "feat(web): add advanced share configuration modal"
```

### Task 8: Implement SharedLinks Dashboard Page

**Files:**
- Create: `packages/web/src/pages/SharedLinksPage.tsx`

- [ ] **Step 1: Write minimal implementation for the page**
```tsx
import { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';

export function SharedLinksPage() {
  const [links, setLinks] = useState<any[]>([]);

  useEffect(() => {
    fetchApi('/api/shared').then(res => setLinks(res.links));
  }, []);

  const revoke = async (id: string) => {
    await fetchApi(`/api/shared/${id}`, { method: 'DELETE' });
    setLinks(links.filter(l => l.id !== id));
  };

  return (
    <div className="p-4">
      <h2>Active Shared Links</h2>
      <ul>
        {links.map(link => (
          <li key={link.id}>
            {link.id} - Views: {link.viewCount} - Downloads: {link.downloadCount}
            <button onClick={() => revoke(link.id)}>Stop Sharing</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/pages/SharedLinksPage.tsx
git commit -m "feat(web): add shared links dashboard"
```
