/**
 * PERISAI - Pelaporan (BAB III Pasal 21 Perbup 66/2023).
 * Form 11 Laporan Pelaksanaan Pengelolaan Risiko dan Form 12 Laporan Berkala oleh UPR.
 * Bagian naratif dapat disunting; tabel disusun otomatis dari data.
 */
(function () {
  'use strict';
  const S = window.PERISAI_STORE, U = window.PERISAI_UI, C = window.PERISAI_CONFIG;
  const { esc, icon, scoreBadge } = U;
  const V = (window.PERISAI_VIEWS = window.PERISAI_VIEWS || {});

  const PERIODE = {
    'TW I': ['I'], 'TW II': ['II'], 'TW III': ['III'], 'TW IV': ['IV'],
    'Semester I': ['I', 'II'], 'Semester II': ['III', 'IV'], 'Tahunan': ['I', 'II', 'III', 'IV'],
  };
  const MONTH_TW = m => C.TRIWULAN[Math.floor(m / 3)];

  function opdName() { const p = S.state.profil; return p.opd || 'Perangkat Daerah'; }

  // ---------------- tabel otomatis ----------------
  function tblKonteks() {
    const rows = S.state.konteks;
    return `<table class="dt"><thead><tr><th>Tingkat</th><th>Sasaran</th><th>Indikator</th><th>Program / Kegiatan</th></tr></thead><tbody>
      ${rows.map(k => `<tr><td>${esc(k.level)}</td><td>${esc(k.sasaran)}</td><td>${esc(k.indikator)}</td><td>${esc([k.program, k.kegiatan, k.subKegiatan].filter(Boolean).join(' / '))}</td></tr>`).join('') || '<tr><td colspan="4" class="center">Belum ada konteks</td></tr>'}</tbody></table>`;
  }
  function tblIdentifikasi(y) {
    const rs = S.risksForYear(y);
    const kel = [...new Set(rs.map(r => r.level + '|' + r.kelompok))];
    return `<table class="dt"><thead><tr><th>Tingkat</th><th>Kelompok</th><th>Jumlah risiko</th><th>Sebab dapat dikendalikan (C)</th><th>Sumber internal</th></tr></thead><tbody>
      ${kel.map(g => { const [l, k] = g.split('|'); const x = rs.filter(r => r.level === l && r.kelompok === k); return `<tr><td>${esc(C.LEVELS[l].label)}</td><td>${esc(k)}</td><td class="center">${x.length}</td><td class="center">${x.filter(r => r.cuc === 'C').length}</td><td class="center">${x.filter(r => /internal/i.test(r.sumber || '')).length}</td></tr>`; }).join('')}
      <tr class="group"><td colspan="2">Jumlah</td><td class="center">${rs.length}</td><td class="center">${rs.filter(r => r.cuc === 'C').length}</td><td class="center">${rs.filter(r => /internal/i.test(r.sumber || '')).length}</td></tr></tbody></table>`;
  }
  function tblAnalisis(y) {
    const rs = S.risksForYear(y);
    const cnt = {}; C.BANDS.forEach(b => { cnt[b.cls] = { RSP: 0, RSO: 0, ROO: 0 }; });
    let belum = 0;
    rs.forEach(r => { const s = S.assessment(r, y).skor; if (s == null) belum++; else cnt[S.bandOf(s).cls][r.level]++; });
    return `<table class="dt"><thead><tr><th>Tingkat risiko</th><th>Besaran</th><th>RSP</th><th>RSO</th><th>ROO</th><th>Jumlah</th></tr></thead><tbody>
      ${C.BANDS.slice().reverse().map(b => { const c = cnt[b.cls]; return `<tr><td>${esc(b.label)}</td><td class="center">${b.min}-${b.max}</td><td class="center">${c.RSP}</td><td class="center">${c.RSO}</td><td class="center">${c.ROO}</td><td class="center"><b>${c.RSP + c.RSO + c.ROO}</b></td></tr>`; }).join('')}
      <tr><td colspan="5">Belum dinilai</td><td class="center">${belum}</td></tr></tbody></table>`;
  }
  function tblPrioritas(y) {
    const prio = S.priorityRisks(y);
    return `<table class="dt"><thead><tr><th>No</th><th>Kode</th><th>Risiko prioritas</th><th>Skor</th><th>Pemilik</th></tr></thead><tbody>
      ${prio.map(({ r, a }, i) => `<tr><td class="center">${i + 1}</td><td>${esc(r.kode)}</td><td>${esc(r.uraian)}</td><td class="center">${scoreBadge(a.skor)}</td><td>${esc(r.pemilik)}</td></tr>`).join('') || '<tr><td colspan="5" class="center">Tidak ada risiko prioritas</td></tr>'}</tbody></table>`;
  }
  function rtpRows(y, twFilter) {
    return S.rtpForYear(y).map(t => ({ t, r: S.get('risks', t.riskId) })).filter(x => x.r && (!twFilter || twFilter.includes(x.t.targetTriwulan || 'IV')))
      .sort((a, b) => a.r.kode.localeCompare(b.r.kode, 'id', { numeric: true }));
  }
  function tblRtp(y, field, twFilter) {
    const rows = rtpRows(y, twFilter);
    const label = field === 'pengendalianAda' ? 'Pengendalian yang sudah ada' : 'Rencana tindak pengendalian (pengendalian yang dibutuhkan)';
    return `<table class="dt"><thead><tr><th>No</th><th>Kode</th><th>Risiko</th><th>${esc(label)}</th>${field === 'rencana' ? '<th>Penanggung jawab</th><th>Target</th>' : '<th>Celah pengendalian</th>'}</tr></thead><tbody>
      ${rows.map(({ t, r }, i) => `<tr><td class="center">${i + 1}</td><td>${esc(r.kode)}</td><td>${esc(r.uraian)}</td><td>${U.nl2br(t[field])}</td>${field === 'rencana' ? `<td>${esc(t.pj)}</td><td>${esc(t.target)}</td>` : `<td>${U.nl2br(t.celah)}</td>`}</tr>`).join('') || `<tr><td colspan="${field === 'rencana' ? 6 : 5}" class="center">Tidak ada data</td></tr>`}</tbody></table>`;
  }
  function tblFormSimple(coll, y, cols) {
    const rows = S.state[coll].filter(x => Number(x.tahun) === y);
    return `<table class="dt"><thead><tr><th>No</th>${cols.map(c => `<th>${esc(c[1])}</th>`).join('')}</tr></thead><tbody>
      ${rows.map((x, i) => `<tr><td class="center">${i + 1}</td>${cols.map(c => `<td>${U.nl2br(x[c[0]])}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length + 1}" class="center">Tidak ada data</td></tr>`}</tbody></table>`;
  }
  function tblRealisasi(y, tws) {
    const rows = [];
    rtpRows(y).forEach(({ t, r }) => {
      S.state.rtpProgress.filter(p => p.rtpId === t.id && tws.includes(p.triwulan)).sort((a, b) => C.TRIWULAN.indexOf(a.triwulan) - C.TRIWULAN.indexOf(b.triwulan))
        .forEach(p => rows.push({ t, r, p }));
    });
    return `<table class="dt"><thead><tr><th>No</th><th>Kode</th><th>RTP</th><th>TW</th><th>Status</th><th>Realisasi</th><th>Bukti dukung</th></tr></thead><tbody>
      ${rows.map(({ t, r, p }, i) => `<tr><td class="center">${i + 1}</td><td>${esc(r.kode)}</td><td>${U.nl2br(t.rencana)}</td><td class="center">${esc(p.triwulan)}</td><td>${esc(p.status)}</td><td>${U.nl2br(p.realisasi)}</td><td>${esc(p.bukti)}</td></tr>`).join('') || '<tr><td colspan="7" class="center">Belum ada realisasi yang dicatat pada periode ini</td></tr>'}</tbody></table>`;
  }
  function gapRows(y, tws) {
    const last = tws[tws.length - 1];
    return rtpRows(y).filter(({ t }) => {
      const target = C.TRIWULAN.indexOf(t.targetTriwulan || 'IV');
      if (target > C.TRIWULAN.indexOf(last)) return false;
      return S.rtpStatus(t.id).status !== 'Selesai';
    });
  }
  function tblGap(y, tws) {
    const rows = gapRows(y, tws);
    return `<table class="dt"><thead><tr><th>No</th><th>Kode</th><th>RTP</th><th>Target</th><th>Status terakhir</th><th>Keterangan</th></tr></thead><tbody>
      ${rows.map(({ t, r }, i) => { const st = S.rtpStatus(t.id); return `<tr><td class="center">${i + 1}</td><td>${esc(r.kode)}</td><td>${U.nl2br(t.rencana)}</td><td>${esc(t.target || 'TW ' + t.targetTriwulan)}</td><td>${esc(st.status)}</td><td>${U.nl2br(st.last ? st.last.keterangan : '')}</td></tr>`; }).join('') || '<tr><td colspan="6" class="center">Tidak ada gap: seluruh RTP yang jatuh tempo telah selesai</td></tr>'}</tbody></table>`;
  }
  function tblEvents(y, tws) {
    const rows = S.state.events.filter(e => Number(e.tahun) === y && (!tws || (e.tanggal && tws.includes(MONTH_TW(new Date(e.tanggal + 'T00:00:00').getMonth())))));
    return `<table class="dt"><thead><tr><th>No</th><th>Tanggal</th><th>Kode</th><th>Risiko</th><th>Sebab</th><th>Dampak</th></tr></thead><tbody>
      ${rows.map((e, i) => { const r = S.get('risks', e.riskId); return `<tr><td class="center">${i + 1}</td><td>${esc(U.fmtDate(e.tanggal))}</td><td>${esc(r ? r.kode : '')}</td><td>${esc(r ? r.uraian : '')}</td><td>${U.nl2br(e.sebab)}</td><td>${U.nl2br(e.dampak)}</td></tr>`; }).join('') || '<tr><td colspan="6" class="center">Tidak ada kejadian risiko yang dicatat</td></tr>'}</tbody></table>`;
  }

  // ---------------- definisi laporan ----------------
  function draftCommon(y) {
    const p = S.state.profil;
    return {
      latar: `Pengelolaan risiko merupakan bagian dari unsur penilaian risiko dalam Sistem Pengendalian Intern Pemerintah. Peraturan Bupati Buleleng Nomor 66 Tahun 2023 mewajibkan setiap Unit Pemilik Risiko melaksanakan pengelolaan risiko secara sistematis, terdokumentasi, dan berkelanjutan, serta menyusun laporan pengelolaan risiko sebagai bentuk akuntabilitas. Laporan ini disusun oleh ${opdName()} untuk tahun ${y}.`,
      dasar: C.DASAR_HUKUM.map((d, i) => `${i + 1}. ${d};`).join('\n'),
      maksud: `Laporan ini dimaksudkan untuk menyajikan pelaksanaan pengelolaan risiko ${opdName()} tahun ${y}, dengan tujuan memberikan keyakinan memadai atas tercapainya tujuan strategis dan operasional, mendukung pengambilan keputusan berbasis risiko, serta memenuhi kewajiban pelaporan kepada Bupati melalui Sekretariat Daerah dan Unit Kepatuhan.`,
      lingkup: `Ruang lingkup meliputi risiko strategis Pemerintah Daerah, risiko strategis ${p.opdSingkat || 'Perangkat Daerah'}, dan risiko operasional (termasuk risiko kecurangan dan program penunjang) pada periode Renstra ${p.periodeAwal}-${p.periodeAkhir}, tahun penilaian ${y}. Kriteria risiko mengacu Surat Edaran Sekretaris Daerah Nomor 100.3.3.2/232.1/SEKT-ITDA/II/2025.`,
    };
  }

  function sectionsF11(y) {
    const d = draftCommon(y);
    const rs = S.risksForYear(y);
    const prio = S.priorityRisks(y);
    const rtp = S.rtpForYear(y);
    return [
      { h: 'I. Pendahuluan' },
      { id: 'latar', t: 'A. Latar Belakang', def: d.latar },
      { id: 'dasar', t: 'B. Dasar Hukum', def: d.dasar },
      { id: 'maksud', t: 'C. Maksud dan Tujuan', def: d.maksud },
      { id: 'lingkup', t: 'D. Ruang Lingkup', def: d.lingkup },
      { h: 'II. Perbaikan Lingkungan Pengendalian yang Diharapkan' },
      { id: 'lingkungan', t: 'A. Kondisi Lingkungan Pengendalian Saat Ini', def: '', ph: 'Isi berdasarkan hasil reviu dokumen dan survei persepsi CEE (Form 1.a s.d. 1.c).' },
      { id: 'perbaikanLP', t: 'B. Rencana Perbaikan Lingkungan Pengendalian', def: '', ph: 'Strategi perbaikan lingkungan pengendalian untuk mendukung budaya sadar risiko.' },
      { h: 'III. Pengelolaan Risiko dan Rencana Tindak Pengendalian' },
      { id: 'konteks', t: 'A. Penetapan Konteks/Tujuan', def: `Penetapan konteks dilakukan atas ${S.state.konteks.length} konteks tujuan, sasaran, program, dan kegiatan sebagaimana tabel berikut.`, auto: () => tblKonteks() },
      { id: 'identifikasi', t: 'B. Hasil Identifikasi Risiko', def: `Hasil identifikasi menghasilkan ${rs.length} risiko, terdiri atas ${rs.filter(r => r.level === 'RSP').length} risiko strategis Pemda, ${rs.filter(r => r.level === 'RSO').length} risiko strategis OPD, dan ${rs.filter(r => r.level === 'ROO').length} risiko operasional.`, auto: () => tblIdentifikasi(y) },
      { id: 'analisis', t: 'C. Hasil Analisis Risiko', def: `Analisis dampak dan kemungkinan menggunakan matriks 5x5 SE Sekda. Sebanyak ${prio.length} risiko berada pada tingkat Sedang s.d. Sangat Tinggi (skor 12 ke atas) sehingga ditetapkan sebagai risiko prioritas yang wajib ditangani.`, auto: () => tblAnalisis(y) + '<h3>Daftar risiko prioritas</h3>' + tblPrioritas(y) },
      { id: 'pengendalianAda', t: 'D. Pengendalian yang Sudah Dilakukan', def: 'Pengendalian yang telah ada atas risiko prioritas beserta celahnya adalah sebagai berikut.', auto: () => tblRtp(y, 'pengendalianAda') },
      { id: 'pengendalianButuh', t: 'E. Pengendalian yang Masih Dibutuhkan', def: `Disusun ${rtp.length} rencana tindak pengendalian untuk menutup celah pengendalian.`, auto: () => tblRtp(y, 'rencana') },
      { id: 'infokom', t: 'IV. Rancangan Informasi dan Komunikasi', def: 'Pengendalian yang dibangun dikomunikasikan kepada pihak terkait sebagaimana rencana berikut (Form 8).', auto: () => tblFormSimple('infokom', y, [['kegiatan', 'Kegiatan pengendalian'], ['media', 'Media'], ['penyedia', 'Penyedia'], ['penerima', 'Penerima'], ['rencana', 'Rencana waktu'], ['realisasi', 'Realisasi']]) },
      { id: 'pemantauan', t: 'V. Rancangan Pemantauan', def: 'Pemantauan atas pelaksanaan pengendalian dan keterjadian risiko dilakukan secara berjenjang dan dicatat triwulanan (Form 9 dan Form 10).', auto: () => tblFormSimple('pemantauanPI', y, [['kegiatan', 'Kegiatan pengendalian'], ['metode', 'Metode pemantauan'], ['pj', 'Penanggung jawab'], ['rencana', 'Rencana waktu'], ['realisasi', 'Realisasi']]) },
      { id: 'penutup', t: 'VI. Penutup', def: `Demikian laporan pelaksanaan pengelolaan risiko ${opdName()} tahun ${y}. Seluruh kertas kerja (Form 2 s.d. Form 10) terlampir dan dapat dicetak dari aplikasi PERISAI.` },
    ];
  }

  function sectionsF12(y, per) {
    const d = draftCommon(y);
    const tws = PERIODE[per];
    const plan = rtpRows(y, tws);
    const gap = gapRows(y, tws);
    return [
      { h: 'I. Pendahuluan' },
      { id: 'latar', t: 'A. Latar Belakang', def: d.latar.replace('Laporan ini disusun', `Laporan berkala ${per} ini disusun`) },
      { id: 'dasar', t: 'B. Dasar Hukum', def: d.dasar },
      { id: 'maksud', t: 'C. Maksud dan Tujuan', def: d.maksud },
      { id: 'lingkup', t: 'D. Ruang Lingkup', def: d.lingkup + ` Periode laporan: ${per} ${y}.` },
      { h: 'II. Rencana dan Realisasi Kegiatan Pengelolaan Risiko' },
      { id: 'rencana', t: `A. Rencana Kegiatan ${per}`, def: `Terdapat ${plan.length} RTP dengan target penyelesaian pada ${per} ${y}.`, auto: () => tblRtp(y, 'rencana', tws) },
      { id: 'realisasi', t: `B. Realisasi Kegiatan ${per}`, def: 'Realisasi pelaksanaan RTP yang dicatat pemilik risiko pada periode ini adalah sebagai berikut.', auto: () => tblRealisasi(y, tws) },
      { id: 'hambatan', t: 'III. Hambatan Pelaksanaan Kegiatan', def: gap.length ? `Terdapat ${gap.length} RTP yang telah jatuh tempo namun belum selesai. Uraikan penyebab gap dan kendala pelaksanaannya.` : 'Tidak terdapat gap antara rencana dan realisasi RTP yang jatuh tempo pada periode ini.', auto: () => tblGap(y, tws) },
      { id: 'monitoring', t: 'IV. Monitoring Risiko dan RTP', def: 'Hasil monitoring atas keterjadian risiko dan pengomunikasian RTP pada periode ini, termasuk kebutuhan pemutakhiran risiko dan RTP untuk periode berikutnya.', auto: () => '<h3>Kejadian risiko</h3>' + tblEvents(y, tws) },
      { id: 'penutup', t: 'V. Penutup', def: `Demikian laporan berkala pengelolaan risiko ${opdName()} ${per} tahun ${y}, disampaikan kepada Bupati dengan tembusan kepada Sekretaris Daerah dan Unit Kepatuhan Internal (Pasal 21 ayat 6).` },
    ];
  }

  function reportKey(type, y, per) { return type === 'f11' ? `f11:${y}` : `f12:${per}:${y}`; }

  function buildDoc(type, y, per) {
    const key = reportKey(type, y, per);
    const saved = S.state.laporan[key] || {};
    const secs = type === 'f11' ? sectionsF11(y) : sectionsF12(y, per);
    const title = type === 'f11' ? `Laporan Pelaksanaan Pengelolaan Risiko` : `Laporan Berkala Pengelolaan Risiko ${per}`;
    const p = S.state.profil;
    const body = secs.map(s => {
      if (s.h) return `<h2>${esc(s.h)}</h2>`;
      const txt = saved[s.id] !== undefined ? saved[s.id] : s.def;
      return `<h3>${esc(s.t)}</h3>${txt ? txt.split(/\n{2,}/).map(par => `<p>${U.nl2br(par)}</p>`).join('') : ''}${s.auto ? s.auto() : ''}`;
    }).join('');
    return `<div class="doc">
      <div class="cover"><div style="text-align:right;font-size:10px">${type === 'f11' ? 'Form 11' : 'Form 12'}</div><h1>${esc(title)}</h1><p style="text-align:center">${esc(p.opd)}<br>${esc(p.pemda)}<br>Tahun ${y}</p></div>
      ${body}
      ${U.docFooter()}</div>`;
  }

  V.pelaporan = {
    label: 'Pelaporan',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M13 3v6h6M8 13h8M8 17h5"/></svg>',
    render(el, ctx) {
      const y = S.activeYear();
      const type = ctx.filter('type', 'f11');
      const per = PERIODE[ctx.filter('per', 'Semester I')] ? ctx.filter('per', 'Semester I') : 'Semester I';
      const key = reportKey(type, y, per);
      const saved = S.state.laporan[key] || {};
      const secs = type === 'f11' ? sectionsF11(y) : sectionsF12(y, per);
      el.innerHTML = `
        <div class="topbar"><div><div class="eyebrow">Pasal 21 &middot; Tahun ${y}</div><h2>Pelaporan Pengelolaan Risiko</h2>
          <p class="sub">Laporan pelaksanaan (Form 11) disusun setelah pengelolaan risiko; laporan berkala oleh Unit Pemilik Risiko (Form 12) disampaikan triwulanan dan tahunan kepada Bupati dengan tembusan Sekretariat Daerah dan Unit Kepatuhan Internal.</p></div>
          <div class="toolbar">${U.exportButtons('laporan', ['print', 'pdf', 'word'])}</div></div>
        <div class="filters">
          <select id="l-type" aria-label="Jenis laporan"><option value="f11" ${type === 'f11' ? 'selected' : ''}>Form 11 - Laporan Pelaksanaan Pengelolaan Risiko</option><option value="f12" ${type === 'f12' ? 'selected' : ''}>Form 12 - Laporan Berkala oleh UPR</option></select>
          ${type === 'f12' ? `<select id="l-per" aria-label="Periode">${Object.keys(PERIODE).map(k => `<option ${k === per ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>` : ''}
          <label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="l-final" ${saved.final ? 'checked' : ''}> Tandai laporan final</label>
          <span class="rowcount">${saved.diubah ? 'Disimpan ' + esc(new Date(saved.diubah).toLocaleString('id-ID')) : 'Belum disimpan (menampilkan draf otomatis)'}</span>
        </div>
        <div class="panel report-edit"><form id="l-form">
          ${secs.map(s => s.h ? `<h4>${esc(s.h)}</h4>` : `<div class="sec"><label class="small" for="ls-${s.id}"><b>${esc(s.t)}</b></label>
            <textarea id="ls-${s.id}" name="${s.id}" rows="${Math.min(10, Math.max(3, Math.ceil(((saved[s.id] !== undefined ? saved[s.id] : s.def) || '').length / 140) + 1))}" placeholder="${esc(s.ph || '')}">${esc(saved[s.id] !== undefined ? saved[s.id] : s.def)}</textarea>
            ${s.auto ? `<div class="auto doc">${s.auto()}</div>` : ''}</div>`).join('')}
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button type="submit" class="btn btn-primary">${icon('check')}Simpan laporan</button><button type="button" class="btn" id="l-reset">Kembalikan ke draf otomatis</button></div>
        </form></div>`;
      el.querySelector('#l-type').addEventListener('change', e => ctx.setFilter('type', e.target.value));
      const ps = el.querySelector('#l-per');
      if (ps) ps.addEventListener('change', e => ctx.setFilter('per', e.target.value));
      const form = el.querySelector('#l-form');
      const collect = () => { const o = {}; secs.forEach(s => { if (s.id) o[s.id] = form.elements[s.id].value; }); return o; };
      form.addEventListener('submit', e => { e.preventDefault(); S.setLaporan(key, { ...collect(), diubah: new Date().toISOString() }); U.toast('Laporan disimpan.'); });
      el.querySelector('#l-final').addEventListener('change', e => { S.setLaporan(key, { ...collect(), final: e.target.checked, diubah: new Date().toISOString() }); U.toast(e.target.checked ? 'Laporan ditandai final.' : 'Tanda final dicabut.'); });
      el.querySelector('#l-reset').addEventListener('click', () => U.confirmDialog('Kembalikan seluruh teks ke draf otomatis? Teks yang sudah Anda sunting akan hilang.', () => {
        const next = { ...(S.state.laporan[key] || {}) };
        secs.forEach(s => { if (s.id) delete next[s.id]; });
        S.state.laporan[key] = next; S.commit(); U.toast('Teks dikembalikan ke draf otomatis.');
      }, { yes: 'Kembalikan', danger: false }));
      // simpan teks yang belum disimpan sebelum ekspor agar dokumen sesuai layar
      el.querySelectorAll('[data-export]').forEach(b => b.addEventListener('click', () => {
        const cur = collect();
        const prev = S.state.laporan[key] || {};
        if (secs.some(s => s.id && cur[s.id] !== (prev[s.id] !== undefined ? prev[s.id] : s.def))) S.setLaporan(key, { ...cur, diubah: new Date().toISOString() });
      }, true));
    },
    exports: {
      laporan(kind, ctx) {
        const y = S.activeYear();
        const type = ctx.filter('type', 'f11');
        const per = ctx.filter('per', 'Semester I');
        const html = buildDoc(type, y, per);
        const name = `${type === 'f11' ? 'Form11_Laporan_Pelaksanaan' : 'Form12_Laporan_Berkala_' + per}_${S.state.profil.opdSingkat || 'OPD'}_${y}`;
        if (kind === 'print') U.printHtml(html, true); else if (kind === 'word') U.wordHtml(html, name, false); else U.pdfHtml(html, name, false);
      },
    },
  };
})();
