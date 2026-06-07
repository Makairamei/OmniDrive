# Google Drive UI/UX Overhaul Design Spec

## 1. Overview
The goal of this project is to overhaul the OmniDrive web interface (`packages/web`) to closely mimic the UI/UX of Google Drive (Material Design 3). This includes replicating the layout structure, interactive file management capabilities, and comprehensive sidebar navigation, creating a premium and highly familiar user experience.

## 2. Architecture & Technology Stack
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS integrated with Shadcn UI.
- **Component Strategy:** Shadcn UI components will be heavily customized (border-radius, colors, typography, shadow) to achieve the Material Design 3 aesthetic.
- **State Management:** Zustand for local UI state.
- **Icons:** Lucide React (currently installed) adapted to mimic Material icons, or replacing/augmenting with Material Symbols if necessary for exact fidelity.

## 3. Layout Structure
The application will be divided into four main functional areas:

1. **Top Header:**
   - OmniDrive Logo/Branding on the left.
   - Prominent, pill-shaped Search Bar in the center (with advanced search filter dropdown mock).
   - User profile avatar and settings icons on the right.

2. **Left Sidebar (Collapsible):**
   - Prominent "New" button (pill-shaped) launching a dropdown for uploads/creation.
   - Primary Navigation: My Drive, Computers, Shared with me, Recent, Starred, Spam, Trash.
   - Storage usage indicator at the bottom.
   - *Note:* Menus not currently backed by the backend will be mocked to display empty states or coming soon indicators.

3. **Main Content Area:**
   - Dynamic Sub-header: Breadcrumb navigation, view toggles (List vs. Grid), and action buttons (Info, View details).
   - Content View: Scrollable area rendering files and folders.

4. **Right Info Panel (Toggleable):**
   - Slides in from the right when toggled or when a file is selected.
   - Displays file metadata, thumbnail preview, and activity history.

## 4. Core Components & Interactions
- **File/Folder View:** 
  - Supports List and Grid modes.
  - Implements `react-dropzone` for drag-and-drop file uploads over the entire main area.
  - Single click to select, double click to navigate inside folders.
  - Multi-select capability via shift/ctrl-click.
- **Context Menus:** 
  - Right-click menu on files/folders using Shadcn's Context Menu.
  - Includes standard actions: Preview, Share, Get link, Download, Rename, Move to Trash.
- **Modals/Dialogs:** 
  - Standardized Shadcn Dialogs for file uploads, creating new folders, and renaming items.

## 5. State Management (Zustand Stores)
The state will be modularized to avoid prop drilling and keep components clean:

- **`useUIStore`:** 
  - `isSidebarOpen` (boolean)
  - `isInfoPanelOpen` (boolean)
  - `viewMode` ('list' | 'grid')
  - `theme` ('light' | 'dark')
- **`useSelectionStore`:**
  - `selectedIds` (string array of currently selected file/folder IDs)
  - `clearSelection()`
  - `addSelection(id)`
  - `removeSelection(id)`

## 6. Implementation Phasing
1. **Foundation:** Initialize Tailwind CSS and Shadcn UI configuration. Define the Material Design 3 color palette, typography, and utility classes in the global CSS.
2. **Layout Skeletons:** Build the Header, Sidebar, Main Area wrapper, and Info Panel structure.
3. **Core Stores:** Setup Zustand stores for UI state.
4. **File Views:** Implement List/Grid views, Context Menus, and the "New" button dropdown.
5. **Polishing:** Apply micro-animations, hover states, and drag-and-drop interactions to perfect the Google Drive feel.
