import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ProgressBar from '../components/ProgressBar';
import api from '../api/axios';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><p className="text-ink-600">Memuat data...</p></Layout>;

  return (
    <Layout>
      <h1 className="font-display text-2xl text-ink-900 mb-6">Ringkasan Dashboard</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Stuck per tahap */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-ink-800 mb-3">Pengadaan Stuck per Tahap</h2>
          {data.stuck_per_tahap.length === 0 && <p className="text-sm text-ink-400">Tidak ada yang stuck. 🎉</p>}
          <ul className="space-y-2">
            {data.stuck_per_tahap.map((t) => (
              <li key={t.nama_tahap} className="flex justify-between text-sm border-b border-ink-100 pb-2">
                <span className="text-ink-600">{t.nama_tahap}</span>
                <span className="font-semibold text-stamp-600">{t.jumlah_stuck} item</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Rata-rata durasi */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-ink-800 mb-3">Rata-rata Durasi per Tahap (hari)</h2>
          {data.avg_durasi_per_tahap.length === 0 && <p className="text-sm text-ink-400">Belum ada data selesai.</p>}
          <ul className="space-y-2">
            {data.avg_durasi_per_tahap.map((t) => (
              <li key={t.nama_tahap} className="flex justify-between text-sm border-b border-ink-100 pb-2">
                <span className="text-ink-600">{t.nama_tahap}</span>
                <span className="font-semibold text-ink-800">{t.rata_rata_hari ?? '-'} hari</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Progress per item */}
      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="font-semibold text-ink-800 mb-4">Progress per Pengadaan</h2>
        <div className="space-y-4">
          {data.progress_items.map((item) => (
            <Link to={`/pengadaan/${item.id}`} key={item.id} className="block hover:bg-ink-50 rounded p-2 -m-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-ink-800">{item.nama_pengadaan}</span>
                <span className="text-ink-400">{item.vendor} · {item.pic}</span>
              </div>
              <ProgressBar percent={item.progress_percent} />
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
