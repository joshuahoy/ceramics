'use strict';

// ── Data model ────────────────────────────────────────────────────────────────
const localSessionLog = [];
let sessionLog = localSessionLog;
let showingSharedRecords = false;
let editingRecordId = null;
let currentRecord = newRecord();
let suspendedNewRecordDraft = null;
let recordBrowserFilters = [];
let recordBrowserSearch = '';
let recordBrowserSortField = 'modifiedOn';
let recordBrowserSortDescending = true;
let recordBrowserPage = 0;
let recordBrowserPageSize = 50;
let selectedRecordDetailsId = null;

const RECORD_BROWSER_FIELDS = [
  ['remoteId', 'Record ID'], ['syncStatus', 'Sync Status'], ['createdOn', 'Created On'], ['createdBy', 'Created By'],
  ['modifiedOn', 'Modified On'], ['modifiedBy', 'Modified By'], ['id', 'Artifact ID'], ['count', 'Count'],
  ['material', 'Material'], ['ware', 'Ware'], ['manuTech', 'Manufacturing Technique'], ['vesselCat', 'Vessel Category'],
  ['form', 'Form'], ['completeness', 'Completeness'], ['extSurface', 'Exterior Surface'], ['extColor', 'Exterior Color'],
  ['intSurface', 'Interior Surface'], ['intColor', 'Interior Color'], ['pasteColor', 'Paste Color'],
  ['oxidized', 'Oxidized / Reduced'], ['burning', 'Burning'], ['wearLocation', 'Wear Location'],
  ['wearPattern', 'Wear Pattern'], ['postMfgMod', 'Post-Manufacturing Modification'], ['decorated', 'Decorated'],
  ['decorations', 'Decorations'], ['baseMark', 'Base Mark'], ['baseMarkColor', 'Base Mark Color'],
  ['baseMarkRef', 'Base Mark Reference'], ['thickness', 'Thickness'], ['maxSize', 'Maximum Size'],
  ['weight', 'Weight'], ['mendedWeight', 'Mended Weight'], ['rimLength', 'Rim Length'], ['rimDiam', 'Rim Diameter'],
  ['mendedRimDiam', 'Mended Rim Diameter'], ['baseLength', 'Base Length'], ['baseDiam', 'Base Diameter'],
  ['mendedBaseDiam', 'Mended Base Diameter'], ['notes', 'Notes'], ['photos', 'Photo Count'],
];

const RECORD_BROWSER_NUMERIC_FIELDS = new Set([
  'count', 'thickness', 'maxSize', 'weight', 'mendedWeight', 'rimLength', 'rimDiam',
  'mendedRimDiam', 'baseLength', 'baseDiam', 'mendedBaseDiam', 'photos',
]);
const RECORD_BROWSER_DATE_FIELDS = new Set(['createdOn', 'modifiedOn']);

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
    notes: '', photos: [],
  };
}

function newDecRow() {
  return { intExt: '', location: '', technique: '', color: '', stylElement: '', motif: '', genre: '', patternName: '', patternNotes: '' };
}

// ── Session log ───────────────────────────────────────────────────────────────
async function saveRecord() {
  const r = { ...currentRecord, decorations: currentRecord.decorations.map(d => ({ ...d }) ) };
  const pendingPhotos = currentRecord.pendingPhotos || [];
  const photosToDelete = currentRecord.pendingPhotoDeletes || [];
  delete r.pendingPhotos;
  delete r.pendingPhotoDeletes;
  if (!getFirebaseUser()) {
    saveLocalRecord(r, editingRecordId ? 'Saved locally as a new record' : 'Saved locally');
    editingRecordId = null;
    currentRecord = newRecord();
    return true;
  }
  if (editingRecordId) {
    try {
      const { record: updatedRecord, photoCleanupFailed } = await updateRecord(r, pendingPhotos, photosToDelete);
      const index = sessionLog.findIndex(record => record.remoteId === editingRecordId);
      if (index !== -1) sessionLog[index] = updatedRecord;
      editingRecordId = null;
      restoreNewRecordDraft();
      rebuildLog();
      setSyncStatus(photoCleanupFailed ? 'error' : 'synced', photoCleanupFailed ? 'Changes saved; photo cleanup failed' : 'Changes saved');
      return true;
    } catch (error) {
      const detail = error.code || error.message || 'Unknown error';
      setSyncStatus('error', `Changes not saved: ${detail}`);
      console.error('Firebase record update failed:', error);
      return false;
    }
  }
  sessionLog.push(r);
  if (!showingSharedRecords && sessionLog !== localSessionLog) localSessionLog.push(r);
  appendLogRow(r);
  updateLogUI();
  createRecord(r, pendingPhotos).catch(error => {
    r.syncStatus = 'failed';
    const detail = error.code || error.message || 'Unknown error';
    setSyncStatus('error', `Saved locally; sync failed: ${detail}`);
    console.error('Firebase record sync failed:', error);
  });
  currentRecord = newRecord();
  return true;
}

function saveLocalRecord(record, message) {
  const localRecord = {
    ...record,
    remoteId: crypto.randomUUID(),
    syncStatus: 'local',
    photos: [],
    decorations: record.decorations.map(decoration => ({ ...decoration })),
  };
  localSessionLog.push(localRecord);
  sessionLog = localSessionLog;
  showingSharedRecords = false;
  rebuildLog();
  setSyncStatus('offline', message);
}

async function hydrateRemoteRecords() {
  const remoteRecords = await loadRecords();
  sessionLog = remoteRecords;
  showingSharedRecords = true;
  rebuildLog();
  setSyncStatus('synced', 'All records synced');
}

function replaceRemoteRecords(records) {
  sessionLog = records;
  showingSharedRecords = true;
  rebuildLog();
}

function showLocalRecords() {
  sessionLog = localSessionLog;
  showingSharedRecords = false;
  editingRecordId = null;
  rebuildLog();
}

function rebuildLog() {
  const tbody = document.getElementById('log-body');
  if (tbody) tbody.innerHTML = '';
  sessionLog.forEach(appendLogRow);
  const source = document.getElementById('log-source');
  if (source) source.textContent = showingSharedRecords ? 'Shared records' : 'Local session';
  updateLogUI();
  renderRecordsBrowser();
}

function initializeRecordsBrowser() {
  const sortSelect = document.getElementById('records-sort-field');
  if (!sortSelect || sortSelect.dataset.initialized) return;
  sortSelect.innerHTML = RECORD_BROWSER_FIELDS.map(([key, label]) => `<option value="${key}">${escHtml(label)}</option>`).join('');
  sortSelect.value = recordBrowserSortField;
  sortSelect.dataset.initialized = 'true';
  sortSelect.addEventListener('change', () => {
    recordBrowserSortField = sortSelect.value;
    recordBrowserPage = 0;
    renderRecordsBrowser();
  });
  document.getElementById('records-search')?.addEventListener('input', event => {
    recordBrowserSearch = event.target.value.trim().toLocaleLowerCase();
    recordBrowserPage = 0;
    renderRecordsBrowser();
  });
  document.getElementById('records-page-size')?.addEventListener('change', event => {
    recordBrowserPageSize = Number(event.target.value) || 50;
    recordBrowserPage = 0;
    renderRecordsBrowser();
  });
  document.getElementById('records-sort-direction')?.addEventListener('click', event => {
    recordBrowserSortDescending = !recordBrowserSortDescending;
    event.currentTarget.textContent = recordBrowserSortDescending ? 'Descending' : 'Ascending';
    renderRecordsBrowser();
  });
  document.getElementById('records-add-filter')?.addEventListener('click', () => {
    recordBrowserFilters.push({ field: 'ware', operator: 'contains', value: '' });
    recordBrowserPage = 0;
    renderRecordFilterControls();
    renderRecordsBrowser();
  });
  document.getElementById('records-clear-filters')?.addEventListener('click', () => {
    recordBrowserFilters = [];
    recordBrowserSearch = '';
    const search = document.getElementById('records-search');
    if (search) search.value = '';
    recordBrowserPage = 0;
    renderRecordFilterControls();
    renderRecordsBrowser();
  });
  const filterList = document.getElementById('records-filters');
  filterList?.addEventListener('input', handleRecordFilterChange);
  filterList?.addEventListener('change', handleRecordFilterChange);
  filterList?.addEventListener('click', event => {
    const removeButton = event.target.closest('[data-remove-filter]');
    if (!removeButton) return;
    recordBrowserFilters.splice(Number(removeButton.dataset.removeFilter), 1);
    recordBrowserPage = 0;
    renderRecordFilterControls();
    renderRecordsBrowser();
  });
  document.getElementById('records-prev-page')?.addEventListener('click', () => {
    recordBrowserPage = Math.max(0, recordBrowserPage - 1);
    renderRecordsBrowser();
  });
  document.getElementById('records-next-page')?.addEventListener('click', () => {
    recordBrowserPage++;
    renderRecordsBrowser();
  });
  document.getElementById('records-table-body')?.addEventListener('click', event => {
    const button = event.target.closest('[data-view-record]');
    if (button) showRecordDetails(button.dataset.viewRecord);
  });
  document.getElementById('record-details-close')?.addEventListener('click', closeRecordDetails);
  document.getElementById('record-details-edit')?.addEventListener('click', () => {
    if (selectedRecordDetailsId) startRemoteEdit(selectedRecordDetailsId);
  });
  renderRecordFilterControls();
}

function handleRecordFilterChange(event) {
  const row = event.target.closest('[data-filter-index]');
  if (!row) return;
  const index = Number(row.dataset.filterIndex);
  const filter = recordBrowserFilters[index];
  if (!filter) return;
  if (event.target.matches('[data-filter-field]')) filter.field = event.target.value;
  if (event.target.matches('[data-filter-operator]')) filter.operator = event.target.value;
  if (event.target.matches('[data-filter-value]')) filter.value = event.target.value;
  const valueInput = row.querySelector('[data-filter-value]');
  if (valueInput) valueInput.disabled = filter.operator === 'empty' || filter.operator === 'notEmpty';
  recordBrowserPage = 0;
  renderRecordsBrowser();
}

function renderRecordFilterControls() {
  const container = document.getElementById('records-filters');
  if (!container) return;
  container.innerHTML = recordBrowserFilters.map((filter, index) => `
    <div class="record-filter" data-filter-index="${index}">
      <label>Field<select data-filter-field>${RECORD_BROWSER_FIELDS.map(([key, label]) => `<option value="${key}"${filter.field === key ? ' selected' : ''}>${escHtml(label)}</option>`).join('')}</select></label>
      <label>Match<select data-filter-operator>
        <option value="contains"${filter.operator === 'contains' ? ' selected' : ''}>Contains</option>
        <option value="equals"${filter.operator === 'equals' ? ' selected' : ''}>Is</option>
        <option value="startsWith"${filter.operator === 'startsWith' ? ' selected' : ''}>Starts with</option>
        <option value="empty"${filter.operator === 'empty' ? ' selected' : ''}>Is empty</option>
        <option value="notEmpty"${filter.operator === 'notEmpty' ? ' selected' : ''}>Is not empty</option>
      </select></label>
      <label class="filter-value">Value<input data-filter-value value="${escHtml(filter.value)}"${filter.operator === 'empty' || filter.operator === 'notEmpty' ? ' disabled' : ''}></label>
      <button class="btn btn-ghost btn-sm" type="button" data-remove-filter="${index}" aria-label="Remove filter">Remove</button>
    </div>`).join('');
}

function recordBrowserValue(record, key) {
  if (key === 'decorations') {
    return (record.decorations || []).map(decoration => Object.values(decoration).filter(Boolean).join(' ')).join(' ');
  }
  if (key === 'photos') return String((record.photos || []).length);
  const value = record[key];
  return value == null ? '' : String(value);
}

function recordPassesFilter(record, filter) {
  const actual = recordBrowserValue(record, filter.field).trim();
  const value = String(filter.value || '').trim();
  if (filter.operator === 'empty') return !actual;
  if (filter.operator === 'notEmpty') return Boolean(actual);
  if (!value) return true;
  if (filter.operator === 'equals') return actual.toLocaleLowerCase() === value.toLocaleLowerCase();
  if (filter.operator === 'startsWith') return actual.toLocaleLowerCase().startsWith(value.toLocaleLowerCase());
  return actual.toLocaleLowerCase().includes(value.toLocaleLowerCase());
}

function compareRecordValues(first, second, field) {
  const a = recordBrowserValue(first, field);
  const b = recordBrowserValue(second, field);
  if (RECORD_BROWSER_NUMERIC_FIELDS.has(field)) return (Number(a) || 0) - (Number(b) || 0);
  if (RECORD_BROWSER_DATE_FIELDS.has(field)) {
    const aDate = Date.parse(a) || 0;
    const bDate = Date.parse(b) || 0;
    return aDate - bDate;
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function renderRecordsBrowser() {
  const tableBody = document.getElementById('records-table-body');
  if (!tableBody) return;
  const search = recordBrowserSearch;
  let matches = sessionLog.filter(record => {
    const matchesSearch = !search || RECORD_BROWSER_FIELDS.some(([key]) => recordBrowserValue(record, key).toLocaleLowerCase().includes(search));
    return matchesSearch && recordBrowserFilters.every(filter => recordPassesFilter(record, filter));
  });
  matches.sort((a, b) => compareRecordValues(a, b, recordBrowserSortField) * (recordBrowserSortDescending ? -1 : 1));

  const pageCount = Math.max(1, Math.ceil(matches.length / recordBrowserPageSize));
  recordBrowserPage = Math.min(recordBrowserPage, pageCount - 1);
  const pageRecords = matches.slice(recordBrowserPage * recordBrowserPageSize, (recordBrowserPage + 1) * recordBrowserPageSize);
  tableBody.innerHTML = pageRecords.map(record => `
    <tr>
      <td>${escHtml(record.id)}</td><td>${escHtml(record.ware)}</td><td>${escHtml(record.material)}</td>
      <td>${escHtml(record.form)}</td><td>${escHtml(record.extColor)}</td><td>${escHtml(record.modifiedOn)}</td>
      <td><button class="btn btn-secondary btn-sm" type="button" data-view-record="${escHtml(record.remoteId)}">Details</button></td>
    </tr>`).join('');
  document.getElementById('records-result-count').textContent = `${matches.length} record${matches.length === 1 ? '' : 's'}`;
  document.getElementById('records-page-label').textContent = matches.length ? `Page ${recordBrowserPage + 1} of ${pageCount}` : '';
  document.getElementById('records-empty').classList.toggle('hidden', matches.length > 0);
  document.getElementById('records-prev-page').disabled = recordBrowserPage === 0 || !matches.length;
  document.getElementById('records-next-page').disabled = recordBrowserPage >= pageCount - 1 || !matches.length;
  if (selectedRecordDetailsId && !sessionLog.some(record => record.remoteId === selectedRecordDetailsId)) closeRecordDetails();
}

function showRecordDetails(remoteId) {
  const record = sessionLog.find(item => item.remoteId === remoteId);
  if (!record) return;
  selectedRecordDetailsId = remoteId;
  const details = document.getElementById('record-details');
  const fields = RECORD_BROWSER_FIELDS.filter(([key]) => key !== 'photos');
  document.getElementById('record-details-content').innerHTML = fields.map(([key, label]) => {
    const value = recordBrowserValue(record, key);
    if (!value) return '';
    return `<div class="record-detail-field"><span class="record-detail-label">${escHtml(label)}</span>${escHtml(value)}</div>`;
  }).join('') + ((record.photos || []).length ? `<div class="record-detail-photos">${record.photos.map(photo => `<a href="${escHtml(photo.url)}" target="_blank" rel="noopener"><img src="${escHtml(photo.url)}" alt="${escHtml(photo.name || 'Record photo')}"></a>`).join('')}</div>` : '');
  details.classList.remove('hidden');
  details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeRecordDetails() {
  selectedRecordDetailsId = null;
  document.getElementById('record-details')?.classList.add('hidden');
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
  if (!editingRecordId) {
    suspendedNewRecordDraft = {
      record: { ...currentRecord, photos: [...(currentRecord.photos || [])], decorations: currentRecord.decorations.map(decoration => ({ ...decoration })) },
      step: currentStep,
      pendingPhotoFiles: typeof pendingPhotoFiles === 'undefined' ? [] : [...pendingPhotoFiles],
      pendingPhotoDeletes: typeof pendingPhotoDeletes === 'undefined' ? [] : [...pendingPhotoDeletes],
    };
  }
  editingRecordId = remoteId;
  currentRecord = { ...record, photos: [...(record.photos || [])], decorations: record.decorations.map(decoration => ({ ...decoration })) };
  if (typeof pendingPhotoFiles !== 'undefined') pendingPhotoFiles = [];
  if (typeof pendingPhotoDeletes !== 'undefined') pendingPhotoDeletes = [];
  currentStep = 0;
  if (typeof showRecordEntryView === 'function') showRecordEntryView();
  else renderStep(0);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelRemoteEdit() {
  if (!editingRecordId) return;
  editingRecordId = null;
  restoreNewRecordDraft();
  if (typeof showRecordEntryView === 'function') showRecordEntryView();
  else renderStep(currentStep);
}

function restoreNewRecordDraft() {
  if (suspendedNewRecordDraft) {
    currentRecord = suspendedNewRecordDraft.record;
    currentStep = suspendedNewRecordDraft.step;
    if (typeof pendingPhotoFiles !== 'undefined') pendingPhotoFiles = suspendedNewRecordDraft.pendingPhotoFiles;
    if (typeof pendingPhotoDeletes !== 'undefined') pendingPhotoDeletes = suspendedNewRecordDraft.pendingPhotoDeletes;
    suspendedNewRecordDraft = null;
    return;
  }
  currentRecord = newRecord();
  currentStep = 0;
  if (typeof pendingPhotoFiles !== 'undefined') pendingPhotoFiles = [];
  if (typeof pendingPhotoDeletes !== 'undefined') pendingPhotoDeletes = [];
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
