"""Build PERISAI seed data from KK MR_KOMINFOSANTI 2026.xlsx and the SIMR kamus.

Output: <app>/js/seed.js defining window.PERISAI_SEED and window.PERISAI_KAMUS.
Only data that exists in the source files is emitted; nothing is invented.
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

SRC = Path(r"C:\Users\wira0\Downloads\PERISAI\PERISAI")
OUT = SRC / "app" / "js" / "seed.js"

wb = openpyxl.load_workbook(SRC / "KK MR_KOMINFOSANTI 2026.xlsx", data_only=True)


def txt(v):
    if v is None:
        return ""
    s = str(v).replace("\r", "").strip()
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n\s*\n+", "\n", s)
    return s.strip().strip('"').strip()


def strip_label(s, *labels):
    for lb in labels:
        m = re.match(r"^\s*" + lb + r"\s*:?\s*", s, re.I)
        if m:
            return s[m.end():].strip()
    return s


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def cell(ws, ref):
    return txt(ws[ref].value)


# ---------------- entitas list ----------------
ws = wb["kode risiko"]
entitas = []
for row in ws.iter_rows(min_row=1, values_only=True):
    a, b = (row[0], row[1]) if len(row) > 1 else (None, None)
    if a is not None and b and re.fullmatch(r"\d{1,2}", str(a).strip()) and not str(b).strip().isdigit():
        entitas.append({"kode": str(a).strip().zfill(2), "nama": txt(b)})
# the first 4 numeric rows are the "Jenis Risiko" (urusan) list, the rest are entitas
urusan = entitas[:4]
entitas = entitas[4:]

risks = []
konteks = []


def add_konteks(level, **kw):
    key = (level, kw.get("sasaran", ""), kw.get("program", ""), kw.get("kegiatan", ""), kw.get("subKegiatan", ""))
    for k in konteks:
        if (k["level"], k.get("sasaran", ""), k.get("program", ""), k.get("kegiatan", ""), k.get("subKegiatan", "")) == key:
            return k["id"]
    kid = f"K{len(konteks) + 1:03d}"
    konteks.append({"id": kid, "level": level, "tahun": 2026, **kw})
    return kid


# ---------------- Form 3a (strategis Pemda) ----------------
ws = wb["Form3a KK Risk Strategis Pemda "]
tujuan = strip_label(cell(ws, "B16"), r"Tujuan Strategis Pemda 1")
sasaran = cell(ws, "B17")
kid = add_konteks("RSP", tujuan=tujuan, sasaran=sasaran, indikator=cell(ws, "C17"),
                  program=cell(ws, "B18"), kegiatan="", subKegiatan="",
                  sumberData="RPJMD Kabupaten Buleleng 2025-2029")
risks.append({
    "level": "RSP", "kelompok": "Strategis Pemda", "kode": cell(ws, "E18"), "konteksId": kid,
    "tahap": "", "indikator": cell(ws, "C17"), "uraian": cell(ws, "D18"), "pemilik": cell(ws, "F18"),
    "sebab": cell(ws, "G18"), "sumber": cell(ws, "H18"), "cuc": cell(ws, "I18"),
    "dampak": cell(ws, "J18"), "pihakTerkena": cell(ws, "K18"),
})

# ---------------- Form 3b (strategis OPD) ----------------
ws = wb["Form 3b Risk Strategis OPD "]
ctx = {"tujuan": strip_label(cell(ws, "B17"), "Tujuan"), "sasaran": "", "indikator": "", "program": "",
       "kegiatan": "", "subKegiatan": ""}
for r in range(18, 43):
    b, c, d = cell(ws, f"B{r}"), cell(ws, f"C{r}"), cell(ws, f"D{r}")
    if b.lower().startswith("sasaran"):
        ctx.update(sasaran=strip_label(b, r"Sasaran Strategis OPD").rstrip(" /"), indikator=c,
                   program="", kegiatan="", subKegiatan="")
        continue
    if b.lower().startswith("program"):
        ctx.update(program=strip_label(b, "Program"), kegiatan="", subKegiatan="")
        if not ctx["program"].lower().startswith("program"):
            ctx["program"] = "Program " + ctx["program"]
        continue
    if b.lower().startswith("kegiatan"):
        ctx.update(kegiatan=strip_label(b, "Kegiatan"), subKegiatan="")
    if c.lower().startswith("sub kegiatan"):
        ctx["subKegiatan"] = strip_label(c, "Sub Kegiatan")
    if not d:
        continue
    kid = add_konteks("RSO", tujuan=ctx["tujuan"], sasaran=ctx["sasaran"], indikator=ctx["indikator"],
                      program=ctx["program"], kegiatan=ctx["kegiatan"], subKegiatan=ctx["subKegiatan"],
                      sumberData="Renstra Dinas Kominfosanti 2025-2029")
    risks.append({
        "level": "RSO", "kelompok": "Strategis OPD", "kode": cell(ws, f"E{r}"), "konteksId": kid,
        "tahap": "", "indikator": ctx["indikator"], "uraian": d, "pemilik": cell(ws, f"F{r}"),
        "sebab": cell(ws, f"G{r}"), "sumber": cell(ws, f"H{r}").capitalize(), "cuc": cell(ws, f"I{r}"),
        "dampak": cell(ws, f"J{r}"), "pihakTerkena": cell(ws, f"K{r}"),
    })

# ---------------- Form 3c (operasional OPD) ----------------
ws = wb["Form 3c Risk Operasional OPD "]
ctx = {"program": "", "kegiatan": "", "tahap": "", "kelompok": "Operasional OPD", "indikator": ""}
for r in range(22, 149):
    b, c, d, e = cell(ws, f"B{r}"), cell(ws, f"C{r}"), cell(ws, f"D{r}"), cell(ws, f"E{r}")
    if b.startswith("Risiko Fraud"):
        ctx.update(kelompok="Kecurangan/Fraud", program="", kegiatan="", tahap="")
        continue
    if b.startswith("Risiko Program Penunjang"):
        ctx.update(kelompok="Program Penunjang", program="", kegiatan="", tahap="")
        continue
    if b.lower().startswith("program"):
        p = strip_label(b.replace(" / ", " "), "Program")
        p = strip_label(p, "Program")
        ctx.update(program="Program " + p, kegiatan="", tahap="")
        if c:
            ctx["indikator"] = c
    elif b.lower().startswith("kegiatan"):
        ctx["kegiatan"] = strip_label(b.replace(" / ", " "), "Kegiatan")
    if d:
        ctx["tahap"] = strip_label(d, "Kegiatan")
    if not e:
        continue
    kid = add_konteks("ROO", tujuan="", sasaran="", indikator=ctx["indikator"], program=ctx["program"],
                      kegiatan=ctx["kegiatan"], subKegiatan="", sumberData="Renja / RKA Dinas Kominfosanti 2026")
    risks.append({
        "level": "ROO", "kelompok": ctx["kelompok"], "kode": cell(ws, f"F{r}"), "konteksId": kid,
        "tahap": ctx["tahap"], "indikator": ctx["indikator"], "uraian": e,
        "pemilik": cell(ws, f"G{r}") or "Kepala Dinas Komunikasi, Informatika, Persandian dan Statistik",
        "sebab": cell(ws, f"H{r}"), "sumber": cell(ws, f"I{r}"), "cuc": cell(ws, f"J{r}"),
        "dampak": cell(ws, f"K{r}"), "pihakTerkena": cell(ws, f"L{r}"),
    })

# ---------------- Form 4 scores ----------------
ws = wb["Form 4 KK Analisis Risk"]
by_code, fraud_rows, penunjang_rows = {}, [], []
group = None
for r in range(14, 170):
    a, b, code = cell(ws, f"A{r}"), cell(ws, f"B{r}"), cell(ws, f"C{r}")
    if b.startswith("Risiko Kecurangan"):
        group = "fraud"; continue
    if b.startswith("Risiko Pada Program Penunjang"):
        group = "penunjang"; continue
    if a in ("I", "II", "III", "IV", "V"):
        group = "skip" if ("RSUD" in b or "P3AP2KB" in b) else None
        continue
    if group == "skip" or not b:
        continue
    dv, kv, sv = ws[f"D{r}"].value, ws[f"E{r}"].value, ws[f"F{r}"].value
    item = {"uraian": b, "d": dv, "k": kv, "skor": sv}
    if code:
        by_code[code] = item
    elif group == "fraud":
        fraud_rows.append(item)
    elif group == "penunjang":
        penunjang_rows.append(item)

MATRIX = {1: {1: 1, 2: 3, 3: 5, 4: 8, 5: 20}, 2: {1: 2, 2: 7, 3: 11, 4: 13, 5: 21},
          3: {1: 4, 2: 10, 3: 14, 4: 17, 5: 22}, 4: {1: 6, 2: 12, 3: 16, 4: 19, 5: 24},
          5: {1: 9, 2: 15, 3: 18, 4: 23, 5: 25}}  # MATRIX[kemungkinan][dampak], SE Tabel 4

mismatch = []


def attach(risk, item):
    if item is None or item["d"] in (None, "") or item["k"] in (None, ""):
        return
    d, k = int(item["d"]), int(item["k"])
    expected = MATRIX[k][d]
    if item["skor"] not in (None, "") and int(item["skor"]) != expected:
        mismatch.append((risk.get("kode") or risk["uraian"][:40], d, k, item["skor"], expected))
    risk["analisis"] = {"2026": {"d": d, "k": k}}


for rk in risks:
    if rk["kode"] in by_code:
        attach(rk, by_code[rk["kode"]])

fraud_risks = [r for r in risks if r["kelompok"] == "Kecurangan/Fraud"]
used = set()
for item in fraud_rows:
    hit = next((r for r in fraud_risks if id(r) not in used and norm(r["uraian"])[:30] == norm(item["uraian"])[:30]), None)
    if hit is None:
        # present in Form 4 but not in Form 3c: keep it, with only what Form 4 records
        hit = {"level": "ROO", "kelompok": "Kecurangan/Fraud", "kode": "", "konteksId": "", "tahap": "",
               "indikator": "", "uraian": item["uraian"],
               "pemilik": "Kepala Dinas Komunikasi, Informatika, Persandian dan Statistik",
               "sebab": "", "sumber": "", "cuc": "", "dampak": "", "pihakTerkena": ""}
        risks.append(hit)
    used.add(id(hit))
    attach(hit, item)

pen_risks = [r for r in risks if r["kelompok"] == "Program Penunjang"]
if len(pen_risks) != len(penunjang_rows):
    sys.exit(f"penunjang count mismatch: 3c={len(pen_risks)} form4={len(penunjang_rows)}")
for rk, item in zip(pen_risks, penunjang_rows):
    if norm(rk["uraian"])[:18] != norm(item["uraian"])[:18]:
        sys.exit(f"penunjang order mismatch: {rk['uraian'][:50]!r} vs {item['uraian'][:50]!r}")
    attach(rk, item)

# ---------------- codes for risks the workbook left uncoded ----------------
nums = [int(r["kode"].split(".")[-1]) for r in risks if r["level"] == "ROO" and r["kode"]]
nxt = max(nums) + 1
for rk in risks:
    if not rk["kode"]:
        rk["kode"] = f"ROO.26.02.23.{nxt:02d}"
        rk["kodeOtomatis"] = True
        nxt += 1

for i, rk in enumerate(risks, 1):
    rk["id"] = f"R{i:03d}"
    rk["tahunIdentifikasi"] = 2026
    rk.setdefault("analisis", {})

# ---------------- kamus from reference HTML ----------------
html = (SRC / "SIMR-Manajemen-Risiko-Kecurangan (1).html").read_text(encoding="utf-8").split("\n")[479]
ref = json.loads(html[html.index("{"):html.rindex("}") + 1])
kamus = [{"no": k["no"], "kategori": k["kategori"], "nama": k["nama"], "k": k["f"], "d": k["d"]} for k in ref["kamus"]]
ref_matrix = {int(a): {int(b): v for b, v in row.items()} for a, row in ref["matrix"].items()}
assert ref_matrix == MATRIX, "reference matrix differs from Surat Edaran Tabel 4"

seed = {
    "versi": 1,
    "profil": {
        "pemda": "Pemerintah Kabupaten Buleleng, Provinsi Bali",
        "opd": "Dinas Komunikasi, Informatika, Persandian dan Statistik",
        "opdSingkat": "Dinas Kominfosanti",
        "kodeEntitas": "23",
        "urusan": "Urusan Wajib Bukan Pelayanan Dasar",
        "kodeUrusan": "02",
        "periodeAwal": 2025,
        "periodeAkhir": 2029,
        "tahunAktif": 2026,
        "tujuanStrategis": "Terwujudnya kelembagaan tepat fungsi dan tepat sasaran untuk menciptakan pelayanan publik yang prima",
        "kepala": "",
        "nipKepala": "",
    },
    "konteks": konteks,
    "risks": risks,
    "rtp": [], "events": [], "rtpProgress": [], "infokom": [], "pemantauanPI": [], "apip": [],
    "laporan": {},
}
ref_lists = {"entitas": entitas, "urusan": urusan}

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(
    "/* Data awal PERISAI. Dibangkitkan dari KK MR_KOMINFOSANTI 2026.xlsx dan kamus risiko BPKP.\n"
    "   Jangan diedit manual; jalankan ulang tools/extract_seed.py. */\n"
    "window.PERISAI_SEED = " + json.dumps(seed, ensure_ascii=False, indent=1) + ";\n"
    "window.PERISAI_REF = " + json.dumps(ref_lists, ensure_ascii=False) + ";\n"
    "window.PERISAI_KAMUS = " + json.dumps(kamus, ensure_ascii=False) + ";\n",
    encoding="utf-8", newline="\n")

from collections import Counter
print("konteks", len(konteks), "risks", len(risks), Counter(r["kelompok"] for r in risks))
print("dinilai", sum(1 for r in risks if r["analisis"]), "kode otomatis", sum(1 for r in risks if r.get("kodeOtomatis")))
print("entitas", len(entitas), entitas[20:24], "urusan", urusan)
print("skor mismatch vs matrix:", mismatch)
print("kamus", len(kamus))
