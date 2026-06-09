import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceMainView } from '../../../src/components/workspaces/WorkspaceMainView';

vi.mock('../../../src/components/workspaces/WorkspaceFilesTab', () => ({
  WorkspaceFilesTab: () => <div data-testid="files-tab">Files Tab Content</div>
}));
vi.mock('../../../src/components/workspaces/WorkspaceMembersTab', () => ({
  WorkspaceMembersTab: () => <div data-testid="members-tab">Members Tab Content</div>
}));
vi.mock('../../../src/components/workspaces/WorkspaceSettingsTab', () => ({
  WorkspaceSettingsTab: () => <div data-testid="settings-tab">Settings Tab Content</div>
}));

describe('WorkspaceMainView', () => {
  const mockProps = {
    activeFolder: { id: '1', name: 'Engineering', workspaceId: 'w1', parentId: null, icon: null, color: null, isStarred: false, createdAt: '', updatedAt: '' },
    path: [{ id: '1', name: 'Engineering' }],
    onCreateFolder: vi.fn(),
    onSync: vi.fn(),
    isSyncing: false,
    fileTabProps: {
      files: [], subfolders: [], getDriveInfo: vi.fn(), onNavigateFolder: vi.fn(),
      onPreviewFile: vi.fn(), onShare: vi.fn(), onRenameFile: vi.fn(), onDeleteFile: vi.fn(),
      onMoveDrive: vi.fn(), isTargetShared: vi.fn(), errorDrives: new Set<string>(), onViewInfo: vi.fn()
    }
  };

  it('renders breadcrumbs and title', () => {
    render(<WorkspaceMainView {...mockProps} />);
    expect(screen.getAllByText('Engineering')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1, name: 'Engineering' })).toBeDefined();
  });

  it('switches tabs correctly', () => {
    render(<WorkspaceMainView {...mockProps} />);
    expect(screen.getByTestId('files-tab')).toBeDefined();
    
    fireEvent.click(screen.getByText('Members'));
    expect(screen.getByTestId('members-tab')).toBeDefined();
    
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByTestId('settings-tab')).toBeDefined();
  });
});
