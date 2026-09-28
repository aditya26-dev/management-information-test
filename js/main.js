/**
 * PERISAI - router, navigasi samping, dan pengelolaan data (cadangan/pulihkan/atur ulang).
 */
(function () {
  'use strict';
  const S = window.PERISAI_STORE;
  const U = window.PERISAI_UI;
  const V = window.PERISAI_VIEWS;
  const C = window.PERISAI_CONFIG;
  const { esc, $, icon } = U;

  const NAV = [
    { group: 'Ringkasan', items: ['dashboard'] },
    { group: 'Proses Pengelolaan Risiko', items: ['konteks', 'identifikasi', 'analisis', 'monitoring'] },
    { group: 'Pengawasan dan Pelaporan', items: ['apip', 'pelaporan'] },
    { group: 'Referensi', items: ['kamus'] },
  ];

  const ui = loadUi();
  function loadUi() {
    let u = null;
    try { u = JSON.parse(localStorage.getItem(C.UI_KEY) || 'null'); } catch (e) { /* abaikan */ }
    return (u && typeof u === 'object') ? { view: u.view || 'dashboard', sub: u.sub || {}, f: u.f || {} } : { view: 'dashboard', sub: {}, f: {} };
  }
  function saveUi() { try { localStorage.setItem(C.UI_KEY, JSON.stringify(ui)); } catch (e) { /* abaikan */ } }

  /** Konteks yang diberikan ke setiap view. */
  const ctx = {
    get sub() { return ui.sub[ui.view]; },
    setSub(id) { ui.sub[ui.view] = id; saveUi(); render(); },
    filter(key, def) { const v = ui.f[ui.view + '.' + key]; return v === undefined ? def : v; },
    setFilter(key, val) { ui.f[ui.view + '.' + key] = val; saveUi(); render(); },
    go(view, sub) { navigate(view, sub); },
    rerender: () => render(),
  };

  function navigate(view, sub) {
    if (!V[view]) view = 'dashboard';
    U.closeOverlay();
    ui.view = view;
    if (sub) ui.sub[view] = sub;
    saveUi();
    if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
    render();
    const m = $('#view');
    m.scrollTop = 0;
    window.scrollTo(0, 0);
    m.focus({ preventScroll: true });
    $('#sidenav').classList.remove('open');
    $('#nav-toggle').setAttribute('aria-expanded', 'false');
  }

  function renderNav() {
    const nav = $('#navtabs');
    nav.innerHTML = NAV.map(g => `<div class="nav-group">${esc(g.group)}</div>` + g.items.map(id => {
      const v = V[id];
      const lead = v.num ? `<span class="num">${v.num}</span>` : `<span aria-hidden="true">${v.icon || ''}</span>`;
      return `<button type="button" data-view="${id}" class="${ui.view === id ? 'active' : ''}" ${ui.view === id ? 'aria-current="page"' : ''}>${lead}${esc(v.label)}</button>`;
    }).join('')).join('');
  }

  function renderSide() {
    const st = S.state;
    const y = S.activeYear();
    const sel = $('#year-select');
    sel.innerHTML = S.years().map(yy => `<option value="${yy}" ${yy === y ? 'selected' : ''}>${yy}</option>`).join('');
    $('#side-opd').textContent = st.profil.opd || 'Profil OPD belum diisi';
    $('#side-year').textContent = y;
    const rs = S.risksForYear(y);
    const dinilai = rs.filter(r => S.assessment(r, y).skor != null).length;
    const prio = S.priorityRisks(y);
    const rtpRisk = new Set(S.rtpForYear(y).map(t => t.riskId));
    $('#stat-total').textContent = rs.length;
    $('#stat-dinilai').textContent = dinilai;
    $('#stat-prioritas').textContent = prio.length;
    $('#stat-rtp').textContent = `${prio.filter(p => rtpRisk.has(p.r.id)).length}/${prio.length}`;
    $('#storage-warn').hidden = S.storageOk;
  }

  function render() {
    renderNav();
    renderSide();
    const v = V[ui.view];
    const el = $('#view');
    // pertahankan fokus kontrol sebaris (mis. pilihan skor) melewati render ulang
    const act = document.activeElement;
    const focusKey = act && el.contains(act) ? act.getAttribute('data-fk') : null;
    try {
      v.render(el, ctx);
      if (focusKey) {
        const again = el.querySelector(`[data-fk="${CSS.escape(focusKey)}"]`);
        if (again) {
          again.focus({ preventScroll: true });
          if (typeof again.setSelectionRange === 'function' && /^(text|search)$/.test(again.type)) {
            const n = again.value.length;
            try { again.setSelectionRange(n, n); } catch (e) { /* tipe input tanpa seleksi */ }
          }
        }
      }
    } catch (err) {
      console.error(err);
      el.innerHTML = `<div class="callout">${icon('alert')}<div><b>Halaman gagal ditampilkan.</b> ${esc(err.message)}. Data Anda tetap tersimpan. Coba muat ulang halaman atau pulihkan dari cadangan.</div></div>`;
    }
    document.title = `${v.label} - PERISAI`;
  }

  // ---------------- event global ----------------
  $('#navtabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-view]');
    if (b) navigate(b.dataset.view);
  });
  $('#year-select').addEventListener('change', e => { S.setProfil({ tahunAktif: Number(e.target.value) }); U.toast('Tahun aktif: ' + e.target.value); });
  $('#nav-toggle').addEventListener('click', () => {
    const open = $('#sidenav').classList.toggle('open');
    $('#nav-toggle').setAttribute('aria-expanded', String(open));
  });

  // ekspor didelegasikan ke view aktif: data-export="prefix:kind"
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-export]');
    if (!b) return;
    const [prefix, kind] = b.dataset.export.split(':');
    const v = V[ui.view];
    const fn = v.exports && v.exports[prefix];
    if (!fn) return;
    try { fn(kind, ctx); } catch (err) { console.error(err); U.toast('Ekspor gagal: ' + err.message, 'error'); }
  });

  $('#btn-backup').addEventListener('click', () => {
    const p = S.state.profil;
    const name = `PERISAI_${U.safeName(p.opdSingkat || p.opd || 'OPD')}_${new Date().toISOString().slice(0, 10)}.json`;
    U.download(new Blob([JSON.stringify(S.state, null, 1)], { type: 'application/json' }), name);
    U.toast('Cadangan data diunduh.');
  });

  $('#file-restore').addEventListener('change', e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { U.toast('Berkas terlalu besar (maks. 20 MB).', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      let d;
      try { d = JSON.parse(reader.result); } catch (err) { U.toast('Berkas bukan JSON yang sah.', 'error'); return; }
      const err = S.validate(d);
      if (err) { U.toast('Berkas ditolak: ' + err, 'error'); return; }
      U.confirmDialog(`Data saat ini akan diganti dengan isi berkas "${file.name}" (${d.risks.length} risiko, OPD: ${d.profil.opd || '-'}). Lanjutkan?`, () => {
        try { S.replaceAll(d); U.toast('Data berhasil dipulihkan.'); } catch (ex) { U.toast(ex.message, 'error'); }
      }, { title: 'Pulihkan data', yes: 'Ganti data' });
    };
    reader.onerror = () => U.toast('Berkas tidak dapat dibaca.', 'error');
    reader.readAsText(file);
  });

  $('#btn-reset').addEventListener('click', () => {
    const ov = U.openOverlay(`
      <div class="modal-head"><h3>Atur ulang data</h3><button type="button" class="close-x" aria-label="Tutup" data-close>&times;</button></div>
      <div class="modal-body"><p class="confirm-msg">Pilih titik awal baru. Tindakan ini mengganti seluruh data di peramban ini; unduh cadangan terlebih dahulu bila perlu.</p></div>
      <div class="modal-foot"><button type="button" class="btn" data-close>Batal</button>
      <button type="button" class="btn" data-act="seed">Muat contoh Kominfosanti 2026</button>
      <button type="button" class="btn btn-danger-solid" data-act="empty">Kosongkan semua</button></div>`, { small: true });
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', U.closeOverlay));
    ov.querySelector('[data-act="seed"]').addEventListener('click', () => { U.closeOverlay(); S.resetSeed(); U.toast('Data contoh Kominfosanti 2026 dimuat.'); });
    ov.querySelector('[data-act="empty"]').addEventListener('click', () => { U.closeOverlay(); S.resetEmpty(); navigate('konteks', 'profil'); U.toast('Data dikosongkan. Mulai dari profil OPD.'); });
  });

  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== ui.view && V[h]) navigate(h); });

  // ---------------- mulai ----------------
  S.load();
  S.subscribe(render);
  const h = location.hash.slice(1);
  if (h && V[h]) ui.view = h;
  if (!V[ui.view]) ui.view = 'dashboard';
  render();
})();
