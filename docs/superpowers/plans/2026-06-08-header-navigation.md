# Header Navigation Implementation Plan

### Task 1: Update Header Navigation and Profile Dropdown

**Files:**
- Modify: `packages/web/src/components/layout/Header.tsx`
- Modify: `packages/web/src/components/layout/Header.test.tsx`

- [ ] **Step 1: Write the failing test**

Update `Header.test.tsx` to test the dropdown and toast actions. (Since testing Radix UI in jsdom can be tricky, we'll write a simple test checking if the "Coming soon!" text appears or the Dropdown Trigger exists).

```tsx
// packages/web/src/components/layout/Header.test.tsx
// Add test cases for placeholder icons
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { useToastStore } from '../../stores/toastStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('Header', () => {
  it('renders OmniDrive branding', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText('OmniDrive')).toBeDefined();
  });

  // ... (keep search test) ...

  it('shows toast for placeholder icons', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    
    // Help icon is the first one, Settings second, Grid third. We can query by their container or accessible roles if we add them. 
    // To make it simple, we'll check if the AddToast was called.
    const buttons = screen.getAllByRole('button');
    // buttons[0] = Sidebar toggle
    // buttons[1] = Help
    fireEvent.click(buttons[1]);
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'Coming soon!' })
      ])
    );
  });
});
```

- [ ] **Step 2: Write implementation**

Modify `packages/web/src/components/layout/Header.tsx`.

Add imports for DropdownMenu, useToastStore.
Wrap the Avatar in a `DropdownMenu`.
Add `onClick={() => addToast('info', 'Coming soon!')}` to Help, Settings, and Grid buttons.

```tsx
// Example snippet
import { useToastStore } from '../../stores/toastStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { LogOut, User } from 'lucide-react';

export const Header: React.FC = () => {
  // ...
  const { addToast } = useToastStore();
  const handlePlaceholderClick = () => {
    addToast('info', 'Coming soon!');
  };

  return (
    // ...
      <div className="flex items-center gap-2 px-2 text-gray-600">
        <button onClick={handlePlaceholderClick} className="p-2 hover:bg-gray-200 rounded-full transition-colors hidden sm:block">
          <HelpCircle size={24} />
        </button>
        <button onClick={handlePlaceholderClick} className="p-2 hover:bg-gray-200 rounded-full transition-colors hidden sm:block">
          <Settings size={24} />
        </button>
        <button onClick={handlePlaceholderClick} className="p-2 hover:bg-gray-200 rounded-full transition-colors hidden sm:block mr-2">
          <Grid3X3 size={24} />
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium cursor-pointer hover:bg-blue-700 select-none">
              U
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white shadow-xl rounded-xl border border-gray-200">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1 py-1">
                <p className="text-sm font-medium leading-none text-gray-800">User</p>
                <p className="text-xs leading-none text-gray-500">user@example.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={handlePlaceholderClick}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    // ...
  );
};
```

- [ ] **Step 3: Run test**

Run: `cd packages/web && npx vitest run src/components/layout/Header.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

Run: `rtk git add packages/web/src/components/layout/Header.tsx packages/web/src/components/layout/Header.test.tsx && rtk git commit -m "feat: add profile dropdown and placeholder interactions"`
