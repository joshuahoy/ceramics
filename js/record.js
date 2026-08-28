'use strict';

// ── Data model ────────────────────────────────────────────────────────────────
const localSessionLog = [];
let sessionLog = localSessionLog;
let showingSharedRecords = false;
let editingRecordId = null;
let currentRecord = newRecord();

function newRecord() {
  return {
    remoteId: crypto.randomUUID(), syncStatus: 'local',
    createdOn: '', createdBy: '', modifiedOn: '', modifiedBy: '',
    id: '', count: '1', material: '', ware: '', manuTech: '', vesselCat: '', form: '',
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
async function saveRecord() {
  const r = { ...currentRecord, decorations: currentRecord.decorations.map(d => ({ ...d }) ) };
  if (editingRecordId) {
    try {
      const updatedRecord = await updateRecordInSupabase(r);
      const index = sessionLog.findIndex(record => record.remoteId === editingRecordId);
      if (index !== -1) sessionLog[index] = updatedRecord;
      editingRecordId = null;
      currentRecord = newRecord();
      rebuildLog();
      setSyncStatus('synced', 'Changes saved');
      return true;
    } catch (error) {
      const detail = error.code || error.message || 'Unknown error';
      setSyncStatus('error', `Changes not saved: ${detail}`);
      console.error('Supabase record update failed:', error);
      return false;
    }
  }
  sessionLog.push(r);
  if (!showingSharedRecords && sessionLog !== localSessionLog) localSessionLog.push(r);
  appendLogRow(r);
  updateLogUI();
  syncRecordToSupabase(r).catch(error => {
    r.syncStatus = 'failed';
    const detail = error.code || error.message || 'Unknown error';
    setSyncStatus('error', `Saved locally; sync failed: ${detail}`);
    console.error('Supabase record sync failed:', error);
  });
  currentRecord = newRecord();
  return true;
}

async function hydrateRemoteRecords() {
  const remoteRecords = await loadRecords();
  sessionLog = remoteRecords;
  showingSharedRecords = true;
  rebuildLog();
  setSyncStatus('synced', 'All records synced');
}

function showLocalRecords() {
  sessionLog = localSessionLog;
  showingSharedRecords = false;
  rebuildLog();
}

function rebuildLog() {
  const tbody = document.getElementById('log-body');
  if (tbody) tbody.innerHTML = '';
  sessionLog.forEach(appendLogRow);
  const source = document.getElementById('log-source');
  if (source) source.textContent = showingSharedRecords ? 'Shared records' : 'Local session';
  updateLogUI();
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
    showingSharedRecords ? `<td><button class="btn btn-secondary btn-sm" data-edit-record="${escHtml(r.remoteId)}">Edit</button></td>` : '<td>—</td>',
  ].join('');
  tbody.appendChild(tr);
  tr.querySelector('[data-edit-record]')?.addEventListener('click', () => startRemoteEdit(r.remoteId));
}

function startRemoteEdit(remoteId) {
  const record = sessionLog.find(item => item.remoteId === remoteId);
  if (!record) return;
  editingRecordId = remoteId;
  currentRecord = { ...record, decorations: record.decorations.map(decoration => ({ ...decoration })) };
  currentStep = 0;
  renderStep(0);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelRemoteEdit() {
  if (!editingRecordId) return;
  editingRecordId = null;
  currentRecord = newRecord();
  currentStep = 0;
  renderStep(0);
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
    'Created On','Created By','Modified On','Modified By',
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
      r.createdOn, r.createdBy, r.modifiedOn, r.modifiedBy,
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
