import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Activity, CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react';
import Layout from '../components/Layout';
import ProgressBar from '../components/ProgressBar';
import api from '../api/axios';

const STATUS_COLORS = {
  'Belum Mulai': '#8fa2b0',
  'Proses': '#3b82f6',
  'Selesai': '#10b981',
  'Tertunda': '#c17f2c',
  'Batal': '#ef4444',
};

const STATUS_ICON = {
  'Belum Mulai': Clock,
  'Proses': Activity,
  'Selesai': CheckCircle2,
  'Tertunda': PauseCircle,
  'Batal': XCircle,
};

function formatPeriode(p) {
  const [y, m] = p.split('-');
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${bulan[Number(m) - 1]} '${y.slice(2)}`;
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/summary')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat ringkasan dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Dashboard"><p className="text-ink-600">Memuat data...</p></Layout>;

  if (error || !data) {
    return (
      <Layout title="Dashboard">
        <div className="bg-red-50 text-red-700 text-sm rounded-xl p-4">
          {error || 'Data dashboard tidak tersedia.'}
        </div>
      </Layout>
    );
  }

  const statusData = (data.status_distribution || []).map((s) => ({
    status: s.status,
    jumlah: Number(s.jumlah),
  }));

  const trendData = (data.trend_bulanan || []).map((t) => ({
    periode: formatPeriode(t.periode),
    Dibuat: Number(t.dibuat),
    Selesai: Number(t.selesai),
  }));

  return (
    <Layout title="Dashboard">
      <div className="grid lg:grid-cols-5 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 lg:col-span-2">
  <h2 className="font-semibold text-ink-800 mb-3">Distribusi Status Tahap</h2>
  {statusData.length === 0 ? (
    <p className="text-sm text-ink-400">Belum ada data.</p>
  ) : (
    <>
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={statusData}
              dataKey="jumlah"
              nameKey="status"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={3}
              stroke="none"
            >
              {statusData.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#8fa2b0'} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value} tahap`, name]} />
          </PieChart>
        </ResponsiveContainer>
        {/* Angka total ditaro absolute di tengah container, bukan pakai <text> SVG,
            supaya posisinya presisi di tengah donut tanpa perlu utak-atik koordinat % */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-semibold text-ink-800">
            {statusData.reduce((sum, s) => sum + s.jumlah, 0)}
          </span>
          <span className="text-[11px] text-ink-400">Total Tahap</span>
        </div>
      </div>

      {/* Legend custom di bawah chart, horizontal & rapi, bukan bawaan recharts */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
        {statusData.map((s) => (
          <div key={s.status} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: STATUS_COLORS[s.status] || '#8fa2b0' }}
            />
            <span className="text-ink-600">{s.status}</span>
            <span className="text-ink-400">({s.jumlah})</span>
          </div>
        ))}
      </div>
    </>
  )}
</div>

        <div className="bg-white rounded-xl shadow-sm p-5 lg:col-span-3">
          <h2 className="font-semibold text-ink-800 mb-3">Tren 6 Bulan Terakhir</h2>
          {trendData.every((t) => t.Dibuat === 0 && t.Selesai === 0) ? (
            <p className="text-sm text-ink-400">Belum ada data cukup untuk tren.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e9ee" />
                <XAxis dataKey="periode" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Dibuat" fill="#31485c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Selesai" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
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

        <div className="bg-white rounded-xl shadow-sm p-5">
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

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5 lg:col-span-3">
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
            {data.progress_items.length === 0 && <p className="text-sm text-ink-400">Belum ada pengadaan.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 lg:col-span-2">
          <h2 className="font-semibold text-ink-800 mb-4">Aktivitas Terbaru</h2>
          <ul className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {data.activity_feed.map((a) => {
              const Icon = STATUS_ICON[a.status] || Activity;
              return (
                <li key={a.id} className="flex gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${STATUS_COLORS[a.status] || '#8fa2b0'}22`, color: STATUS_COLORS[a.status] || '#8fa2b0' }}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-ink-800 leading-snug">
                      <span className="font-medium">{a.updated_by_nama || 'Seseorang'}</span>{' '}
                      mengubah <Link to={`/pengadaan/${a.pengadaan_id}`} className="text-stamp-600 hover:underline">{a.nama_pengadaan}</Link>{' '}
                      — {a.nama_tahap} jadi <span className="font-medium">{a.status}</span>
                    </p>
                    <p className="text-xs text-ink-400">{timeAgo(a.tanggal_update)}</p>
                  </div>
                </li>
              );
            })}
            {data.activity_feed.length === 0 && <p className="text-sm text-ink-400">Belum ada aktivitas.</p>}
          </ul>
        </div>
      </div>
    </Layout>
  );
}