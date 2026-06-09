# Implementation Plan: Enterprise Workspace Phase 3

## Step 1: Database Migration
- **Target:** `packages/worker/src/db/0004_enterprise_workspace_phase3.sql` and `schema.sql`
- **Actions:**
  - Add `metadata TEXT DEFAULT '{}'` to `files` table.
  - Add `metadata TEXT DEFAULT '{}'` to `workspace_folders` table.

## Step 2: Shared Types Update
- **Target:** `packages/web/src/types/index.ts`
- **Actions:**
  - Update `FileEntry` and `WorkspaceFolder` interfaces to include `metadata?: string | Record<string, string>`.

## Step 3: Backend API - Metadata Updates
- **Target:** `packages/worker/src/routes/files.ts` and `packages/worker/src/routes/folders.ts`
- **Actions:**
  - Add `PATCH /api/files/:id/metadata` to update file metadata. Check RBAC (editor+).
  - Add `PATCH /api/workspaces/:id/folders/:folderId/metadata` to update folder metadata. Check RBAC (editor+).

## Step 4: Backend API - Unified Search
- **Target:** `packages/worker/src/routes/search.ts` (create) and `index.ts`
- **Actions:**
  - Create the new `searchRouter`.
  - Implement `GET /` which searches both personal `files` (via `user_id`) and workspace `files` (via `workspace_members`).
  - Implement JSON metadata filtering using SQLite's `json_extract` if the `metadata` query param is provided.

## Step 5: Frontend API Client
- **Target:** `packages/web/src/lib/api.ts`
- **Actions:**
  - Add `updateFileMetadata`, `updateFolderMetadata`, and `globalSearch` methods.

## Step 6: UI - Info Panel Metadata Editor
- **Target:** `packages/web/src/components/files/InfoPanel.tsx`
- **Actions:**
  - Add a "Tags & Metadata" section.
  - Render active tags.
  - Add a form to define new Key-Value pairs if the user has edit permissions, calling the update API.

## Step 7: UI - Global Omnibar
- **Target:** `packages/web/src/components/layout/Header.tsx` (or new `Omnibar.tsx` component)
- **Actions:**
  - Upgrade the search input to call `globalSearch`.
  - Render a dropdown of results grouped by context.
  - Add basic metadata filter inputs to the search bar.

## Step 8: UI - Visual Badges in FileGrid
- **Target:** `packages/web/src/components/files/FileGrid.tsx`
- **Actions:**
  - Parse `metadata` for files and folders in the grid.
  - Render colorful pill badges for each tag next to the file/folder name.
