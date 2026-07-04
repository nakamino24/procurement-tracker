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
CREATE TABLE tahapan_master (
    id          SERIAL PRIMARY KEY,
    nama_tahap  VARCHAR(150) NOT NULL UNIQUE,
    urutan      INTEGER NOT NULL UNIQUE, -- 1,2,3,... menentukan urutan wajib
    is_active   BOOLEAN NOT NULL DEFAULT true
);

-- Data awal sesuai kebutuhan kamu (urutan wajib dilewati berurutan)
INSERT INTO tahapan_master (nama_tahap, urutan) VALUES
    ('Izin Kegiatan User', 1),
    ('Konfirmasi Anggaran dari Grup Terkait', 2),
    ('Risk Assessment dari Grup Terkait', 3),
    ('Kelengkapan Dokumen', 4),
    ('Izin Prinsip Pengadaan', 5),
    ('Harga Perkiraan Sendiri (HPS)', 6),
    ('Kontrak', 7),
    ('Penandatanganan', 8),
    ('Selesai', 9);

-- 3. PENGADAAN (data induk)
CREATE TABLE pengadaan (
    id             SERIAL PRIMARY KEY,
    nama_pengadaan VARCHAR(255) NOT NULL,
    vendor         VARCHAR(255),
    nilai_kontrak  NUMERIC(18,2) DEFAULT 0,
    pic            VARCHAR(150),
    tanggal_mulai  DATE NOT NULL DEFAULT CURRENT_DATE,
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

-- ============================================================
-- TRIGGER: setiap ada pengadaan baru, otomatis buatkan baris
-- pengadaan_tahapan untuk SEMUA tahapan_master yang aktif.
-- Ini kunci supaya frontend/backend TIDAK PERLU manual insert
-- 9 baris tahapan tiap kali user bikin pengadaan baru.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_generate_tahapan()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO pengadaan_tahapan (pengadaan_id, tahapan_master_id, status)
    SELECT NEW.id, tm.id, 'Belum Mulai'
    FROM tahapan_master tm
    WHERE tm.is_active = true
    ORDER BY tm.urutan;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_tahapan
AFTER INSERT ON pengadaan
FOR EACH ROW EXECUTE FUNCTION fn_generate_tahapan();
