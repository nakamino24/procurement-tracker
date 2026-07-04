-- Jalankan ini KALAU database kamu sudah pernah di-migrate sebelumnya
-- (supaya tidak perlu drop semua data). Kalau database masih kosong/baru,
-- cukup jalankan `npm run migrate` seperti biasa (schema.sql sudah termasuk ini).
ALTER TABLE pengadaan ADD COLUMN IF NOT EXISTS pic_user_id INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_pengadaan_pic_user ON pengadaan(pic_user_id);
