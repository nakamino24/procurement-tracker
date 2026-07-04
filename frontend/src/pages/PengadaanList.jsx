import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ProgressBar from '../components/ProgressBar';
import api from '../api/axios';

const STATUS_OPTIONS = ['', 'Belum Mulai', 'Proses', 'Selesai', 'Tertunda'];

export default function PengadaanList() {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ status: '', vendor: '', pic: '', search: '' });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const { data } = await api.get('/pengadaan', { params });
    setItems(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // load awal

  function handleFilterSubmit(e) {
    e.preventDefault();
    load();
  }

  function exportFile(type) {
    const token = localStorage.getItem('token');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    // Karena export butuh auth header, kita fetch manual lalu buat blob link
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
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-ink-900">Daftar Pengadaan</h1>
        <div className="flex gap-2">
          <button onClick={() => exportFile('excel')} className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700">
            Export Excel
          </button>
          <button onClick={() => exportFile('pdf')} className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700">
            Export PDF
          </button>
        </div>
      </div>

      <form onSubmit={handleFilterSubmit} className="bg-white rounded-lg shadow p-4 mb-6 grid sm:grid-cols-4 gap-3">
        <input
          placeholder="Cari nama pengadaan..." value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="border border-ink-100 rounded px-3 py-2 text-sm"
        />
        <input
          placeholder="Vendor" value={filters.vendor}
          onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
          className="border border-ink-100 rounded px-3 py-2 text-sm"
        />
        <input
          placeholder="PIC" value={filters.pic}
          onChange={(e) => setFilters({ ...filters, pic: e.target.value })}
          className="border border-ink-100 rounded px-3 py-2 text-sm"
        />
        <select
          value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="border border-ink-100 rounded px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || 'Semua status tahap'}</option>)}
        </select>
        <button type="submit" className="sm:col-span-4 bg-ink-900 text-white rounded py-2 text-sm hover:bg-ink-800">
          Terapkan Filter
        </button>
      </form>

      {loading ? (
        <p className="text-ink-600">Memuat...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-100 text-ink-600 text-left">
              <tr>
                <th className="px-4 py-2">Nama Pengadaan</th>
                <th className="px-4 py-2">Vendor</th>
                <th className="px-4 py-2">PIC</th>
                <th className="px-4 py-2">Tahap Saat Ini</th>
                <th className="px-4 py-2 w-40">Progress</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-ink-100 hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <Link to={`/pengadaan/${p.id}`} className="font-medium text-ink-800 hover:text-stamp-600">
                      {p.nama_pengadaan}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{p.vendor}</td>
                  <td className="px-4 py-3 text-ink-600">{p.pic}</td>
                  <td className="px-4 py-3 text-ink-600">{p.tahap_saat_ini || 'Selesai semua'}</td>
                  <td className="px-4 py-3"><ProgressBar percent={p.progress_percent} /></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-400">Tidak ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
