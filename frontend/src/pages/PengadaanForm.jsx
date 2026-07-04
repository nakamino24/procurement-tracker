import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/axios';

export default function PengadaanForm() {
  const [form, setForm] = useState({
    nama_pengadaan: '', vendor: '', nilai_kontrak: '', pic: '', tanggal_mulai: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/pengadaan', form);
      // Setelah dibuat, trigger DB otomatis bikin 9 baris tahapan -> langsung ke detail
      navigate(`/pengadaan/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan.');
    }
  }

  return (
    <Layout>
      <h1 className="font-display text-2xl text-ink-900 mb-6">Pengadaan Baru</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-lg space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm rounded p-2">{error}</div>}
        <div>
          <label className="text-sm text-ink-600">Nama Pengadaan *</label>
          <input name="nama_pengadaan" required onChange={handleChange}
            className="w-full mt-1 border border-ink-100 rounded px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-ink-600">Vendor</label>
          <input name="vendor" onChange={handleChange}
            className="w-full mt-1 border border-ink-100 rounded px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-ink-600">Nilai Kontrak (Rp)</label>
          <input type="number" name="nilai_kontrak" onChange={handleChange}
            className="w-full mt-1 border border-ink-100 rounded px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-ink-600">PIC</label>
          <input name="pic" onChange={handleChange}
            className="w-full mt-1 border border-ink-100 rounded px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-ink-600">Tanggal Mulai</label>
          <input type="date" name="tanggal_mulai" onChange={handleChange}
            className="w-full mt-1 border border-ink-100 rounded px-3 py-2" />
        </div>
        <button type="submit" className="bg-ink-900 text-white rounded py-2 px-6 hover:bg-ink-800">
          Simpan
        </button>
      </form>
    </Layout>
  );
}
