import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, PlusCircle, Users, Settings, LogOut, FileStack } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const linkBase = 'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors';
const linkActive = 'bg-stamp-500 text-white';
const linkIdle = 'text-ink-100/70 hover:bg-white/5 hover:text-white';

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 shrink-0 bg-ink-900 text-white min-h-screen flex flex-col">
      <div className="px-5 py-6 flex items-center gap-2">
        <FileStack className="text-stamp-500" size={26} />
        <span className="font-display text-lg leading-tight">Procurement<br/>Tracker</span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <NavLink to="/" end className={({isActive}) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>
        <NavLink to="/pengadaan" className={({isActive}) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
          <ClipboardList size={18} /> Daftar Pengadaan
        </NavLink>
        <NavLink to="/pengadaan/baru" className={({isActive}) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
          <PlusCircle size={18} /> Pengadaan Baru
        </NavLink>
        {user?.role === 'admin' && (
          <NavLink to="/users" className={({isActive}) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
            <Users size={18} /> Kelola Akun
          </NavLink>
        )}
        <NavLink to="/settings" className={({isActive}) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
          <Settings size={18} /> Pengaturan
        </NavLink>
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-sm font-medium">{user?.nama}</p>
        <p className="text-xs text-ink-100/50 mb-3 capitalize">{user?.role}</p>
        <button onClick={logout} className="flex items-center gap-2 text-xs text-ink-100/70 hover:text-stamp-500">
          <LogOut size={14} /> Keluar
        </button>
      </div>
    </aside>
  );
}
