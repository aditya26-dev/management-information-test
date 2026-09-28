/**
 * PERISAI - komponen UI bersama: escape, badge, modal formulir, dialog konfirmasi,
 * toast, tabel, dan ekspor (cetak, Excel, PDF, Word).
 */
(function () {
  'use strict';
  const C = window.PERISAI_CONFIG;
  const S = () => window.PERISAI_STORE;

  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  /** Escape HTML untuk setiap nilai dari data pengguna. */
  function esc(v) { return (v === undefined || v === null ? '' : String(v)).replace(/[&<>"']/g, c => ESC_MAP[c]); }
  function nl2br(v) { return esc(v).replace(/\n/g, '<br>'); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="6" y="14" width="12" height="7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 3h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    alert: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.5"/>',
  };
  function icon(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  /** Badge skor risiko berwarna sesuai Tabel 3 SE. */
  function scoreBadge(s, withLabel) {
    if (s == null) return '<span class="badge b0" title="Belum dinilai">Belum dinilai</span>';
    const b = S().bandOf(s);
    return `<span class="badge ${b.cls}" title="${esc(b.label)} (${b.warna})">${s}${withLabel === false ? '' : ' &middot; ' + esc(b.label)}</span>`;
  }
  function levelTag(level) { return `<span class="tag lv-${esc(level)}">${esc(level)}</span>`; }
  function statusTag(st) {
    const cls = { 'Selesai': 'st-done', 'Dalam Proses': 'st-prog', 'Belum Dilaksanakan': 'st-todo', 'Tidak Dilaksanakan': 'st-fail' }[st] || 'st-todo';
    return `<span class="status ${cls}">${esc(st)}</span>`;
  }

  // ---------------- toast ----------------
  let toastTimer = null;
  function toast(msg, kind) {
    const t = $('#toast');
    $('#toast-msg').textContent = msg;
    t.className = 'show' + (kind === 'error' ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = ''; }, 3200);
  }

  // ---------------- modal ----------------
  let lastFocus = null;
  function openOverlay(html, opts) {
    closeOverlay();
    lastFocus = document.activeElement;
    const ov = document.createElement('div');
    ov.className = 'overlay open';
    ov.id = 'overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = `<div class="modal ${opts && opts.wide ? 'wide' : ''} ${opts && opts.small ? 'small' : ''}">${html}</div>`;
    document.body.appendChild(ov);
    ov.addEventListener('mousedown', e => { if (e.target === ov) closeOverlay(); });
    const first = ov.querySelector('input:not([type=hidden]),select,textarea,button.btn-primary');
    if (first) setTimeout(() => first.focus(), 30);
    return ov;
  }
  function closeOverlay() {
    const ov = $('#overlay');
    if (ov) ov.remove();
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* abaikan */ } }
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#overlay')) closeOverlay(); });

  /**
   * Modal formulir generik.
   * @param {{title:string, fields:Array, values?:object, submitLabel?:string, wide?:boolean,
   *          onSubmit:(vals:object)=>string|void, onInput?:(vals:object, form:HTMLFormElement)=>void, intro?:string}} cfg
   */
  function formModal(cfg) {
    const vals = cfg.values || {};
    const fieldHtml = cfg.fields.map(f => {
      if (f.type === 'section') return `<div class="section-div">${esc(f.label)}</div>`;
      if (f.type === 'html') return `<div class="full" data-html="${esc(f.name || '')}">${f.html || ''}</div>`;
      const id = 'f-' + f.name;
      const v = vals[f.name] !== undefined && vals[f.name] !== null ? vals[f.name] : (f.default !== undefined ? f.default : '');
      const req = f.required ? ' required' : '';
      let input;
      if (f.type === 'textarea') {
        input = `<textarea id="${id}" name="${esc(f.name)}" rows="${f.rows || 3}"${req} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''}>${esc(v)}</textarea>`;
      } else if (f.type === 'select') {
        const opts = (f.options || []).map(o => {
          const ov = typeof o === 'object' ? o.value : o;
          const ol = typeof o === 'object' ? o.label : o;
          return `<option value="${esc(ov)}"${String(ov) === String(v) ? ' selected' : ''}>${esc(ol)}</option>`;
        }).join('');
        input = `<select id="${id}" name="${esc(f.name)}"${req}>${f.placeholder !== undefined ? `<option value="">${esc(f.placeholder)}</option>` : ''}${opts}</select>`;
      } else {
        const type = f.type || 'text';
        const extra = type === 'number' ? ` min="${f.min != null ? f.min : ''}" max="${f.max != null ? f.max : ''}" step="1"` : '';
        input = `<input id="${id}" name="${esc(f.name)}" type="${type}" value="${esc(v)}"${req}${extra} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''} ${f.list ? `list="${esc(f.list)}"` : ''} autocomplete="off">`;
      }
      return `<div class="field ${f.full ? 'full' : ''}"><label for="${id}">${esc(f.label)}${f.required ? ' <span class="req" aria-hidden="true">*</span>' : ''}${f.hint ? ` <span class="hint">${esc(f.hint)}</span>` : ''}</label>${input}</div>`;
    }).join('');

    const ov = openOverlay(`
      <div class="modal-head"><h3>${esc(cfg.title)}</h3><button type="button" class="close-x" aria-label="Tutup" data-close>&times;</button></div>
      <form class="modal-body form-grid" novalidate>
        ${cfg.intro ? `<div class="full intro">${cfg.intro}</div>` : ''}
        ${fieldHtml}
        <div class="full form-error" role="alert" hidden></div>
      </form>
      <div class="modal-foot"><button type="button" class="btn" data-close>Batal</button><button type="button" class="btn btn-primary" data-submit>${esc(cfg.submitLabel || 'Simpan')}</button></div>
    `, { wide: cfg.wide });
    const form = ov.querySelector('form');
    const collect = () => {
      const out = {};
      cfg.fields.forEach(f => {
        if (!f.name || f.type === 'section' || f.type === 'html') return;
        const el = form.elements[f.name];
        if (!el) return;
        let v = el.value;
        if (f.type === 'number') v = v === '' ? null : Number(v);
        else v = typeof v === 'string' ? v.trim() : v;
        out[f.name] = v;
      });
      return out;
    };
    const errBox = form.querySelector('.form-error');
    const submit = () => {
      const v = collect();
      const missing = cfg.fields.filter(f => f.required && (v[f.name] === '' || v[f.name] === null || v[f.name] === undefined));
      if (missing.length) {
        errBox.textContent = 'Lengkapi isian wajib: ' + missing.map(f => f.label).join(', ') + '.';
        errBox.hidden = false;
        const el = form.elements[missing[0].name];
        if (el && el.focus) el.focus();
        return;
      }
      const bad = cfg.fields.find(f => f.type === 'number' && v[f.name] !== null && ((f.min != null && v[f.name] < f.min) || (f.max != null && v[f.name] > f.max) || !Number.isInteger(v[f.name])));
      if (bad) { errBox.textContent = `${bad.label} harus bilangan bulat ${bad.min} s.d. ${bad.max}.`; errBox.hidden = false; return; }
      const err = cfg.onSubmit(v);
      if (err) { errBox.textContent = err; errBox.hidden = false; return; }
      closeOverlay();
    };
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeOverlay));
    ov.querySelector('[data-submit]').addEventListener('click', submit);
    form.addEventListener('submit', e => { e.preventDefault(); submit(); });
    form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); submit(); } });
    if (cfg.onInput) {
      form.addEventListener('input', () => cfg.onInput(collect(), form));
      form.addEventListener('change', () => cfg.onInput(collect(), form));
      cfg.onInput(collect(), form);
    }
    return { overlay: ov, form, collect };
  }

  /** Dialog konfirmasi tanpa window.confirm (tidak memblokir peramban). */
  function confirmDialog(message, onYes, opts) {
    const ov = openOverlay(`
      <div class="modal-head"><h3>${esc((opts && opts.title) || 'Konfirmasi')}</h3><button type="button" class="close-x" aria-label="Tutup" data-close>&times;</button></div>
      <div class="modal-body"><p class="confirm-msg">${esc(message)}</p></div>
      <div class="modal-foot"><button type="button" class="btn" data-close>Batal</button><button type="button" class="btn ${opts && opts.danger === false ? 'btn-primary' : 'btn-danger-solid'}" data-yes>${esc((opts && opts.yes) || 'Hapus')}</button></div>
    `, { small: true });
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeOverlay));
    ov.querySelector('[data-yes]').addEventListener('click', () => { closeOverlay(); onYes(); });
    setTimeout(() => ov.querySelector('[data-yes]').focus(), 30);
  }

  // ---------------- tabel ----------------
  function emptyRow(cols, msg) { return `<tr><td colspan="${cols}" class="empty">${esc(msg || 'Belum ada data.')}</td></tr>`; }
  function actions(editAttr, delAttr) {
    return `<div class="row-actions">
      <button type="button" class="icon-btn" ${editAttr} title="Ubah" aria-label="Ubah">${icon('edit')}</button>
      <button type="button" class="icon-btn danger" ${delAttr} title="Hapus" aria-label="Hapus">${icon('trash')}</button></div>`;
  }

  // ---------------- dokumen cetak ----------------
  /** Kepala dokumen gaya kertas kerja Perbup (Lampiran II). */
  function docHeader(formNo, title, subtitle, meta) {
    const p = S().state.profil;
    const rows = meta || [
      ['Nama Pemda', p.pemda], ['Nama OPD', p.opd], ['Tahun Penilaian', S().activeYear()],
      ['Periode yang dinilai', `Periode Renstra (Tahun ${p.periodeAwal}-${p.periodeAkhir})`], ['Urusan Pemerintahan', p.urusan],
    ];
    return `<div class="doc-head">
      <div class="doc-form">Lampiran II Perbup 66/2023<br><b>${esc(formNo)}</b></div>
      <div class="doc-title">Kertas Kerja<br><b>${esc(title)}</b>${subtitle ? `<br><span>${esc(subtitle)}</span>` : ''}</div>
      <table class="doc-meta">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>: ${esc(v)}</td></tr>`).join('')}</table>
    </div>`;
  }

  function docFooter() {
    const p = S().state.profil;
    const d = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    return `<div class="doc-sign"><div>Singaraja, ${esc(d)}<br>Kepala ${esc(p.opdSingkat || p.opd || 'Perangkat Daerah')}<br><br><br><br><b>${esc(p.kepala || '(.................................)')}</b><br>${p.nipKepala ? 'NIP. ' + esc(p.nipKepala) : ''}</div></div>
      <div class="doc-foot">Dicetak dari PERISAI (Pengelolaan Risiko Berbasis Aplikasi), Inspektorat Daerah Kabupaten Buleleng</div>`;
  }

  /** Cetak dokumen lewat dialog peramban. portrait=true untuk laporan naratif. */
  function printHtml(html, portrait) {
    const host = $('#print-root');
    host.innerHTML = html;
    let pageStyle = null;
    if (portrait) {
      pageStyle = document.createElement('style');
      pageStyle.textContent = '@media print{@page{size:A4 portrait;margin:15mm}}';
      document.head.appendChild(pageStyle);
    }
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); host.innerHTML = ''; if (pageStyle) pageStyle.remove(); pageStyle = null; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { window.print(); setTimeout(done, 1500); }, 50);
  }

  function safeName(s) { return String(s).replace(/[^\w.-]+/g, '_').replace(/_+/g, '_'); }

  function pdfHtml(html, filename, landscape) {
    if (typeof window.html2pdf !== 'function') {
      toast('Pustaka PDF tidak termuat (butuh internet). Gunakan Cetak lalu pilih "Simpan sebagai PDF".', 'error');
      return;
    }
    // Pembungkus luar yang digeser keluar layar; html2pdf menerima elemen dalam (tata letak normal).
    // Jika elemen yang diberikan sendiri berposisi fixed, klonnya ikut fixed dan kanvas kosong (tinggi 0).
    const wrap = document.createElement('div');
    wrap.className = 'pdf-offscreen';
    const el = document.createElement('div');
    el.className = 'pdf-root' + (landscape === false ? ' portrait' : '');
    el.innerHTML = html;
    wrap.appendChild(el);
    document.body.appendChild(wrap);
    toast('Menyiapkan PDF...');
    window.html2pdf().set({
      margin: [8, 8, 10, 8], filename: safeName(filename) + '.pdf',
      image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: landscape === false ? 'portrait' : 'landscape' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.avoid-break'] },
    }).from(el).save().then(() => { wrap.remove(); toast('PDF berhasil diunduh.'); })
      .catch(err => { wrap.remove(); console.error(err); toast('Gagal membuat PDF.', 'error'); });
  }

  function wordHtml(html, filename, landscape) {
    const css = `body{font-family:Arial,sans-serif;font-size:10pt;color:#111}table{border-collapse:collapse;width:100%}th,td{border:1px solid #777;padding:4px;vertical-align:top;font-size:9pt}th{background:#1b3a5c;color:#fff}h1,h2,h3{font-family:Georgia,serif}.doc-meta td{border:none;padding:1px 4px}.badge{font-weight:bold}` +
      (landscape === false ? '' : '@page Section1{size:841.9pt 595.3pt;mso-page-orientation:landscape;margin:40pt}div.Section1{page:Section1}');
    const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>${css}</style></head><body><div class="Section1">${html}</div></body></html>`;
    download(new Blob(['﻿', doc], { type: 'application/msword' }), safeName(filename) + '.doc');
  }

  /**
   * Ekspor Excel. sheets: [{name, title, meta:[[k,v]], head:[...], rows:[[...]]}]
   * Fallback tanpa SheetJS: tabel HTML .xls.
   */
  function excel(sheets, filename) {
    const p = S().state.profil;
    if (window.XLSX) {
      const wb = window.XLSX.utils.book_new();
      sheets.forEach(sh => {
        const aoa = [];
        if (sh.form) aoa.push([sh.form]);
        aoa.push([sh.title]);
        (sh.meta || [['Nama Pemda', p.pemda], ['Nama OPD', p.opd], ['Tahun', S().activeYear()]]).forEach(m => aoa.push([m[0], ': ' + (m[1] == null ? '' : m[1])]));
        aoa.push([]);
        const headRow = aoa.length;
        aoa.push(sh.head);
        sh.rows.forEach(r => aoa.push(r.map(c => (c == null ? '' : c))));
        const ws = window.XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = sh.head.map((h, i) => ({ wch: (sh.widths && sh.widths[i]) || Math.min(60, Math.max(8, String(h).length + 2)) }));
        ws['!autofilter'] = { ref: window.XLSX.utils.encode_range({ s: { r: headRow, c: 0 }, e: { r: headRow + sh.rows.length, c: sh.head.length - 1 } }) };
        window.XLSX.utils.book_append_sheet(wb, ws, sh.name.slice(0, 31));
      });
      window.XLSX.writeFile(wb, safeName(filename) + '.xlsx');
    } else {
      const html = sheets.map(sh => `<h3>${esc(sh.title)}</h3><table border="1"><tr>${sh.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${sh.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`).join('<br>');
      download(new Blob(['﻿<html><head><meta charset="utf-8"></head><body>' + html + '</body></html>'], { type: 'application/vnd.ms-excel' }), safeName(filename) + '.xls');
      toast('SheetJS tidak termuat; diekspor sebagai .xls sederhana.');
      return;
    }
    toast('Berkas Excel berhasil diunduh.');
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /** Toolbar ekspor standar. handlers: {print, excel, pdf, word} */
  function exportButtons(prefix, which) {
    const w = which || ['print', 'excel', 'pdf'];
    const lbl = { print: ['print', 'Cetak'], excel: ['download', 'Excel'], pdf: ['download', 'PDF'], word: ['download', 'Word'] };
    return w.map(k => `<button type="button" class="btn" data-export="${prefix}:${k}">${icon(lbl[k][0])}${lbl[k][1]}</button>`).join('');
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    return isNaN(d) ? iso : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function truncate(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  window.PERISAI_UI = {
    esc, nl2br, $, $$, icon, scoreBadge, levelTag, statusTag, toast, openOverlay, closeOverlay, formModal,
    confirmDialog, emptyRow, actions, docHeader, docFooter, printHtml, pdfHtml, wordHtml, excel, download,
    exportButtons, fmtDate, truncate, safeName,
  };
})();
