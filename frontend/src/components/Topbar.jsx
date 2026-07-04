import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function Topbar({ title }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();
    if (q.trim()) navigate(`/pengadaan?search=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="flex items-center justify-between gap-4 px-8 py-5 border-b border-ink-100 bg-white">
      <h1 className="font-display text-xl text-ink-900">{title}</h1>
      <form onSubmit={handleSearch} className="relative w-full max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari pengadaan..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-ink-100 rounded-full focus:outline-none focus:ring-2 focus:ring-stamp-500"
        />
      </form>
    </div>
  );
}
