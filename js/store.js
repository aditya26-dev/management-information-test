/**
 * PERISAI - penyimpanan data dan perhitungan turunan.
 * Data hidup di localStorage peramban ini; cadangan lewat berkas JSON.
 */
(function () {
  'use strict';
  const C = window.PERISAI_CONFIG;

  const COLLECTIONS = ['konteks', 'risks', 'rtp', 'events', 'rtpProgress', 'infokom', 'pemantauanPI', 'apip'];

  let state = null;
  let storageOk = true;
  const listeners = new Set();

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function emptyState() {
    const seed = window.PERISAI_SEED;
    return {
      versi: 1,
      profil: { ...clone(seed.profil), opd: '', opdSingkat: '', kodeEntitas: '', tujuanStrategis: '' },
      konteks: [], risks: [], rtp: [], events: [], rtpProgress: [], infokom: [], pemantauanPI: [], apip: [],
      laporan: {},
    };
  }

  /**
   * Validasi bentuk data hasil impor/penyimpanan. Menolak struktur asing
   * agar berkas JSON sembarang tidak merusak aplikasi.
   * @param {any} d
   * @returns {string|null} pesan galat atau null jika valid
   */
  function validate(d) {
    if (!d || typeof d !== 'object') return 'Berkas bukan objek data PERISAI.';
    if (d.versi !== 1) return 'Versi data tidak dikenali.';
    if (!d.profil || typeof d.profil !== 'object') return 'Bagian profil tidak ada.';
    for (const k of COLLECTIONS) {
      if (!Array.isArray(d[k])) return `Bagian "${k}" tidak ada atau bukan daftar.`;
    }
    for (const r of d.risks) {
      if (!r || typeof r.id !== 'string' || !C.LEVELS[r.level]) return 'Ada risiko dengan id atau tingkat tidak sah.';
    }
    return null;
  }

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(C.STORAGE_KEY); } catch (e) { storageOk = false; }
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (!validate(d)) { state = d; normalize(); return; }
      } catch (e) { /* rusak: jatuh ke seed */ }
    }
    state = clone(window.PERISAI_SEED);
    normalize();
    persist();
  }

  function normalize() {
    if (!state.laporan || typeof state.laporan !== 'object') state.laporan = {};
    state.risks.forEach(r => { if (!r.analisis || typeof r.analisis !== 'object') r.analisis = {}; });
  }

  function persist() {
    try {
      localStorage.setItem(C.STORAGE_KEY, JSON.stringify(state));
      storageOk = true;
    } catch (e) {
      storageOk = false;
    }
  }

  function commit() {
    persist();
    listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ---------------- skor ----------------
  function clamp15(v) {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
  }

  /** @returns {number|null} besaran risiko dari matriks SE, atau null bila belum lengkap */
  function score(d, k) {
    const dd = clamp15(d), kk = clamp15(k);
    return dd && kk ? C.MATRIX[kk][dd] : null;
  }

  function bandOf(s) {
    if (s == null) return null;
    return C.BANDS.find(b => s >= b.min && s <= b.max) || null;
  }

  function needsHandling(s) { return s != null && s >= C.SELERA_MIN_TANGANI; }

  /** Penilaian risiko untuk satu tahun: awal (Form 4) dan evaluasi akhir tahun. */
  function assessment(r, year) {
    const a = (r.analisis && r.analisis[String(year)]) || {};
    const awal = score(a.d, a.k);
    const eval_ = score(a.dEval, a.kEval);
    return { d: clamp15(a.d), k: clamp15(a.k), skor: awal, dEval: clamp15(a.dEval), kEval: clamp15(a.kEval), skorEval: eval_, catatan: a.catatan || '' };
  }

  function years() {
    const p = state.profil;
    const a = Number(p.periodeAwal) || new Date().getFullYear();
    const b = Math.max(a, Number(p.periodeAkhir) || a);
    const out = [];
    for (let y = a; y <= b && out.length < 10; y++) out.push(y);
    return out;
  }

  function activeYear() { return Number(state.profil.tahunAktif) || years()[0]; }

  /** Risiko yang sudah ada pada tahun tertentu (diidentifikasi pada atau sebelum tahun itu). */
  function risksForYear(year) {
    return state.risks.filter(r => !r.tahunIdentifikasi || Number(r.tahunIdentifikasi) <= year);
  }

  function priorityRisks(year) {
    return risksForYear(year)
      .map(r => ({ r, a: assessment(r, year) }))
      .filter(x => needsHandling(x.a.skor))
      .sort((x, y) => y.a.skor - x.a.skor || x.r.kode.localeCompare(y.r.kode));
  }

  // ---------------- kode risiko ----------------
  /** Format dari sheet "kode risiko": TINGKAT.YY.URUSAN.ENTITAS.NN */
  function nextCode(level, year) {
    const p = state.profil;
    const yy = String(year).slice(-2);
    const prefix = [level, yy, (p.kodeUrusan || '00').padStart(2, '0'), (p.kodeEntitas || '00').padStart(2, '0')].join('.') + '.';
    let max = 0;
    state.risks.forEach(r => {
      if (r.kode && r.kode.startsWith(prefix)) {
        const n = parseInt(r.kode.slice(prefix.length), 10);
        if (n > max) max = n;
      }
    });
    return prefix + String(max + 1).padStart(2, '0');
  }

  // ---------------- CRUD generik ----------------
  function list(coll) { return state[coll]; }
  function get(coll, id) { return state[coll].find(x => x.id === id) || null; }

  function upsert(coll, obj, prefix) {
    const arr = state[coll];
    if (obj.id) {
      const i = arr.findIndex(x => x.id === obj.id);
      if (i >= 0) { arr[i] = { ...arr[i], ...obj, diubah: new Date().toISOString() }; commit(); return arr[i]; }
    }
    const rec = { ...obj, id: obj.id || uid(prefix || coll.slice(0, 2).toUpperCase()), dibuat: new Date().toISOString() };
    arr.push(rec);
    commit();
    return rec;
  }

  /** Hapus dengan kaskade agar tidak ada rujukan yatim. */
  function remove(coll, id) {
    state[coll] = state[coll].filter(x => x.id !== id);
    if (coll === 'risks') {
      const rtpIds = new Set(state.rtp.filter(t => t.riskId === id).map(t => t.id));
      state.rtp = state.rtp.filter(t => t.riskId !== id);
      state.events = state.events.filter(e => e.riskId !== id);
      state.rtpProgress = state.rtpProgress.filter(p => !rtpIds.has(p.rtpId));
      state.infokom.forEach(x => { if (rtpIds.has(x.rtpId)) x.rtpId = ''; });
      state.pemantauanPI.forEach(x => { if (rtpIds.has(x.rtpId)) x.rtpId = ''; });
    }
    if (coll === 'rtp') {
      state.rtpProgress = state.rtpProgress.filter(p => p.rtpId !== id);
      state.infokom.forEach(x => { if (x.rtpId === id) x.rtpId = ''; });
      state.pemantauanPI.forEach(x => { if (x.rtpId === id) x.rtpId = ''; });
    }
    if (coll === 'konteks') {
      state.risks.forEach(r => { if (r.konteksId === id) r.konteksId = ''; });
    }
    commit();
  }

  function setAssessment(riskId, year, patch) {
    const r = get('risks', riskId);
    if (!r) return;
    const key = String(year);
    r.analisis[key] = { ...(r.analisis[key] || {}), ...patch };
    commit();
  }

  /** Salin penilaian tahun sumber sebagai titik awal tahun tujuan (hanya yang kosong). */
  function rollForward(fromYear, toYear) {
    let n = 0;
    state.risks.forEach(r => {
      const src = r.analisis[String(fromYear)];
      const dst = r.analisis[String(toYear)];
      if (src && (!dst || (dst.d == null && dst.k == null))) {
        const base = score(src.dEval, src.kEval) != null ? { d: src.dEval, k: src.kEval } : { d: src.d, k: src.k };
        if (score(base.d, base.k) != null) {
          r.analisis[String(toYear)] = { d: base.d, k: base.k };
          n++;
        }
      }
    });
    commit();
    return n;
  }

  function setProfil(patch) { state.profil = { ...state.profil, ...patch }; commit(); }
  function setLaporan(key, patch) { state.laporan[key] = { ...(state.laporan[key] || {}), ...patch }; commit(); }

  function replaceAll(d) {
    const err = validate(d);
    if (err) throw new Error(err);
    state = clone(d);
    normalize();
    commit();
  }
  function resetSeed() { state = clone(window.PERISAI_SEED); normalize(); commit(); }
  function resetEmpty() { state = emptyState(); commit(); }

  // ---------------- turunan RTP ----------------
  /** Status terakhir sebuah RTP berdasarkan catatan monitoring triwulanan. */
  function rtpStatus(rtpId) {
    const rows = state.rtpProgress.filter(p => p.rtpId === rtpId);
    if (!rows.length) return { status: 'Belum Dilaksanakan', last: null, rows };
    const order = t => C.TRIWULAN.indexOf(t.triwulan);
    const last = rows.slice().sort((a, b) => order(b) - order(a))[0];
    return { status: last.status || 'Belum Dilaksanakan', last, rows };
  }

  function rtpForYear(year) { return state.rtp.filter(t => Number(t.tahun) === Number(year)); }

  window.PERISAI_STORE = {
    load, commit, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    get state() { return state; },
    get storageOk() { return storageOk; },
    validate, score, bandOf, needsHandling, assessment, years, activeYear, risksForYear, priorityRisks,
    nextCode, list, get, upsert, remove, setAssessment, rollForward, setProfil, setLaporan,
    replaceAll, resetSeed, resetEmpty, rtpStatus, rtpForYear, uid,
  };
})();
