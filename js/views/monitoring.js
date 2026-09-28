/**
 * PERISAI - Menu 4: Monitoring Internal Perangkat Daerah (Pasal 18-20 Perbup 66/2023).
 * Pelaksanaan RTP per triwulan, kejadian risiko (Form 10), pengkomunikasian (Form 8),
 * dan rencana/realisasi pemantauan pengendalian (Form 9).
 */
(function () {
  'use strict';
  const S = window.PERISAI_STORE, U = window.PERISAI_UI, C = window.PERISAI_CONFIG;
  const { esc, icon, levelTag, scoreBadge, statusTag, truncate } = U;
  const V = (window.PERISAI_VIEWS = window.PERISAI_VIEWS || {});

  const SUBS = [
    { id: 'rtp', label: 'Pelaksanaan RTP' },
    { id: 'kejadian', label: 'Kejadian Risiko' },
    { id: 'infokom', label: 'Pengkomunikasian (Form 8)' },
    { id: 'pemantauan', label: 'Rencana Pemantauan (Form 9)' },
  ];

  function rtpOptions(y) {
    return S.rtpForYear(y).map(t => { const r = S.get('risks', t.riskId); return { value: t.id, label: `${r ? r.kode : '?'} - ${truncate(t.rencana, 90)}` }; });
  }

  // ---------------- pelaksanaan RTP ----------------
  function openProgress(rtpId, tw) {
    const t = S.get('rtp', rtpId);
    const r = S.get('risks', t.riskId);
    const existing = S.state.rtpProgress.find(p => p.rtpId === rtpId && p.triwulan === tw);
    U.formModal({
      title: `Pelaksanaan RTP triwulan ${tw} ${t.tahun}`,
      intro: `<b>${esc(r ? r.kode : '')}</b> ${esc(truncate(r ? r.uraian : '', 120))}<br><b>RTP:</b> ${esc(t.rencana)}<br><b>Target:</b> ${esc(t.target || 'Triwulan ' + (t.targetTriwulan || '-'))}`,
      values: existing || { status: 'Dalam Proses' },
      fields: [
        { name: 'status', label: 'Status pelaksanaan', type: 'select', required: true, options: C.STATUS_RTP },
        { name: 'tanggal', label: 'Tanggal realisasi', type: 'date' },
        { name: 'realisasi', label: 'Realisasi pelaksanaan RTP', type: 'textarea', rows: 3, full: true, placeholder: 'Apa yang sudah dilakukan pada triwulan ini' },
        { name: 'bukti', label: 'Bukti dukung', full: true, placeholder: 'mis. SK Kadis No..., notulen rapat, tautan dokumen' },
        { name: 'keterangan', label: 'Keterangan / efektivitas / hambatan', type: 'textarea', rows: 2, full: true },
      ],
      onSubmit(v) {
        if (v.status === 'Selesai' && !v.bukti) return 'RTP berstatus Selesai wajib mencantumkan bukti dukung.';
        S.upsert('rtpProgress', { ...(existing ? { id: existing.id } : {}), rtpId, triwulan: tw, ...v }, 'P');
        U.toast('Pelaksanaan RTP dicatat.');
      },
    });
    if (existing) {
      const foot = document.querySelector('#overlay .modal-foot');
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'btn'; del.style.marginRight = 'auto'; del.style.color = 'var(--danger)';
      del.textContent = 'Hapus catatan triwulan ini';
      del.addEventListener('click', () => { U.closeOverlay(); S.remove('rtpProgress', existing.id); U.toast('Catatan dihapus.'); });
      foot.prepend(del);
    }
  }

  function renderRtp(body, ctx) {
    const y = S.activeYear();
    const rtp = S.rtpForYear(y).map(t => ({ t, r: S.get('risks', t.riskId) })).filter(x => x.r);
    rtp.sort((a, b) => a.r.kode.localeCompare(b.r.kode, 'id', { numeric: true }));
    const stf = ctx.filter('st', '');
    const rows = rtp.filter(x => !stf || S.rtpStatus(x.t.id).status === stf);
    const twIdx = C.TRIWULAN;
    const nowTw = Math.floor(new Date().getMonth() / 3);
    const overdue = x => {
      const target = twIdx.indexOf(x.t.targetTriwulan || 'IV');
      const st = S.rtpStatus(x.t.id).status;
      return st !== 'Selesai' && (y < new Date().getFullYear() || (y === new Date().getFullYear() && nowTw > target));
    };
    const nOver = rtp.filter(overdue).length;
    body.innerHTML = `
      <p class="muted small" style="margin-top:0">Catat realisasi setiap RTP per triwulan oleh pemilik risiko (Form 10, kolom RTP). Klik sel triwulan untuk mengisi. Status terakhir dipakai pada dashboard dan laporan.</p>
      ${nOver ? `<div class="callout">${icon('alert')}<div><b>${nOver} RTP melewati triwulan target</b> dan belum berstatus Selesai.</div></div>` : ''}
      <div class="filters"><select id="m-st" aria-label="Status"><option value="">Semua status</option>${C.STATUS_RTP.map(s => `<option ${s === stf ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select><span class="rowcount">${rows.length} RTP</span></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Kode</th><th>Risiko</th><th>Rencana tindak pengendalian</th><th>PJ</th><th>Target</th>${twIdx.map(t => `<th class="center">TW ${t}</th>`).join('')}<th>Status</th></tr></thead><tbody>
      ${rows.map(x => {
        const st = S.rtpStatus(x.t.id);
        return `<tr><td class="mono nowrap">${esc(x.r.kode)}</td><td class="wrap small">${esc(truncate(x.r.uraian, 110))}</td><td class="wrap">${esc(x.t.rencana)}</td><td class="small">${esc(x.t.pj)}</td>
          <td class="small nowrap">${esc(x.t.target || ('TW ' + (x.t.targetTriwulan || '')))}${overdue(x) ? '<div class="small" style="color:var(--danger)">lewat target</div>' : ''}</td>
          ${twIdx.map(tw => { const p = st.rows.find(q => q.triwulan === tw); return `<td class="center"><button type="button" class="btn btn-sm" data-prog="${esc(x.t.id)}" data-tw="${tw}" title="${esc(p ? p.realisasi : 'Belum dicatat')}">${p ? statusTag(p.status) : '<span class="muted">+ isi</span>'}</button></td>`; }).join('')}
          <td>${statusTag(st.status)}</td></tr>`;
      }).join('') || U.emptyRow(10, `Belum ada RTP ${y}. Susun RTP di menu Analisis Risiko.`)}
      </tbody></table></div>`;
    body.querySelector('#m-st').addEventListener('change', e => ctx.setFilter('st', e.target.value));
    body.querySelectorAll('[data-prog]').forEach(b => b.addEventListener('click', () => openProgress(b.dataset.prog, b.dataset.tw)));
  }

  // ---------------- kejadian risiko ----------------
  function openEvent(id) {
    const y = S.activeYear();
    const e = id ? S.get('events', id) : { tahun: y, tanggal: '' };
    const risks = V.analisis.sortRisks(S.risksForYear(y));
    U.formModal({
      title: id ? 'Ubah kejadian risiko' : 'Catat kejadian risiko (risk event)',
      intro: 'Form 10: pencatatan peristiwa risiko yang benar-benar terjadi pada tahun berjalan, untuk menilai keterjadian dan efektivitas pengendalian.',
      values: e,
      fields: [
        { name: 'riskId', label: 'Risiko yang teridentifikasi', type: 'select', required: true, full: true, placeholder: 'Pilih risiko', options: risks.map(r => ({ value: r.id, label: `${r.kode} - ${truncate(r.uraian, 100)}` })) },
        { name: 'tanggal', label: 'Tanggal terjadi', type: 'date', required: true },
        { name: 'tahun', label: 'Tahun', type: 'number', min: 2000, max: 2100, required: true },
        { name: 'sebab', label: 'Sebab kejadian', type: 'textarea', rows: 2, full: true, required: true },
        { name: 'dampak', label: 'Dampak yang timbul', type: 'textarea', rows: 2, full: true, required: true },
        { name: 'keterangan', label: 'Keterangan / tindakan segera', type: 'textarea', rows: 2, full: true },
      ],
      onSubmit(v) {
        if (v.tanggal && Number(v.tanggal.slice(0, 4)) !== Number(v.tahun)) return 'Tanggal terjadi tidak berada pada tahun yang dipilih.';
        S.upsert('events', { ...(id ? { id } : {}), ...v }, 'E');
        U.toast(id ? 'Kejadian diperbarui.' : 'Kejadian risiko dicatat.');
      },
    });
  }

  function renderKejadian(body) {
    const y = S.activeYear();
    const rows = S.state.events.filter(e => Number(e.tahun) === y).sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));
    body.innerHTML = `
      <div class="table-wrap"><table class="data"><thead><tr><th>No</th><th>Tanggal</th><th>Kode</th><th>Risiko yang teridentifikasi</th><th class="center">Skor ${y}</th><th>Sebab</th><th>Dampak</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody>
      ${rows.map((e, i) => { const r = S.get('risks', e.riskId); return `<tr><td class="center">${i + 1}</td><td class="nowrap">${esc(U.fmtDate(e.tanggal))}</td><td class="mono nowrap">${esc(r ? r.kode : '')}</td><td class="wrap">${esc(r ? r.uraian : '(risiko terhapus)')}</td>
        <td class="center">${r ? scoreBadge(S.assessment(r, y).skor, false) : ''}</td><td class="wrap small">${U.nl2br(e.sebab)}</td><td class="wrap small">${U.nl2br(e.dampak)}</td><td class="wrap small">${U.nl2br(e.keterangan)}</td>
        <td>${U.actions(`data-edit="${esc(e.id)}"`, `data-del="${esc(e.id)}"`)}</td></tr>`; }).join('') || U.emptyRow(9, `Belum ada kejadian risiko yang dicatat pada ${y}.`)}
      </tbody></table></div>`;
    body.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openEvent(b.dataset.edit)));
    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => U.confirmDialog('Hapus catatan kejadian risiko ini?', () => { S.remove('events', b.dataset.del); U.toast('Kejadian dihapus.'); })));
  }

  // ---------------- Form 8 & Form 9 ----------------
  const F8 = {
    coll: 'infokom', prefix: 'I', form: 'Form 8', title: 'Rencana dan Realisasi atas Pengkomunikasian Kegiatan Pengendalian yang Dibangun',
    cols: [['kegiatan', 'Kegiatan pengendalian yang dibutuhkan'], ['media', 'Media/bentuk sarana pengkomunikasian'], ['penyedia', 'Penyedia informasi'], ['penerima', 'Penerima informasi'], ['rencana', 'Rencana waktu pelaksanaan'], ['realisasi', 'Realisasi waktu pelaksanaan'], ['keterangan', 'Keterangan']],
    fields: [
      { name: 'media', label: 'Media/bentuk sarana pengkomunikasian', required: true, placeholder: 'Rapat, surat edaran, sosialisasi, unggah di situs resmi' },
      { name: 'penyedia', label: 'Penyedia informasi', required: true },
      { name: 'penerima', label: 'Penerima informasi', required: true, full: true },
    ],
  };
  const F9 = {
    coll: 'pemantauanPI', prefix: 'M', form: 'Form 9', title: 'Rencana dan Realisasi Pemantauan atas Kegiatan Pengendalian Intern yang Dibutuhkan',
    cols: [['kegiatan', 'Kegiatan pengendalian yang dibutuhkan'], ['metode', 'Bentuk/metode pemantauan'], ['pj', 'Penanggung jawab pemantauan'], ['rencana', 'Rencana waktu pemantauan'], ['realisasi', 'Realisasi waktu pelaksanaan'], ['keterangan', 'Keterangan']],
    fields: [
      { name: 'metode', label: 'Bentuk/metode pemantauan yang diperlukan', required: true, full: true, placeholder: 'Konfirmasi, reviu laporan pelaksanaan, pemantauan berkelanjutan' },
      { name: 'pj', label: 'Penanggung jawab pemantauan', required: true },
    ],
  };

  function openF(spec, id) {
    const y = S.activeYear();
    const rec = id ? S.get(spec.coll, id) : { tahun: y };
    U.formModal({
      title: (id ? 'Ubah ' : 'Tambah ') + spec.form, intro: esc(spec.title), values: rec,
      fields: [
        { name: 'rtpId', label: 'Terkait RTP', type: 'select', full: true, placeholder: '(tidak ditautkan)', options: rtpOptions(y) },
        { name: 'kegiatan', label: 'Kegiatan pengendalian yang dibutuhkan', type: 'textarea', rows: 2, full: true, hint: '(kosongkan untuk memakai rencana RTP)' },
        ...spec.fields,
        { name: 'rencana', label: 'Rencana waktu pelaksanaan', list: 'dl-triwulan', required: true },
        { name: 'realisasi', label: 'Realisasi waktu pelaksanaan', list: 'dl-triwulan' },
        { name: 'tahun', label: 'Tahun', type: 'number', min: 2000, max: 2100, required: true },
        { name: 'keterangan', label: 'Keterangan', type: 'textarea', rows: 2, full: true },
      ],
      onInput(v, form) {
        if (v.rtpId && !form.elements.kegiatan.value) {
          const t = S.get('rtp', v.rtpId);
          if (t) form.elements.kegiatan.placeholder = t.rencana;
        }
      },
      onSubmit(v) {
        if (!v.kegiatan) {
          const t = v.rtpId ? S.get('rtp', v.rtpId) : null;
          if (!t) return 'Isi kegiatan pengendalian atau pilih RTP terkait.';
          v.kegiatan = t.rencana;
        }
        S.upsert(spec.coll, { ...(id ? { id } : {}), ...v }, spec.prefix);
        U.toast(spec.form + ' disimpan.');
      },
    });
  }

  function renderF(body, spec) {
    const y = S.activeYear();
    const rows = S.state[spec.coll].filter(x => Number(x.tahun) === y);
    body.innerHTML = `
      <p class="muted small" style="margin-top:0">${esc(spec.title)} (${esc(spec.form)} Lampiran II Perbup 66/2023).</p>
      <div class="table-wrap"><table class="data"><thead><tr><th>No</th>${spec.cols.map(c => `<th>${esc(c[1])}</th>`).join('')}<th>Aksi</th></tr></thead><tbody>
      ${rows.map((x, i) => `<tr><td class="center">${i + 1}</td>${spec.cols.map(c => `<td class="${c[0] === 'kegiatan' || c[0] === 'keterangan' ? 'wrap' : 'small'}">${U.nl2br(x[c[0]])}</td>`).join('')}<td>${U.actions(`data-edit="${esc(x.id)}"`, `data-del="${esc(x.id)}"`)}</td></tr>`).join('') || U.emptyRow(spec.cols.length + 2, `Belum ada isian ${spec.form} untuk ${y}.`)}
      </tbody></table></div>`;
    body.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openF(spec, b.dataset.edit)));
    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => U.confirmDialog(`Hapus baris ${spec.form} ini?`, () => { S.remove(spec.coll, b.dataset.del); U.toast('Baris dihapus.'); })));
  }

  function exportF(spec, kind) {
    const y = S.activeYear();
    const p = S.state.profil;
    const meta = [['Nama Pemda', p.pemda], ['Tahun Pengelolaan', y], ['Tujuan Strategis', p.tujuanStrategis], ['Urusan Pemerintahan', p.urusan]];
    const rows = S.state[spec.coll].filter(x => Number(x.tahun) === y);
    const head = ['No'].concat(spec.cols.map(c => c[1]));
    if (kind === 'excel') {
      U.excel([{ name: spec.form, form: spec.form, title: spec.title, meta, head, rows: rows.map((x, i) => [i + 1].concat(spec.cols.map(c => x[c[0]]))), widths: [5].concat(spec.cols.map(c => (c[0] === 'kegiatan' || c[0] === 'keterangan' ? 45 : 24))) }], `${spec.form.replace(' ', '')}_${y}`);
      return;
    }
    const html = `<div class="doc">${U.docHeader(spec.form, spec.title, '', meta)}<table class="dt"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>
      <tr class="cols">${head.map((h, i) => `<td>${String.fromCharCode(97 + i)}</td>`).join('')}</tr>
      ${rows.map((x, i) => `<tr><td class="center">${i + 1}</td>${spec.cols.map(c => `<td>${U.nl2br(x[c[0]])}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${head.length}" class="center">Tidak ada data</td></tr>`}
      </tbody></table>${U.docFooter()}</div>`;
    if (kind === 'print') U.printHtml(html); else U.pdfHtml(html, `${spec.form.replace(' ', '')}_${y}`);
  }

  /** Form 10 gabungan: kejadian risiko + pelaksanaan RTP per risiko. */
  function form10Rows(y) {
    const risks = V.analisis.sortRisks(S.risksForYear(y));
    const out = [];
    risks.forEach(r => {
      const ev = S.state.events.filter(e => e.riskId === r.id && Number(e.tahun) === y);
      const rt = S.rtpForYear(y).filter(t => t.riskId === r.id);
      if (!ev.length && !rt.length) return;
      const n = Math.max(ev.length, rt.length);
      for (let i = 0; i < n; i++) {
        const e = ev[i] || {}, t = rt[i] || null;
        const st = t ? S.rtpStatus(t.id) : null;
        out.push({ r, first: i === 0, e, t, st });
      }
    });
    return out;
  }

  V.monitoring = {
    label: 'Monitoring Internal PD', num: 4,
    render(el, ctx) {
      const sub = SUBS.some(s => s.id === ctx.sub) ? ctx.sub : 'rtp';
      const y = S.activeYear();
      const counts = { rtp: S.rtpForYear(y).length, kejadian: S.state.events.filter(e => Number(e.tahun) === y).length, infokom: S.state.infokom.filter(x => Number(x.tahun) === y).length, pemantauan: S.state.pemantauanPI.filter(x => Number(x.tahun) === y).length };
      const addBtn = { kejadian: 'Catat kejadian', infokom: 'Tambah Form 8', pemantauan: 'Tambah Form 9' }[sub];
      const exp = { rtp: 'form10', kejadian: 'form10', infokom: 'form8', pemantauan: 'form9' }[sub];
      el.innerHTML = `
        <div class="topbar"><div><div class="eyebrow">Menu 4 &middot; Pasal 18-20 &middot; Tahun ${y}</div><h2>Monitoring Internal Perangkat Daerah</h2>
          <p class="sub">Pencatatan pelaksanaan RTP dan keterjadian risiko secara berkala oleh pemilik risiko, pengkomunikasian pengendalian, dan rencana pemantauannya.</p></div>
          <div class="toolbar">${addBtn ? `<button type="button" class="btn btn-primary" id="m-add">${icon('plus')}${esc(addBtn)}</button>` : ''}${U.exportButtons(exp)}</div></div>
        <div class="subtabs" role="tablist">${SUBS.map(s => `<button type="button" role="tab" aria-selected="${s.id === sub}" class="${s.id === sub ? 'active' : ''}" data-sub="${s.id}">${esc(s.label)}<span class="cnt">${counts[s.id]}</span></button>`).join('')}</div>
        <div id="m-body"></div>`;
      el.querySelectorAll('[data-sub]').forEach(b => b.addEventListener('click', () => ctx.setSub(b.dataset.sub)));
      const add = el.querySelector('#m-add');
      if (add) add.addEventListener('click', () => (sub === 'kejadian' ? openEvent(null) : openF(sub === 'infokom' ? F8 : F9, null)));
      const body = el.querySelector('#m-body');
      if (sub === 'rtp') renderRtp(body, ctx);
      else if (sub === 'kejadian') renderKejadian(body);
      else renderF(body, sub === 'infokom' ? F8 : F9);
    },
    form10Rows,
    exports: {
      form8: kind => exportF(F8, kind),
      form9: kind => exportF(F9, kind),
      form10(kind) {
        const y = S.activeYear();
        const p = S.state.profil;
        const meta = [['Nama Pemda', p.pemda], ['Tahun Pengelolaan', y], ['Tujuan Strategis', p.tujuanStrategis], ['Urusan Pemerintahan', p.urusan]];
        const rows = form10Rows(y);
        const real = st => (st && st.rows.length ? st.rows.map(q => `TW ${q.triwulan}: ${q.status}${q.tanggal ? ' (' + q.tanggal + ')' : ''}${q.realisasi ? ' - ' + q.realisasi : ''}`).join('\n') : '');
        const bukti = st => (st && st.rows.length ? st.rows.filter(q => q.bukti).map(q => `TW ${q.triwulan}: ${q.bukti}`).join('\n') : '');
        if (kind === 'excel') {
          U.excel([{ name: 'Form 10', form: 'Form 10', title: 'Pencatatan Kejadian Risiko (Risk Event) dan Pelaksanaan RTP', meta,
            head: ['No', 'Risiko yang Teridentifikasi', 'Kode Risiko', 'Tanggal Terjadi', 'Sebab', 'Dampak', 'Keterangan', 'RTP', 'Rencana Pelaksanaan RTP', 'Realisasi Pelaksanaan RTP', 'Status', 'Bukti Dukung'],
            widths: [5, 45, 17, 12, 30, 30, 25, 40, 18, 45, 16, 30],
            rows: rows.map((x, i) => [i + 1, x.first ? x.r.uraian : '', x.first ? x.r.kode : '', x.e.tanggal || '', x.e.sebab || '', x.e.dampak || '', x.e.keterangan || '', x.t ? x.t.rencana : '', x.t ? x.t.target : '', real(x.st), x.st ? x.st.status : '', bukti(x.st)]) }], `Form10_Kejadian_dan_RTP_${y}`);
          return;
        }
        const html = `<div class="doc">${U.docHeader('Form 10', 'Pencatatan Kejadian Risiko (Risk Event) dan Pelaksanaan RTP', '', meta)}
          <table class="dt"><thead><tr><th rowspan="2">No</th><th rowspan="2">Risiko yang Teridentifikasi</th><th rowspan="2">Kode Risiko</th><th colspan="3">Kejadian Risiko</th><th rowspan="2">Keterangan</th><th rowspan="2">RTP</th><th rowspan="2">Rencana Pelaksanaan RTP</th><th rowspan="2">Realisasi Pelaksanaan RTP</th><th rowspan="2">Bukti Dukung</th></tr>
          <tr><th>Tanggal terjadi</th><th>Sebab</th><th>Dampak</th></tr></thead><tbody>
          ${rows.map((x, i) => `<tr><td class="center">${i + 1}</td><td>${x.first ? esc(x.r.uraian) : ''}</td><td>${x.first ? esc(x.r.kode) : ''}</td><td>${esc(U.fmtDate(x.e.tanggal))}</td><td>${U.nl2br(x.e.sebab)}</td><td>${U.nl2br(x.e.dampak)}</td><td>${U.nl2br(x.e.keterangan)}</td><td>${x.t ? U.nl2br(x.t.rencana) : ''}</td><td>${x.t ? esc(x.t.target) : ''}</td><td>${U.nl2br(real(x.st))}</td><td>${U.nl2br(bukti(x.st))}</td></tr>`).join('') || '<tr><td colspan="11" class="center">Belum ada kejadian risiko maupun RTP</td></tr>'}
          </tbody></table>${U.docFooter()}</div>`;
        if (kind === 'print') U.printHtml(html); else U.pdfHtml(html, `Form10_Kejadian_dan_RTP_${y}`);
      },
    },
  };
})();
