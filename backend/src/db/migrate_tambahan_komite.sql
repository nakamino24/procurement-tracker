-- Jalankan ini SETELAH migrate_alur_baru.sql (kalau kamu sudah jalanin itu
-- sebelumnya). Migration ini ADDITIVE -- tidak menghapus progress tahap
-- yang sudah ada, cuma: (1) geser nomor urutan tahap yang posisinya
-- berubah, (2) tambah tahap baru: Penyampaian HPS (wajib untuk semua) dan
-- 6 tahap due-diligence yang cuma relevan untuk keputusan lewat Komite.

BEGIN;

-- 1. Geser urutan tahap-tahap yang posisinya mundur karena ada tahap baru
--    disisipkan di antaranya
UPDATE tahapan_master SET urutan = 5  WHERE kode = 'izin_pelaksanaan';
UPDATE tahapan_master SET urutan = 6  WHERE kode = 'aanwijzing';
UPDATE tahapan_master SET urutan = 7  WHERE kode = 'pemasukan_sampul';
UPDATE tahapan_master SET urutan = 8  WHERE kode = 'penilaian_teknis';
UPDATE tahapan_master SET urutan = 9  WHERE kode IN ('penggabungan_nilai', 'auction');
UPDATE tahapan_master SET urutan = 10 WHERE kode = 'klarifikasi_negosiasi';
UPDATE tahapan_master SET urutan = 17 WHERE kode = 'putusan_hasil';
UPDATE tahapan_master SET urutan = 18 WHERE kode = 'pengumuman_pemenang';
UPDATE tahapan_master SET urutan = 19 WHERE kode = 'surat_perintah_kerja';
UPDATE tahapan_master SET urutan = 20 WHERE kode = 'penerbitan_perjanjian';

-- 2. Tambah tahap-tahap baru (aman dijalankan berkali-kali, skip kalau kode
--    sudah ada)
INSERT INTO tahapan_master (kode, nama_tahap, urutan, wajib_untuk) VALUES
    ('penyampaian_hps', 'Penyampaian HPS', 4, 'semua'),
    ('background_checking', 'Background Checking', 11, 'komite'),
    ('pep', 'Politically Exposed Person (PEP)', 12, 'komite'),
    ('opini_legal', 'Opini Legal', 13, 'komite'),
    ('opini_compliance', 'Opini Compliance', 14, 'komite'),
    ('opini_sorh', 'Opini SORH', 15, 'komite'),
    ('uji_kepatuhan', 'Uji Kepatuhan', 16, 'komite_1_2')
ON CONFLICT (kode) DO NOTHING;

-- 3. "Penyampaian HPS" wajib_untuk = 'semua', jadi tambahkan retroaktif ke
--    semua pengadaan yang sudah ada (yang belum punya tahap ini)
INSERT INTO pengadaan_tahapan (pengadaan_id, tahapan_master_id, status)
SELECT p.id, tm.id, 'Belum Mulai'
FROM pengadaan p
CROSS JOIN tahapan_master tm
WHERE tm.kode = 'penyampaian_hps'
ON CONFLICT (pengadaan_id, tahapan_master_id) DO NOTHING;

-- Tahap due-diligence komite TIDAK ditambahkan otomatis di sini, karena
-- itu tergantung kategori_putusan tiap pengadaan (baru diketahui belakangan).
-- Nanti muncul otomatis lewat endpoint PUT /api/pengadaan/:id/metode
-- begitu kategori_putusan-nya di-set.

COMMIT;