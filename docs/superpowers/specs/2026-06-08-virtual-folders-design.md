# Virtual Folders (Enterprise Approach) - Design Spec

## 1. Overview
Virtual Folders allows users to create a custom hierarchy of folders to organize files across multiple connected Google Drive accounts. This feature is designed with an "enterprise approach" focusing on zero-latency loading, robust error handling, and a professional user interface.

This is Phase 1 of the Virtual Folders initiative, focusing on Core Organization & UI.

## 2. Architecture & Data Flow

### 2.1. Backend & Database
We are utilizing a **Full Local Database Query** approach for maximum performance and a seamless enterprise user experience.

- **Storage**: We use the existing `virtual_folders` table and the `virtual_folder_id` foreign key in the `files` table.
- **Data Fetching**: When a user opens a Virtual Folder, the backend queries the local `files` table where `virtual_folder_id = X`. This provides instantaneous loading (zero-latency).
- **Manual Sync**: A `Sync` button will be provided. When clicked, it triggers a background verification check against the Google Drive API to ensure the files in the Virtual Folder still exist and their metadata is up to date, reconciling any external changes (e.g., deletions directly in Google Drive).

### 2.2. API Endpoints
- `GET /api/virtual-folders`: Fetch the tree structure of virtual folders.
- `POST /api/virtual-folders`: Create a new virtual folder.
- `PUT /api/virtual-folders/:id`: Update virtual folder (rename, change color/icon, move to new parent).
- `DELETE /api/virtual-folders/:id`: Delete virtual folder (files inside will just be unlinked, not deleted from Drive).
- `GET /api/virtual-folders/:id/contents`: Fetch sub-folders and files inside the folder (local DB query).
- `POST /api/virtual-folders/:id/files`: Add an array of `fileId`s to this virtual folder.
- `POST /api/virtual-folders/:id/sync`: Trigger on-demand sync with Google Drive for files in this folder.

## 3. Frontend & UI Components

### 3.1. Main Layout (`VirtualFoldersPage.tsx`)
A dedicated tab/page separate from the main "All Files" view.
- **Split-Pane Layout**: 
  - **Left Sidebar**: A Tree-View specifically for navigating the Virtual Folders hierarchy. Users can drag-and-drop folders to nest them. Right-clicking a folder reveals options to Create Sub-folder, Rename, Change Color/Icon, and Delete.
  - **Main Area**: A Grid/List view displaying the contents (files and sub-folders) of the selected Virtual Folder.
- **Header**: Includes Breadcrumb navigation, a "Sync" button (with loading spinner), and an "Add Files" button.

### 3.2. Interactions
- **Add Files Modal (From Virtual Folder)**: Clicking "Add Files" opens a modal (similar to a file picker) allowing users to browse their "All Files" and select items to insert into the current Virtual Folder.
- **Context Menu (From All Files)**: In the standard `FilesPage`, right-clicking any file will show an "Add to Virtual Folder" option. This opens a modal to choose the destination Virtual Folder.

## 4. Error Handling & Edge Cases

### 4.1. Data Loss Prevention
- **Default Deletion Behavior**: Deleting a file from within a Virtual Folder strictly performs a "Remove from Virtual Folder" action (clearing the `virtual_folder_id`). It does **not** delete the file from Google Drive.
- Explicit Drive deletion from within a Virtual Folder will require a prominent, red confirmation dialog.

### 4.2. External Changes
- If a file is deleted directly in Google Drive, the local database might still show it in the Virtual Folder temporarily.
- If the user attempts to open the missing file, or clicks the "Sync" button, the system will detect the absence, remove the file from the Virtual Folder locally, and display a toast notification explaining that the file was removed externally.

### 4.3. Circular Dependencies
- The backend will strictly validate parent-child relationships when creating or moving folders to prevent infinite loops (e.g., Folder A -> Folder B -> Folder A).
