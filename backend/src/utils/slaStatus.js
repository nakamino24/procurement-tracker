// Rumus SLA & kriteria status ini diadaptasi 1:1 dari rumus Excel divisi:
//
// SLA target (hari kerja) per metode:
//   =IFS(metode="Kontrak Payung",0, metode="Tender Umum",30,
//        metode="Tender Terbatas",28, metode="Penunjukan Langsung",9,
//        metode="Seleksi Langsung",28, metode="Sewa Properti",5,
//        metode="Beli Properti",21, metode="Swakelola",5, metode="Addendum",0)
//
// Kriteria status (ON SCHEDULE / OVERDUE / dst) pakai threshold SEDIKIT
// BEDA dari target di atas untuk beberapa metode (ini memang begitu di
// rumus aslinya):
//   Penunjukan Langsung <= 9   -> ON SCHEDULE
//   Tender Terbatas     <= 28  -> ON SCHEDULE
//   Tender Umum         <= 33  -> ON SCHEDULE
//   Sewa Properti       <= 5   -> ON SCHEDULE
//   Beli Properti/Swakelola <= 21 -> ON SCHEDULE
// Kontrak Payung & Seleksi Langsung TIDAK ada di rumus kriteria asli
// (otomatis jatuh ke NOT VALID) -- atas konfirmasi user, di sistem ini
// keduanya ikut dicek juga pakai angka target SLA-nya sendiri (0 & 28).

const SLA_TARGET_HARI = {
  'Kontrak Payung': 0,
  'Tender Umum': 30,
  'Tender Terbatas': 28,
  'Penunjukan Langsung': 9,
  'Seleksi Langsung': 28,
  'Sewa Properti': 5,
  'Beli Properti': 21,
  'Swakelola': 5,
  'Addendum': 0,
};

const SLA_ON_SCHEDULE_THRESHOLD = {
  'Penunjukan Langsung': 9,
  'Tender Terbatas': 28,
  'Tender Umum': 33,
  'Sewa Properti': 5,
  'Beli Properti': 21,
  'Swakelola': 21,
  'Kontrak Payung': 0,
  'Seleksi Langsung': 28,
};

const METODE_PENGADAAN_LIST = [
  'Tender Umum', 'Tender Terbatas', 'Penunjukan Langsung', 'Seleksi Langsung',
  'Kontrak Payung', 'Sewa Properti', 'Beli Properti', 'Swakelola', 'Addendum',
];

// hariBerjalan = jumlah hari kerja dari tanggal_mulai s/d sekarang (atau s/d
// tanggal selesai kalau semua tahap sudah Selesai).
// semuaBelumMulai = true kalau SEMUA tahap pengadaan ini masih "Belum Mulai".
function computeSlaStatus({ metodePengadaan, hariBerjalan, semuaBelumMulai }) {
  if (!metodePengadaan) return null;
  if (metodePengadaan === 'Addendum') return '📝 ADDENDUM';
  if (semuaBelumMulai) return 'Belum Mulai';
  if (hariBerjalan == null || hariBerjalan > 365 || hariBerjalan <= 0) return '❌ NOT VALID';

  const threshold = SLA_ON_SCHEDULE_THRESHOLD[metodePengadaan];
  if (threshold === undefined) return '❌ NOT VALID';
  return hariBerjalan <= threshold ? '✅ ON SCHEDULE' : '⚠️ OVERDUE';
}

module.exports = { SLA_TARGET_HARI, SLA_ON_SCHEDULE_THRESHOLD, METODE_PENGADAAN_LIST, computeSlaStatus };