-- ============================================================
-- SKEMA DATABASE: Procurement Tracking
-- ============================================================
-- Filosofi desain (baca ini dulu sebelum lanjut ke kode):
--
-- 1. `users`            -> siapa yang login & role-nya
-- 2. `tahapan_master`   -> DAFTAR BAKU nama tahapan + urutannya.
--                          Ini "kamus" tahapan, BUKAN data transaksi.
-- 3. `pengadaan`        -> data induk 1 proyek pengadaan
-- 4. `pengadaan_tahapan`-> tabel PENGHUBUNG (junction table) antara
--                          pengadaan & tahapan_master, ditambah kolom
--                          status/tanggal/catatan.
--
-- KENAPA DIPISAH JADI 4 TABEL (bukan 1 tabel besar)?
-- - Kalau nama tahapan ditulis manual di tiap baris pengadaan (mis.
--   kolom teks bebas), maka: (a) rawan typo/inkonsisten
--   ("Risk Assesment" vs "Risk Assessment"), (b) susah dihitung
--   "rata-rata durasi per tahap" karena nama tahap tidak seragam,
--   (c) kalau mau nambah/hapus/reorder tahapan, harus ubah SEMUA
--   baris data lama.
-- - Dengan `tahapan_master` terpisah, urutan & nama tahapan jadi
--   SATU SUMBER KEBENARAN (single source of truth). Setiap kali ada
--   pengadaan baru, sistem otomatis membuatkan baris di
--   `pengadaan_tahapan` untuk SETIAP baris di `tahapan_master`
--   (relasi one-to-many dari pengadaan, many-to-one dari
--   tahapan_master -> hasilnya many-to-many lewat tabel penghubung).
-- - Ini pola standar bernama "associative entity" / junction table,
--   dipakai kalau dua entitas (pengadaan & tahapan) punya hubungan
--   many-to-many TAPI hubungan itu sendiri punya atribut tambahan
--   (status, tanggal_update, catatan) yang tidak masuk akal
--   ditempel di salah satu tabel induk.
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'staff');
CREATE TYPE tahap_status AS ENUM ('Belum Mulai', 'Proses', 'Selesai', 'Tertunda');

-- 1. USERS
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    nama          VARCHAR(150) NOT NULL,
    email         VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          user_role NOT NULL DEFAULT 'staff',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TAHAPAN_MASTER (kamus tahapan + urutan baku)
-- `kode` = identifier stabil dipakai kode program (tidak berubah walau nama
--          tampilan diedit admin nanti).
-- `wajib_untuk` = kapan tahap ini relevan buat suatu pengadaan:
--     'semua'                -> selalu dibuat untuk semua pengadaan
--     'tender'                -> cuma untuk metode Tender Umum / Tender Terbatas
--     'penilaian_sistem_nilai'-> cuma kalau metode_penilaian = 'Sistem Nilai'
--     'penilaian_auction'     -> cuma kalau metode_penilaian = 'Evaluasi Biaya Terendah'
--     'opsional'              -> tergantung toggle pakai_spk di pengadaan
-- Tahap dengan wajib_untuk selain 'semua' TIDAK otomatis dibuat saat
-- pengadaan baru dibikin -- baru ditambahkan belakangan lewat endpoint
-- /api/pengadaan/:id/metode setelah PIC menentukan metode pengadaan/penilaiannya
-- (karena metode itu sendiri baru ditentukan SAAT mengerjakan tahap
-- "Usulan User" dan "Aanwijzing", bukan dari awal).
CREATE TABLE tahapan_master (
    id          SERIAL PRIMARY KEY,
    kode        VARCHAR(50) NOT NULL UNIQUE,
    nama_tahap  VARCHAR(150) NOT NULL UNIQUE,
    urutan      INTEGER NOT NULL, -- boleh sama untuk tahap yang saling menggantikan (lihat penggabungan_nilai vs auction)
    wajib_untuk VARCHAR(30) NOT NULL DEFAULT 'semua',
    is_active   BOOLEAN NOT NULL DEFAULT true
);

-- Data awal sesuai alur riil pengadaan BRI
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
    ('penerbitan_perjanjian', 'Penerbitan Perjanjian', 13, 'semua');

-- 3. PENGADAAN (data induk)
CREATE TABLE pengadaan (
    id             SERIAL PRIMARY KEY,
    nama_pengadaan VARCHAR(255) NOT NULL,
    vendor         VARCHAR(255),
    nilai_kontrak  NUMERIC(18,2) DEFAULT 0,
    pic            VARCHAR(150),
    pic_user_id    INTEGER REFERENCES users(id), -- akun PIC yang bertanggung jawab; dipakai untuk batasi akses staff
    tanggal_mulai  DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Ditentukan PIC saat mengerjakan tahap "Usulan User"
    metode_pengadaan       VARCHAR(30), -- 'Tender Umum' | 'Tender Terbatas' | 'Penunjukan Langsung'
    aspek_positif_pl       TEXT,        -- khusus Penunjukan Langsung
    aspek_negatif_pl       TEXT,        -- khusus Penunjukan Langsung

    -- Ditentukan PIC saat mengerjakan tahap "Aanwijzing"
    metode_penilaian       VARCHAR(30), -- 'Sistem Nilai' | 'Evaluasi Biaya Terendah'

    -- Ditentukan PIC saat mengerjakan tahap "Putusan Hasil"
    kategori_putusan       VARCHAR(30), -- 'Komite 1'..'Komite 4' | 'GH + GH' | 'DH + GH'

    -- Toggle: kadang setelah putusan hasil langsung ke Penerbitan Perjanjian
    -- tanpa lewat Surat Perintah Kerja
    pakai_spk              BOOLEAN NOT NULL DEFAULT true,

    created_by     INTEGER REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. PENGADAAN_TAHAPAN (junction table -> inti dari sistem tracking)
CREATE TABLE pengadaan_tahapan (
    id               SERIAL PRIMARY KEY,
    pengadaan_id     INTEGER NOT NULL REFERENCES pengadaan(id) ON DELETE CASCADE,
    tahapan_master_id INTEGER NOT NULL REFERENCES tahapan_master(id),
    status           tahap_status NOT NULL DEFAULT 'Belum Mulai',
    tanggal_update   TIMESTAMPTZ,
    catatan          TEXT,
    updated_by       INTEGER REFERENCES users(id),
    UNIQUE (pengadaan_id, tahapan_master_id) -- 1 pengadaan cuma punya 1 baris per tahap
);

-- Index untuk mempercepat filter & dashboard
CREATE INDEX idx_pengadaan_tahapan_pengadaan ON pengadaan_tahapan(pengadaan_id);
CREATE INDEX idx_pengadaan_tahapan_status ON pengadaan_tahapan(status);
CREATE INDEX idx_pengadaan_vendor ON pengadaan(vendor);
CREATE INDEX idx_pengadaan_pic ON pengadaan(pic);
CREATE INDEX idx_pengadaan_pic_user ON pengadaan(pic_user_id);

-- ============================================================
-- TRIGGER: setiap ada pengadaan baru, otomatis buatkan baris
-- pengadaan_tahapan HANYA untuk tahap yang wajib_untuk = 'semua'
-- (tahap yang tergantung metode pengadaan/penilaian/opsional BELUM
-- dibuat di sini -- baru ditambahkan lewat endpoint
-- PUT /api/pengadaan/:id/metode setelah metode-nya ditentukan).
-- ============================================================
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

CREATE TRIGGER trg_generate_tahapan
AFTER INSERT ON pengadaan
FOR EACH ROW EXECUTE FUNCTION fn_generate_tahapan();