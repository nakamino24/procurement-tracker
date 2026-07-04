require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const pengadaanRoutes = require('./routes/pengadaanRoutes');
const tahapanRoutes = require('./routes/tahapanRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'ok', message: 'Procurement Tracker API' }));

app.use('/api/auth', authRoutes);
app.use('/api/pengadaan', pengadaanRoutes);
app.use('/api/tahapan', tahapanRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Handler error terakhir (jaga-jaga)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Terjadi kesalahan tak terduga.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server jalan di http://localhost:${PORT}`));
