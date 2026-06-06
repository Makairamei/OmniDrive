# Full Google Drive Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the sync process to mirror the entire Google Drive for each connected Gmail account — all files and all folders — without limiting to a specific root folder. Mirror the folder hierarchy in the UI with lazy loading for subfolders.

**Spec:** `docs/superpowers/specs/2026-06-07-full-drive-sync-design.md`

**Affected files:**
- `packages/worker/src/db/schema.sql`
- `packages/worker/src/services/google-drive.ts`
- `packages/worker/src/services/sync.ts`
- `packages/worker/src/routes/drives.ts`
- `packages/worker/src/types/index.ts`
- `packages/web/src/lib/api.ts`
- `packages/web/src/types/index.ts`
- `packages/web/src/pages/DashboardPage.tsx` (or equivalent file browser)

---

## Task 1 — Database Schema: Add `drive_folders` table and `google_parent_id` column

**File:** `packages/worker/src/db/schema.sql`

- [ ] Add new table `drive_folders` after the `drive_accounts` table:

```sql
-- Google Drive folder structure (mirrored from Google Drive, read-only)
CREATE TABLE IF NOT EXISTS drive_folders (
    id                TEXT PRIMARY KEY,
    drive_account_id  TEXT NOT NULL REFERENCES drive_accounts(id) ON DELETE CASCADE,
    google_folder_id  TEXT NOT NULL,
    google_parent_id  TEXT,
    name              TEXT NOT NULL,
    is_synced         INTEGER NOT NULL DEFAULT 0,
    synced_at         TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(drive_account_id, google_folder_id)
);

CREATE INDEX IF NOT EXISTS idx_drive_folders_parent
    ON drive_folders(drive_account_id, google_parent_id);
```

- [ ] Add `google_parent_id` column to `files` table:

```sql
-- In the files table definition, add:
google_parent_id TEXT,
```

- [ ] Run migration on D1 (for existing databases, document these migration commands):

```sql
-- Migration commands (run via wrangler d1 execute):
ALTER TABLE files ADD COLUMN google_parent_id TEXT;

CREATE TABLE IF NOT EXISTS drive_folders (
    id                TEXT PRIMARY KEY,
    drive_account_id  TEXT NOT NULL REFERENCES drive_accounts(id) ON DELETE CASCADE,
    google_folder_id  TEXT NOT NULL,
    google_parent_id  TEXT,
    name              TEXT NOT NULL,
    is_synced         INTEGER NOT NULL DEFAULT 0,
    synced_at         TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(drive_account_id, google_folder_id)
);

CREATE INDEX IF NOT EXISTS idx_drive_folders_parent
    ON drive_folders(drive_account_id, google_parent_id);

-- Force re-sync of all existing drive accounts
UPDATE sync_state SET change_token = NULL;
```

**Verification:** Schema file is consistent; no duplicate column definitions.

---

## Task 2 — Types: Add `DriveFolder` type to shared types

**File:** `packages/worker/src/types/index.ts`

- [ ] Add `DriveFolder` interface:

```typescript
export interface DriveFolder {
  id: string;
  driveAccountId: string;
  googleFolderId: string;
  googleParentId: string | null;
  name: string;
  isSynced: boolean;
  syncedAt: string | null;
  createdAt: string;
}
```

- [ ] Add `mapDriveFolderRow` mapper function:

```typescript
export function mapDriveFolderRow(row: Record<string, unknown>): DriveFolder {
  return {
    id: row.id as string,
    driveAccountId: row.drive_account_id as string,
    googleFolderId: row.google_folder_id as string,
    googleParentId: row.google_parent_id as string | null,
    name: row.name as string,
    isSynced: Boolean(row.is_synced),
    syncedAt: row.synced_at as string | null,
    createdAt: row.created_at as string,
  };
}
```

- [ ] Update `DriveFile` type to include `googleParentId`:

```typescript
// Add to existing DriveFile interface:
googleParentId?: string | null;
```

- [ ] Update `mapFileRow` to include `googleParentId`:

```typescript
googleParentId: row.google_parent_id as string | null ?? null,
```

**Verification:** TypeScript compiles without errors (`npx tsc --noEmit` in packages/worker).

---

## Task 3 — Google Drive Service: Add `listFolderContents` method

**File:** `packages/worker/src/services/google-drive.ts`

- [ ] Add return type interfaces near the top of the file:

```typescript
export interface GDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  parents?: string[];
  trashed?: boolean;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime: string;
  modifiedTime: string;
}

export interface GDriveFolder {
  id: string;
  name: string;
  parents?: string[];
}
```

- [ ] Add `listFolderContents` method to `GoogleDriveService` class (place after the existing `listFilesInFolder` method):

```typescript
async listFolderContents(
  driveAccountId: string,
  folderId: string
): Promise<{ files: GDriveFile[]; folders: GDriveFolder[] }> {
  const token = await this.getValidToken(driveAccountId);
  const fields =
    'nextPageToken,files(id,name,mimeType,size,parents,trashed,thumbnailLink,webViewLink,webContentLink,createdTime,modifiedTime)';
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);

  const allFiles: GDriveFile[] = [];
  const allFolders: GDriveFolder[] = [];
  let pageToken: string | undefined;

  do {
    const url = `${DRIVE_API}/files?q=${q}&fields=nextPageToken,${fields}${
      pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
    }`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to list folder contents: ${await response.text()}`);
    }

    const data: { files: GDriveFile[]; nextPageToken?: string } = await response.json();

    for (const item of data.files) {
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        allFolders.push({ id: item.id, name: item.name, parents: item.parents });
      } else {
        allFiles.push(item);
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return { files: allFiles, folders: allFolders };
}
```

- [ ] Keep the existing `listFilesInFolder` method (it may still be used elsewhere), but note it is superseded by `listFolderContents` for sync purposes.

**Verification:** `npx tsc --noEmit` passes. Method handles pagination correctly.

---

## Task 4 — Sync Service: Rewrite `performInitialSync` and `performIncrementalSync`

**File:** `packages/worker/src/services/sync.ts`

- [ ] Add import for `GDriveFile`, `GDriveFolder` from `google-drive.ts`:

```typescript
import type { GDriveFile, GDriveFolder } from './google-drive';
```

- [ ] Rewrite `syncDriveAccount` entry point — remove the early exit on `!drive.rootFolderId`:

```typescript
// REMOVE these lines:
if (!drive.rootFolderId) {
  console.log(`Skipping sync for ${drive.email}: no root folder`);
  return;
}
```

The function should now always proceed regardless of `rootFolderId`.

- [ ] Rewrite `performInitialSync` to crawl Drive root and save folders + files:

```typescript
async function performInitialSync(
  drive: DriveAccount,
  db: D1Database,
  driveService: GoogleDriveService
): Promise<void> {
  console.log(`Initial sync for ${drive.email} — crawling Drive root`);

  const { files, folders } = await driveService.listFolderContents(drive.id, 'root');

  // Upsert all root-level folders (not yet recursed into)
  for (const folder of folders) {
    await upsertDriveFolder(db, drive, folder, null);
  }

  // Upsert all root-level files
  for (const file of files) {
    await upsertFile(db, drive, file, 'root');
  }
}
```

- [ ] Add `upsertDriveFolder` helper function:

```typescript
async function upsertDriveFolder(
  db: D1Database,
  drive: DriveAccount,
  folder: GDriveFolder,
  googleParentId: string | null
): Promise<void> {
  const existing = await db
    .prepare('SELECT id FROM drive_folders WHERE drive_account_id = ? AND google_folder_id = ?')
    .bind(drive.id, folder.id)
    .first<{ id: string }>();

  if (existing) {
    await db
      .prepare(
        `UPDATE drive_folders SET name = ?, google_parent_id = ? WHERE id = ?`
      )
      .bind(folder.name, googleParentId, existing.id)
      .run();
  } else {
    const folderId = generateId();
    await db
      .prepare(
        `INSERT INTO drive_folders (id, drive_account_id, google_folder_id, google_parent_id, name, is_synced)
         VALUES (?, ?, ?, ?, ?, 0)`
      )
      .bind(folderId, drive.id, folder.id, googleParentId, folder.name)
      .run();
  }
}
```

- [ ] Rewrite `performIncrementalSync` to remove the `rootFolderId` filter and handle both files and folders:

```typescript
async function performIncrementalSync(
  drive: DriveAccount,
  db: D1Database,
  pageToken: string,
  driveService: GoogleDriveService
): Promise<string> {
  console.log(`Incremental sync for ${drive.email} from token ${pageToken}`);

  let currentToken = pageToken;
  let hasMore = true;

  while (hasMore) {
    const response = await driveService.listChanges(drive.id, currentToken);

    for (const change of response.changes) {
      const isFolder = change.file?.mimeType === 'application/vnd.google-apps.folder';

      // Handle removals
      if (change.removed || change.file?.trashed) {
        if (isFolder) {
          await db
            .prepare('DELETE FROM drive_folders WHERE drive_account_id = ? AND google_folder_id = ?')
            .bind(drive.id, change.fileId)
            .run();
        } else {
          await db
            .prepare('DELETE FROM files WHERE drive_account_id = ? AND google_file_id = ?')
            .bind(drive.id, change.fileId)
            .run();
        }
        continue;
      }

      const file = change.file;
      if (!file) continue;

      // Skip Google Drive shortcuts
      if (file.mimeType === 'application/vnd.google-apps.shortcut') continue;

      const parentId = file.parents?.[0] ?? null;

      if (isFolder) {
        // Upsert folder
        await upsertDriveFolder(db, drive, { id: file.id, name: file.name, parents: file.parents }, parentId);
      } else {
        // Upsert file with updated google_parent_id (handles moves)
        await upsertFile(db, drive, file, parentId ?? 'root');
      }
    }

    if (response.newStartPageToken) {
      return response.newStartPageToken;
    }

    if (response.nextPageToken) {
      currentToken = response.nextPageToken;
    } else {
      hasMore = false;
    }
  }

  return currentToken;
}
```

- [ ] Update `upsertFile` signature to accept `googleParentId` and include it in INSERT/UPDATE:

```typescript
async function upsertFile(
  db: D1Database,
  drive: DriveAccount,
  file: GDriveFile,
  googleParentId: string
): Promise<void> {
  const existing = await db
    .prepare('SELECT id FROM files WHERE drive_account_id = ? AND google_file_id = ?')
    .bind(drive.id, file.id)
    .first<{ id: string }>();

  if (existing) {
    await db
      .prepare(
        `UPDATE files
         SET name = ?, mime_type = ?, size = ?, thumbnail_url = ?, web_view_link = ?,
             web_content_link = ?, google_modified_at = ?, google_parent_id = ?, synced_at = datetime('now')
         WHERE id = ?`
      )
      .bind(
        file.name,
        file.mimeType,
        parseInt(file.size ?? '0', 10),
        file.thumbnailLink ?? null,
        file.webViewLink ?? null,
        file.webContentLink ?? null,
        file.modifiedTime,
        googleParentId,
        existing.id
      )
      .run();
  } else {
    const fileId = generateId();
    await db
      .prepare(
        `INSERT INTO files
           (id, user_id, drive_account_id, google_file_id, google_parent_id, name, mime_type, size,
            thumbnail_url, web_view_link, web_content_link, google_created_at, google_modified_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        fileId,
        drive.userId,
        drive.id,
        file.id,
        googleParentId,
        file.name,
        file.mimeType,
        parseInt(file.size ?? '0', 10),
        file.thumbnailLink ?? null,
        file.webViewLink ?? null,
        file.webContentLink ?? null,
        file.createdTime,
        file.modifiedTime
      )
      .run();
  }
}
```

**Verification:** `npx tsc --noEmit` passes. No references to `drive.rootFolderId` remain in the sync logic.

---

## Task 5 — Drives Router: Add lazy folder sync and folder contents endpoints

**File:** `packages/worker/src/routes/drives.ts`

- [ ] Add import for `mapDriveFolderRow` and `GoogleDriveService`:

```typescript
import { GoogleDriveService } from '../services/google-drive';
import { mapDriveFolderRow } from '../types';
import { generateId } from '../lib/id';
```

- [ ] Add `POST /drives/:driveId/folders/:googleFolderId/sync` endpoint (lazy folder sync):

```typescript
drivesRouter.post('/:driveId/folders/:googleFolderId/sync', async (c) => {
  const userId = c.get('userId');
  const { driveId, googleFolderId } = c.req.param();

  // Verify ownership
  const drive = await c.env.DB
    .prepare('SELECT * FROM drive_accounts WHERE id = ? AND user_id = ?')
    .bind(driveId, userId)
    .first();

  if (!drive) return c.json({ error: 'Drive not found' }, 404);

  // Idempotency: if already synced, return existing data
  const folder = await c.env.DB
    .prepare('SELECT * FROM drive_folders WHERE drive_account_id = ? AND google_folder_id = ?')
    .bind(driveId, googleFolderId)
    .first();

  if (folder && folder.is_synced) {
    const subfolders = await c.env.DB
      .prepare('SELECT * FROM drive_folders WHERE drive_account_id = ? AND google_parent_id = ?')
      .bind(driveId, googleFolderId)
      .all();
    const files = await c.env.DB
      .prepare('SELECT * FROM files WHERE drive_account_id = ? AND google_parent_id = ?')
      .bind(driveId, googleFolderId)
      .all();
    return c.json({
      folder: mapDriveFolderRow(folder as Record<string, unknown>),
      subfolders: subfolders.results.map(r => mapDriveFolderRow(r as Record<string, unknown>)),
      files: files.results,
    });
  }

  // Lazy sync: fetch from Google Drive
  const tokenJson = await c.env.KV.get(`tokens:${driveId}`);
  if (!tokenJson) return c.json({ error: 'No tokens for drive' }, 400);
  const tokens = JSON.parse(tokenJson);

  const driveService = new GoogleDriveService(c.env.KV, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET);
  // Temporarily set the tokens so getValidToken works
  await c.env.KV.put(`oauth:${driveId}`, tokenJson);

  const { files: gFiles, folders: gFolders } = await driveService.listFolderContents(driveId, googleFolderId);

  const driveRow = drive as Record<string, unknown>;
  const driveAccount = {
    id: driveRow.id as string,
    userId: driveRow.user_id as string,
    googleAccountId: driveRow.google_account_id as string,
    email: driveRow.email as string,
    name: driveRow.name as string,
    type: driveRow.type as string,
    isPrimary: Boolean(driveRow.is_primary),
    rootFolderId: driveRow.root_folder_id as string | null,
    totalQuota: driveRow.total_quota as number,
    usedQuota: driveRow.used_quota as number,
    quotaUpdatedAt: driveRow.quota_updated_at as string | null,
    createdAt: driveRow.created_at as string,
  };

  // Upsert subfolders
  for (const gFolder of gFolders) {
    const existing = await c.env.DB
      .prepare('SELECT id FROM drive_folders WHERE drive_account_id = ? AND google_folder_id = ?')
      .bind(driveId, gFolder.id)
      .first<{ id: string }>();

    if (existing) {
      await c.env.DB
        .prepare('UPDATE drive_folders SET name = ?, google_parent_id = ? WHERE id = ?')
        .bind(gFolder.name, googleFolderId, existing.id)
        .run();
    } else {
      await c.env.DB
        .prepare(
          'INSERT INTO drive_folders (id, drive_account_id, google_folder_id, google_parent_id, name, is_synced) VALUES (?, ?, ?, ?, ?, 0)'
        )
        .bind(generateId(), driveId, gFolder.id, googleFolderId, gFolder.name)
        .run();
    }
  }

  // Upsert files
  for (const gFile of gFiles) {
    const existing = await c.env.DB
      .prepare('SELECT id FROM files WHERE drive_account_id = ? AND google_file_id = ?')
      .bind(driveId, gFile.id)
      .first<{ id: string }>();

    if (existing) {
      await c.env.DB
        .prepare(
          `UPDATE files SET name = ?, mime_type = ?, size = ?, thumbnail_url = ?, web_view_link = ?,
           web_content_link = ?, google_modified_at = ?, google_parent_id = ?, synced_at = datetime('now')
           WHERE id = ?`
        )
        .bind(
          gFile.name, gFile.mimeType, parseInt(gFile.size ?? '0', 10),
          gFile.thumbnailLink ?? null, gFile.webViewLink ?? null, gFile.webContentLink ?? null,
          gFile.modifiedTime, googleFolderId, existing.id
        )
        .run();
    } else {
      await c.env.DB
        .prepare(
          `INSERT INTO files (id, user_id, drive_account_id, google_file_id, google_parent_id, name, mime_type, size,
             thumbnail_url, web_view_link, web_content_link, google_created_at, google_modified_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          generateId(), driveAccount.userId, driveId, gFile.id, googleFolderId,
          gFile.name, gFile.mimeType, parseInt(gFile.size ?? '0', 10),
          gFile.thumbnailLink ?? null, gFile.webViewLink ?? null, gFile.webContentLink ?? null,
          gFile.createdTime, gFile.modifiedTime
        )
        .run();
    }
  }

  // Mark this folder as synced
  if (folder) {
    await c.env.DB
      .prepare(`UPDATE drive_folders SET is_synced = 1, synced_at = datetime('now') WHERE drive_account_id = ? AND google_folder_id = ?`)
      .bind(driveId, googleFolderId)
      .run();
  }

  const newSubfolders = await c.env.DB
    .prepare('SELECT * FROM drive_folders WHERE drive_account_id = ? AND google_parent_id = ?')
    .bind(driveId, googleFolderId)
    .all();
  const newFiles = await c.env.DB
    .prepare('SELECT * FROM files WHERE drive_account_id = ? AND google_parent_id = ?')
    .bind(driveId, googleFolderId)
    .all();

  return c.json({
    folder: folder ? mapDriveFolderRow(folder as Record<string, unknown>) : null,
    subfolders: newSubfolders.results.map(r => mapDriveFolderRow(r as Record<string, unknown>)),
    files: newFiles.results,
  });
});
```

- [ ] Add `GET /drives/:driveId/folders/:googleFolderId` endpoint (read from DB):

```typescript
drivesRouter.get('/:driveId/folders/:googleFolderId', async (c) => {
  const userId = c.get('userId');
  const { driveId, googleFolderId } = c.req.param();

  // Verify ownership
  const drive = await c.env.DB
    .prepare('SELECT id FROM drive_accounts WHERE id = ? AND user_id = ?')
    .bind(driveId, userId)
    .first();

  if (!drive) return c.json({ error: 'Drive not found' }, 404);

  const folder = googleFolderId === 'root'
    ? null
    : await c.env.DB
        .prepare('SELECT * FROM drive_folders WHERE drive_account_id = ? AND google_folder_id = ?')
        .bind(driveId, googleFolderId)
        .first();

  const subfolders = await c.env.DB
    .prepare('SELECT * FROM drive_folders WHERE drive_account_id = ? AND google_parent_id = ?')
    .bind(driveId, googleFolderId === 'root' ? null : googleFolderId)
    .all();

  const files = await c.env.DB
    .prepare('SELECT * FROM files WHERE drive_account_id = ? AND google_parent_id = ?')
    .bind(driveId, googleFolderId)
    .all();

  return c.json({
    folder: folder ? mapDriveFolderRow(folder as Record<string, unknown>) : { googleFolderId: 'root', name: 'My Drive', isSynced: true },
    subfolders: subfolders.results.map(r => mapDriveFolderRow(r as Record<string, unknown>)),
    files: files.results,
  });
});
```

**Verification:** `npx tsc --noEmit` passes. Endpoints return correctly structured JSON.

---

## Task 6 — Frontend Types: Add `DriveFolder` type

**File:** `packages/web/src/types/index.ts`

- [ ] Add `DriveFolder` interface:

```typescript
export interface DriveFolder {
  id: string;
  driveAccountId: string;
  googleFolderId: string;
  googleParentId: string | null;
  name: string;
  isSynced: boolean;
  syncedAt: string | null;
}
```

- [ ] Update `DriveFile` type to include optional `googleParentId`:

```typescript
googleParentId?: string | null;
```

---

## Task 7 — Frontend API: Add folder sync and folder contents calls

**File:** `packages/web/src/lib/api.ts`

- [ ] Add `getFolderContents` function:

```typescript
export async function getFolderContents(driveId: string, googleFolderId: string) {
  const res = await apiFetch(`/api/drives/${driveId}/folders/${googleFolderId}`);
  if (!res.ok) throw new Error('Failed to get folder contents');
  return res.json() as Promise<{
    folder: DriveFolder | null;
    subfolders: DriveFolder[];
    files: DriveFile[];
  }>;
}
```

- [ ] Add `syncFolder` function:

```typescript
export async function syncFolder(driveId: string, googleFolderId: string) {
  const res = await apiFetch(`/api/drives/${driveId}/folders/${googleFolderId}/sync`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to sync folder');
  return res.json() as Promise<{
    folder: DriveFolder | null;
    subfolders: DriveFolder[];
    files: DriveFile[];
  }>;
}
```

---

## Task 8 — Frontend: File browser with folder navigation

**File:** `packages/web/src/pages/DashboardPage.tsx` (or equivalent file browser component)

- [ ] Add navigation state to the file browser:

```typescript
const [currentDriveId, setCurrentDriveId] = useState<string | null>(null);
const [currentGoogleFolderId, setCurrentGoogleFolderId] = useState<string>('root');
const [folderHistory, setFolderHistory] = useState<Array<{ googleFolderId: string; name: string }>>([
  { googleFolderId: 'root', name: 'My Drive' }
]);
const [subfolders, setSubfolders] = useState<DriveFolder[]>([]);
const [isFolderLoading, setIsFolderLoading] = useState(false);
```

- [ ] Add folder open handler with lazy sync:

```typescript
async function handleOpenFolder(folder: DriveFolder) {
  setIsFolderLoading(true);
  try {
    let result;
    if (!folder.isSynced) {
      result = await syncFolder(folder.driveAccountId, folder.googleFolderId);
    } else {
      result = await getFolderContents(folder.driveAccountId, folder.googleFolderId);
    }
    setCurrentGoogleFolderId(folder.googleFolderId);
    setSubfolders(result.subfolders);
    // Update files list with result.files
    setFolderHistory(prev => [...prev, { googleFolderId: folder.googleFolderId, name: folder.name }]);
  } catch (err) {
    toast.error('Gagal memuat folder, coba lagi');
  } finally {
    setIsFolderLoading(false);
  }
}
```

- [ ] Add breadcrumb navigation handler:

```typescript
function handleBreadcrumbClick(index: number) {
  const target = folderHistory[index];
  setFolderHistory(prev => prev.slice(0, index + 1));
  setCurrentGoogleFolderId(target.googleFolderId);
  // Re-load folder contents
  if (currentDriveId) {
    getFolderContents(currentDriveId, target.googleFolderId).then(result => {
      setSubfolders(result.subfolders);
      // Update files list
    });
  }
}
```

- [ ] Render breadcrumb UI above the file list:

```tsx
<div className="breadcrumb">
  {folderHistory.map((crumb, index) => (
    <span key={crumb.googleFolderId}>
      {index > 0 && <span className="breadcrumb-sep"> › </span>}
      <button
        className="breadcrumb-item"
        onClick={() => handleBreadcrumbClick(index)}
        disabled={index === folderHistory.length - 1}
      >
        {crumb.name}
      </button>
    </span>
  ))}
</div>
```

- [ ] Render subfolder cards above the file list (between breadcrumb and files):

```tsx
{subfolders.length > 0 && (
  <div className="folder-grid">
    {subfolders.map(folder => (
      <button
        key={folder.googleFolderId}
        className="folder-card"
        onClick={() => handleOpenFolder(folder)}
        disabled={isFolderLoading}
      >
        <span className="folder-icon">
          {isFolderLoading ? '⏳' : '📁'}
          {!folder.isSynced && <span className="folder-unsynced-indicator" />}
        </span>
        <span className="folder-name">{folder.name}</span>
      </button>
    ))}
  </div>
)}
```

- [ ] Add Google native file badges to the file row/card render:

```typescript
function getGoogleNativeBadge(mimeType: string): string | null {
  const badges: Record<string, string> = {
    'application/vnd.google-apps.document': 'G Doc',
    'application/vnd.google-apps.spreadsheet': 'G Sheet',
    'application/vnd.google-apps.presentation': 'G Slides',
    'application/vnd.google-apps.form': 'G Form',
  };
  return badges[mimeType] ?? null;
}
```

- [ ] For Google native files: use `webViewLink` on click (open new tab), hide the download button:

```tsx
const isGoogleNative = file.mimeType.startsWith('application/vnd.google-apps.');
const badge = getGoogleNativeBadge(file.mimeType);

// In file card:
{badge && <span className="file-badge">{badge}</span>}
{isGoogleNative ? (
  <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">Open in Google</a>
) : (
  <button onClick={() => handleDownload(file)}>Download</button>
)}
```

- [ ] Add CSS styles for new elements (`folder-grid`, `folder-card`, `breadcrumb`, `file-badge`, `folder-unsynced-indicator`) to `packages/web/src/index.css`.

**Verification:** Clicking a drive account shows root-level folders and files. Clicking a folder navigates into it. Breadcrumb shows correct path and is clickable. Google native files show badge and open via webViewLink.

---

## Task 9 — CSS: Add styles for folder navigation and badges

**File:** `packages/web/src/index.css`

- [ ] Add `.breadcrumb` styles — horizontal bar, clickable items with hover state, last item non-clickable/muted
- [ ] Add `.folder-grid` — CSS grid, same visual weight as file cards but with folder icon prominence
- [ ] Add `.folder-card` — button reset, hover lift effect, folder icon + name, loading state (opacity 0.6)
- [ ] Add `.folder-unsynced-indicator` — small dot or shimmer to indicate not yet loaded
- [ ] Add `.file-badge` — small pill badge (background: accent color, text: white, font-size: 0.7rem)

---

## Task 10 — Verification & Testing

- [ ] Run `npx tsc --noEmit` in `packages/worker` — must pass clean
- [ ] Run `npx tsc --noEmit` in `packages/web` — must pass clean
- [ ] Apply migrations to local D1 (`wrangler d1 execute omnidrive --local --command "ALTER TABLE files ADD COLUMN google_parent_id TEXT"`)
- [ ] Apply `CREATE TABLE drive_folders` migration to local D1
- [ ] Reset `sync_state` change tokens: `wrangler d1 execute omnidrive --local --command "UPDATE sync_state SET change_token = NULL"`
- [ ] Trigger manual sync via cron simulate or `wrangler dev` and verify:
  - Root-level folders appear in `drive_folders` table with `is_synced = 0`
  - Root-level files appear in `files` with `google_parent_id = 'root'`
- [ ] Open a subfolder in UI → verify lazy sync endpoint is called → folder contents appear
- [ ] Verify Google Docs/Sheets in UI show correct badge and open via `webViewLink`
- [ ] Verify breadcrumb navigation works correctly (forward and backward)
- [ ] Verify `DELETE` in Google Drive reflects correctly after incremental sync (file removed from DB)
