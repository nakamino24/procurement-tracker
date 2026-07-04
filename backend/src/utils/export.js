const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const pool = require('../config/db');

// Ambil data lengkap (pengadaan + progress) yang mau diexport
async function fetchExportData() {
  const { rows } = await pool.query(`
    SELECT p.id, p.nama_pengadaan, p.vendor, p.pic, p.nilai_kontrak, p.tanggal_mulai,
      COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE pt.status = 'Selesai') / NULLIF(COUNT(*), 0)), 0) AS progress_percent,
      (
        SELECT tm.nama_tahap FROM pengadaan_tahapan pt2
        JOIN tahapan_master tm ON tm.id = pt2.tahapan_master_id
        WHERE pt2.pengadaan_id = p.id AND pt2.status != 'Selesai'
        ORDER BY tm.urutan ASC LIMIT 1
      ) AS tahap_saat_ini
    FROM pengadaan p
    LEFT JOIN pengadaan_tahapan pt ON pt.pengadaan_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `);
  return rows;
}

// GET /api/export/excel
async function exportExcel(req, res) {
  try {
    const data = await fetchExportData();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Laporan Pengadaan');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 6 },
      { header: 'Nama Pengadaan', key: 'nama_pengadaan', width: 30 },
      { header: 'Vendor', key: 'vendor', width: 20 },
      { header: 'PIC', key: 'pic', width: 18 },
      { header: 'Nilai Kontrak', key: 'nilai_kontrak', width: 16 },
      { header: 'Tanggal Mulai', key: 'tanggal_mulai', width: 14 },
      { header: 'Progress (%)', key: 'progress_percent', width: 12 },
      { header: 'Tahap Saat Ini', key: 'tahap_saat_ini', width: 30 },
    ];
    sheet.getRow(1).font = { bold: true };
    data.forEach((row) => sheet.addRow(row));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=laporan_pengadaan.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal export Excel.' });
  }
}

// GET /api/export/pdf
async function exportPdf(req, res) {
  try {
    const data = await fetchExportData();
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=laporan_pengadaan.pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Laporan Progress Pengadaan', { align: 'center' });
    doc.moveDown();

    const startX = 30;
    let y = doc.y;
    const colWidths = [140, 90, 80, 70, 70, 60, 200];
    const headers = ['Nama Pengadaan', 'Vendor', 'PIC', 'Nilai Kontrak', 'Mulai', 'Progress', 'Tahap Saat Ini'];

    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((h, i) => {
      doc.text(h, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i] });
    });
    doc.moveDown();
    doc.font('Helvetica');

    data.forEach((row) => {
      y = doc.y;
      const values = [
        row.nama_pengadaan,
        row.vendor || '-',
        row.pic || '-',
        Number(row.nilai_kontrak || 0).toLocaleString('id-ID'),
        row.tanggal_mulai ? new Date(row.tanggal_mulai).toLocaleDateString('id-ID') : '-',
        `${row.progress_percent}%`,
        row.tahap_saat_ini || 'Selesai semua',
      ];
      values.forEach((v, i) => {
        doc.text(String(v), startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i] });
      });
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal export PDF.' });
  }
}

module.exports = { exportExcel, exportPdf };
