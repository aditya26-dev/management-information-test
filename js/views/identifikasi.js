/**
 * PERISAI - Menu 2: Identifikasi Risiko (Pasal 16 Perbup 66/2023; Form 3.a, 3.b, 3.c).
 * Register risiko strategis Pemda, strategis OPD, dan operasional OPD dengan kamus risiko.
 */
(function () {
  'use strict';
  const S = window.PERISAI_STORE, U = window.PERISAI_UI, C = window.PERISAI_CONFIG;
  const { esc, icon, levelTag, scoreBadge, truncate } = U;
  const V = (window.PERISAI_VIEWS = window.PERISAI_VIEWS || {});

  const SUMBER = ['Internal', 'Eksternal', 'Internal dan Eksternal'];

  function optionsHtml(opts, current) {
    return opts.map(o => `<option value="${esc(o.value)}"${String(o.value) === String(current) ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
  }
  function kelompokOpts(level) { return C.KELOMPOK[level].map(k => ({ value: k, label: k })); }
  function konteksOpts(level) { return [{ value: '', label: '(tidak ditautkan)' }].concat(V.konteks.konteksOptions(level)); }

  /**
   * Formulir risiko. prefill dipakai saat mengambil dari kamus.
   * @param {string|null} id
   * @param {object} [prefill]
   */
  function openRisk(id, prefill) {
    const y = S.activeYear();
    const r = id ? S.get('risks', id) : { level: 'ROO', kelompok: 'Operasional OPD', tahunIdentifikasi: y, sumber: 'Internal', cuc: 'C', ...(prefill || {}) };
    const a = id ? S.assessment(r, y) : { d: prefill && prefill.d, k: prefill && prefill.k };
    let autoKode = !id;
    const values = { ...r, kode: id ? r.kode : S.nextCode(r.level, r.tahunIdentifikasi || y), d: a.d || '', k: a.k || '' };
    let prevLevel = r.level;

    U.formModal({
      title: id ? `Ubah risiko ${r.kode}` : 'Tambah risiko',
      wide: true,
      intro: prefill && prefill._kamus ? `Diambil dari kamus risiko BPKP: <b>${esc(prefill._kamus)}</b>. Lengkapi atribut sesuai kondisi OPD.` : '',
      values,
      fields: [
        { type: 'section', label: 'Tingkat dan konteks' },
        { name: 'level', label: 'Tingkat risiko', type: 'select', required: true, options: Object.keys(C.LEVELS).map(l => ({ value: l, label: `${l} - ${C.LEVELS[l].label} (${C.LEVELS[l].form})` })) },
        { name: 'kelompok', label: 'Kelompok', type: 'select', required: true, options: kelompokOpts(r.level) },
        { name: 'konteksId', label: 'Konteks (tujuan/sasaran/program/kegiatan)', type: 'select', full: true, options: konteksOpts(r.level) },
        { name: 'tahap', label: 'Tahap kegiatan', hint: '(khusus risiko operasional)', placeholder: 'mis. Perencanaan, Pelaksanaan, Pelaporan' },
        { name: 'indikator', label: 'Indikator kinerja / keluaran' },
        { type: 'section', label: 'Risiko' },
        { name: 'uraian', label: 'Uraian risiko', type: 'textarea', rows: 2, required: true, full: true, placeholder: 'Peristiwa yang dapat menghambat pencapaian tujuan' },
        { name: 'kode', label: 'Kode risiko', required: true, hint: '(otomatis, dapat diubah)' },
        { name: 'tahunIdentifikasi', label: 'Tahun identifikasi', type: 'number', min: 2000, max: 2100, required: true },
        { name: 'pemilik', label: 'Pemilik risiko', required: true, full: true, placeholder: 'Pihak/unit yang bertanggung jawab mengelola risiko' },
        { type: 'section', label: 'Sebab' },
        { name: 'sebab', label: 'Uraian sebab', type: 'textarea', rows: 3, full: true, hint: '(kategori: Man, Money, Method, Machine, Material)' },
        { name: 'sumber', label: 'Sumber', type: 'select', options: SUMBER },
        { name: 'cuc', label: 'C/UC', type: 'select', options: [{ value: 'C', label: 'C - dapat dikendalikan unit kerja' }, { value: 'UC', label: 'UC - tidak dapat dikendalikan' }], placeholder: '(belum ditentukan)' },
        { type: 'section', label: 'Dampak' },
        { name: 'dampak', label: 'Uraian dampak', type: 'textarea', rows: 3, full: true, hint: '(kategori: Keuangan, Kinerja, Reputasi, Hukum, Pelayanan)' },
        { name: 'pihakTerkena', label: 'Pihak yang terkena', full: true },
        { type: 'section', label: `Penilaian awal tahun ${y} (opsional, dapat diisi di menu Analisis)` },
        { name: 'd', label: 'Skala dampak', type: 'select', placeholder: '-', options: C.SKALA_DAMPAK.map(x => ({ value: x.skor, label: `${x.skor} - ${x.label}` })) },
        { name: 'k', label: 'Skala kemungkinan', type: 'select', placeholder: '-', options: C.SKALA_KEMUNGKINAN.map(x => ({ value: x.skor, label: `${x.skor} - ${x.label}` })) },
        { type: 'html', name: 'preview', html: '<div class="score-preview" id="risk-preview"></div>' },
      ],
      onInput(v, form) {
        if (v.level !== prevLevel) {
          form.elements.kelompok.innerHTML = optionsHtml(kelompokOpts(v.level), C.KELOMPOK[v.level][0]);
          form.elements.konteksId.innerHTML = optionsHtml(konteksOpts(v.level), '');
          if (autoKode) form.elements.kode.value = S.nextCode(v.level, v.tahunIdentifikasi || y);
          prevLevel = v.level;
        }
        const pv = form.querySelector('#risk-preview');
        const s = S.score(v.d, v.k);
        pv.innerHTML = s == null ? '<span class="muted">Pilih skala dampak dan kemungkinan untuk melihat besaran risiko.</span>'
          : `Besaran risiko: ${scoreBadge(s)} <span class="muted">${S.needsHandling(s) ? 'Di atas selera risiko: wajib ditangani (masuk risiko prioritas).' : 'Dalam selera risiko: dapat diterima.'}</span>`;
        form.elements.kode.oninput = () => { autoKode = false; };
      },
      onSubmit(v) {
        const kode = v.kode.toUpperCase();
        if (S.state.risks.some(x => x.kode === kode && x.id !== id)) return `Kode ${kode} sudah dipakai risiko lain.`;
        const rec = {
          ...(id ? { id } : {}), level: v.level, kelompok: v.kelompok, konteksId: v.konteksId, tahap: v.tahap,
          indikator: v.indikator, uraian: v.uraian, kode, tahunIdentifikasi: v.tahunIdentifikasi, pemilik: v.pemilik,
          sebab: v.sebab, sumber: v.sumber, cuc: v.cuc, dampak: v.dampak, pihakTerkena: v.pihakTerkena,
        };
        if (!id) rec.analisis = {};
        const saved = S.upsert('risks', rec, 'R');
        const d = v.d ? Number(v.d) : null, k = v.k ? Number(v.k) : null;
        const cur = S.assessment(saved, y);
        if (d !== cur.d || k !== cur.k) S.setAssessment(saved.id, y, { d, k });
        U.toast(id ? 'Risiko diperbarui.' : `Risiko ${kode} ditambahkan.`);
      },
    });
  }

  function deleteRisk(id) {
    const r = S.get('risks', id);
    const nRtp = S.state.rtp.filter(t => t.riskId === id).length;
    const nEv = S.state.events.filter(e => e.riskId === id).length;
    U.confirmDialog(`Hapus risiko ${r.kode}? ${nRtp || nEv ? `Ikut terhapus: ${nRtp} RTP beserta catatan monitoringnya dan ${nEv} kejadian risiko.` : ''} Penilaian seluruh tahun juga terhapus.`, () => {
      S.remove('risks', id); U.toast('Risiko dihapus.');
    });
  }

  /** Pemilih kamus risiko; memanggil openRisk dengan isian awal. */
  function openKamusPicker(level) {
    const K = window.PERISAI_KAMUS || [];
    const cats = [...new Set(K.map(k => k.kategori))];
    const ov = U.openOverlay(`
      <div class="modal-head"><h3>Ambil dari kamus risiko</h3><button type="button" class="close-x" aria-label="Tutup" data-close>&times;</button></div>
      <div class="modal-body">
        <p class="intro" style="margin-top:0">Kamus berisi ${K.length} nomenklatur risiko operasional umum Perangkat Daerah (BPKP). Skor K/D adalah acuan, sesuaikan dengan kondisi OPD.</p>
        <div class="filters"><div class="search-wrap">${icon('search')}<input type="search" id="kp-q" placeholder="Cari nama risiko" aria-label="Cari kamus"></div>
        <select id="kp-cat" aria-label="Kategori"><option value="">Semua kategori</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select><span class="rowcount" id="kp-count"></span></div>
        <div class="table-wrap" style="max-height:52vh"><table class="data" style="min-width:600px"><thead><tr><th>Kategori</th><th>Nama risiko</th><th class="center">K</th><th class="center">D</th><th class="center">Skor</th><th></th></tr></thead><tbody id="kp-body"></tbody></table></div>
      </div>`, { wide: true });
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', U.closeOverlay));
    const q = ov.querySelector('#kp-q'), cat = ov.querySelector('#kp-cat'), tb = ov.querySelector('#kp-body');
    const used = new Set(S.state.risks.map(r => r.uraian.trim().toLowerCase()));
    const draw = () => {
      const t = q.value.trim().toLowerCase();
      const rows = K.filter(k => (!cat.value || k.kategori === cat.value) && (!t || k.nama.toLowerCase().includes(t)));
      ov.querySelector('#kp-count').textContent = `${rows.length} entri`;
      tb.innerHTML = rows.slice(0, 300).map(k => `<tr><td><span class="tag">${esc(k.kategori.replace('Risiko ', ''))}</span></td><td class="wrap">${esc(k.nama)}${used.has(k.nama.trim().toLowerCase()) ? ' <span class="tag gold">sudah di register</span>' : ''}</td>
        <td class="center mono">${k.k}</td><td class="center mono">${k.d}</td><td class="center">${scoreBadge(S.score(k.d, k.k), false)}</td>
        <td><button type="button" class="btn btn-sm" data-pick="${k.no}">Gunakan</button></td></tr>`).join('') + (rows.length > 300 ? `<tr><td colspan="6" class="empty">Menampilkan 300 dari ${rows.length}. Persempit pencarian.</td></tr>` : '') || U.emptyRow(6, 'Tidak ada yang cocok.');
    };
    q.addEventListener('input', draw); cat.addEventListener('change', draw); draw();
    tb.addEventListener('click', e => {
      const b = e.target.closest('[data-pick]');
      if (!b) return;
      const k = K.find(x => String(x.no) === b.dataset.pick);
      U.closeOverlay();
      const lvl = level || 'ROO';
      openRisk(null, {
        level: lvl, kelompok: lvl === 'ROO' && k.kategori === 'Risiko Fraud' ? 'Kecurangan/Fraud' : C.KELOMPOK[lvl][0],
        uraian: k.nama, d: k.d, k: k.k, _kamus: `${k.kategori}: ${k.nama}`,
      });
    });
    setTimeout(() => q.focus(), 30);
  }

  function konteksCell(r) {
    const k = r.konteksId ? S.get('konteks', r.konteksId) : null;
    if (!k) return '<span class="muted small">-</span>';
    return [k.sasaran && `<div class="small">${esc(truncate(k.sasaran, 80))}</div>`, k.program && `<div class="small muted">${esc(truncate(k.program, 70))}</div>`, (k.kegiatan || k.subKegiatan) && `<div class="small muted">&rsaquo; ${esc(truncate(k.subKegiatan || k.kegiatan, 70))}</div>`].filter(Boolean).join('');
  }

  function filtered(ctx, level) {
    const kel = ctx.filter('kel', '');
    const q = ctx.filter('q', '').toLowerCase();
    return S.state.risks.filter(r => r.level === level && (!kel || r.kelompok === kel) &&
      (!q || [r.kode, r.uraian, r.sebab, r.dampak, r.pemilik, r.tahap].some(x => String(x || '').toLowerCase().includes(q))));
  }

  V.identifikasi = {
    label: 'Identifikasi Risiko', num: 2, openRisk, openKamusPicker, deleteRisk,
    render(el, ctx) {
      const level = C.LEVELS[ctx.sub] ? ctx.sub : 'RSO';
      const rows = filtered(ctx, level);
      const y = S.activeYear();
      const kel = ctx.filter('kel', '');
      const cols = level === 'ROO' ? 13 : 12;
      const incomplete = r => ['pemilik', 'sebab', 'sumber', 'cuc', 'dampak'].filter(a => !String(r[a] || '').trim());
      const groups = [...new Set(rows.map(r => r.kelompok))];

      el.innerHTML = `
        <div class="topbar"><div><div class="eyebrow">Menu 2 &middot; Pasal 16</div><h2>Identifikasi Risiko</h2>
          <p class="sub">Kertas kerja identifikasi risiko yang menghambat pencapaian tujuan: pemilik, sebab, sumber, sifat pengendalian (C/UC), dampak, dan pihak yang terkena.</p></div>
          <div class="toolbar"><button type="button" class="btn btn-primary" id="i-add">${icon('plus')}Tambah risiko</button>
          <button type="button" class="btn btn-gold" id="i-kamus">${icon('book')}Ambil dari kamus</button>${U.exportButtons('form3')}</div></div>
        <div class="subtabs" role="tablist">${Object.keys(C.LEVELS).map(l => `<button type="button" role="tab" aria-selected="${l === level}" class="${l === level ? 'active' : ''}" data-sub="${l}">${esc(C.LEVELS[l].form)} ${esc(C.LEVELS[l].label)}<span class="cnt">${S.state.risks.filter(r => r.level === l).length}</span></button>`).join('')}</div>
        <div class="filters">
          <div class="search-wrap">${icon('search')}<input type="search" id="i-q" data-fk="i-q" placeholder="Cari kode, uraian, sebab, dampak" value="${esc(ctx.filter('q', ''))}" aria-label="Cari risiko"></div>
          ${C.KELOMPOK[level].length > 1 ? `<select id="i-kel" aria-label="Filter kelompok"><option value="">Semua kelompok</option>${C.KELOMPOK[level].map(k => `<option ${k === kel ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>` : ''}
          <span class="rowcount">${rows.length} risiko</span>
        </div>
        <div class="table-wrap"><table class="data"><thead><tr>
          <th>No</th><th>Konteks</th><th>Indikator</th>${level === 'ROO' ? '<th>Tahap</th>' : ''}<th>Uraian risiko</th><th>Kode</th><th>Pemilik</th><th>Sebab</th><th>Sumber</th><th>C/UC</th><th>Dampak</th><th class="center">Skor ${y}</th><th>Aksi</th>
        </tr></thead><tbody>
        ${groups.map(g => (groups.length > 1 || level === 'ROO' ? `<tr class="group"><td colspan="${cols}">${esc(g)}</td></tr>` : '') + rows.filter(r => r.kelompok === g).map((r, i) => {
          const miss = incomplete(r);
          return `<tr>
            <td class="center">${i + 1}</td><td class="wrap">${konteksCell(r)}</td><td class="small wrap">${esc(truncate(r.indikator, 90))}</td>
            ${level === 'ROO' ? `<td class="small">${esc(r.tahap)}</td>` : ''}
            <td class="wrap"><b>${esc(r.uraian)}</b>${miss.length ? `<div class="small" style="color:var(--danger)">Belum diisi: ${esc(miss.join(', '))}</div>` : ''}</td>
            <td class="mono nowrap">${esc(r.kode)}${r.kodeOtomatis ? '<div class="small muted" title="Kode dibentuk aplikasi karena kertas kerja asal belum memberi kode">kode aplikasi</div>' : ''}</td>
            <td class="small wrap">${esc(truncate(r.pemilik, 60))}</td><td class="small wrap"><div class="clamp">${esc(r.sebab)}</div></td>
            <td class="small">${esc(r.sumber)}</td><td class="center mono">${esc(r.cuc)}</td><td class="small wrap"><div class="clamp">${esc(r.dampak)}</div></td>
            <td class="center">${scoreBadge(S.assessment(r, y).skor, false)}</td>
            <td>${U.actions(`data-edit="${esc(r.id)}"`, `data-del="${esc(r.id)}"`)}</td></tr>`;
        }).join('')).join('') || U.emptyRow(cols, 'Belum ada risiko pada tingkat ini.')}
        </tbody></table></div>`;

      el.querySelectorAll('[data-sub]').forEach(b => b.addEventListener('click', () => ctx.setSub(b.dataset.sub)));
      el.querySelector('#i-add').addEventListener('click', () => openRisk(null, { level, kelompok: kel || C.KELOMPOK[level][0] }));
      el.querySelector('#i-kamus').addEventListener('click', () => openKamusPicker(level));
      let t = null;
      el.querySelector('#i-q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => ctx.setFilter('q', e.target.value), 250); });
      const ks = el.querySelector('#i-kel');
      if (ks) ks.addEventListener('change', e => ctx.setFilter('kel', e.target.value));
      el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openRisk(b.dataset.edit)));
      el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteRisk(b.dataset.del)));
    },
    exports: {
      form3(kind, ctx) {
        const level = C.LEVELS[ctx.sub] ? ctx.sub : 'RSO';
        const L = C.LEVELS[level];
        const rows = S.state.risks.filter(r => r.level === level);
        const y = S.activeYear();
        const kctx = r => { const k = r.konteksId ? S.get('konteks', r.konteksId) : null; return k ? [k.sasaran, k.program, k.kegiatan, k.subKegiatan].filter(Boolean).join(' / ') : ''; };
        const isOp = level === 'ROO';
        const head = isOp ? ['No', 'Kegiatan', 'Indikator Keluaran', 'Tahap', 'Uraian Risiko', 'Kode Risiko', 'Pemilik', 'Uraian Sebab', 'Sumber', 'C/UC', 'Uraian Dampak', 'Pihak yang Terkena']
          : ['No', 'Tujuan/Sasaran Strategis/Program', 'Indikator Kinerja', 'Uraian Risiko', 'Kode Risiko', 'Pemilik', 'Uraian Sebab', 'Sumber', 'C/UC', 'Uraian Dampak', 'Pihak yang Terkena'];
        const toRow = (r, i) => isOp ? [i + 1, kctx(r), r.indikator, r.tahap, r.uraian, r.kode, r.pemilik, r.sebab, r.sumber, r.cuc, r.dampak, r.pihakTerkena]
          : [i + 1, kctx(r), r.indikator, r.uraian, r.kode, r.pemilik, r.sebab, r.sumber, r.cuc, r.dampak, r.pihakTerkena];
        if (kind === 'excel') {
          U.excel([{ name: L.form, form: L.form, title: 'Kertas Kerja Identifikasi ' + L.label, head, rows: rows.map(toRow), widths: head.map((h, i) => (i === 0 ? 5 : /Uraian|Tujuan|Kegiatan/.test(h) ? 42 : 20)) }], `${L.form.replace(' ', '')}_Identifikasi_${level}_${y}`);
          return;
        }
        const groups = [...new Set(rows.map(r => r.kelompok))];
        const html = `<div class="doc">${U.docHeader(L.form, 'Identifikasi ' + L.label)}
          <table class="dt"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>
          <tr class="cols">${head.map((h, i) => `<td>${String.fromCharCode(97 + i)}</td>`).join('')}</tr>
          ${groups.map(g => `<tr class="group"><td colspan="${head.length}">${esc(g)}</td></tr>` + rows.filter(r => r.kelompok === g).map((r, i) => `<tr>${toRow(r, i).map(c => `<td>${U.nl2br(c)}</td>`).join('')}</tr>`).join('')).join('')}
          </tbody></table>${U.docFooter()}</div>`;
        if (kind === 'print') U.printHtml(html); else U.pdfHtml(html, `${L.form.replace(' ', '')}_Identifikasi_${level}_${y}`);
      },
    },
  };
})();
