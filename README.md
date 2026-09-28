# PERISAI - Pengelolaan Risiko Berbasis Aplikasi

Aplikasi web (HTML, CSS, JS murni) untuk inovasi PERISAI, Inspektorat Daerah Kabupaten Buleleng.
Alur dan formulir mengikuti Perbup Buleleng No. 66 Tahun 2023; skala dan matriks risiko mengikuti
SE Sekda No. 100.3.3.2/232.1/SEKT-ITDA/II/2025.

## Menjalankan

Buka `index.html` di peramban, atau jalankan server lokal:

    python -m http.server 8765

lalu buka http://127.0.0.1:8765. Ekspor Excel (SheetJS) dan PDF (html2pdf) dimuat dari CDN,
jadi butuh internet; fitur lain berjalan luring.

## Menu

| Menu | Dasar | Isi |
|---|---|---|
| Dashboard | - | Kemajuan 5 tahap, sebaran tingkat risiko, 10 risiko tertinggi |
| 1. Penetapan Konteks | Pasal 13-15, Form 2.a-2.c | Profil OPD, periode Renstra, konteks, kriteria SE |
| 2. Identifikasi Risiko | Pasal 16, Form 3.a-3.c | Register risiko, kode otomatis, kamus risiko |
| 3. Analisis Risiko | Pasal 17, Form 4, 5, 7 | Penilaian dan evaluasi per tahun, risiko prioritas, RTP, peta 5x5, tren Renstra |
| 4. Monitoring Internal PD | Pasal 18-20, Form 8, 9, 10 | Realisasi RTP per triwulan, kejadian risiko, infokom, rencana pemantauan |
| Pemantauan APIP | Pasal 20 ayat (4) | Evaluasi terpisah 8 kriteria, skor 1-5, rekomendasi dan tindak lanjut |
| Pelaporan | Pasal 21, Form 11, 12 | Laporan pelaksanaan dan laporan berkala (TW/Semester/Tahunan) |
| Kamus Risiko | - | 598 nomenklatur BPKP |

## Data

- Tersimpan di localStorage peramban. Gunakan "Unduh cadangan" secara berkala; data tidak dibagi antar komputer.
- Data awal: kertas kerja KK MR Kominfosanti 2026 (137 risiko, 125 sudah dinilai).
  `js/seed.js` dibangkitkan oleh `tools/extract_seed.py` dari xlsx dan kamus SIMR.
- Besaran risiko dibaca dari matriks SE (bukan D x K). Selera risiko: skor 12 ke atas wajib ditangani.

## Catatan atas data sumber

- RSO.26.02.23.04 di xlsx tercatat skor 2 untuk D=2, K=1; matriks SE memberi 3. Aplikasi memakai 3.
- 103 risiko (kecurangan dan program penunjang) tidak berkode di xlsx; aplikasi memberi kode
  ROO.26.02.23.19 dan seterusnya, ditandai "kode aplikasi".
- RSO.13-15 dan ROO.13-18 belum dinilai di Form 4; beberapa risiko tanpa pemilik atau C/UC. Keduanya ditandai di aplikasi.
- Sebagian entri kamus BPKP tidak memiliki skor acuan.

## Belum dicakup

- Form 1.a-1.c (CEE) dan Form 6 (RTP atas CEE).
- Multi-OPD dan multi-pengguna: butuh backend. Saat ini APIP mengevaluasi OPD yang datanya sedang dimuat.
