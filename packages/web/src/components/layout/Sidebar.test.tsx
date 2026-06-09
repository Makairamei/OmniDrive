import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('should contain Workspaces link', () => {
    // Note: useUIStore defaults isSidebarOpen to true, so it should render
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByText('Workspaces')).toBeDefined();
    expect(screen.queryByText('Virtual Folders')).toBeNull();
  });
});
