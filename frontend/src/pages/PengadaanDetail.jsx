import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/axios';

const STATUS_LIST = ['Belum Mulai', 'Proses', 'Selesai', 'Tertunda'];
const STATUS_COLOR = {
  'Belum Mulai': 'bg-ink-100 text-ink-600',
  'Proses': 'bg-blue-100 text-blue-700',
  'Selesai': 'bg-emerald-100 text-emerald-700',
  'Tertunda': 'bg-amber-100 text-amber-700',
};

export default function PengadaanDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  async function load() {
    const res = await api.get(`/pengadaan/${id}`);
    setData(res.data);
  }

  useEffect(() => { load(); }, [id]);

  async function updateStatus(tahapId, status, catatan) {
    setError('');
    setSavingId(tahapId);
    try {
      await api.put(`/tahapan/${tahapId}`, { status, catatan });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal update status.');
    } finally {
      setSavingId(null);
    }
  }

  if (!data) return <Layout title="Detail Pengadaan"><p className="text-ink-600">Memuat...</p></Layout>;

  return (
    <Layout title={data.nama_pengadaan}>
      <div className="mb-6">
        <p className="text-ink-600 text-sm mt-1">
          Vendor: {data.vendor || '-'} · PIC: {data.pic_nama || data.pic || '-'} · Nilai: Rp{Number(data.nilai_kontrak).toLocaleString('id-ID')}
        </p>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded p-3 mb-4">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm divide-y divide-ink-100">
        {data.tahapan.map((t) => (
          <div key={t.id} className="p-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-medium text-ink-800">{t.urutan}. {t.nama_tahap}</p>
              {t.tanggal_update && (
                <p className="text-xs text-ink-400">
                  Update terakhir: {new Date(t.tanggal_update).toLocaleString('id-ID')}
                </p>
              )}
              {t.catatan && <p className="text-xs text-ink-500 mt-1">Catatan: {t.catatan}</p>}
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[t.status]}`}>
              {t.status}
            </span>
            <select
              value={t.status}
              disabled={savingId === t.id}
              onChange={(e) => {
                const catatan = window.prompt('Catatan (opsional):', t.catatan || '');
                updateStatus(t.id, e.target.value, catatan);
              }}
              className="text-sm border border-ink-100 rounded px-2 py-1"
            >
              {STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ))}
      </div>
    </Layout>
  );
}
