/**
 * PERISAI - Menu 3: Analisis Risiko (Pasal 17 Perbup 66/2023).
 * Form 4 (penilaian + evaluasi), Form 5 (risiko prioritas), Form 7 (RTP), peta risiko, tren Renstra.
 */
(function () {
  'use strict';
  const S = window.PERISAI_STORE, U = window.PERISAI_UI, C = window.PERISAI_CONFIG;
  const { esc, icon, levelTag, scoreBadge, statusTag, truncate } = U;
  const V = (window.PERISAI_VIEWS = window.PERISAI_VIEWS || {});

  const SUBS = [
    { id: 'penilaian', label: 'Penilaian (Form 4)' },
    { id: 'prioritas', label: 'Risiko Prioritas (Form 5)' },
    { id: 'rtp', label: 'RTP (Form 7)' },
    { id: 'peta', label: 'Peta Risiko' },
    { id: 'tren', label: 'Tren Renstra' },
  ];
  const ORDER = ['RSP', 'RSO', 'ROO'];

  function sortRisks(list) {
    const kelOrder = k => ['Strategis Pemda', 'Strategis OPD', 'Operasional OPD', 'Kecurangan/Fraud', 'Program Penunjang'].indexOf(k);
    return list.slice().sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level) || kelOrder(a.kelompok) - kelOrder(b.kelompok) || a.kode.localeCompare(b.kode, 'id', { numeric: true }));
  }

  function scaleSelect(riskId, field, val, label) {
    return `<select class="inline" data-assess="${esc(riskId)}" data-field="${field}" data-fk="as-${esc(riskId)}-${field}" aria-label="${esc(label)}">
      <option value="">-</option>${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${val === n ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  }

  function deltaHtml(a) {
    if (a.skor == null || a.skorEval == null) return '<span class="muted">-</span>';
    const d = a.skorEval - a.skor;
    if (d < 0) return `<span class="delta-down" title="Risiko turun">&darr; ${-d}</span>`;
    if (d > 0) return `<span class="delta-up" title="Risiko naik">&uarr; ${d}</span>`;
    return '<span class="delta-flat" title="Tetap">= 0</span>';
  }

  // ---------------- RTP ----------------
  /**
   * Formulir RTP (Form 7).
   * @param {string|null} id
   * @param {string} [riskId]
   */
  function openRtp(id, riskId) {
    const y = S.activeYear();
    const t = id ? S.get('rtp', id) : { riskId: riskId || '', tahun: y, targetTriwulan: 'IV' };
    const prio = S.priorityRisks(y);
    const prioIds = new Set(prio.map(p => p.r.id));
    const others = sortRisks(S.risksForYear(y).filter(r => !prioIds.has(r.id)));
    const opts = prio.map(({ r, a }) => ({ value: r.id, label: `[${a.skor}] ${r.kode} - ${truncate(r.uraian, 90)}` }))
      .concat(others.map(r => ({ value: r.id, label: `(non-prioritas) ${r.kode} - ${truncate(r.uraian, 80)}` })));
    U.formModal({
      title: id ? 'Ubah rencana tindak pengendalian' : 'Susun rencana tindak pengendalian',
      wide: true,
      intro: 'Form 7: penilaian atas kegiatan pengendalian yang ada dan yang masih dibutuhkan. RTP wajib untuk risiko dengan skor 12 ke atas (Sedang s.d. Sangat Tinggi).',
      values: t,
      fields: [
        { name: 'riskId', label: 'Risiko prioritas', type: 'select', required: true, full: true, options: opts, placeholder: 'Pilih risiko' },
        { type: 'html', name: 'riskinfo', html: '<div id="rtp-riskinfo" class="score-preview"></div>' },
        { name: 'pengendalianAda', label: 'Uraian pengendalian yang sudah ada', type: 'textarea', rows: 3, full: true, placeholder: 'SOP, kebijakan, sistem, atau praktik yang sudah berjalan' },
        { name: 'celah', label: 'Celah pengendalian', type: 'textarea', rows: 2, full: true, placeholder: 'Kelemahan pengendalian yang ada sehingga risiko masih tinggi' },
        { name: 'rencana', label: 'Rencana tindak pengendalian', type: 'textarea', rows: 3, full: true, required: true },
        { name: 'pj', label: 'Pemilik / penanggung jawab', required: true },
        { name: 'target', label: 'Target waktu penyelesaian', list: 'dl-triwulan', placeholder: 'mis. Triwulan II 2026' },
        { name: 'targetTriwulan', label: 'Triwulan target (untuk monitoring)', type: 'select', options: C.TRIWULAN.map(x => ({ value: x, label: 'Triwulan ' + x })) },
        { name: 'tahun', label: 'Tahun RTP', type: 'number', min: 2000, max: 2100, required: true },
        { name: 'indikatorKeluaran', label: 'Indikator keluaran RTP', type: 'textarea', rows: 2, full: true, placeholder: 'Bukti bahwa RTP terlaksana, mis. SK, SOP baru, laporan' },
      ],
      onInput(v, form) {
        const r = v.riskId ? S.get('risks', v.riskId) : null;
        const box = form.querySelector('#rtp-riskinfo');
        if (!r) { box.innerHTML = '<span class="muted">Pilih risiko untuk melihat sebab dan skornya.</span>'; return; }
        const a = S.assessment(r, v.tahun || y);
        box.innerHTML = `<div>${scoreBadge(a.skor)}</div><div class="small"><b>Sebab:</b> ${esc(truncate(r.sebab, 220)) || '-'}<br><b>Pemilik:</b> ${esc(r.pemilik)}</div>`;
        if (!form.elements.pj.value && r.pemilik) form.elements.pj.value = r.pemilik;
      },
      onSubmit(v) {
        S.upsert('rtp', { ...(id ? { id } : {}), ...v }, 'T');
        U.toast(id ? 'RTP diperbarui.' : 'RTP disusun.');
      },
    });
  }

  function deleteRtp(id) {
    const n = S.state.rtpProgress.filter(p => p.rtpId === id).length;
    U.confirmDialog(`Hapus RTP ini?${n ? ` ${n} catatan monitoring pelaksanaannya ikut terhapus.` : ''}`, () => { S.remove('rtp', id); U.toast('RTP dihapus.'); });
  }

  // ---------------- sub: penilaian ----------------
  function renderPenilaian(body, ctx) {
    const y = S.activeYear();
    const lv = ctx.filter('lv', ''), st = ctx.filter('st', ''), q = ctx.filter('q', '').toLowerCase();
    let rows = sortRisks(S.risksForYear(y)).filter(r => (!lv || r.level === lv) && (!q || (r.kode + ' ' + r.uraian).toLowerCase().includes(q)));
    rows = rows.filter(r => {
      const a = S.assessment(r, y);
      if (st === 'belum') return a.skor == null;
      if (st === 'prioritas') return S.needsHandling(a.skor);
      if (st === 'eval') return a.skor != null && a.skorEval == null;
      return true;
    });
    const years = S.years();
    const prevY = years.includes(y - 1) ? y - 1 : null;
    const groups = [...new Set(rows.map(r => r.level + '|' + r.kelompok))];

    body.innerHTML = `
      <div class="callout info">${icon('alert')}<div>Isi <b>skala dampak (D)</b> dan <b>skala kemungkinan (K)</b> dengan mengacu kriteria SE Sekda; besaran risiko dihitung dari matriks 5x5. Kolom <b>evaluasi</b> diisi pada akhir tahun setelah RTP berjalan untuk melihat efektivitas pengendalian.
        <button type="button" class="link-btn" data-go-kriteria>Lihat kriteria</button></div></div>
      <div class="filters">
        <div class="search-wrap">${icon('search')}<input type="search" id="a-q" data-fk="a-q" placeholder="Cari kode atau uraian" value="${esc(ctx.filter('q', ''))}" aria-label="Cari"></div>
        <select id="a-lv" aria-label="Tingkat"><option value="">Semua tingkat</option>${ORDER.map(l => `<option value="${l}" ${l === lv ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select id="a-st" aria-label="Status"><option value="">Semua status</option><option value="belum" ${st === 'belum' ? 'selected' : ''}>Belum dinilai</option><option value="prioritas" ${st === 'prioritas' ? 'selected' : ''}>Wajib ditangani</option><option value="eval" ${st === 'eval' ? 'selected' : ''}>Belum dievaluasi</option></select>
        ${prevY ? `<button type="button" class="btn btn-sm" id="a-roll">${icon('copy')}Salin nilai ${prevY} ke ${y}</button>` : ''}
        <span class="rowcount">${rows.length} risiko</span>
      </div>
      <div class="table-wrap"><table class="data"><thead><tr>
        <th>Kode</th><th>Risiko yang teridentifikasi</th><th class="center">D</th><th class="center">K</th><th class="center">Skala risiko</th>
        <th class="center">D eval</th><th class="center">K eval</th><th class="center">Skor evaluasi</th><th class="center">Perubahan</th><th>Catatan evaluasi</th>
      </tr></thead><tbody>
      ${groups.map(g => {
        const [l, kel] = g.split('|');
        return `<tr class="group"><td colspan="10">${esc(C.LEVELS[l].label)}${kel && kel !== C.KELOMPOK[l][0] ? ': ' + esc(kel) : ''}</td></tr>` +
          rows.filter(r => r.level === l && r.kelompok === kel).map(r => {
            const a = S.assessment(r, y);
            return `<tr><td class="mono nowrap">${esc(r.kode)}</td><td class="wrap">${esc(r.uraian)}</td>
              <td class="center">${scaleSelect(r.id, 'd', a.d, 'Skala dampak ' + r.kode)}</td><td class="center">${scaleSelect(r.id, 'k', a.k, 'Skala kemungkinan ' + r.kode)}</td>
              <td class="center">${scoreBadge(a.skor)}</td>
              <td class="center">${scaleSelect(r.id, 'dEval', a.dEval, 'Dampak evaluasi ' + r.kode)}</td><td class="center">${scaleSelect(r.id, 'kEval', a.kEval, 'Kemungkinan evaluasi ' + r.kode)}</td>
              <td class="center">${scoreBadge(a.skorEval)}</td><td class="center">${deltaHtml(a)}</td>
              <td><button type="button" class="btn btn-sm" data-note="${esc(r.id)}" title="${esc(a.catatan)}">${a.catatan ? 'Lihat' : 'Tulis'}</button></td></tr>`;
          }).join('');
      }).join('') || U.emptyRow(10, 'Tidak ada risiko yang cocok dengan filter.')}
      </tbody></table></div>`;

    body.querySelector('[data-go-kriteria]').addEventListener('click', () => ctx.go('konteks', 'kriteria'));
    let tq = null;
    body.querySelector('#a-q').addEventListener('input', e => { clearTimeout(tq); tq = setTimeout(() => ctx.setFilter('q', e.target.value), 250); });
    body.querySelector('#a-lv').addEventListener('change', e => ctx.setFilter('lv', e.target.value));
    body.querySelector('#a-st').addEventListener('change', e => ctx.setFilter('st', e.target.value));
    const roll = body.querySelector('#a-roll');
    if (roll) roll.addEventListener('click', () => U.confirmDialog(`Salin penilaian ${prevY} ke ${y} untuk risiko yang belum dinilai di ${y}? Nilai evaluasi ${prevY} dipakai bila ada; bila tidak, nilai awal ${prevY}. Nilai ${y} yang sudah ada tidak ditimpa.`, () => {
      const n = S.rollForward(prevY, y); U.toast(`${n} penilaian disalin ke ${y}.`);
    }, { title: 'Salin penilaian', yes: 'Salin', danger: false }));
    body.querySelectorAll('[data-assess]').forEach(sel => sel.addEventListener('change', () => {
      const v = sel.value === '' ? null : Number(sel.value);
      S.setAssessment(sel.dataset.assess, y, { [sel.dataset.field]: v });
    }));
    body.querySelectorAll('[data-note]').forEach(b => b.addEventListener('click', () => {
      const r = S.get('risks', b.dataset.note);
      U.formModal({
        title: `Catatan evaluasi ${r.kode} (${y})`, values: { catatan: S.assessment(r, y).catatan },
        fields: [{ name: 'catatan', label: 'Catatan efektivitas pengendalian / alasan perubahan skor', type: 'textarea', rows: 5, full: true }],
        onSubmit(v) { S.setAssessment(r.id, y, { catatan: v.catatan }); U.toast('Catatan disimpan.'); },
      });
    }));
  }

  // ---------------- sub: prioritas ----------------
  function renderPrioritas(body) {
    const y = S.activeYear();
    const prio = S.priorityRisks(y);
    const rtp = S.rtpForYear(y);
    body.innerHTML = `
      <p class="muted small" style="margin-top:0">Validasi risiko (Pasal 17 ayat 3 huruf b): risiko dengan besaran ${C.SELERA_MIN_TANGANI} ke atas melewati selera risiko dan wajib ditangani. Daftar ini terbentuk otomatis dari penilaian ${y}.</p>
      <div class="table-wrap"><table class="data"><thead><tr><th>No</th><th>Risiko prioritas</th><th>Kode</th><th class="center">Skala risiko</th><th>Pemilik</th><th>Penyebab</th><th>Dampak</th><th>RTP</th></tr></thead><tbody>
      ${ORDER.map(l => {
        const g = prio.filter(p => p.r.level === l);
        if (!g.length) return '';
        return `<tr class="group"><td colspan="8">${esc(C.LEVELS[l].label)} (${g.length})</td></tr>` + g.map(({ r, a }, i) => {
          const n = rtp.filter(t => t.riskId === r.id).length;
          return `<tr><td class="center">${i + 1}</td><td class="wrap"><b>${esc(r.uraian)}</b><div class="small muted">${esc(r.kelompok)}</div></td><td class="mono nowrap">${esc(r.kode)}</td>
            <td class="center">${scoreBadge(a.skor)}</td><td class="small wrap">${esc(truncate(r.pemilik, 60))}</td>
            <td class="small wrap"><div class="clamp">${esc(r.sebab)}</div></td><td class="small wrap"><div class="clamp">${esc(r.dampak)}</div></td>
            <td class="nowrap">${n ? `<span class="status st-done">${n} RTP</span> ` : ''}<button type="button" class="btn btn-sm" data-add-rtp="${esc(r.id)}">${icon('plus')}${n ? 'Tambah' : 'Susun RTP'}</button></td></tr>`;
        }).join('');
      }).join('') || U.emptyRow(8, `Belum ada risiko prioritas pada ${y}. Isi penilaian di tab Penilaian.`)}
      </tbody></table></div>`;
    body.querySelectorAll('[data-add-rtp]').forEach(b => b.addEventListener('click', () => openRtp(null, b.dataset.addRtp)));
  }

  // ---------------- sub: rtp ----------------
  function renderRtp(body) {
    const y = S.activeYear();
    const rtp = S.rtpForYear(y);
    const prio = S.priorityRisks(y);
    const without = prio.filter(p => !rtp.some(t => t.riskId === p.r.id));
    const riskOf = id => S.get('risks', id);
    const sorted = rtp.slice().sort((a, b) => {
      const ra = riskOf(a.riskId), rb = riskOf(b.riskId);
      return ORDER.indexOf(ra && ra.level) - ORDER.indexOf(rb && rb.level) || String(ra && ra.kode).localeCompare(String(rb && rb.kode), 'id', { numeric: true });
    });
    body.innerHTML = `
      ${without.length ? `<div class="callout">${icon('alert')}<div><b>${without.length} risiko prioritas belum memiliki RTP.</b> ${without.slice(0, 6).map(p => `<button type="button" class="link-btn" data-add-rtp="${esc(p.r.id)}">${esc(p.r.kode)}</button>`).join(', ')}${without.length > 6 ? ', dan lainnya (lihat tab Risiko Prioritas)' : ''}</div></div>` : ''}
      <div class="table-wrap"><table class="data"><thead><tr><th>No</th><th>Risiko prioritas</th><th>Kode</th><th class="center">Skor</th><th>Pengendalian yang sudah ada</th><th>Celah pengendalian</th><th>Rencana tindak pengendalian</th><th>Penanggung jawab</th><th>Target waktu</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
      ${sorted.map((t, i) => {
        const r = riskOf(t.riskId);
        const a = r ? S.assessment(r, y) : {};
        return `<tr><td class="center">${i + 1}</td><td class="wrap">${r ? esc(r.uraian) : '<span class="muted">(risiko terhapus)</span>'}</td><td class="mono nowrap">${esc(r ? r.kode : '')}</td>
          <td class="center">${scoreBadge(a.skor, false)}</td><td class="small wrap">${U.nl2br(t.pengendalianAda)}</td><td class="small wrap">${U.nl2br(t.celah)}</td>
          <td class="wrap">${U.nl2br(t.rencana)}</td><td class="small">${esc(t.pj)}</td><td class="small nowrap">${esc(t.target)}</td>
          <td>${statusTag(S.rtpStatus(t.id).status)}</td><td>${U.actions(`data-edit="${esc(t.id)}"`, `data-del="${esc(t.id)}"`)}</td></tr>`;
      }).join('') || U.emptyRow(11, `Belum ada RTP untuk ${y}.`)}
      </tbody></table></div>`;
    body.querySelectorAll('[data-add-rtp]').forEach(b => b.addEventListener('click', () => openRtp(null, b.dataset.addRtp)));
    body.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openRtp(b.dataset.edit)));
    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteRtp(b.dataset.del)));
  }

  // ---------------- sub: peta ----------------
  function petaHtml(y, mode, lv, selKey) {
    const rs = S.risksForYear(y).filter(r => !lv || r.level === lv);
    const cells = {};
    rs.forEach(r => {
      const a = S.assessment(r, y);
      const d = mode === 'eval' ? a.dEval : a.d, k = mode === 'eval' ? a.kEval : a.k;
      if (d && k) (cells[k + '-' + d] = cells[k + '-' + d] || []).push(r);
    });
    let html = `<div class="peta" role="grid" aria-label="Peta risiko ${y}"><div class="ax vert">Kemungkinan</div>`;
    C.SKALA_KEMUNGKINAN.forEach(kk => {
      html +=`<div class="lab">${kk.skor}. ${esc(kk.label)}</div>`;
      [1, 2, 3, 4, 5].forEach(d => {
        const s = C.MATRIX[kk.skor][d];
        const n = (cells[kk.skor + '-' + d] || []).length;
        const key = kk.skor + '-' + d;
        html += `<button type="button" class="cell ${S.bandOf(s).cls} ${n ? '' : 'zero'} ${selKey === key ? 'sel' : ''}" data-cell="${key}" aria-label="Kemungkinan ${kk.skor}, dampak ${d}, skor ${s}, ${n} risiko"><span class="sv">${s}</span><span class="cnt">${n}</span></button>`;
      });
    });
    html += `<div></div><div class="lab" style="background:none"></div>${C.SKALA_DAMPAK.slice().reverse().map(d => `<div class="lab center" style="text-align:center">${d.skor}. ${esc(d.label)}</div>`).join('')}`;
    html += `<div></div><div></div><div class="ax" style="grid-column: span 5">Dampak</div></div>`;
    return { html, cells };
  }

  function renderPeta(body, ctx) {
    const y = S.activeYear();
    const mode = ctx.filter('mode', 'awal'), lv = ctx.filter('lv', ''), sel = ctx.filter('cell', '');
    const { html, cells } = petaHtml(y, mode, lv, sel);
    const items = sel ? (cells[sel] || []) : [];
    const [sk, sd] = sel ? sel.split('-').map(Number) : [];
    body.innerHTML = `
      <div class="panel">
        <div class="filters">
          <div class="toggle-group" role="group" aria-label="Mode penilaian"><button type="button" data-mode="awal" class="${mode === 'awal' ? 'active' : ''}">Penilaian awal</button><button type="button" data-mode="eval" class="${mode === 'eval' ? 'active' : ''}">Evaluasi akhir tahun</button></div>
          <select id="p-lv" aria-label="Tingkat"><option value="">Semua tingkat</option>${ORDER.map(l => `<option value="${l}" ${l === lv ? 'selected' : ''}>${l} - ${esc(C.LEVELS[l].label)}</option>`).join('')}</select>
        </div>
        <div class="peta-wrap">${html}
          <div class="legend"><b>Tingkat risiko (SE Sekda)</b>${C.BANDS.slice().reverse().map(b => `<div class="lg-item"><span class="sw ${b.cls}"></span>${esc(b.label)} (${b.min}-${b.max})</div>`).join('')}
          <p class="small muted" style="margin:6px 0 0">Angka kecil di pojok sel adalah besaran risiko; angka besar adalah jumlah risiko. Klik sel untuk melihat daftarnya.</p></div>
        </div>
        ${sel ? `<h3 style="margin-top:16px">Kemungkinan ${sk}, dampak ${sd}: ${items.length} risiko</h3>
          <div class="table-wrap"><table class="data" style="min-width:600px"><thead><tr><th>Kode</th><th>Tingkat</th><th>Risiko</th><th>Pemilik</th></tr></thead><tbody>
          ${items.map(r => `<tr><td class="mono nowrap">${esc(r.kode)}</td><td>${levelTag(r.level)}</td><td class="wrap">${esc(r.uraian)}</td><td class="small">${esc(truncate(r.pemilik, 60))}</td></tr>`).join('') || U.emptyRow(4, 'Tidak ada risiko pada sel ini.')}
          </tbody></table></div>` : ''}
      </div>`;
    body.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => ctx.setFilter('mode', b.dataset.mode)));
    body.querySelector('#p-lv').addEventListener('change', e => ctx.setFilter('lv', e.target.value));
    body.querySelectorAll('[data-cell]').forEach(b => b.addEventListener('click', () => ctx.setFilter('cell', sel === b.dataset.cell ? '' : b.dataset.cell)));
  }

  // ---------------- sub: tren ----------------
  function renderTren(body, ctx) {
    const years = S.years();
    const lv = ctx.filter('lv', '');
    const rs = sortRisks(S.state.risks.filter(r => !lv || r.level === lv));
    const perYear = years.map(y => {
      const c = { total: 0 }; C.BANDS.forEach(b => { c[b.cls] = 0; });
      let sum = 0;
      S.risksForYear(y).filter(r => !lv || r.level === lv).forEach(r => { const s = S.assessment(r, y).skor; if (s != null) { c[S.bandOf(s).cls]++; c.total++; sum += s; } });
      return { y, c, avg: c.total ? sum / c.total : null };
    });
    const tracked = rs.filter(r => years.filter(y => S.assessment(r, y).skor != null).length >= 1);
    const improved = [], worsened = [];
    rs.forEach(r => {
      const sc = years.map(y => S.assessment(r, y).skor).filter(s => s != null);
      if (sc.length >= 2) { if (sc[sc.length - 1] < sc[0]) improved.push(r); else if (sc[sc.length - 1] > sc[0]) worsened.push(r); }
    });
    const spark = r => `<span class="spark" aria-hidden="true">${years.map(y => { const s = S.assessment(r, y).skor; return s == null ? '<i class="none"></i>' : `<i class="${S.bandOf(s).cls}" style="height:${Math.max(4, s)}px" title="${y}: ${s}"></i>`; }).join('')}</span>`;
    body.innerHTML = `
      <div class="filters"><select id="t-lv" aria-label="Tingkat"><option value="">Semua tingkat</option>${ORDER.map(l => `<option value="${l}" ${l === lv ? 'selected' : ''}>${l} - ${esc(C.LEVELS[l].label)}</option>`).join('')}</select>
        <span class="rowcount">Periode Renstra ${years[0]}-${years[years.length - 1]}</span></div>
      <div class="grid-cards">
        <div class="card"><div class="lbl">Risiko dengan riwayat</div><div class="val">${tracked.length}</div><div class="note">dinilai minimal satu tahun</div></div>
        <div class="card"><div class="lbl">Skor turun</div><div class="val" style="color:var(--b2)">${improved.length}</div><div class="note">tahun terakhir lebih rendah dari tahun pertama</div></div>
        <div class="card"><div class="lbl">Skor naik</div><div class="val" style="color:var(--b5)">${worsened.length}</div><div class="note">indikasi pengendalian belum berhasil</div></div>
      </div>
      <div class="panel"><h3>Sebaran tingkat risiko per tahun</h3><p class="desc">Riwayat penilaian awal (Form 4) sepanjang periode Renstra.</p>
        <div class="bars">${perYear.map(p => `<div class="bar-row" style="grid-template-columns:60px 1fr 150px"><span class="mono">${p.y}</span>
          <div class="stack" role="img" aria-label="${p.y}: ${p.c.total} risiko dinilai">${p.c.total ? C.BANDS.map(b => p.c[b.cls] ? `<i class="${b.cls}" style="width:${(p.c[b.cls] / p.c.total) * 100}%" title="${b.label}: ${p.c[b.cls]}"></i>` : '').join('') : ''}</div>
          <span class="small">${p.c.total ? `${p.c.total} dinilai, rerata ${p.avg.toFixed(1)}` : '<span class="muted">belum ada penilaian</span>'}</span></div>`).join('')}</div>
      </div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Kode</th><th>Risiko</th>${years.map(y => `<th class="center">${y}</th>`).join('')}<th>Tren</th></tr></thead><tbody>
      ${tracked.map(r => `<tr><td class="mono nowrap">${esc(r.kode)}</td><td class="wrap">${esc(truncate(r.uraian, 140))}</td>${years.map(y => `<td class="center">${scoreBadge(S.assessment(r, y).skor, false)}</td>`).join('')}<td>${spark(r)}</td></tr>`).join('') || U.emptyRow(years.length + 3, 'Belum ada penilaian.')}
      </tbody></table></div>`;
    body.querySelector('#t-lv').addEventListener('change', e => ctx.setFilter('lv', e.target.value));
  }

  // ---------------- ekspor ----------------
  function form4Rows(y) {
    return sortRisks(S.risksForYear(y)).map(r => ({ r, a: S.assessment(r, y) }));
  }

  V.analisis = {
    label: 'Analisis Risiko', num: 3, openRtp, sortRisks, petaHtml,
    render(el, ctx) {
      const sub = SUBS.some(s => s.id === ctx.sub) ? ctx.sub : 'penilaian';
      const y = S.activeYear();
      const counts = { prioritas: S.priorityRisks(y).length, rtp: S.rtpForYear(y).length };
      const exp = { penilaian: 'form4', prioritas: 'form5', rtp: 'form7', peta: 'peta' }[sub];
      el.innerHTML = `
        <div class="topbar"><div><div class="eyebrow">Menu 3 &middot; Pasal 17 &middot; Tahun ${y}</div><h2>Analisis Risiko</h2>
          <p class="sub">Penilaian dampak dan kemungkinan, penetapan risiko prioritas, penyusunan RTP, serta evaluasi penilaian. Riwayat tersimpan per tahun sepanjang periode Renstra.</p></div>
          <div class="toolbar">${sub === 'rtp' ? `<button type="button" class="btn btn-primary" id="an-add-rtp">${icon('plus')}Susun RTP</button>` : ''}${exp ? U.exportButtons(exp, exp === 'peta' ? ['print', 'pdf'] : ['print', 'excel', 'pdf']) : ''}</div></div>
        <div class="subtabs" role="tablist">${SUBS.map(s => `<button type="button" role="tab" aria-selected="${s.id === sub}" class="${s.id === sub ? 'active' : ''}" data-sub="${s.id}">${esc(s.label)}${counts[s.id] != null ? `<span class="cnt">${counts[s.id]}</span>` : ''}</button>`).join('')}</div>
        <div id="an-body"></div>`;
      el.querySelectorAll('[data-sub]').forEach(b => b.addEventListener('click', () => ctx.setSub(b.dataset.sub)));
      const addRtp = el.querySelector('#an-add-rtp');
      if (addRtp) addRtp.addEventListener('click', () => openRtp(null));
      const body = el.querySelector('#an-body');
      ({ penilaian: renderPenilaian, prioritas: renderPrioritas, rtp: renderRtp, peta: renderPeta, tren: renderTren })[sub](body, ctx);
    },
    exports: {
      form4(kind) {
        const y = S.activeYear();
        const rows = form4Rows(y);
        const p = S.state.profil;
        const meta = [['Nama Pemda', p.pemda], ['Nama OPD', p.opd], ['Tahun Penilaian', y], ['Tujuan Strategis', p.tujuanStrategis], ['Urusan Pemerintahan', p.urusan]];
        if (kind === 'excel') {
          U.excel([{ name: 'Form 4', form: 'Form 4', title: 'Kertas Kerja Hasil Analisis Risiko', meta, head: ['No', 'Tingkat', 'Kelompok', 'Risiko yang Teridentifikasi', 'Kode Risiko', 'Skala Dampak', 'Skala Kemungkinan', 'Skala Risiko', 'Tingkat Risiko', 'D Evaluasi', 'K Evaluasi', 'Skor Evaluasi', 'Catatan'],
            widths: [5, 7, 18, 60, 17, 8, 8, 8, 14, 8, 8, 8, 40],
            rows: rows.map(({ r, a }, i) => [i + 1, r.level, r.kelompok, r.uraian, r.kode, a.d, a.k, a.skor, a.skor != null ? S.bandOf(a.skor).label : 'Belum dinilai', a.dEval, a.kEval, a.skorEval, a.catatan]) }], `Form4_Analisis_Risiko_${y}`);
          return;
        }
        const groups = [...new Set(rows.map(x => x.r.level + '|' + x.r.kelompok))];
        const html = `<div class="doc">${U.docHeader('Form 4', 'Hasil Analisis Risiko', '', meta)}
          <table class="dt"><thead><tr><th rowspan="2">No</th><th rowspan="2">Risiko yang Teridentifikasi</th><th rowspan="2">Kode Risiko</th><th colspan="3">Analisis Risiko</th><th colspan="3">Evaluasi</th></tr>
          <tr><th>Skala Dampak</th><th>Skala Kemungkinan</th><th>Skala Risiko</th><th>D</th><th>K</th><th>Skor</th></tr></thead><tbody>
          <tr class="cols"><td>a</td><td>b</td><td>c</td><td>d</td><td>e</td><td>f (matriks)</td><td>g</td><td>h</td><td>i</td></tr>
          ${groups.map(g => { const [l, kel] = g.split('|'); return `<tr class="group"><td colspan="9">${esc(C.LEVELS[l].label)}${kel !== C.KELOMPOK[l][0] ? ': ' + esc(kel) : ''}</td></tr>` + rows.filter(x => x.r.level === l && x.r.kelompok === kel).map(({ r, a }, i) => `<tr><td class="center">${i + 1}</td><td>${esc(r.uraian)}</td><td>${esc(r.kode)}</td><td class="center">${a.d || ''}</td><td class="center">${a.k || ''}</td><td class="center">${a.skor != null ? scoreBadge(a.skor, false) : ''}</td><td class="center">${a.dEval || ''}</td><td class="center">${a.kEval || ''}</td><td class="center">${a.skorEval != null ? scoreBadge(a.skorEval, false) : ''}</td></tr>`).join(''); }).join('')}
          </tbody></table>${U.docFooter()}</div>`;
        if (kind === 'print') U.printHtml(html); else U.pdfHtml(html, `Form4_Analisis_Risiko_${y}`);
      },
      form5(kind) {
        const y = S.activeYear();
        const prio = S.priorityRisks(y);
        const p = S.state.profil;
        const meta = [['Nama Pemda', p.pemda], ['Tahun Penilaian', y], ['Tujuan Strategis', p.tujuanStrategis], ['Urusan Pemerintahan', p.urusan]];
        if (kind === 'excel') {
          U.excel([{ name: 'Form 5', form: 'Form 5', title: 'Daftar Risiko Prioritas', meta, head: ['No', 'Tingkat', 'Risiko Prioritas', 'Kode Risiko', 'Skala Risiko', 'Tingkat Risiko', 'Pemilik Risiko', 'Penyebab', 'Dampak'], widths: [5, 7, 50, 17, 8, 13, 30, 50, 50],
            rows: prio.map(({ r, a }, i) => [i + 1, r.level, r.uraian, r.kode, a.skor, S.bandOf(a.skor).label, r.pemilik, r.sebab, r.dampak]) }], `Form5_Risiko_Prioritas_${y}`);
          return;
        }
        const html = `<div class="doc">${U.docHeader('Form 5', 'Daftar Risiko Prioritas', '', meta)}
          <table class="dt"><thead><tr><th>No</th><th>Risiko Prioritas</th><th>Kode Risiko</th><th>Skala Risiko</th><th>Pemilik Risiko</th><th>Penyebab</th><th>Dampak</th></tr></thead><tbody>
          <tr class="cols"><td>a</td><td>b</td><td>c</td><td>d</td><td>e</td><td>f</td><td>g</td></tr>
          ${ORDER.map(l => { const g = prio.filter(x => x.r.level === l); return g.length ? `<tr class="group"><td colspan="7">${esc(C.LEVELS[l].label)}</td></tr>` + g.map(({ r, a }, i) => `<tr><td class="center">${i + 1}</td><td>${esc(r.uraian)}</td><td>${esc(r.kode)}</td><td class="center">${scoreBadge(a.skor)}</td><td>${esc(r.pemilik)}</td><td>${U.nl2br(r.sebab)}</td><td>${U.nl2br(r.dampak)}</td></tr>`).join('') : ''; }).join('')}
          </tbody></table>${U.docFooter()}</div>`;
        if (kind === 'print') U.printHtml(html); else U.pdfHtml(html, `Form5_Risiko_Prioritas_${y}`);
      },
      form7(kind) {
        const y = S.activeYear();
        const p = S.state.profil;
        const meta = [['Nama Pemda', p.pemda], ['Tahun Penilaian', y], ['Tujuan Strategis', p.tujuanStrategis], ['Urusan Pemerintahan', p.urusan]];
        const rows = S.rtpForYear(y).map(t => ({ t, r: S.get('risks', t.riskId) })).filter(x => x.r);
        rows.sort((a, b) => ORDER.indexOf(a.r.level) - ORDER.indexOf(b.r.level) || a.r.kode.localeCompare(b.r.kode, 'id', { numeric: true }));
        if (kind === 'excel') {
          U.excel([{ name: 'Form 7', form: 'Form 7', title: 'Penilaian atas Kegiatan Pengendalian yang Ada dan Masih Dibutuhkan (RTP atas Hasil Identifikasi Risiko)', meta,
            head: ['No', 'Risiko Prioritas', 'Kode Risiko', 'Uraian Pengendalian yang Sudah Ada', 'Celah Pengendalian', 'Rencana Tindak Pengendalian', 'Pemilik/Penanggung Jawab', 'Target Waktu Penyelesaian', 'Indikator Keluaran', 'Status'], widths: [5, 45, 17, 40, 35, 45, 25, 18, 30, 16],
            rows: rows.map(({ t, r }, i) => [i + 1, r.uraian, r.kode, t.pengendalianAda, t.celah, t.rencana, t.pj, t.target, t.indikatorKeluaran, S.rtpStatus(t.id).status]) }], `Form7_RTP_${y}`);
          return;
        }
        const html = `<div class="doc">${U.docHeader('Form 7', 'Penilaian atas Kegiatan Pengendalian yang Ada dan Masih Dibutuhkan', '(RTP atas Hasil Identifikasi Risiko)', meta)}
          <table class="dt"><thead><tr><th>No</th><th>Risiko Prioritas</th><th>Kode Risiko</th><th>Uraian Pengendalian yang Sudah Ada</th><th>Celah Pengendalian</th><th>Rencana Tindak Pengendalian</th><th>Pemilik/ Penanggung Jawab</th><th>Target Waktu Penyelesaian</th></tr></thead><tbody>
          <tr class="cols"><td>a</td><td>b</td><td>c</td><td>d</td><td>e</td><td>f</td><td>g</td><td>h</td></tr>
          ${ORDER.map(l => { const g = rows.filter(x => x.r.level === l); return g.length ? `<tr class="group"><td colspan="8">${esc(C.LEVELS[l].label)}</td></tr>` + g.map(({ t, r }, i) => `<tr><td class="center">${i + 1}</td><td>${esc(r.uraian)}</td><td>${esc(r.kode)}</td><td>${U.nl2br(t.pengendalianAda)}</td><td>${U.nl2br(t.celah)}</td><td>${U.nl2br(t.rencana)}</td><td>${esc(t.pj)}</td><td>${esc(t.target)}</td></tr>`).join('') : ''; }).join('') || '<tr><td colspan="8" class="center">Belum ada RTP</td></tr>'}
          </tbody></table>${U.docFooter()}</div>`;
        if (kind === 'print') U.printHtml(html); else U.pdfHtml(html, `Form7_RTP_${y}`);
      },
      peta(kind, ctx) {
        const y = S.activeYear();
        const mode = ctx.filter('mode', 'awal');
        const html = `<div class="doc"><h1>Peta Risiko ${esc(S.state.profil.opdSingkat || S.state.profil.opd)} Tahun ${y}</h1><p style="text-align:center">${mode === 'eval' ? 'Evaluasi akhir tahun' : 'Penilaian awal'} &middot; matriks SE Sekda Buleleng 2025</p><div style="display:flex;justify-content:center">${petaHtml(y, mode, ctx.filter('lv', ''), '').html}</div>${U.docFooter()}</div>`;
        if (kind === 'print') U.printHtml(html); else U.pdfHtml(html, `Peta_Risiko_${y}`);
      },
    },
  };
})();
