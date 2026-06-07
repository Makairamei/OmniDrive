import React from 'react';
import { useUIStore } from '../../stores/useUIStore';

export const Sidebar: React.FC = () => {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);

  if (!isSidebarOpen) return null;

  return (
    <aside className="w-64 bg-surface h-full flex flex-col p-4 gap-4">
      <button className="bg-white text-primary rounded-full px-6 py-4 shadow-sm w-max hover:shadow-md transition-shadow">
        + New
      </button>
      <nav className="flex flex-col gap-1">
        <div className="px-4 py-2 bg-blue-100 text-primary rounded-full font-medium">My Drive</div>
        <div className="px-4 py-2 hover:bg-gray-100 rounded-full cursor-pointer">Computers</div>
        <div className="px-4 py-2 hover:bg-gray-100 rounded-full cursor-pointer">Shared with me</div>
        <div className="px-4 py-2 hover:bg-gray-100 rounded-full cursor-pointer">Trash</div>
      </nav>
    </aside>
  );
};
