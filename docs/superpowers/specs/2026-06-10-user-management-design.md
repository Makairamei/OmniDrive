# User & Team Management Design Specification

## 1. Overview
This feature introduces a global Admin User Management system to OmniDrive, allowing administrators to view, invite, block, and delete application users. It also updates the global application `Header` to correctly display the authenticated user's profile information (avatar, name, email) instead of hardcoded placeholders.

## 2. Data Model Changes
The `User` interface (located in `types/index.ts`) will be updated to include role and status properties:
- `role`: `'admin' | 'user'`
- `status`: `'active' | 'blocked'`

These properties will determine user access levels and whether they are permitted to log in or use the application.

## 3. Header Component Improvements
- **Location**: `components/layout/Header.tsx`
- **Data Source**: Hook into `useAuthStore` to get the current authenticated `user`.
- **Avatar Display**: 
  - If `user.avatarUrl` is present, display it as an `<img>` tag with appropriate styling.
  - If `user.avatarUrl` is null/empty, fallback to an initial-based avatar (e.g., `user.name.charAt(0)`).
- **Dropdown Info**: Update the dropdown menu inside the header to show the dynamic `user.name` and `user.email`.

## 4. Admin Routing & Navigation
- **Protected Route**: A new route `/admin/users` will be created inside the main application layout. This route will have a guard that redirects non-admin users (`user.role !== 'admin'`) to the dashboard or shows an unauthorized message.
- **Sidebar Navigation**: `components/layout/Sidebar.tsx` will be updated to conditionally render an "Admin" or "User Management" navigation item. This item will only be visible when `user?.role === 'admin'`.

## 5. User Management Interface
- **File**: `AdminUsersPage.tsx`
- **Layout**: 
  - A page header containing the title and a primary "Invite User" button.
  - A responsive Data Table.
- **Table Columns**:
  - Name & Avatar
  - Email
  - Role (`admin` | `user`)
  - Status (`active` | `blocked`)
  - Joined Date
  - Actions
- **Interactions**:
  - **Invite User**: Opens a modal component (`InviteUserModal.tsx`) containing a form for Email and Role selection.
  - **Actions Dropdown**: Located in the Actions column of each row. Contains options to "Block User" / "Unblock User" (depending on current status) and "Delete User".

## 6. API Considerations
- The backend/mock-api will need to expose endpoints for the user management operations:
  - `GET /api/admin/users`: Fetch all users.
  - `POST /api/admin/users/invite`: Invite a new user.
  - `PATCH /api/admin/users/:id/status`: Block/unblock user.
  - `DELETE /api/admin/users/:id`: Delete a user.

## 7. Security & Scope
- All admin actions must be strictly guarded both on the frontend (routing) and the backend (API endpoints requiring admin authorization).
- The scope is strictly global application users, independent of Workspace member management.
