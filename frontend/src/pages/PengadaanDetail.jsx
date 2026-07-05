import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, History } from 'lucide-react';
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

const METODE_PENGADAAN_INFO = {
  'Tender Umum': 'Nilai anggaran > Rp5 Miliar',
  'Tender Terbatas': 'Nilai anggaran Rp500 Juta – Rp5 Miliar',
  'Penunjukan Langsung': 'Wajib isi aspek positif & negatif bila dikerjakan provider lain',
};

function formatTanggal(dateStr) {
  return new Date(dateStr).toLocaleString('id-ID');
}

export default function PengadaanDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [modal, setModal] = useState(null);

  const [metode, setMetode] = useState(null);
  const [metodeSaving, setMetodeSaving] = useState(false);
  const [metodeMsg, setMetodeMsg] = useState('');

  const [audit, setAudit] = useState([]);
  const [showAudit, setShowAudit] = useState(false);

  async function load() {
    const res = await api.get(`/pengadaan/${id}`);
    setData(res.data);
    setMetode({
      metode_pengadaan: res.data.metode_pengadaan || '',
      aspek_positif_pl: res.data.aspek_positif_pl || '',
      aspek_negatif_pl: res.data.aspek_negatif_pl || '',
      metode_penilaian: res.data.metode_penilaian || '',
      kategori_putusan: res.data.kategori_putusan || '',
      pakai_spk: res.data.pakai_spk,
    });
  }

  async function loadAudit() {
    const res = await api.get(`/pengadaan/${id}/audit`);
    setAudit(res.data);
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
      if (showAudit) await loadAudit();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal update status.');
      setModal(null);
    } finally {
      setSavingId(null);
    }
  }

  async function saveMetode(e) {
    e.preventDefault();
    setMetodeMsg('');
    setMetodeSaving(true);
    try {
      await api.put(`/pengadaan/${id}/metode`, metode);
      setMetodeMsg('Tersimpan. Tahap terkait sudah otomatis disesuaikan.');
      await load();
      if (showAudit) await loadAudit();
    } catch (err) {
      setMetodeMsg(err.response?.data?.message || 'Gagal menyimpan.');
    } finally {
      setMetodeSaving(false);
    }
  }

  async function toggleAudit() {
    if (!showAudit) await loadAudit();
    setShowAudit(!showAudit);
  }

  if (!data || !metode) return <Layout title="Detail Pengadaan"><p className="text-ink-600">Memuat...</p></Layout>;

  return (
    <Layout title={data.nama_pengadaan}>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-ink-600 text-sm mt-1">
          Vendor: {data.vendor || '-'} · PIC: {data.pic_nama || data.pic || '-'} · Nilai: Rp{Number(data.nilai_kontrak).toLocaleString('id-ID')}
        </p>
        <button
          onClick={toggleAudit}
          className="flex items-center gap-1.5 text-sm text-ink-600 hover:text-stamp-600 shrink-0"
        >
          <History size={16} /> {showAudit ? 'Sembunyikan' : 'Lihat'} Riwayat Perubahan
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded p-3 mb-4">{error}</div>}

      {showAudit && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-ink-800 mb-3">Riwayat Perubahan</h2>
          {audit.length === 0 ? (
            <p className="text-sm text-ink-400">Belum ada riwayat.</p>
          ) : (
            <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {audit.map((a) => (
                <li key={a.id} className="text-sm border-b border-ink-100 pb-2">
                  <p className="text-ink-800">
                    <span className="font-medium">{a.user_nama || 'Sistem'}</span> — {a.aksi}
                  </p>
                  {a.detail && <p className="text-xs text-ink-500 mt-0.5">{a.detail}</p>}
                  <p className="text-xs text-ink-400 mt-0.5">{formatTanggal(a.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-ink-800 mb-1">Metode Pengadaan</h2>
        <p className="text-xs text-ink-400 mb-4">
          Diisi di tahap "Usulan User" & "Aanwijzing". Mengubah ini otomatis menambah/menghapus tahap yang relevan.
        </p>
        {metodeMsg && (
          <div className={`text-sm rounded p-2 mb-3 ${metodeMsg.startsWith('Tersimpan') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {metodeMsg}
          </div>
        )}
        <form onSubmit={saveMetode} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-ink-600">Metode Pengadaan</label>
            <select
              value={metode.metode_pengadaan}
              onChange={(e) => setMetode({ ...metode, metode_pengadaan: e.target.value })}
              className="w-full mt-1 border border-ink-100 rounded px-3 py-2 text-sm"
            >
              <option value="">Belum ditentukan</option>
              <option value="Tender Umum">Tender Umum</option>
              <option value="Tender Terbatas">Tender Terbatas</option>
              <option value="Penunjukan Langsung">Penunjukan Langsung</option>
            </select>
            {metode.metode_pengadaan && (
              <p className="text-xs text-ink-400 mt-1">{METODE_PENGADAAN_INFO[metode.metode_pengadaan]}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-ink-600">Metode Penilaian (diisi saat Aanwijzing)</label>
            <select
              value={metode.metode_penilaian}
              onChange={(e) => setMetode({ ...metode, metode_penilaian: e.target.value })}
              className="w-full mt-1 border border-ink-100 rounded px-3 py-2 text-sm"
            >
              <option value="">Belum ditentukan</option>
              <option value="Sistem Nilai">Sistem Nilai (70% Teknis + 30% Finansial)</option>
              <option value="Evaluasi Biaya Terendah">Evaluasi Biaya Terendah (Auction)</option>
            </select>
          </div>

          {metode.metode_pengadaan === 'Penunjukan Langsung' && (
            <>
              <div>
                <label className="text-sm text-ink-600">Aspek Positif (bila dikerjakan provider lain)</label>
                <textarea
                  rows={2}
                  value={metode.aspek_positif_pl}
                  onChange={(e) => setMetode({ ...metode, aspek_positif_pl: e.target.value })}
                  className="w-full mt-1 border border-ink-100 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-ink-600">Aspek Negatif (bila dikerjakan provider lain)</label>
                <textarea
                  rows={2}
                  value={metode.aspek_negatif_pl}
                  onChange={(e) => setMetode({ ...metode, aspek_negatif_pl: e.target.value })}
                  className="w-full mt-1 border border-ink-100 rounded px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-sm text-ink-600">Kategori Putusan (diisi saat Putusan Hasil)</label>
            <select
              value={metode.kategori_putusan}
              onChange={(e) => setMetode({ ...metode, kategori_putusan: e.target.value })}
              className="w-full mt-1 border border-ink-100 rounded px-3 py-2 text-sm"
            >
              <option value="">Belum ditentukan</option>
              <option value="Komite 1">Komite 1</option>
              <option value="Komite 2">Komite 2</option>
              <option value="Komite 3">Komite 3</option>
              <option value="Komite 4">Komite 4</option>
              <option value="GH + GH">Non-Komite: GH + GH</option>
              <option value="DH + GH">Non-Komite: DH + GH</option>
            </select>
            {['Komite 1', 'Komite 2', 'Komite 3', 'Komite 4'].includes(metode.kategori_putusan) && (
              <p className="text-xs text-ink-400 mt-1">
                Otomatis menambah tahap Background Checking, PEP, Opini Legal, Opini Compliance, Opini SORH
                {['Komite 1', 'Komite 2'].includes(metode.kategori_putusan) && ' + Uji Kepatuhan'}.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="pakai_spk"
              checked={metode.pakai_spk}
              onChange={(e) => setMetode({ ...metode, pakai_spk: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="pakai_spk" className="text-sm text-ink-600">
              Pakai Surat Perintah Kerja (SPK) sebelum Penerbitan Perjanjian
            </label>
          </div>

          <button
            type="submit" disabled={metodeSaving}
            className="sm:col-span-2 bg-ink-900 text-white rounded py-2 text-sm hover:bg-ink-800 disabled:opacity-50"
          >
            {metodeSaving ? 'Menyimpan...' : 'Simpan Metode'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm divide-y divide-ink-100">
        {data.tahapan.map((t) => (
          <div key={t.id} className="p-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-ink-800">{t.urutan}. {t.nama_tahap}</p>
                {t.is_overdue && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                    <AlertTriangle size={11} /> Lewat SLA
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-400">
                Target: {t.target_hari} hari
                {t.tanggal_update && ` · Update terakhir: ${formatTanggal(t.tanggal_update)}`}
              </p>
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
        {data.tahapan.length === 0 && (
          <div className="p-6 text-center text-sm text-ink-400">Belum ada tahap.</div>
        )}
      </div>

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
              <button onClick={() => setModal(null)} className="text-sm px-4 py-2 rounded text-ink-600 hover:bg-ink-50">
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