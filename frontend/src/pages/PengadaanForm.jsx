import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function PengadaanForm() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    nama_pengadaan: '', vendor: '', nilai_kontrak: '', pic_user_id: '', tanggal_mulai: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Dropdown pilih PIC cuma relevan buat admin (staff otomatis jadi PIC dirinya sendiri)
  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/auth/users').then((res) => setUsers(res.data.filter((u) => u.role === 'staff')));
    }
  }, [user]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/pengadaan', form);
      navigate(`/pengadaan/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan.');
    }
  }

  return (
    <Layout title="Pengadaan Baru">
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

        {user?.role === 'admin' ? (
          <div>
            <label className="text-sm text-ink-600">PIC *</label>
            <select name="pic_user_id" required onChange={handleChange}
              className="w-full mt-1 border border-ink-100 rounded px-3 py-2">
              <option value="">Pilih PIC...</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
            </select>
          </div>
        ) : (
          <div className="text-sm text-ink-500 bg-ink-50 rounded p-3">
            PIC otomatis: <span className="font-medium text-ink-800">{user?.nama}</span> (kamu)
          </div>
        )}

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
