/**
 * PERISAI - Kamus Risiko: nomenklatur risiko operasional umum Perangkat Daerah (BPKP),
 * sebagai referensi pemilik risiko agar identifikasi lebih lengkap (Karya Tulis PERISAI 3.1.2).
 */
(function () {
  'use strict';
  const S = window.PERISAI_STORE, U = window.PERISAI_UI;
  const { esc, icon, scoreBadge } = U;
  const V = (window.PERISAI_VIEWS = window.PERISAI_VIEWS || {});

  V.kamus = {
    label: 'Kamus Risiko',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    render(el, ctx) {
      const K = window.PERISAI_KAMUS || [];
      const cats = [...new Set(K.map(k => k.kategori))];
      const cat = ctx.filter('cat', '');
      const q = ctx.filter('q', '').toLowerCase();
      const used = new Set(S.state.risks.map(r => r.uraian.trim().toLowerCase()));
      const rows = K.filter(k => (!cat || k.kategori === cat) && (!q || k.nama.toLowerCase().includes(q)));
      el.innerHTML = `
        <div class="topbar"><div><div class="eyebrow">Referensi</div><h2>Kamus Risiko</h2>
          <p class="sub">${K.length} nomenklatur risiko operasional yang umum terjadi pada Perangkat Daerah (BPKP), lengkap dengan skor acuan kemungkinan (K) dan dampak (D). Skor dibaca dengan matriks SE Sekda. Gunakan sebagai referensi, lalu sesuaikan dengan kondisi OPD.</p></div>
          <div class="toolbar">${U.exportButtons('kamus', ['excel'])}</div></div>
        <div class="filters">
          <div class="search-wrap">${icon('search')}<input type="search" id="km-q" data-fk="km-q" placeholder="Cari nama risiko" value="${esc(ctx.filter('q', ''))}" aria-label="Cari kamus"></div>
          <span class="rowcount">${rows.length} dari ${K.length} entri</span>
        </div>
        <div class="filters" role="group" aria-label="Kategori">
          <button type="button" class="btn btn-sm ${!cat ? 'btn-primary' : ''}" data-cat="">Semua</button>
          ${cats.map(c => `<button type="button" class="btn btn-sm ${c === cat ? 'btn-primary' : ''}" data-cat="${esc(c)}">${esc(c)} <span class="mono">${K.filter(k => k.kategori === c).length}</span></button>`).join('')}
        </div>
        <div class="table-wrap"><table class="data" style="min-width:720px"><thead><tr><th>No</th><th>Kategori</th><th>Nama risiko</th><th class="center">K</th><th class="center">D</th><th class="center">Skor acuan</th><th></th></tr></thead><tbody>
        ${rows.map(k => `<tr><td class="mono">${k.no}</td><td><span class="tag">${esc(k.kategori)}</span></td><td class="wrap">${esc(k.nama)}${used.has(k.nama.trim().toLowerCase()) ? ' <span class="tag gold">sudah di register</span>' : ''}</td>
          <td class="center mono">${k.k}</td><td class="center mono">${k.d}</td><td class="center">${scoreBadge(S.score(k.d, k.k))}</td>
          <td><button type="button" class="btn btn-sm" data-use="${k.no}">${icon('plus')}Ke register</button></td></tr>`).join('') || U.emptyRow(7, 'Tidak ada yang cocok.')}
        </tbody></table></div>`;
      let t = null;
      el.querySelector('#km-q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => ctx.setFilter('q', e.target.value), 250); });
      el.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => ctx.setFilter('cat', b.dataset.cat)));
      el.querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', () => {
        const k = K.find(x => String(x.no) === b.dataset.use);
        V.identifikasi.openRisk(null, { level: 'ROO', kelompok: k.kategori === 'Risiko Fraud' ? 'Kecurangan/Fraud' : 'Operasional OPD', uraian: k.nama, d: k.d, k: k.k, _kamus: `${k.kategori}: ${k.nama}` });
      }));
    },
    exports: {
      kamus() {
        const K = window.PERISAI_KAMUS || [];
        U.excel([{ name: 'Kamus Risiko', title: 'Kamus Risiko (nomenklatur BPKP)', meta: [['Jumlah entri', K.length], ['Skor', 'Matriks SE Sekda Buleleng 2025']], head: ['No', 'Kategori', 'Nama Risiko', 'Kemungkinan', 'Dampak', 'Skor', 'Tingkat'], widths: [6, 20, 70, 11, 9, 7, 14],
          // sebagian entri kamus sumber tidak memiliki skor acuan: biarkan kosong
          rows: K.map(k => { const s = S.score(k.d, k.k); return [k.no, k.kategori, k.nama, k.k, k.d, s, s == null ? '' : S.bandOf(s).label]; }) }], 'Kamus_Risiko_PERISAI');
      },
    },
  };
})();
