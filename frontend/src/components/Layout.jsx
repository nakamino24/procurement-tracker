import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="bg-ink-900 text-ink-50">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-xl tracking-tight">
            Procurement Tracker
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link to="/" className="hover:text-stamp-500 transition">Dashboard</Link>
            <Link to="/pengadaan" className="hover:text-stamp-500 transition">Daftar Pengadaan</Link>
            <Link to="/pengadaan/baru" className="hover:text-stamp-500 transition">+ Baru</Link>
            <span className="text-ink-400">|</span>
            <span className="text-ink-400">{user?.nama} ({user?.role})</span>
            <button onClick={handleLogout} className="text-stamp-500 hover:underline">
              Keluar
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
