import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ children, title = 'Dashboard' }) {
  return (
    <div className="min-h-screen bg-ink-50 flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Topbar title={title} />
        <main className="max-w-6xl mx-auto px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
