-- Jalankan SETELAH migrate_alur_baru.sql dan migrate_tambahan_komite.sql.
-- Additive -- tidak menghapus data yang sudah ada.

BEGIN;

-- 1. SLA per tahap
ALTER TABLE tahapan_master ADD COLUMN IF NOT EXISTS target_hari INTEGER NOT NULL DEFAULT 5;

UPDATE tahapan_master SET target_hari = 3 WHERE kode IN ('usulan_user', 'permintaan_hps', 'penyampaian_hps', 'aanwijzing', 'pep', 'pengumuman_pemenang');
UPDATE tahapan_master SET target_hari = 7 WHERE kode IN ('penilaian_teknis', 'putusan_hasil');
-- sisanya (kelengkapan_dokumen, izin_pelaksanaan, pemasukan_sampul,
-- penggabungan_nilai, auction, klarifikasi_negosiasi, background_checking,
-- opini_legal, opini_compliance, opini_sorh, uji_kepatuhan,
-- surat_perintah_kerja, penerbitan_perjanjian) pakai default 5 hari.

-- 2. Kolom buat hitung SLA -- kapan tahap ini mulai dikerjakan
ALTER TABLE pengadaan_tahapan ADD COLUMN IF NOT EXISTS tanggal_mulai_tahap TIMESTAMPTZ;

-- Isi retroaktif: kalau suatu tahap sudah pernah di-update (statusnya bukan
-- "Belum Mulai"), anggap tanggal_mulai_tahap = tanggal_update yang tercatat
-- (perkiraan terbaik yang bisa kita buat dari data lama).
UPDATE pengadaan_tahapan
SET tanggal_mulai_tahap = tanggal_update
WHERE tanggal_mulai_tahap IS NULL AND status != 'Belum Mulai' AND tanggal_update IS NOT NULL;

-- 3. Tabel audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id           SERIAL PRIMARY KEY,
    pengadaan_id INTEGER REFERENCES pengadaan(id) ON DELETE CASCADE,
    user_id      INTEGER REFERENCES users(id),
    aksi         VARCHAR(255) NOT NULL,
    detail       TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_pengadaan ON audit_log(pengadaan_id);

COMMIT;