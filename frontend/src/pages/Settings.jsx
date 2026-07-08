import { useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setMessage('');
    if (newPassword !== confirm) return setError('Konfirmasi password baru tidak cocok.');
    try {
      const { data } = await api.put('/auth/me/password', { oldPassword, newPassword });
      setMessage(data.message);
      setOldPassword(''); setNewPassword(''); setConfirm('');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengganti password.');
    }
  }

  return (
    <Layout title="Pengaturan">
      <div className="max-w-lg space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-ink-800 mb-4">Profil</h2>
          <p className="text-sm text-ink-600">Nama: <span className="font-medium text-ink-800">{user?.nama}</span></p>
          <p className="text-sm text-ink-600">Email: <span className="font-medium text-ink-800">{user?.email}</span></p>
          <p className="text-sm text-ink-600 capitalize">Role: <span className="font-medium text-ink-800">{user?.role}</span></p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-ink-800 mb-4">Ganti Password</h2>
          {message && <div className="bg-emerald-50 text-emerald-700 text-sm rounded p-2 mb-3">{message}</div>}
          {error && <div className="bg-red-50 text-red-700 text-sm rounded p-2 mb-3">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm text-ink-600">Password Lama</label>
              <input type="password" required value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
                className="w-full mt-1 border border-ink-100 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm text-ink-600">Password Baru</label>
              <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full mt-1 border border-ink-100 rounded px-3 py-2 text-sm" />
            </div>
            <p className="text-xs text-ink-400 mt-1">Minimal 8 karakter, kombinasi huruf dan angka.</p>
            <div>
              <label className="text-sm text-ink-600">Konfirmasi Password Baru</label>
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="w-full mt-1 border border-ink-100 rounded px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="bg-ink-900 text-white rounded py-2 px-5 text-sm hover:bg-ink-800">
              Simpan
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
