import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import ProgressBar from '../components/ProgressBar';
import api from '../api/axios';
import { FileDown, FileSpreadsheet } from 'lucide-react';

const STATUS_OPTIONS = ['', 'Belum Mulai', 'Proses', 'Selesai', 'Tertunda'];
const SLA_BADGE_COLOR = {
  '✅ ON SCHEDULE': 'bg-emerald-100 text-emerald-700',
  '⚠️ OVERDUE': 'bg-red-100 text-red-700',
  '❌ NOT VALID': 'bg-ink-200 text-ink-700',
  'Belum Mulai': 'bg-ink-100 text-ink-600',
  '📝 ADDENDUM': 'bg-blue-100 text-blue-700',
};

export default function PengadaanList() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({
    status: '', vendor: '', pic: '', search: searchParams.get('search') || '',
  });
  const [loading, setLoading] = useState(true);

  async function load(activeFilters = filters) {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(activeFilters).filter(([, v]) => v));
    const { data } = await api.get('/pengadaan', { params });
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    const initial = { status: '', vendor: '', pic: '', search: searchParams.get('search') || '' };
    setFilters(initial);
    load(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleFilterSubmit(e) {
    e.preventDefault();
    load(filters);
  }

  function exportFile(type) {
    const token = localStorage.getItem('token');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    fetch(`${base}/dashboard/export/${type}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laporan_pengadaan.${type === 'excel' ? 'xlsx' : 'pdf'}`;
        a.click();
      });
  }

  return (
    <Layout title="Daftar Pengadaan">
      <div className="flex items-center justify-end gap-2 mb-6">
        <button onClick={() => exportFile('excel')} className="flex items-center gap-1.5 text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-full hover:bg-emerald-700">
          <FileSpreadsheet size={15} /> Excel
        </button>
        <button onClick={() => exportFile('pdf')} className="flex items-center gap-1.5 text-sm bg-red-600 text-white px-3 py-1.5 rounded-full hover:bg-red-700">
          <FileDown size={15} /> PDF
        </button>
      </div>

      <form onSubmit={handleFilterSubmit} className="bg-white rounded-xl shadow-sm p-4 mb-6 grid sm:grid-cols-4 gap-3">
        <input
          placeholder="Cari nama pengadaan..." value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="border border-ink-100 rounded-full px-4 py-2 text-sm"
        />
        <input
          placeholder="Vendor" value={filters.vendor}
          onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
          className="border border-ink-100 rounded-full px-4 py-2 text-sm"
        />
        <input
          placeholder="PIC" value={filters.pic}
          onChange={(e) => setFilters({ ...filters, pic: e.target.value })}
          className="border border-ink-100 rounded-full px-4 py-2 text-sm"
        />
        <select
          value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="border border-ink-100 rounded-full px-4 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || 'Semua status tahap'}</option>)}
        </select>
        <button type="submit" className="sm:col-span-4 bg-ink-900 text-white rounded-full py-2 text-sm hover:bg-ink-800">
          Terapkan Filter
        </button>
      </form>

      {loading ? (
        <p className="text-ink-600">Memuat...</p>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <Link
              to={`/pengadaan/${p.id}`} key={p.id}
              className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-stamp-500/10 text-stamp-600 flex items-center justify-center text-xs font-semibold shrink-0">
                  {(p.pic_nama || '-').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink-800 truncate">{p.nama_pengadaan}</p>
                    {p.sla_status && (
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${SLA_BADGE_COLOR[p.sla_status] || 'bg-ink-100 text-ink-600'}`}>
                        {p.sla_status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-400">{p.vendor || 'Belum ada vendor'} · PIC: {p.pic_nama || '-'}</p>
                </div>
                <div className="w-32 shrink-0">
                  <ProgressBar percent={p.progress_percent} />
                </div>
                <span className="text-xs text-ink-500 w-40 shrink-0 text-right hidden md:block">
                  {p.tahap_saat_ini || 'Selesai semua'}
                </span>
              </div>
            </Link>
          ))}
          {items.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center text-ink-400">Tidak ada data.</div>
          )}
        </div>
      )}
    </Layout>
  );
}