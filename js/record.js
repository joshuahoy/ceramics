'use strict';

// ── Data model ────────────────────────────────────────────────────────────────
const sessionLog = [];
let currentRecord = newRecord();

function newRecord() {
  return {
    id: '', count: '', material: '', ware: '', manuTech: '', vesselCat: '', form: '',
    completeness: '', extSurface: '', extColor: '', intSurface: '', intColor: '',
    pasteColor: '', oxidized: 'Not Reduced', burning: 'Unburned',
    wearLocation: '', wearPattern: '', postMfgMod: 'No',
    decorated: 'No', decorations: [],
    baseMark: 'Not Applicable', baseMarkColor: '', baseMarkRef: '',
    thickness: '', maxSize: '', weight: '', mendedWeight: '',
    rimLength: '', rimDiam: '', mendedRimDiam: '',
    baseLength: '', baseDiam: '', mendedBaseDiam: '',
    notes: '',
  };
}

function newDecRow() {
  return { intExt: '', location: '', technique: '', color: '', stylElement: '', motif: '', genre: '', patternName: '', patternNotes: '' };
}

// ── Session log ───────────────────────────────────────────────────────────────
function saveRecord() {
  const r = { ...currentRecord, decorations: currentRecord.decorations.map(d => ({ ...d }) ) };
  sessionLog.push(r);
  appendLogRow(r);
  updateLogUI();
  currentRecord = newRecord();
}

function appendLogRow(r) {
  const tbody = document.getElementById('log-body');
  const td = v => `<td>${escHtml(v || '')}</td>`;
  const decSummary = r.decorations.length
    ? r.decorations.map(d => [d.genre, d.technique, d.color].filter(Boolean).join(' / ')).join(' | ')
    : (r.decorated === 'Yes' ? '(decorated)' : '—');
  const tr = document.createElement('tr');
  tr.innerHTML = [
    td(r.id), td(r.ware), td(r.form), td(r.extSurface),
    td(r.extColor), td(r.intColor), td(r.pasteColor),
    td(r.burning), td(decSummary), td(r.notes),
  ].join('');
  tbody.appendChild(tr);
}

function updateLogUI() {
  const n = sessionLog.length;
  const badge = document.getElementById('log-count');
  const inline = document.getElementById('log-count-inline');
  const empty = document.getElementById('log-empty');
  const wrap = document.getElementById('log-table-wrap');
  const exportBtn = document.getElementById('export-btn');
  if (badge) { badge.textContent = n; badge.classList.toggle('hidden', n === 0); }
  if (inline) inline.textContent = `${n} record${n !== 1 ? 's' : ''}`;
  if (empty) empty.classList.toggle('hidden', n > 0);
  if (wrap) wrap.classList.toggle('hidden', n === 0);
  if (exportBtn) exportBtn.disabled = n === 0;
}

function exportCSV() {
  if (!sessionLog.length) return;
  const headers = [
    'ID','Count','Ware','Material','Manu Tech','Category','Form','Completeness',
    'Ext Surface','Ext Color','Int Surface','Int Color','Paste Color',
    'Oxidized vs Reduced','Burning','Post-Mfg Mod','Wear Location','Wear Pattern',
    'Decorated','Genre 1','Dec Technique 1','Dec Color 1','Stylistic Element 1','Motif 1',
    'Genre 2','Dec Technique 2','Dec Color 2','Stylistic Element 2','Motif 2',
    'Pattern Name','Base Mark','Base Mark Color','Base Mark Ref',
    'Thickness (mm)','Max Size (mm)','Weight (g)',
    'Rim Length (mm)','Rim Diam (mm)','Base Length (mm)','Base Diam (mm)',
    'Notes',
  ];
  const rows = sessionLog.map(r => {
    const d1 = r.decorations[0] || {};
    const d2 = r.decorations[1] || {};
    return [
      r.id, r.count, r.ware, r.material, r.manuTech, r.vesselCat, r.form, r.completeness,
      r.extSurface, r.extColor, r.intSurface, r.intColor, r.pasteColor,
      r.oxidized, r.burning, r.postMfgMod, r.wearLocation, r.wearPattern,
      r.decorated, d1.genre||'', d1.technique||'', d1.color||'', d1.stylElement||'', d1.motif||'',
      d2.genre||'', d2.technique||'', d2.color||'', d2.stylElement||'', d2.motif||'',
      r.decorations.length ? r.decorations[0].patternName||'' : '',
      r.baseMark, r.baseMarkColor, r.baseMarkRef,
      r.thickness, r.maxSize, r.weight, r.rimLength, r.rimDiam, r.baseLength, r.baseDiam,
      r.notes,
    ].map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',');
  });
  const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = Object.assign(document.createElement('a'), {
    href: url, download: `ceramics-${new Date().toISOString().slice(0,10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function normalizeMunsell(code) {
  return code.replace(/([A-Z])(\d)/g, '$1 $2').trim();
}

function neutralToHex(code) {
  const m = code.match(/^N\s*([\d.]+)\//);
  if (!m) return '#808080';
  const c = Math.round(Math.min(parseFloat(m[1]) / 10, 1) * 255);
  const h = c.toString(16).padStart(2, '0');
  return `#${h}${h}${h}`;
}

function computeHex(rawCode) {
  if (!rawCode) return '#808080';
  if (SPECIAL_DISPLAY_COLOURS[rawCode]) return SPECIAL_DISPLAY_COLOURS[rawCode];
  const code = normalizeMunsell(rawCode.trim());
  if (/^N\s*[\d.]+\//.test(code)) return neutralToHex(code);
  try {
    const [r, g, b] = window.munsell.munsellToRgb255(code);
    const clamp = n => Math.max(0, Math.min(255, Math.round(n)));
    return '#' + [r,g,b].map(clamp).map(v => v.toString(16).padStart(2,'0')).join('');
  } catch { return '#808080'; }
}
