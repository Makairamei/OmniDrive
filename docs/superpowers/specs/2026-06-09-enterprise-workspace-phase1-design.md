# Enterprise Workspace Phase 1: Access Control & Audit Trails Design

## Overview
This document outlines the architecture and implementation design for Phase 1 of the "Enterprise Workspace" epic for OmniDrive. Phase 1 focuses on establishing a robust Role-Based Access Control (RBAC) system and comprehensive Audit Trails. This creates the security foundation required for larger enterprise features.

## 1. Architecture & Data Model

### 1.1 Expanding Roles
The `WorkspaceMember` model will be updated to support a new, granular set of predefined roles:
- `viewer`: Can only read files and folder structures.
- `commenter`: Can read files and add comments.
- `editor`: Can read, upload, modify, and delete files.
- `manager`: Can do everything an editor can, plus manage workspace settings and invite/remove members.
- `auditor`: A special read-only role that can view the workspace audit logs.
- `owner`: Full administrative control (cannot be removed except by transferring ownership).

### 1.2 Audit Log Data Model
A new `AuditLog` database table will be introduced to track all significant events within workspaces and across the system.
**Schema Definition:**
- `id`: Unique identifier (String/UUID).
- `workspaceId`: The workspace where the action occurred (String/UUID, nullable for global events).
- `actorId`: The ID of the user who performed the action (String/UUID).
- `actionType`: A string representing the event (e.g., `file.create`, `file.delete`, `member.invite`, `role.update`, `workspace.settings_update`).
- `resourceId`: The ID of the affected resource (String/UUID).
- `resourceName`: The name of the affected resource for human-readable context (String).
- `metadata`: JSON payload containing specific details (e.g., `{ "previousRole": "viewer", "newRole": "editor" }`).
- `createdAt`: Timestamp of the event.

### 1.3 Automated Retention
To prevent unbounded growth of the `AuditLog` table, a background worker (cron job) will be implemented to automatically delete any log entries where `createdAt` is older than **30 days**.

## 2. Backend API & Authorization

### 2.1 RBAC Enforcement
- Implement a centralized authorization middleware or utility function to verify roles before processing requests.
- E.g., File deletion requests will require `editor`, `manager`, or `owner` roles. Workspace setting changes will require `manager` or `owner` roles.

### 2.2 Event Logging Service
- Introduce an internal `logEvent` service.
- The backend controllers (e.g., file upload, member invite, role update) will call `logEvent` synchronously after a successful database transaction to record the audit trail.

### 2.3 New Audit API Endpoints
- `GET /api/workspaces/:id/audit-logs`: Returns paginated logs for a specific workspace. Guarded by the `manager`, `auditor`, or `owner` role.
- `GET /api/admin/audit-logs`: Returns paginated logs for the entire platform. Guarded by system Super Admin privileges.

## 3. UI & Frontend Experience

### 3.1 Upgraded Workspace Members Tab
- The `WorkspaceMembersTab` component will be updated to display and assign the new comprehensive roles.
- The UI will conditionally render, disable, or hide actions (like "New Folder" or "Delete") based on the active user's permissions, ensuring an intuitive experience.

### 3.2 Workspace Audit Log Tab
- A new "Audit Log" tab will be added to the `WorkspaceMainView` component alongside Files, Members, and Settings.
- The tab will display a paginated data table showing: Date, Actor, Action, and Resource.
- Basic filtering controls will be provided to filter logs by Action Type or specific Users.

### 3.3 Global Super Admin Dashboard
- A new top-level frontend route (e.g., `/admin/audit`) will be created for platform Super Admins.
- This view will display the system-wide master audit log, including an additional "Workspace" column to provide context on where the event occurred.
