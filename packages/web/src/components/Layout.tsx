import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 'var(--sidebar-width)', padding: 'var(--space-xl) var(--space-2xl)', maxWidth: '1200px' }}>
        <Outlet />
      </main>
    </div>
  );
}
