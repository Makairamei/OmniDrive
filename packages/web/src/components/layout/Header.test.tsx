import { render, screen, fireEvent } from '@testing-library/react';
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

  it('navigates to search page on enter', () => {
    const mockNavigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('Search in Drive');
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/search?q=test+query');
  });

  it('shows toast for placeholder icons', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    
    // Help icon is the first one, Settings second, Grid third.
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
