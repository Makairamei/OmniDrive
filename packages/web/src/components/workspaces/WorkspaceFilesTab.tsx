import type { ComponentProps } from 'react';
import { FileGrid } from '../files/FileGrid';

export type WorkspaceFilesTabProps = ComponentProps<typeof FileGrid>;

export function WorkspaceFilesTab(props: WorkspaceFilesTabProps) {
  return (
    <div className="flex-1 overflow-auto p-4">
      <FileGrid {...props} />
    </div>
  );
}
