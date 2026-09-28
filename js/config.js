/**
 * PERISAI - konfigurasi baku.
 * Sumber: Surat Edaran Sekda Buleleng No. 100.3.3.2/232.1/SEKT-ITDA/II/2025
 * (Penetapan Skala Risiko) dan Perbup Buleleng No. 66 Tahun 2023.
 */
(function () {
  'use strict';

  /** Tabel 4 SE: MATRIX[kemungkinan][dampak] = besaran risiko. Bukan perkalian D x K. */
  const MATRIX = {
    1: { 1: 1, 2: 3, 3: 5, 4: 8, 5: 20 },
    2: { 1: 2, 2: 7, 3: 11, 4: 13, 5: 21 },
    3: { 1: 4, 2: 10, 3: 14, 4: 17, 5: 22 },
    4: { 1: 6, 2: 12, 3: 16, 4: 19, 5: 24 },
    5: { 1: 9, 2: 15, 3: 18, 4: 23, 5: 25 },
  };

  /** Tabel 3 SE: tingkat risiko. */
  const BANDS = [
    { level: 1, min: 1, max: 5, label: 'Sangat Rendah', warna: 'Biru', cls: 'b1' },
    { level: 2, min: 6, max: 11, label: 'Rendah', warna: 'Hijau', cls: 'b2' },
    { level: 3, min: 12, max: 15, label: 'Sedang', warna: 'Kuning', cls: 'b3' },
    { level: 4, min: 16, max: 19, label: 'Tinggi', warna: 'Oranye', cls: 'b4' },
    { level: 5, min: 20, max: 25, label: 'Sangat Tinggi', warna: 'Merah', cls: 'b5' },
  ];

  /** Butir d SE: Sedang s.d. Sangat Tinggi harus ditangani. */
  const SELERA_MIN_TANGANI = 12;

  /** Tabel 1 SE: skala dampak. */
  const SKALA_DAMPAK = [
    { skor: 5, label: 'Sangat Signifikan', keuangan: 'Kerugian sangat besar, > Rp500 juta', kinerja: 'Pencapaian target kinerja < 25%', reputasi: 'Negatif, tersebar luas di semua media nasional/internasional', hukum: 'Pelanggaran serius, terkena sanksi pidana', pelayanan: 'Pelayanan tertunda lebih dari 30 hari' },
    { skor: 4, label: 'Signifikan', keuangan: 'Kerugian besar, Rp100 juta s.d. Rp500 juta', kinerja: 'Pencapaian target kinerja di atas 25% s.d. 50%', reputasi: 'Negatif, tersebar di beberapa media nasional', hukum: 'Pelanggaran serius, sanksi tertulis', pelayanan: 'Pelayanan tertunda di atas 15 hari s.d. 30 hari' },
    { skor: 3, label: 'Moderat', keuangan: 'Kerugian cukup besar, Rp10 juta s.d. Rp100 juta', kinerja: 'Pencapaian target kinerja di atas 50% s.d. 80%', reputasi: 'Negatif, tersebar di beberapa media lokal', hukum: 'Pelanggaran biasa, sanksi tertulis', pelayanan: 'Pelayanan tertunda di atas 5 hari s.d. 15 hari' },
    { skor: 2, label: 'Minor', keuangan: 'Kerugian kurang material, Rp10 juta s.d. Rp50 juta', kinerja: 'Pencapaian target kinerja di atas 80% s.d. 100%', reputasi: 'Keluhan stakeholder secara lisan/tulisan ke organisasi, > 3 kali dalam satu periode', hukum: 'Pelanggaran biasa, sanksi teguran', pelayanan: 'Pelayanan tertunda di atas 1 hari s.d. 5 hari' },
    { skor: 1, label: 'Tidak Signifikan', keuangan: 'Kerugian tidak material, < Rp10 juta', kinerja: 'Pencapaian target kinerja >= 100%', reputasi: 'Keluhan stakeholder secara lisan/tulisan ke organisasi, <= 3 kali dalam satu periode', hukum: 'Tidak material', pelayanan: 'Pelayanan tertunda <= 1 hari' },
  ];

  /** Tabel 2 SE: skala kemungkinan. */
  const SKALA_KEMUNGKINAN = [
    { skor: 5, label: 'Hampir Pasti Terjadi', uraian: 'Sangat sering (lebih dari 70% atau lebih dari 7 kali dalam 5 tahun)' },
    { skor: 4, label: 'Sering Terjadi', uraian: 'Sering (51% s.d. 70% atau 5 s.d. 7 kali dalam 5 tahun)' },
    { skor: 3, label: 'Kadang Terjadi', uraian: 'Kadang-kadang (31% s.d. 50% atau 3 s.d. 5 kali dalam 5 tahun)' },
    { skor: 2, label: 'Jarang Terjadi', uraian: 'Rendah/kecil (11% s.d. 30% atau 1 s.d. 3 kali dalam 5 tahun)' },
    { skor: 1, label: 'Hampir Tidak Terjadi', uraian: 'Sangat kecil (0% s.d. 10% atau 1 kali dalam 5 tahun)' },
  ];

  /** Tingkat risiko menurut Pasal 12 ayat (2) Perbup 66/2023 dan sheet "kode risiko". */
  const LEVELS = {
    RSP: { label: 'Risiko Strategis Pemda', form: 'Form 3.a', konteksForm: 'Form 2.a', dasar: 'RPJMD' },
    RSO: { label: 'Risiko Strategis OPD', form: 'Form 3.b', konteksForm: 'Form 2.b', dasar: 'Renstra Perangkat Daerah' },
    ROO: { label: 'Risiko Operasional OPD', form: 'Form 3.c', konteksForm: 'Form 2.c', dasar: 'RKA-SKPD / Renja' },
  };

  /** Pengelompokan dalam kertas kerja Kominfosanti (Form 4/5). */
  const KELOMPOK = {
    RSP: ['Strategis Pemda'],
    RSO: ['Strategis OPD'],
    ROO: ['Operasional OPD', 'Kecurangan/Fraud', 'Program Penunjang'],
  };

  const TRIWULAN = ['I', 'II', 'III', 'IV'];
  const STATUS_RTP = ['Belum Dilaksanakan', 'Dalam Proses', 'Selesai', 'Tidak Dilaksanakan'];

  /** Pasal 20 ayat (4): bentuk evaluasi terpisah oleh Inspektorat. */
  const JENIS_PENGAWASAN = ['Audit', 'Reviu', 'Pemantauan', 'Evaluasi', 'Pengawasan Lainnya'];

  /**
   * Kriteria evaluasi terpisah APIP atas tahapan Pasal 10 Perbup 66/2023.
   * "indikator" dihitung dari data aplikasi sebagai bukti pendukung skor.
   */
  const KRITERIA_APIP = [
    { id: 'konteks', nama: 'Penetapan konteks', acuan: 'Pasal 13-15', uraian: 'Profil, periode Renstra, dan konteks strategis/operasional ditetapkan; kriteria risiko mengacu SE Sekda.' },
    { id: 'identifikasi', nama: 'Identifikasi risiko', acuan: 'Pasal 16', uraian: 'Risiko diuraikan atas seluruh program/kegiatan dengan atribut lengkap (pemilik, sebab, sumber, C/UC, dampak).' },
    { id: 'analisis', nama: 'Analisis risiko', acuan: 'Pasal 17 ayat (3) huruf a-b', uraian: 'Seluruh risiko dinilai dampak dan kemungkinannya; risiko prioritas divalidasi.' },
    { id: 'rtp', nama: 'Rencana tindak pengendalian', acuan: 'Pasal 17 ayat (3) huruf c-d', uraian: 'Risiko prioritas memiliki RTP dengan celah pengendalian, penanggung jawab, dan target waktu.' },
    { id: 'pengendalian', nama: 'Kegiatan pengendalian', acuan: 'Pasal 18', uraian: 'RTP dilaksanakan sesuai rencana dan didukung bukti.' },
    { id: 'infokom', nama: 'Informasi dan komunikasi', acuan: 'Pasal 19', uraian: 'Pengendalian yang dibangun dikomunikasikan kepada pihak terkait (Form 8).' },
    { id: 'pemantauan', nama: 'Pemantauan', acuan: 'Pasal 20', uraian: 'Pelaksanaan RTP dan kejadian risiko dicatat berkala (Form 9 dan Form 10).' },
    { id: 'pelaporan', nama: 'Pelaporan', acuan: 'Pasal 21', uraian: 'Laporan pelaksanaan dan laporan berkala pengelolaan risiko tersusun.' },
  ];

  const DASAR_HUKUM = [
    'Peraturan Pemerintah Nomor 60 Tahun 2008 tentang Sistem Pengendalian Intern Pemerintah',
    'Peraturan Presiden Nomor 39 Tahun 2023 tentang Manajemen Risiko Pembangunan Nasional',
    'Peraturan BPKP Nomor 6 Tahun 2018 tentang Pedoman Pengawasan Intern Berbasis Risiko',
    'Peraturan Deputi Bidang Pengawasan Penyelenggaraan Keuangan Daerah BPKP Nomor 4 Tahun 2019 tentang Pedoman Pengelolaan Risiko pada Pemerintah Daerah',
    'Peraturan Bupati Buleleng Nomor 66 Tahun 2023 tentang Pedoman Pengelolaan Risiko di Lingkungan Pemerintah Daerah',
    'Surat Edaran Sekretaris Daerah Kabupaten Buleleng Nomor 100.3.3.2/232.1/SEKT-ITDA/II/2025 tentang Penetapan Skala Risiko Pemerintah Daerah Kabupaten Buleleng',
  ];

  window.PERISAI_CONFIG = Object.freeze({
    MATRIX, BANDS, SELERA_MIN_TANGANI, SKALA_DAMPAK, SKALA_KEMUNGKINAN, LEVELS, KELOMPOK,
    TRIWULAN, STATUS_RTP, JENIS_PENGAWASAN, KRITERIA_APIP, DASAR_HUKUM,
    STORAGE_KEY: 'perisai.data.v1',
    UI_KEY: 'perisai.ui.v1',
  });
})();
