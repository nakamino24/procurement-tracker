-- Jalankan setelah migrasi-migrasi sebelumnya. Additive.

BEGIN;

CREATE TABLE IF NOT EXISTS hari_libur (
    tanggal    DATE PRIMARY KEY,
    keterangan VARCHAR(150)
);

CREATE OR REPLACE FUNCTION hari_kerja_antara(tgl_awal DATE, tgl_akhir DATE)
RETURNS INTEGER AS $$
DECLARE
  total INTEGER;
BEGIN
  IF tgl_awal IS NULL OR tgl_akhir IS NULL OR tgl_akhir < tgl_awal THEN
    RETURN 0;
  END IF;
  SELECT COUNT(*) INTO total
  FROM generate_series(tgl_awal, tgl_akhir, interval '1 day') AS d
  WHERE EXTRACT(ISODOW FROM d) < 6
    AND d::date NOT IN (SELECT tanggal FROM hari_libur);
  RETURN total;
END;
$$ LANGUAGE plpgsql;

INSERT INTO hari_libur (tanggal, keterangan) VALUES
    ('2025-01-01', NULL),
    ('2025-01-27', NULL),
    ('2025-01-28', NULL),
    ('2025-01-29', NULL),
    ('2025-03-28', NULL),
    ('2025-03-31', NULL),
    ('2025-04-01', NULL),
    ('2025-04-02', NULL),
    ('2025-04-03', NULL),
    ('2025-04-04', NULL),
    ('2025-04-07', NULL),
    ('2025-04-18', NULL),
    ('2025-04-20', NULL),
    ('2025-05-01', NULL),
    ('2025-05-12', NULL),
    ('2025-05-13', NULL),
    ('2025-05-29', NULL),
    ('2025-05-30', NULL),
    ('2025-06-01', NULL),
    ('2025-06-06', NULL),
    ('2025-06-09', NULL),
    ('2025-06-27', NULL),
    ('2025-08-17', NULL),
    ('2025-09-05', NULL),
    ('2025-12-25', NULL),
    ('2025-12-26', NULL),
    ('2026-01-01', 'Tahun Baru'),
    ('2026-01-16', 'Israk mikraj'),
    ('2026-02-16', 'Cuti Bersama Imlek'),
    ('2026-02-17', 'Imlek'),
    ('2026-03-18', 'Hari Nyepi'),
    ('2026-03-19', 'Cuti Bersama Nyepi'),
    ('2026-03-20', 'Idul Fitri'),
    ('2026-03-21', 'Idul Fitri'),
    ('2026-03-22', 'Idul Fitri'),
    ('2026-03-23', 'Idul Fitri'),
    ('2026-03-24', 'Idul Fitri'),
    ('2026-04-03', 'Wafat Yesus'),
    ('2026-04-05', 'Paskah'),
    ('2026-04-18', 'Cuti Bersama'),
    ('2026-05-01', 'Hari Buruh'),
    ('2026-05-14', 'Kenaikan Yesus Kristus'),
    ('2026-05-15', 'Kenaikan Yesus Kristus'),
    ('2026-05-27', 'Idul Adha'),
    ('2026-05-28', 'Idul Adha'),
    ('2026-05-31', 'Hari Raya Waisak'),
    ('2026-06-01', 'Hari Pancasila'),
    ('2026-06-16', '1 Muharam'),
    ('2026-08-17', 'Proklamasi'),
    ('2026-08-25', 'Maulid Nabi'),
    ('2026-12-24', 'Natal'),
    ('2026-12-25', 'Natal')
ON CONFLICT (tanggal) DO NOTHING;
COMMIT;