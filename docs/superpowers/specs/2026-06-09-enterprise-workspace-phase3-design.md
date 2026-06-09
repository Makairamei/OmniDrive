# Enterprise Workspace Phase 3: Search & Discovery

## 1. Overview
Phase 3 focuses on enterprise scale by introducing cross-workspace search and custom metadata tagging. This allows organizations to effectively categorize and discover files across massive workspaces.

## 2. Architecture & Data Model
- **Metadata Storage:** 
  - The `files` table will be updated with a `metadata` column (TEXT DEFAULT '{}').
  - The `workspace_folders` table will be updated with a `metadata` column (TEXT DEFAULT '{}').
  - This utilizes SQLite's built-in JSON capabilities for efficient storage and querying.

## 3. Backend API
- **Unified Global Search API (`GET /api/search`):**
  - Searches personal drives and workspaces.
  - Secures results using the `workspace_members` table (users only see files from workspaces they have access to).
  - Query parameters: `q` (text search against name), `workspaceId` (optional scope), `metadata` (optional JSON string to filter by exact key/value matches).
- **Metadata CRUD:**
  - `PATCH /api/files/:id/metadata`: Updates the JSON metadata of a specific file.
  - `PATCH /api/workspaces/:id/folders/:folderId/metadata`: Updates the JSON metadata of a folder.
  - Guarded by RBAC: requires `editor`, `manager`, or `owner` roles.

## 4. UI & Frontend Experience
- **The Omnibar (Global Search):**
  - Search input in the global header fetches results from `/api/search`.
  - Results are visually grouped by context (e.g., Personal vs. Workspace A).
  - Includes an advanced filter dropdown for metadata queries.
- **Metadata Inspector (Info Panel):**
  - Extends the right-hand Info Panel to display a "Tags & Metadata" section.
  - Provides a UI for editors/admins to add or remove Key-Value pairs.
- **Visual Badges:**
  - Files/folders with metadata will render small pill badges directly in the `FileGrid` to highlight their tags.
