/**
 * PERISAI - Pemantauan APIP: evaluasi terpisah oleh Inspektorat (Pasal 20 ayat 4 Perbup 66/2023).
 * Indikator objektif dihitung dari data aplikasi; skor akhir tetap pertimbangan auditor (skala 1-5).
 */
(function () {
  'use strict';
  const S = window.PERISAI_STORE, U = window.PERISAI_UI, C = window.PERISAI_CONFIG;
  const { esc, icon, statusTag } = U;
  const V = (window.PERISAI_VIEWS = window.PERISAI_VIEWS || {});

  const TL = ['Belum Ditindaklanjuti', 'Dalam Proses', 'Selesai'];

  function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
  function suggest(p) { return p >= 90 ? 5 : p >= 75 ? 4 : p >= 50 ? 3 : p >= 25 ? 2 : 1; }

  /** Indikator objektif per kriteria untuk tahun yang dievaluasi. */
  function indicators(y) {
    const st = S.state;
    const rs = S.risksForYear(y);
    const attrs = ['pemilik', 'sebab', 'sumber', 'cuc', 'dampak'];
    const lengkap = rs.filter(r => attrs.every(a => String(r[a] || '').trim())).length;
    const dinilai = rs.filter(r => S.assessment(r, y).skor != null).length;
    const prio = S.priorityRisks(y);
    const rtp = S.rtpForYear(y);
    const prioRtp = prio.filter(p => rtp.some(t => t.riskId === p.r.id)).length;
    const rtpFull = rtp.filter(t => t.celah && t.pj && (t.target || t.targetTriwulan)).length;
    const selesai = rtp.filter(t => S.rtpStatus(t.id).status === 'Selesai').length;
    const dimonitor = rtp.filter(t => st.rtpProgress.some(p => p.rtpId === t.id)).length;
    const infokom = st.infokom.filter(x => Number(x.tahun) === y);
    const rtpKom = rtp.filter(t => infokom.some(x => x.rtpId === t.id)).length;
    const pi = st.pemantauanPI.filter(x => Number(x.tahun) === y).length;
    const ev = st.events.filter(e => Number(e.tahun) === y).length;
    const lvl = ['RSP', 'RSO', 'ROO'].filter(l => st.konteks.some(k => k.level === l)).length;
    const prof = ['pemda', 'opd', 'urusan', 'kodeEntitas', 'tujuanStrategis'].filter(k => st.profil[k]).length;
    const lap = Object.keys(st.laporan || {}).filter(k => k.endsWith(':' + y) && st.laporan[k].final).length;
    const kP = pct(prof + lvl, 8), iP = pct(lengkap, rs.length), aP = pct(dinilai, rs.length);
    // cakupan diukur terhadap kebutuhan (risiko prioritas), bukan hanya RTP yang sudah ada,
    // agar satu RTP rapi tidak menghasilkan nilai tinggi saat puluhan risiko prioritas belum ditangani
    const basis = Math.max(rtp.length, prio.length);
    const rP = prio.length ? Math.round(pct(prioRtp, prio.length) * (rtp.length ? rtpFull / rtp.length : 0)) : (rs.length ? 100 : 0);
    const cP = pct(selesai, basis), fP = pct(rtpKom, basis), mP = pct(dimonitor, basis), lP = Math.min(100, lap * 50);
    return {
      konteks: { p: kP, text: `Profil ${prof}/5 terisi; konteks ${lvl}/3 tingkat (RSP/RSO/ROO) ditetapkan.` },
      identifikasi: { p: iP, text: `${rs.length} risiko; ${lengkap} (${iP}%) beratribut lengkap.` },
      analisis: { p: aP, text: `${dinilai} dari ${rs.length} risiko (${aP}%) dinilai; ${prio.length} risiko prioritas.` },
      rtp: { p: rP, text: `${prioRtp}/${prio.length} risiko prioritas ber-RTP; ${rtpFull}/${rtp.length} RTP memuat celah, PJ, dan target.` },
      pengendalian: { p: cP, text: `${selesai} RTP berstatus Selesai dari kebutuhan ${basis} (${rtp.length} RTP, ${prio.length} risiko prioritas).` },
      infokom: { p: fP, text: `${infokom.length} baris Form 8; ${rtpKom} RTP dikomunikasikan dari kebutuhan ${basis}.` },
      pemantauan: { p: mP, text: `${dimonitor} RTP memiliki catatan monitoring dari kebutuhan ${basis}; ${pi} baris Form 9; ${ev} kejadian risiko dicatat.` },
      pelaporan: { p: lP, text: `${lap} laporan tahun ${y} ditandai final.` },
    };
  }

  function overall(ev) {
    const sc = C.KRITERIA_APIP.map(k => Number(ev.skor && ev.skor[k.id])).filter(n => n >= 1 && n <= 5);
    return sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : null;
  }
  function predikat(n) {
    if (n == null) return '-';
    return n >= 4.5 ? 'Sangat Baik' : n >= 3.5 ? 'Baik' : n >= 2.5 ? 'Cukup' : n >= 1.5 ? 'Kurang' : 'Sangat Kurang';
  }

  function renderList(el, ctx) {
    const list = S.state.apip.slice().sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));
    el.innerHTML = `
      <div class="topbar"><div><div class="eyebrow">Pengawasan &middot; Pasal 20 ayat (4)</div><h2>Pemantauan APIP (Evaluasi Terpisah)</h2>
        <p class="sub">Inspektorat Daerah menilai penerapan pengelolaan risiko Perangkat Daerah melalui audit, reviu, pemantauan, evaluasi, atau pengawasan lainnya. Indikator dihitung dari data PERISAI; skor akhir 1-5 ditetapkan auditor.</p></div>
        <div class="toolbar"><button type="button" class="btn btn-primary" id="ap-new">${icon('plus')}Evaluasi baru</button></div></div>
      <div class="callout info">${icon('alert')}<div>Evaluasi ini menilai data OPD yang sedang dimuat (${esc(S.state.profil.opd || '-')}). Untuk OPD lain, pulihkan berkas cadangan OPD tersebut lalu lakukan evaluasi.</div></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Tahun dievaluasi</th><th>Tanggal</th><th>Bentuk</th><th>Surat tugas</th><th>Tim</th><th class="center">Nilai</th><th>Predikat</th><th>Rekomendasi</th><th>Aksi</th></tr></thead><tbody>
      ${list.map(ev => { const n = overall(ev); const rek = ev.rekomendasi || []; return `<tr><td class="mono">${esc(ev.tahun)}</td><td class="nowrap">${esc(U.fmtDate(ev.tanggal))}</td><td>${esc(ev.jenis)}</td><td class="small">${esc(ev.nomorST)}</td><td class="small wrap">${esc(ev.tim)}</td>
        <td class="center"><b class="mono">${n != null ? n.toFixed(2) : '-'}</b></td><td>${esc(predikat(n))}</td><td class="small">${rek.length} (${rek.filter(r => r.status === 'Selesai').length} selesai)</td>
        <td class="nowrap"><button type="button" class="btn btn-sm" data-open="${esc(ev.id)}">Buka</button> <button type="button" class="icon-btn danger" data-del="${esc(ev.id)}" aria-label="Hapus" title="Hapus">${icon('trash')}</button></td></tr>`; }).join('') || U.emptyRow(9, 'Belum ada evaluasi terpisah.')}
      </tbody></table></div>`;
    el.querySelector('#ap-new').addEventListener('click', () => ctx.setSub('new'));
    el.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => ctx.setSub('ev:' + b.dataset.open)));
    el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => U.confirmDialog('Hapus evaluasi ini beserta rekomendasinya?', () => { S.remove('apip', b.dataset.del); U.toast('Evaluasi dihapus.'); })));
  }

  function renderEditor(el, ctx, id) {
    const ev = id ? S.get('apip', id) : { tahun: S.activeYear(), tanggal: new Date().toISOString().slice(0, 10), jenis: 'Evaluasi', skor: {}, catatan: {}, rekomendasi: [] };
    if (!ev) { ctx.setSub('list'); return; }
    const y = Number(ev.tahun);
    const ind = indicators(y);
    const rek = (ev.rekomendasi || []).map(r => ({ ...r }));
    el.innerHTML = `
      <div class="topbar"><div><div class="eyebrow">Evaluasi terpisah &middot; ${esc(S.state.profil.opd || '')}</div><h2>${id ? 'Hasil evaluasi' : 'Evaluasi baru'} tahun ${esc(y)}</h2>
        <p class="sub">Indikator di kolom kedua dihitung dari data tahun ${esc(y)} saat ini. Ubah tahun lalu simpan untuk menghitung ulang.</p></div>
        <div class="toolbar"><button type="button" class="btn" id="ap-back">Kembali</button>${id ? U.exportButtons('lhe', ['print', 'pdf', 'word']) : ''}<button type="button" class="btn btn-primary" id="ap-save">${icon('check')}Simpan evaluasi</button></div></div>
      <form id="ap-form" novalidate>
        <div class="panel"><h3>Identitas penugasan</h3>
          <div class="form-grid">
            <div class="field"><label for="ap-tahun">Tahun yang dievaluasi</label><select id="ap-tahun" name="tahun">${S.years().map(yy => `<option ${yy === y ? 'selected' : ''}>${yy}</option>`).join('')}</select></div>
            <div class="field"><label for="ap-tgl">Tanggal evaluasi</label><input type="date" id="ap-tgl" name="tanggal" value="${esc(ev.tanggal)}"></div>
            <div class="field"><label for="ap-jenis">Bentuk pengawasan</label><select id="ap-jenis" name="jenis">${C.JENIS_PENGAWASAN.map(j => `<option ${j === ev.jenis ? 'selected' : ''}>${esc(j)}</option>`).join('')}</select></div>
            <div class="field"><label for="ap-st">Nomor surat tugas</label><input id="ap-st" name="nomorST" value="${esc(ev.nomorST)}"></div>
            <div class="field full"><label for="ap-tim">Tim evaluasi (nama dan peran)</label><input id="ap-tim" name="tim" value="${esc(ev.tim)}" placeholder="mis. Pengendali Teknis ..., Ketua Tim ..., Anggota ..."></div>
          </div>
        </div>
        <div class="panel"><div class="panel-head"><div><h3>Penilaian per tahapan</h3><p class="desc">Skala 1 (sangat kurang) s.d. 5 (sangat baik). Saran skor dihitung dari persentase indikator.</p></div>
          <div class="center"><div class="big-score" id="ap-overall">-</div><div class="small muted" id="ap-pred"></div></div></div>
          ${C.KRITERIA_APIP.map(k => { const i = ind[k.id]; const sv = ev.skor && ev.skor[k.id]; return `<div class="crit-row">
            <div><div class="cn">${esc(k.nama)}</div><div class="ca">${esc(k.acuan)}</div><div class="cu">${esc(k.uraian)}</div></div>
            <div class="ind">${esc(i.text)}<div class="meter ${i.p >= 80 ? 'ok' : i.p >= 40 ? 'mid' : 'low'}"><i style="width:${i.p}%"></i></div><div class="small muted">Capaian ${i.p}%, saran skor <b>${suggest(i.p)}</b></div></div>
            <div><label class="small" for="sk-${k.id}">Skor auditor</label><select id="sk-${k.id}" name="skor.${k.id}" data-score><option value="">-</option>${[1, 2, 3, 4, 5].map(n => `<option ${Number(sv) === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
              <button type="button" class="link-btn small" data-suggest="${k.id}" data-val="${suggest(i.p)}">pakai saran</button></div>
            <div><label class="small" for="ct-${k.id}">Catatan / temuan</label><textarea id="ct-${k.id}" name="catatan.${k.id}" rows="2">${esc(ev.catatan && ev.catatan[k.id])}</textarea></div>
          </div>`; }).join('')}
        </div>
        <div class="panel"><h3>Simpulan</h3><textarea name="simpulan" rows="4" style="width:100%" aria-label="Simpulan">${esc(ev.simpulan)}</textarea></div>
        <div class="panel"><div class="panel-head"><div><h3>Rekomendasi dan tindak lanjut</h3><p class="desc">Pantau status tindak lanjut rekomendasi oleh Perangkat Daerah.</p></div><button type="button" class="btn btn-sm" id="ap-addrek">${icon('plus')}Tambah rekomendasi</button></div>
          <div class="table-wrap" style="max-height:none"><table class="data" style="min-width:760px"><thead><tr><th>No</th><th>Rekomendasi</th><th>Penanggung jawab</th><th>Target</th><th>Status tindak lanjut</th><th></th></tr></thead><tbody id="ap-rek"></tbody></table></div>
        </div>
      </form>`;

    const form = el.querySelector('#ap-form');
    const drawRek = () => {
      el.querySelector('#ap-rek').innerHTML = rek.map((r, i) => `<tr>
        <td class="center">${i + 1}</td><td><textarea data-rek="${i}" data-k="uraian" rows="2" style="width:100%" aria-label="Rekomendasi ${i + 1}">${esc(r.uraian)}</textarea></td>
        <td><input data-rek="${i}" data-k="pj" value="${esc(r.pj)}" aria-label="PJ"></td><td><input data-rek="${i}" data-k="target" value="${esc(r.target)}" list="dl-triwulan" aria-label="Target"></td>
        <td><select data-rek="${i}" data-k="status" aria-label="Status">${TL.map(s => `<option ${s === (r.status || TL[0]) ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></td>
        <td><button type="button" class="icon-btn danger" data-rmrek="${i}" aria-label="Hapus rekomendasi">${icon('trash')}</button></td></tr>`).join('') || U.emptyRow(6, 'Belum ada rekomendasi.');
    };
    drawRek();
    el.querySelector('#ap-rek').addEventListener('input', e => { const t = e.target.closest('[data-rek]'); if (t) rek[Number(t.dataset.rek)][t.dataset.k] = t.value; });
    el.querySelector('#ap-rek').addEventListener('change', e => { const t = e.target.closest('[data-rek]'); if (t) rek[Number(t.dataset.rek)][t.dataset.k] = t.value; });
    el.querySelector('#ap-rek').addEventListener('click', e => { const b = e.target.closest('[data-rmrek]'); if (b) { rek.splice(Number(b.dataset.rmrek), 1); drawRek(); } });
    el.querySelector('#ap-addrek').addEventListener('click', () => { rek.push({ uraian: '', pj: '', target: '', status: TL[0] }); drawRek(); });

    const recalc = () => {
      const sc = C.KRITERIA_APIP.map(k => Number(form.elements['skor.' + k.id].value)).filter(n => n >= 1);
      const n = sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : null;
      el.querySelector('#ap-overall').textContent = n != null ? n.toFixed(2) : '-';
      el.querySelector('#ap-pred').textContent = n != null ? `${predikat(n)} (${sc.length}/${C.KRITERIA_APIP.length} kriteria dinilai)` : 'belum dinilai';
    };
    form.addEventListener('change', e => { if (e.target.matches('[data-score]')) recalc(); });
    el.querySelectorAll('[data-suggest]').forEach(b => b.addEventListener('click', () => { form.elements['skor.' + b.dataset.suggest].value = b.dataset.val; recalc(); }));
    recalc();

    el.querySelector('#ap-back').addEventListener('click', () => ctx.setSub('list'));
    el.querySelector('#ap-save').addEventListener('click', () => {
      const skor = {}, catatan = {};
      C.KRITERIA_APIP.forEach(k => {
        const v = form.elements['skor.' + k.id].value;
        skor[k.id] = v ? Number(v) : null;
        catatan[k.id] = form.elements['catatan.' + k.id].value.trim();
      });
      const rec = {
        ...(id ? { id } : {}), tahun: Number(form.elements.tahun.value), tanggal: form.elements.tanggal.value, jenis: form.elements.jenis.value,
        nomorST: form.elements.nomorST.value.trim(), tim: form.elements.tim.value.trim(), skor, catatan,
        simpulan: form.elements.simpulan.value.trim(), rekomendasi: rek.filter(r => String(r.uraian || '').trim()),
      };
      if (!rec.tanggal) { U.toast('Isi tanggal evaluasi.', 'error'); return; }
      const saved = S.upsert('apip', rec, 'A');
      U.toast('Evaluasi disimpan.');
      if (!id) ctx.setSub('ev:' + saved.id);
    });
  }

  function lheHtml(ev) {
    const p = S.state.profil;
    const ind = indicators(Number(ev.tahun));
    const n = overall(ev);
    return `<div class="doc">
      <div class="cover"><h1>Laporan Hasil ${esc(ev.jenis)} atas Pengelolaan Risiko</h1><p style="text-align:center">${esc(p.opd)}<br>Tahun ${esc(ev.tahun)}</p></div>
      <table class="doc-meta"><tr><td>Nomor surat tugas</td><td>: ${esc(ev.nomorST || '-')}</td></tr><tr><td>Tanggal</td><td>: ${esc(U.fmtDate(ev.tanggal))}</td></tr><tr><td>Tim</td><td>: ${esc(ev.tim || '-')}</td></tr><tr><td>Dasar</td><td>: Pasal 20 ayat (4) Peraturan Bupati Buleleng Nomor 66 Tahun 2023</td></tr></table>
      <h2>A. Nilai penerapan pengelolaan risiko</h2>
      <p>Nilai rata-rata: <b>${n != null ? n.toFixed(2) : '-'}</b> dari skala 5,00 (predikat <b>${esc(predikat(n))}</b>).</p>
      <table class="dt"><thead><tr><th>No</th><th>Tahapan</th><th>Acuan</th><th>Indikator dari data</th><th>Skor</th><th>Catatan / temuan</th></tr></thead><tbody>
      ${C.KRITERIA_APIP.map((k, i) => `<tr><td class="center">${i + 1}</td><td>${esc(k.nama)}</td><td>${esc(k.acuan)}</td><td>${esc(ind[k.id].text)}</td><td class="center"><b>${esc((ev.skor && ev.skor[k.id]) || '-')}</b></td><td>${U.nl2br(ev.catatan && ev.catatan[k.id])}</td></tr>`).join('')}
      </tbody></table>
      <h2>B. Simpulan</h2><p>${U.nl2br(ev.simpulan || '-')}</p>
      <h2>C. Rekomendasi</h2>
      <table class="dt"><thead><tr><th>No</th><th>Rekomendasi</th><th>Penanggung jawab</th><th>Target</th><th>Status tindak lanjut</th></tr></thead><tbody>
      ${(ev.rekomendasi || []).map((r, i) => `<tr><td class="center">${i + 1}</td><td>${U.nl2br(r.uraian)}</td><td>${esc(r.pj)}</td><td>${esc(r.target)}</td><td>${esc(r.status)}</td></tr>`).join('') || '<tr><td colspan="5" class="center">Tidak ada rekomendasi</td></tr>'}
      </tbody></table>
      <div class="doc-sign"><div>Singaraja, ${esc(U.fmtDate(ev.tanggal))}<br>Inspektur Daerah Kabupaten Buleleng<br><br><br><br><b>(.................................)</b></div></div>
      <div class="doc-foot">Dicetak dari PERISAI (Pengelolaan Risiko Berbasis Aplikasi), Inspektorat Daerah Kabupaten Buleleng</div></div>`;
  }

  V.apip = {
    label: 'Pemantauan APIP', overall, indicators,
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>',
    render(el, ctx) {
      const sub = ctx.sub || 'list';
      if (sub === 'new') renderEditor(el, ctx, null);
      else if (sub.startsWith('ev:')) renderEditor(el, ctx, sub.slice(3));
      else renderList(el, ctx);
    },
    exports: {
      lhe(kind, ctx) {
        const id = (ctx.sub || '').slice(3);
        const ev = S.get('apip', id);
        if (!ev) return;
        const html = lheHtml(ev);
        const name = `LHE_Pengelolaan_Risiko_${S.state.profil.opdSingkat || 'OPD'}_${ev.tahun}`;
        if (kind === 'print') U.printHtml(html, true); else if (kind === 'word') U.wordHtml(html, name, false); else U.pdfHtml(html, name, false);
      },
    },
  };
})();
