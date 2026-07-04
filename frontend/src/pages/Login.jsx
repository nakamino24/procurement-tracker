import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-900 px-4">
      <div className="bg-ink-50 rounded-lg shadow-xl w-full max-w-sm p-8">
        <h1 className="font-display text-2xl text-ink-900 mb-1">Procurement Tracker</h1>
        <p className="text-ink-600 text-sm mb-6">Masuk untuk melanjutkan.</p>
        {error && <div className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-ink-600">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 border border-ink-100 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stamp-500"
            />
          </div>
          <div>
            <label className="text-sm text-ink-600">Password</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 border border-ink-100 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stamp-500"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-ink-900 text-white rounded py-2 hover:bg-ink-800 transition disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
        <p className="text-xs text-ink-400 mt-4">
          Default admin: admin@procurement.local / admin123 (ganti setelah login)
        </p>
      </div>
    </div>
  );
}
