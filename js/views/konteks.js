/**
 * PERISAI - Menu 1: Penetapan Konteks (Pasal 13-15 Perbup 66/2023; Form 2.a, 2.b, 2.c).
 * Profil OPD, konteks strategis/operasional, dan kriteria risiko dari SE Sekda.
 */
(function () {
  'use strict';
  const S = window.PERISAI_STORE, U = window.PERISAI_UI, C = window.PERISAI_CONFIG;
  const { esc, icon, levelTag } = U;
  const V = (window.PERISAI_VIEWS = window.PERISAI_VIEWS || {});
  const REF = window.PERISAI_REF || { entitas: [], urusan: [] };

  const SUBS = [
    { id: 'profil', label: 'Profil dan Periode' },
    { id: 'konteks', label: 'Konteks Risiko (Form 2)' },
    { id: 'kriteria', label: 'Kriteria Risiko (SE Sekda)' },
  ];

  function konteksLabel(k) {
    return [k.sasaran, k.program, k.kegiatan, k.subKegiatan].filter(Boolean).map(s => U.truncate(s, 70)).join(' / ') || '(tanpa uraian)';
  }

  /** Label konteks ringkas untuk pilihan dropdown di menu lain. */
  function konteksOptions(level) {
    return S.state.konteks.filter(k => !level || k.level === level).map(k => ({ value: k.id, label: `${k.level}: ${konteksLabel(k)}` }));
  }

  function fieldsFor(level) {
    const f = [{ name: 'level', label: 'Tingkat konteks', type: 'select', required: true, options: Object.keys(C.LEVELS).map(l => ({ value: l, label: `${l} - ${C.LEVELS[l].label} (${C.LEVELS[l].konteksForm})` })) }];
    f.push({ name: 'tahun', label: 'Tahun penetapan', type: 'number', min: 2000, max: 2100, required: true });
    f.push({ name: 'sumberData', label: 'Sumber data', placeholder: level === 'RSP' ? 'RPJMD ...' : level === 'RSO' ? 'Renstra Perangkat Daerah ...' : 'Renja / RKA-SKPD ...', full: true });
    f.push({ name: 'tujuan', label: 'Tujuan strategis', type: 'textarea', rows: 2, full: true });
    f.push({ name: 'sasaran', label: level === 'ROO' ? 'Sasaran kegiatan' : 'Sasaran strategis', type: 'textarea', rows: 2, full: true });
    f.push({ name: 'indikator', label: level === 'ROO' ? 'Indikator keluaran' : 'Indikator kinerja (IKU)', type: 'textarea', rows: 2, full: true });
    f.push({ name: 'program', label: 'Program', full: true });
    f.push({ name: 'kegiatan', label: 'Kegiatan', full: true });
    f.push({ name: 'subKegiatan', label: 'Sub kegiatan', full: true });
    return f;
  }

  function openKonteks(id, level) {
    const k = id ? S.get('konteks', id) : { level: level || 'RSO', tahun: S.activeYear() };
    U.formModal({
      title: id ? 'Ubah konteks risiko' : 'Tambah konteks risiko',
      intro: 'Konteks strategis Pemda mengacu RPJMD, konteks strategis OPD mengacu Renstra, konteks operasional mengacu RKA-SKPD (Pasal 14 ayat 3-5).',
      fields: fieldsFor(k.level), values: k, wide: true,
      onSubmit(v) {
        if (!v.sasaran && !v.program && !v.kegiatan && !v.tujuan) return 'Isi minimal tujuan, sasaran, program, atau kegiatan.';
        S.upsert('konteks', { ...(id ? { id } : {}), ...v }, 'K');
        U.toast(id ? 'Konteks diperbarui.' : 'Konteks ditambahkan.');
      },
    });
  }

  function renderProfil(body) {
    const p = S.state.profil;
    body.innerHTML = `
      <div class="panel"><h3>Profil Unit Pemilik Risiko</h3>
        <p class="desc">Profil ini dipakai pada kepala setiap kertas kerja dan untuk membentuk kode risiko (TINGKAT.TAHUN.URUSAN.ENTITAS.NOMOR, sesuai sheet "kode risiko").</p>
        <form id="profil-form" class="form-grid" novalidate>
          <div class="field full"><label for="p-pemda">Nama Pemda</label><input id="p-pemda" name="pemda" value="${esc(p.pemda)}"></div>
          <div class="field"><label for="p-ent">Entitas / OPD yang menilai</label><select id="p-ent" name="kodeEntitas"><option value="">Pilih OPD</option>${REF.entitas.map(e => `<option value="${esc(e.kode)}" ${e.kode === p.kodeEntitas ? 'selected' : ''}>${esc(e.kode)} - ${esc(e.nama)}</option>`).join('')}</select></div>
          <div class="field"><label for="p-opd">Nama OPD (lengkap)</label><input id="p-opd" name="opd" value="${esc(p.opd)}"></div>
          <div class="field"><label for="p-singkat">Nama singkat OPD</label><input id="p-singkat" name="opdSingkat" value="${esc(p.opdSingkat)}" placeholder="mis. Dinas Kominfosanti"></div>
          <div class="field"><label for="p-urusan">Urusan pemerintahan (jenis risiko)</label><select id="p-urusan" name="kodeUrusan">${REF.urusan.map(u => `<option value="${esc(u.kode)}" ${u.kode === p.kodeUrusan ? 'selected' : ''}>${esc(u.kode)} - ${esc(u.nama)}</option>`).join('')}</select></div>
          <div class="field"><label for="p-awal">Periode Renstra: tahun awal</label><input id="p-awal" name="periodeAwal" type="number" min="2000" max="2100" value="${esc(p.periodeAwal)}"></div>
          <div class="field"><label for="p-akhir">Periode Renstra: tahun akhir</label><input id="p-akhir" name="periodeAkhir" type="number" min="2000" max="2100" value="${esc(p.periodeAkhir)}"></div>
          <div class="field full"><label for="p-tujuan">Tujuan strategis OPD</label><textarea id="p-tujuan" name="tujuanStrategis" rows="2">${esc(p.tujuanStrategis)}</textarea></div>
          <div class="field"><label for="p-kepala">Nama Kepala OPD (penanda tangan)</label><input id="p-kepala" name="kepala" value="${esc(p.kepala)}"></div>
          <div class="field"><label for="p-nip">NIP Kepala OPD</label><input id="p-nip" name="nipKepala" value="${esc(p.nipKepala)}" inputmode="numeric"></div>
          <div class="full form-error" role="alert" hidden></div>
          <div class="full"><button type="submit" class="btn btn-primary">${icon('check')}Simpan profil</button></div>
        </form>
      </div>`;
    const form = body.querySelector('#profil-form');
    form.elements.kodeEntitas.addEventListener('change', e => {
      const ent = REF.entitas.find(x => x.kode === e.target.value);
      if (ent && !form.elements.opd.value.trim()) form.elements.opd.value = ent.nama;
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const g = n => form.elements[n].value.trim();
      const awal = Number(g('periodeAwal')), akhir = Number(g('periodeAkhir'));
      const err = form.querySelector('.form-error');
      if (!Number.isInteger(awal) || !Number.isInteger(akhir) || awal < 2000 || akhir < awal || akhir - awal > 9) {
        err.textContent = 'Periode Renstra tidak sah: tahun akhir harus sama atau setelah tahun awal, paling lama 10 tahun.';
        err.hidden = false; return;
      }
      const urus = REF.urusan.find(u => u.kode === g('kodeUrusan'));
      let tahunAktif = Number(S.state.profil.tahunAktif);
      if (tahunAktif < awal || tahunAktif > akhir) tahunAktif = Math.min(Math.max(new Date().getFullYear(), awal), akhir);
      S.setProfil({
        pemda: g('pemda'), kodeEntitas: g('kodeEntitas'), opd: g('opd'), opdSingkat: g('opdSingkat'),
        kodeUrusan: g('kodeUrusan'), urusan: urus ? urus.nama : S.state.profil.urusan,
        periodeAwal: awal, periodeAkhir: akhir, tahunAktif, tujuanStrategis: g('tujuanStrategis'),
        kepala: g('kepala'), nipKepala: g('nipKepala'),
      });
      U.toast('Profil disimpan.');
    });
  }

  function renderKonteks(body, ctx) {
    const lv = ctx.filter('lv', '');
    const rows = S.state.konteks.filter(k => !lv || k.level === lv);
    const riskCount = id => S.state.risks.filter(r => r.konteksId === id).length;
    const groups = ['RSP', 'RSO', 'ROO'].filter(l => !lv || l === lv);
    body.innerHTML = `
      <div class="filters">
        <select id="k-lv" aria-label="Filter tingkat"><option value="">Semua tingkat</option>${Object.keys(C.LEVELS).map(l => `<option value="${l}" ${l === lv ? 'selected' : ''}>${l} - ${esc(C.LEVELS[l].label)}</option>`).join('')}</select>
        <span class="rowcount">${rows.length} konteks</span>
      </div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Tingkat</th><th>Tujuan / Sasaran</th><th>Indikator</th><th>Program / Kegiatan / Sub kegiatan</th><th>Sumber data</th><th class="center">Risiko</th><th>Aksi</th></tr></thead><tbody>
      ${groups.map(l => {
        const g = rows.filter(k => k.level === l);
        if (!g.length) return '';
        return `<tr class="group"><td colspan="7">${esc(C.LEVELS[l].konteksForm)}: Penetapan konteks ${esc(C.LEVELS[l].label.replace('Risiko ', 'risiko '))} (dasar: ${esc(C.LEVELS[l].dasar)})</td></tr>` +
          g.map(k => `<tr><td>${levelTag(k.level)}<div class="small muted">${esc(k.tahun || '')}</div></td>
            <td class="wrap">${k.tujuan ? `<div class="small muted">${esc(U.truncate(k.tujuan, 90))}</div>` : ''}${esc(k.sasaran)}</td>
            <td class="wrap small">${esc(k.indikator)}</td>
            <td class="wrap">${[k.program, k.kegiatan, k.subKegiatan].filter(Boolean).map(esc).join('<br><span class="muted">&rsaquo;</span> ')}</td>
            <td class="small">${esc(k.sumberData)}</td><td class="center mono">${riskCount(k.id)}</td>
            <td>${U.actions(`data-edit="${esc(k.id)}"`, `data-del="${esc(k.id)}"`)}</td></tr>`).join('');
      }).join('') || U.emptyRow(7, 'Belum ada konteks. Tambahkan tujuan, sasaran, program, atau kegiatan yang akan dinilai risikonya.')}
      </tbody></table></div>`;
    body.querySelector('#k-lv').addEventListener('change', e => ctx.setFilter('lv', e.target.value));
    body.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openKonteks(b.dataset.edit)));
    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const n = riskCount(b.dataset.del);
      U.confirmDialog(`Hapus konteks ini?${n ? ` ${n} risiko yang terkait akan dilepas dari konteks (risikonya tetap ada).` : ''}`, () => { S.remove('konteks', b.dataset.del); U.toast('Konteks dihapus.'); });
    }));
  }

  function critTables() {
    const matrixRows = C.SKALA_KEMUNGKINAN.map(k => `<tr><td><b>${k.skor}</b> ${esc(k.label)}</td>${[1, 2, 3, 4, 5].map(d => { const s = C.MATRIX[k.skor][d]; return `<td class="sc ${S.bandOf(s).cls}">${s}</td>`; }).join('')}</tr>`).join('');
    return `
      <div class="panel"><h3>Tabel 1. Skala dampak risiko</h3>
        <div class="table-wrap" style="max-height:none"><table class="crit"><thead><tr><th>Kategori dampak</th><th>Skor</th><th>Keuangan</th><th>Kinerja</th><th>Reputasi</th><th>Hukum</th><th>Pelayanan</th></tr></thead><tbody>
        ${C.SKALA_DAMPAK.map(d => `<tr><td><b>${esc(d.label)}</b></td><td class="sc">${d.skor}</td><td>${esc(d.keuangan)}</td><td>${esc(d.kinerja)}</td><td>${esc(d.reputasi)}</td><td>${esc(d.hukum)}</td><td>${esc(d.pelayanan)}</td></tr>`).join('')}
        </tbody></table></div></div>
      <div class="two-col">
        <div class="panel"><h3>Tabel 2. Skala kemungkinan terjadinya risiko</h3>
          <table class="crit"><thead><tr><th>Tingkat kemungkinan</th><th>Skor</th><th>Uraian</th></tr></thead><tbody>
          ${C.SKALA_KEMUNGKINAN.map(k => `<tr><td><b>${esc(k.label)}</b></td><td class="sc">${k.skor}</td><td>${esc(k.uraian)}</td></tr>`).join('')}</tbody></table></div>
        <div class="panel"><h3>Tabel 3. Tingkat risiko dan selera risiko</h3>
          <table class="crit"><thead><tr><th>Tingkat risiko</th><th>Besaran</th><th>Warna</th><th>Selera risiko</th></tr></thead><tbody>
          ${C.BANDS.slice().reverse().map(b => `<tr><td class="${b.cls}"><b>${esc(b.label)} (${b.level})</b></td><td class="sc">${b.min} s.d. ${b.max}</td><td>${esc(b.warna)}</td><td>${b.min >= C.SELERA_MIN_TANGANI ? 'Harus ditangani untuk menurunkan tingkat risiko' : 'Dapat diterima, tidak perlu mitigasi'}</td></tr>`).join('')}</tbody></table></div>
      </div>
      <div class="panel"><h3>Tabel 4. Skala nilai risiko (matriks analisis risiko 5 x 5)</h3>
        <p class="desc">Besaran risiko dibaca dari matriks, bukan hasil perkalian dampak x kemungkinan. Contoh: dampak 3 dan kemungkinan 3 bernilai 14 (Sedang).</p>
        <div class="table-wrap" style="max-height:none;max-width:760px"><table class="crit"><thead><tr><th>Kemungkinan \\ Dampak</th>${C.SKALA_DAMPAK.slice().reverse().map(d => `<th class="center">${d.skor}<br><span style="font-weight:400">${esc(d.label)}</span></th>`).join('')}</tr></thead><tbody>${matrixRows}</tbody></table></div>
      </div>`;
  }

  V.konteks = {
    label: 'Penetapan Konteks', num: 1, konteksOptions, konteksLabel, openKonteks, critTables,
    render(el, ctx) {
      const sub = SUBS.some(s => s.id === ctx.sub) ? ctx.sub : 'profil';
      el.innerHTML = `
        <div class="topbar"><div><div class="eyebrow">Menu 1 &middot; Pasal 13-15</div><h2>Penetapan Konteks</h2>
          <p class="sub">Tahap awal pengelolaan risiko: menetapkan tujuan yang akan dinilai risikonya (RPJMD, Renstra, RKA-SKPD) serta kriteria dampak, kemungkinan, tingkat risiko, dan selera risiko.</p></div>
          <div class="toolbar">${sub === 'konteks' ? `<button type="button" class="btn btn-primary" id="k-add">${icon('plus')}Tambah konteks</button>${U.exportButtons('form2')}` : ''}${sub === 'kriteria' ? U.exportButtons('kriteria', ['print', 'pdf']) : ''}</div></div>
        <div class="subtabs" role="tablist">${SUBS.map(s => `<button type="button" role="tab" aria-selected="${s.id === sub}" class="${s.id === sub ? 'active' : ''}" data-sub="${s.id}">${esc(s.label)}${s.id === 'konteks' ? `<span class="cnt">${S.state.konteks.length}</span>` : ''}</button>`).join('')}</div>
        <div id="k-body"></div>`;
      el.querySelectorAll('[data-sub]').forEach(b => b.addEventListener('click', () => ctx.setSub(b.dataset.sub)));
      const body = el.querySelector('#k-body');
      if (sub === 'profil') renderProfil(body);
      else if (sub === 'konteks') { renderKonteks(body, ctx); el.querySelector('#k-add').addEventListener('click', () => openKonteks(null, ctx.filter('lv', '') || 'RSO')); }
      else body.innerHTML = critTables();
    },
    exports: {
      form2(kind) {
        const y = S.activeYear();
        const levels = ['RSP', 'RSO', 'ROO'];
        if (kind === 'excel') {
          U.excel(levels.map(l => ({
            name: C.LEVELS[l].konteksForm, form: C.LEVELS[l].konteksForm, title: 'Penetapan Konteks ' + C.LEVELS[l].label,
            head: ['No', 'Tujuan', 'Sasaran', 'Indikator', 'Program', 'Kegiatan', 'Sub Kegiatan', 'Sumber Data', 'Tahun'],
            widths: [5, 40, 40, 36, 32, 36, 36, 26, 7],
            rows: S.state.konteks.filter(k => k.level === l).map((k, i) => [i + 1, k.tujuan, k.sasaran, k.indikator, k.program, k.kegiatan, k.subKegiatan, k.sumberData, k.tahun]),
          })), `Form2_Penetapan_Konteks_${y}`);
          return;
        }
        const html = levels.map((l, idx) => {
          const rows = S.state.konteks.filter(k => k.level === l);
          return `<div class="doc ${idx ? 'page-break' : ''}">${U.docHeader(C.LEVELS[l].konteksForm, 'Penetapan Konteks ' + C.LEVELS[l].label)}
            <table class="dt"><thead><tr><th>No</th><th>Tujuan</th><th>Sasaran</th><th>Indikator</th><th>Program</th><th>Kegiatan / Sub Kegiatan</th><th>Sumber Data</th></tr></thead><tbody>
            ${rows.map((k, i) => `<tr><td class="center">${i + 1}</td><td>${esc(k.tujuan)}</td><td>${esc(k.sasaran)}</td><td>${esc(k.indikator)}</td><td>${esc(k.program)}</td><td>${esc([k.kegiatan, k.subKegiatan].filter(Boolean).join(' / '))}</td><td>${esc(k.sumberData)}</td></tr>`).join('') || '<tr><td colspan="7" class="center">Tidak ada data</td></tr>'}
            </tbody></table>${U.docFooter()}</div>`;
        }).join('');
        if (kind === 'print') U.printHtml(html); else U.pdfHtml(html, `Form2_Penetapan_Konteks_${y}`);
      },
      kriteria(kind) {
        const html = `<div class="doc"><h1>Kriteria Risiko Pemerintah Kabupaten Buleleng</h1><p style="text-align:center">SE Sekda Nomor 100.3.3.2/232.1/SEKT-ITDA/II/2025</p>${critTables()}</div>`;
        if (kind === 'print') U.printHtml(html); else U.pdfHtml(html, 'Kriteria_Risiko_SE_Sekda_2025');
      },
    },
  };
})();
