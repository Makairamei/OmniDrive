import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-surface h-16 w-full">
      <div className="flex items-center gap-2">
        <span className="text-xl text-primary">OmniDrive</span>
      </div>
      <div className="flex-1 max-w-2xl px-4">
        <div className="bg-white rounded-full h-12 flex items-center px-4 shadow-sm">
          <input type="text" placeholder="Search in Drive" className="bg-transparent outline-none w-full" />
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
        U
      </div>
    </header>
  );
};
