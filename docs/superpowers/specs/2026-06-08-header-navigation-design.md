# Header Profile & Navigation Design Spec

## Overview
Implement a standard profile dropdown and interactive placeholder actions for the Header component to make it feel responsive and complete.

## Approach: Standard Profile Dropdown
- Use existing `@radix-ui/react-dropdown-menu` components (via `src/components/ui/dropdown-menu.tsx`).
- The user avatar ('U') acts as the DropdownMenuTrigger.
- Inside the dropdown:
  - Header: Mock user info (e.g. "User", "user@example.com").
  - Separator.
  - Action: "Log out".
- Secondary Actions (Help, Settings, Grid): clicking these will dispatch an 'info' toast stating "Coming soon!".

## Components Modified
- `Header.tsx`: Wrap the Avatar in a `DropdownMenu`, attach `useToastStore` to the placeholder icons.
