/** PERISAI - Dashboard ringkasan pengelolaan risiko tahun aktif. */
(function () {
  'use strict';
  const S = window.PERISAI_STORE, U = window.PERISAI_UI, C = window.PERISAI_CONFIG;
  const { esc, icon, scoreBadge, levelTag, truncate } = U;
  const V = (window.PERISAI_VIEWS = window.PERISAI_VIEWS || {});

  function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
  function meterCls(p) { return p >= 80 ? 'ok' : p >= 40 ? 'mid' : 'low'; }

  /** Kelengkapan setiap tahap proses (Pasal 10) sebagai indikator kemajuan. */
  function flowStats(y) {
    const st = S.state;
    const rs = S.risksForYear(y);
    const dinilai = rs.filter(r => S.assessment(r, y).skor != null).length;
    const prio = S.priorityRisks(y);
    const rtp = S.rtpForYear(y);
    const prioWithRtp = prio.filter(p => rtp.some(t => t.riskId === p.r.id)).length;
    const rtpMonitored = rtp.filter(t => st.rtpProgress.some(p => p.rtpId === t.id)).length;
    const lvlKonteks = ['RSP', 'RSO', 'ROO'].filter(l => st.konteks.some(k => k.level === l)).length;
    const profilOk = ['pemda', 'opd', 'urusan', 'kodeEntitas', 'kodeUrusan'].filter(k => st.profil[k]).length;
    const attrs = ['pemilik', 'sebab', 'sumber', 'cuc', 'dampak'];
    const lengkap = rs.filter(r => attrs.every(a => String(r[a] || '').trim())).length;
    return {
      rs, dinilai, prio, rtp, prioWithRtp, rtpMonitored, lengkap,
      steps: [
        { n: 1, view: 'konteks', t: 'Penetapan Konteks', p: pct(profilOk + lvlKonteks, 8), info: `${lvlKonteks}/3 tingkat konteks, profil ${profilOk}/5` },
        { n: 2, view: 'identifikasi', t: 'Identifikasi Risiko', p: pct(lengkap, rs.length), info: `${lengkap}/${rs.length} risiko beratribut lengkap` },
        { n: 3, view: 'analisis', t: 'Analisis Risiko', p: pct(dinilai, rs.length), info: `${dinilai}/${rs.length} risiko dinilai ${y}` },
        { n: 4, view: 'analisis', sub: 'rtp', t: 'Rencana Tindak Pengendalian', p: pct(prioWithRtp, prio.length), info: `${prioWithRtp}/${prio.length} risiko prioritas ber-RTP` },
        { n: 5, view: 'monitoring', t: 'Monitoring Internal PD', p: pct(rtpMonitored, rtp.length), info: `${rtpMonitored}/${rtp.length} RTP sudah dimonitor` },
      ],
    };
  }

  V.dashboard = {
    label: 'Dashboard',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    render(el, ctx) {
      const y = S.activeYear();
      const st = S.state;
      const f = flowStats(y);
      const rtpDone = f.rtp.filter(t => S.rtpStatus(t.id).status === 'Selesai').length;
      const events = st.events.filter(e => Number(e.tahun) === y);
      const lastApip = st.apip.slice().sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')))[0];
      const apipScore = lastApip ? V.apip.overall(lastApip) : null;

      const counts = {}; C.BANDS.forEach(b => { counts[b.label] = 0; });
      let unscored = 0;
      f.rs.forEach(r => { const s = S.assessment(r, y).skor; if (s == null) unscored++; else counts[S.bandOf(s).label]++; });
      const maxCount = Math.max(1, ...Object.values(counts));

      const byKel = {};
      f.rs.forEach(r => { byKel[r.kelompok] = byKel[r.kelompok] || { n: 0, p: 0 }; byKel[r.kelompok].n++; if (S.needsHandling(S.assessment(r, y).skor)) byKel[r.kelompok].p++; });
      const maxKel = Math.max(1, ...Object.values(byKel).map(x => x.n));

      const top = f.prio.slice(0, 10);
      const rtpRisk = new Set(f.rtp.map(t => t.riskId));

      el.innerHTML = `
        <div class="topbar"><div><div class="eyebrow">Tahun penilaian ${y}</div><h2>Dashboard Pengelolaan Risiko</h2>
          <p class="sub">${esc(st.profil.opd || 'Profil OPD belum diisi')}. Periode Renstra ${esc(st.profil.periodeAwal)}-${esc(st.profil.periodeAkhir)}. Skala risiko mengikuti SE Sekda Buleleng 2025; selera risiko: skor ${C.SELERA_MIN_TANGANI} ke atas wajib ditangani.</p></div>
          <div class="toolbar">${U.exportButtons('ringkas', ['print', 'pdf'])}</div></div>

        ${!st.risks.length ? `<div class="callout info">${icon('alert')}<div>Belum ada risiko. Mulai dari <button class="link-btn" data-go="konteks">Penetapan Konteks</button>, lalu catat risiko di <button class="link-btn" data-go="identifikasi">Identifikasi Risiko</button>.</div></div>` : ''}

        <div class="grid-cards">
          <div class="card accent"><div class="lbl">Risiko teridentifikasi</div><div class="val">${f.rs.length}</div><div class="note">${['RSP', 'RSO', 'ROO'].map(l => `${l} ${f.rs.filter(r => r.level === l).length}`).join(' / ')}</div></div>
          <div class="card"><div class="lbl">Sudah dinilai ${y}</div><div class="val">${f.dinilai}<small> / ${f.rs.length}</small></div><div class="note">${unscored} risiko belum dinilai</div></div>
          <div class="card warn"><div class="lbl">Risiko prioritas</div><div class="val">${f.prio.length}</div><div class="note">Sedang s.d. Sangat Tinggi (skor &ge; ${C.SELERA_MIN_TANGANI})</div></div>
          <div class="card"><div class="lbl">RTP disusun</div><div class="val">${f.prioWithRtp}<small> / ${f.prio.length}</small></div><div class="note">${f.rtp.length} rencana tindak, ${rtpDone} selesai</div></div>
          <div class="card"><div class="lbl">Kejadian risiko ${y}</div><div class="val">${events.length}</div><div class="note">dicatat pada Form 10</div></div>
          <div class="card"><div class="lbl">Nilai evaluasi APIP</div><div class="val">${apipScore != null ? apipScore.toFixed(2) : '-'}<small>${apipScore != null ? ' / 5' : ''}</small></div><div class="note">${lastApip ? 'Evaluasi ' + esc(lastApip.tahun) + ', ' + esc(U.fmtDate(lastApip.tanggal)) : 'Belum ada evaluasi terpisah'}</div></div>
        </div>

        <div class="panel"><h3>Kemajuan alur pengelolaan risiko</h3>
          <p class="desc">Urutan tahapan mengikuti Pasal 10 dan 12 Perbup 66/2023. Klik tahap untuk membuka menunya.</p>
          <div class="flow">${f.steps.map(s => `<button type="button" class="flow-step" data-go="${s.view}" ${s.sub ? `data-sub="${s.sub}"` : ''}>
            <div class="n">TAHAP ${s.n}</div><div class="t">${esc(s.t)}</div><div class="p">${esc(s.info)}</div>
            <div class="meter ${meterCls(s.p)}" role="img" aria-label="${s.p}%"><i style="width:${s.p}%"></i></div></button>`).join('')}</div>
        </div>

        <div class="two-col">
          <div class="panel"><h3>Sebaran tingkat risiko ${y}</h3><p class="desc">Berdasarkan penilaian awal (Form 4) dan matriks 5x5 SE Sekda.</p>
            <div class="bars">${C.BANDS.slice().reverse().map(b => `<div class="bar-row"><span>${esc(b.label)}</span><div class="bar-track"><div class="bar-fill ${b.cls}" style="width:${(counts[b.label] / maxCount) * 100}%"></div></div><span class="mono">${counts[b.label]}</span></div>`).join('')}
            <div class="bar-row"><span class="muted">Belum dinilai</span><div class="bar-track"><div class="bar-fill navy" style="width:${(unscored / Math.max(maxCount, unscored)) * 100}%;opacity:.35"></div></div><span class="mono">${unscored}</span></div></div>
          </div>
          <div class="panel"><h3>Risiko per kelompok</h3><p class="desc">Jumlah risiko dan porsi yang wajib ditangani.</p>
            <div class="bars">${Object.entries(byKel).map(([k, v]) => `<div class="bar-row" title="${v.p} dari ${v.n} risiko wajib ditangani"><span>${esc(k)}</span><div class="bar-track"><div class="bar-fill navy" style="width:${(v.n / maxKel) * 100}%"></div></div><span class="mono">${v.n}</span></div>`).join('') || '<p class="muted">Belum ada data.</p>'}</div>
          </div>
        </div>

        <div class="panel"><div class="panel-head"><div><h3>Sepuluh risiko tertinggi ${y}</h3><p class="desc">Risiko prioritas dengan skor terbesar. Tandai mana yang belum memiliki RTP.</p></div>
          <button type="button" class="btn btn-sm" data-go="analisis" data-sub="prioritas">Lihat semua risiko prioritas</button></div>
          <div class="table-wrap"><table class="data"><thead><tr><th>Kode</th><th>Tingkat</th><th>Risiko</th><th>Pemilik</th><th class="center">Skor</th><th>RTP</th></tr></thead><tbody>
          ${top.map(({ r, a }) => `<tr><td class="mono nowrap">${esc(r.kode)}</td><td>${levelTag(r.level)}</td><td class="wrap">${esc(r.uraian)}</td><td class="wrap small">${esc(truncate(r.pemilik, 60))}</td><td class="center">${scoreBadge(a.skor)}</td>
            <td>${rtpRisk.has(r.id) ? '<span class="status st-done">Ada</span>' : `<button type="button" class="btn btn-sm" data-add-rtp="${esc(r.id)}">${icon('plus')}Susun RTP</button>`}</td></tr>`).join('') || U.emptyRow(6, 'Tidak ada risiko prioritas pada tahun ini.')}
          </tbody></table></div></div>`;

      el.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => ctx.go(b.dataset.go, b.dataset.sub)));
      el.querySelectorAll('[data-add-rtp]').forEach(b => b.addEventListener('click', () => V.analisis.openRtp(null, b.dataset.addRtp)));
    },
    exports: {
      ringkas(kind) {
        const y = S.activeYear();
        const f = flowStats(y);
        const p = S.state.profil;
        const html = `<div class="doc">
          ${U.docHeader('Ringkasan', 'Ringkasan Pengelolaan Risiko', 'Tahun ' + y)}
          <table class="dt"><thead><tr><th>Tahap</th><th>Capaian</th><th>Keterangan</th></tr></thead><tbody>
          ${f.steps.map(s => `<tr><td>${s.n}. ${esc(s.t)}</td><td class="center">${s.p}%</td><td>${esc(s.info)}</td></tr>`).join('')}</tbody></table>
          <h3>Risiko prioritas (${f.prio.length})</h3>
          <table class="dt"><thead><tr><th>No</th><th>Kode</th><th>Risiko</th><th>Pemilik</th><th>Skor</th></tr></thead><tbody>
          ${f.prio.map(({ r, a }, i) => `<tr><td class="center">${i + 1}</td><td>${esc(r.kode)}</td><td>${esc(r.uraian)}</td><td>${esc(r.pemilik)}</td><td class="center">${scoreBadge(a.skor)}</td></tr>`).join('')}</tbody></table>
          ${U.docFooter()}</div>`;
        if (kind === 'print') U.printHtml(html); else U.pdfHtml(html, `Ringkasan_Risiko_${p.opdSingkat || 'OPD'}_${y}`);
      },
    },
  };
})();
