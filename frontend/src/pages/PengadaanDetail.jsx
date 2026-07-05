import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/axios';

const STATUS_LIST = ['Belum Mulai', 'Proses', 'Selesai', 'Tertunda', 'Batal'];
const STATUS_COLOR = {
  'Belum Mulai': 'bg-ink-100 text-ink-600',
  'Proses': 'bg-blue-100 text-blue-700',
  'Selesai': 'bg-emerald-100 text-emerald-700',
  'Tertunda': 'bg-amber-100 text-amber-700',
  'Batal': 'bg-red-100 text-red-700',
};

export default function PengadaanDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  // Modal ganti status: { tahapId, status, catatan } atau null kalau tertutup
  const [modal, setModal] = useState(null);

  async function load() {
    const res = await api.get(`/pengadaan/${id}`);
    setData(res.data);
  }

  useEffect(() => { load(); }, [id]);

  function openModal(tahap, newStatus) {
    setModal({ tahapId: tahap.id, status: newStatus, catatan: tahap.catatan || '' });
  }

  async function confirmModal() {
    if (!modal) return;
    setError('');
    setSavingId(modal.tahapId);
    try {
      await api.put(`/tahapan/${modal.tahapId}`, { status: modal.status, catatan: modal.catatan });
      setModal(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal update status.');
      setModal(null);
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
              onChange={(e) => openModal(t, e.target.value)}
              className="text-sm border border-ink-100 rounded px-2 py-1"
            >
              {STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Modal ganti status, pengganti window.prompt() yang tidak didukung di semua browser/webview */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-ink-800 mb-1">Ubah Status Tahap</h3>
            <p className="text-sm text-ink-500 mb-4">
              Status baru: <span className="font-medium text-ink-800">{modal.status}</span>
            </p>
            <label className="text-sm text-ink-600">Catatan (opsional)</label>
            <textarea
              autoFocus
              value={modal.catatan}
              onChange={(e) => setModal({ ...modal, catatan: e.target.value })}
              rows={3}
              className="w-full mt-1 border border-ink-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stamp-500"
              placeholder="Tulis catatan kalau perlu..."
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setModal(null)}
                className="text-sm px-4 py-2 rounded text-ink-600 hover:bg-ink-50"
              >
                Batal
              </button>
              <button
                onClick={confirmModal}
                disabled={savingId === modal.tahapId}
                className="text-sm px-4 py-2 rounded bg-ink-900 text-white hover:bg-ink-800 disabled:opacity-50"
              >
                {savingId === modal.tahapId ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}