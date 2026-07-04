import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PengadaanList from './pages/PengadaanList';
import PengadaanForm from './pages/PengadaanForm';
import PengadaanDetail from './pages/PengadaanDetail';
import Settings from './pages/Settings';
import ManageUsers from './pages/ManageUsers';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/pengadaan" element={<PrivateRoute><PengadaanList /></PrivateRoute>} />
      <Route path="/pengadaan/baru" element={<PrivateRoute><PengadaanForm /></PrivateRoute>} />
      <Route path="/pengadaan/:id" element={<PrivateRoute><PengadaanDetail /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/users" element={<AdminRoute><ManageUsers /></AdminRoute>} />
    </Routes>
  );
}
