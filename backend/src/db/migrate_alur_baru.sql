-- Jalankan ini di database yang SUDAH ADA (yang sebelumnya pakai 9 tahap
-- generik). Ini akan: (1) restrukturisasi tahapan_master ke alur baru yang
-- lebih detail & bercabang, (2) tambah kolom metode di pengadaan.
--
-- PERINGATAN: karena nama & jumlah tahap berubah total, script ini akan
-- MENGHAPUS SEMUA baris pengadaan_tahapan yang lama (progress tahap lama akan
-- hilang) lalu membuat ulang tahap universal untuk tiap pengadaan yang sudah
-- ada. Kalau kamu masih tahap development/testing, ini aman.

BEGIN;

ALTER TABLE pengadaan ADD COLUMN IF NOT EXISTS metode_pengadaan VARCHAR(30);
ALTER TABLE pengadaan ADD COLUMN IF NOT EXISTS aspek_positif_pl TEXT;
ALTER TABLE pengadaan ADD COLUMN IF NOT EXISTS aspek_negatif_pl TEXT;
ALTER TABLE pengadaan ADD COLUMN IF NOT EXISTS metode_penilaian VARCHAR(30);
ALTER TABLE pengadaan ADD COLUMN IF NOT EXISTS kategori_putusan VARCHAR(30);
ALTER TABLE pengadaan ADD COLUMN IF NOT EXISTS pakai_spk BOOLEAN NOT NULL DEFAULT true;

DELETE FROM pengadaan_tahapan;

ALTER TABLE tahapan_master ADD COLUMN IF NOT EXISTS kode VARCHAR(50);
ALTER TABLE tahapan_master ADD COLUMN IF NOT EXISTS wajib_untuk VARCHAR(30) NOT NULL DEFAULT 'semua';
ALTER TABLE tahapan_master DROP CONSTRAINT IF EXISTS tahapan_master_urutan_key;

TRUNCATE tahapan_master RESTART IDENTITY CASCADE;

INSERT INTO tahapan_master (kode, nama_tahap, urutan, wajib_untuk) VALUES
    ('usulan_user', 'Usulan User', 1, 'semua'),
    ('kelengkapan_dokumen', 'Kelengkapan Dokumen', 2, 'semua'),
    ('permintaan_hps', 'Permintaan HPS', 3, 'semua'),
    ('izin_pelaksanaan', 'Izin Pelaksanaan Pengadaan', 4, 'semua'),
    ('aanwijzing', 'Aanwijzing', 5, 'semua'),
    ('pemasukan_sampul', 'Pemasukan Sampul Penawaran & Pembukaan Proposal Administrasi dan Teknis', 6, 'semua'),
    ('penilaian_teknis', 'Penilaian Teknis', 7, 'semua'),
    ('penggabungan_nilai', 'Penggabungan Nilai', 8, 'penilaian_sistem_nilai'),
    ('auction', 'Auction', 8, 'penilaian_auction'),
    ('klarifikasi_negosiasi', 'Klarifikasi dan Negosiasi', 9, 'semua'),
    ('putusan_hasil', 'Putusan Hasil', 10, 'semua'),
    ('pengumuman_pemenang', 'Surat Pengumuman Pemenang', 11, 'tender'),
    ('surat_perintah_kerja', 'Surat Perintah Kerja', 12, 'opsional'),
    ('penerbitan_perjanjian', 'Penerbitan Perjanjian', 13, 'opsional');

ALTER TABLE tahapan_master ALTER COLUMN kode SET NOT NULL;
ALTER TABLE tahapan_master ADD CONSTRAINT tahapan_master_kode_key UNIQUE (kode);

CREATE OR REPLACE FUNCTION fn_generate_tahapan()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO pengadaan_tahapan (pengadaan_id, tahapan_master_id, status)
    SELECT NEW.id, tm.id, 'Belum Mulai'
    FROM tahapan_master tm
    WHERE tm.is_active = true AND tm.wajib_untuk = 'semua'
    ORDER BY tm.urutan;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

INSERT INTO pengadaan_tahapan (pengadaan_id, tahapan_master_id, status)
SELECT p.id, tm.id, 'Belum Mulai'
FROM pengadaan p
CROSS JOIN tahapan_master tm
WHERE tm.wajib_untuk = 'semua';

COMMIT;