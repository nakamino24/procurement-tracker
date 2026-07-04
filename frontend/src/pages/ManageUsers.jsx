import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { UserPlus } from 'lucide-react';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ nama: '', email: '', password: '', role: 'staff' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const { data } = await api.get('/auth/users');
    setUsers(data);
  }

  useEffect(() => { load(); }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      await api.post('/auth/register', form);
      setMessage(`Akun ${form.nama} berhasil dibuat.`);
      setForm({ nama: '', email: '', password: '', role: 'staff' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat akun.');
    }
  }

  return (
    <Layout title="Kelola Akun">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-1 h-fit">
          <h2 className="font-semibold text-ink-800 mb-4 flex items-center gap-2">
            <UserPlus size={18} /> Buat Akun PIC/Staff Baru
          </h2>
          {message && <div className="bg-emerald-50 text-emerald-700 text-sm rounded p-2 mb-3">{message}</div>}
          {error && <div className="bg-red-50 text-red-700 text-sm rounded p-2 mb-3">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm text-ink-600">Nama</label>
              <input name="nama" required value={form.nama} onChange={handleChange}
                className="w-full mt-1 border border-ink-100 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm text-ink-600">Email</label>
              <input type="email" name="email" required value={form.email} onChange={handleChange}
                className="w-full mt-1 border border-ink-100 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm text-ink-600">Password Awal</label>
              <input type="password" name="password" required value={form.password} onChange={handleChange}
                className="w-full mt-1 border border-ink-100 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm text-ink-600">Role</label>
              <select name="role" value={form.role} onChange={handleChange}
                className="w-full mt-1 border border-ink-100 rounded px-3 py-2 text-sm">
                <option value="staff">Staff / PIC</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-ink-900 text-white rounded py-2 text-sm hover:bg-ink-800">
              Buat Akun
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow lg:col-span-2 overflow-hidden h-fit">
          <table className="w-full text-sm">
            <thead className="bg-ink-100 text-ink-600 text-left">
              <tr>
                <th className="px-4 py-2">Nama</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-ink-100">
                  <td className="px-4 py-3 font-medium text-ink-800">{u.nama}</td>
                  <td className="px-4 py-3 text-ink-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === 'admin' ? 'bg-stamp-500/10 text-stamp-600' : 'bg-ink-100 text-ink-600'}`}>
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
