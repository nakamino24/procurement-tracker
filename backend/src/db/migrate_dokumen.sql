-- Jalankan setelah migrasi-migrasi sebelumnya. Additive, tidak menghapus data.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS tim VARCHAR(20);

CREATE TABLE IF NOT EXISTS nomor_counter (
    tahun   INTEGER PRIMARY KEY,
    counter INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dokumen (
    id                  SERIAL PRIMARY KEY,
    pengadaan_id        INTEGER NOT NULL REFERENCES pengadaan(id) ON DELETE CASCADE,
    pengadaan_tahapan_id INTEGER REFERENCES pengadaan_tahapan(id),
    nomor_dokumen       VARCHAR(150) UNIQUE NOT NULL,
    kode_kerahasiaan    VARCHAR(5) NOT NULL,
    kode_departemen     VARCHAR(30) NOT NULL,
    kode_group          VARCHAR(30) NOT NULL,
    kode_tim            VARCHAR(30) NOT NULL,
    nama_file_asli      VARCHAR(255) NOT NULL,
    nama_file_simpan    VARCHAR(255) NOT NULL,
    tanggal_dokumen     DATE NOT NULL DEFAULT CURRENT_DATE,
    uploaded_by         INTEGER REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dokumen_pengadaan ON dokumen(pengadaan_id);

COMMIT;