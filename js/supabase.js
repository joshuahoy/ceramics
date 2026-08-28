'use strict';

const SUPABASE_URL = 'https://ebkryqlhnowadikhxkpf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bc10RkwbY4XZnp13wEweGg_j76BFthA';
let supabaseClient = null;

function setSyncStatus(status, message) {
  const indicator = document.getElementById('sync-status');
  if (!indicator) return;
  indicator.dataset.status = status;
  indicator.textContent = message;
}

function mapRecordToDatabase(record) {
  const numericFields = [
    'thickness', 'maxSize', 'weight', 'mendedWeight', 'rimLength', 'rimDiam',
    'mendedRimDiam', 'baseLength', 'baseDiam', 'mendedBaseDiam',
  ];
  const row = {
    id: record.remoteId,
    artifact_id: record.id,
    count: Number(record.count) || 1,
    material: record.material || null,
    ware: record.ware || null,
    manu_tech: record.manuTech || null,
    vessel_cat: record.vesselCat || null,
    form: record.form || null,
    completeness: record.completeness || null,
    ext_surface: record.extSurface || null,
    ext_color: record.extColor || null,
    int_surface: record.intSurface || null,
    int_color: record.intColor || null,
    paste_color: record.pasteColor || null,
    oxidized: record.oxidized || null,
    burning: record.burning || null,
    wear_location: record.wearLocation || null,
    wear_pattern: record.wearPattern || null,
    post_mfg_mod: record.postMfgMod || null,
    decorated: record.decorated || null,
    decorations: record.decorations || [],
    base_mark: record.baseMark || null,
    base_mark_color: record.baseMarkColor || null,
    base_mark_ref: record.baseMarkRef || null,
    notes: record.notes || null,
  };
  numericFields.forEach(field => {
    const value = record[field];
    row[field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)] = value === '' || value == null ? null : Number(value);
  });
  return row;
}

function mapDatabaseToRecord(row) {
  return {
    remoteId: row.id,
    syncStatus: 'synced',
    createdOn: row.created_at || '', createdBy: row.created_by || '',
    modifiedOn: row.updated_at || '', modifiedBy: row.modified_by || row.created_by || '',
    id: row.artifact_id || '', count: String(row.count || 1), material: row.material || '',
    ware: row.ware || '', manuTech: row.manu_tech || '', vesselCat: row.vessel_cat || '',
    form: row.form || '', completeness: row.completeness || '', extSurface: row.ext_surface || '',
    extColor: row.ext_color || '', intSurface: row.int_surface || '', intColor: row.int_color || '',
    pasteColor: row.paste_color || '', oxidized: row.oxidized || '', burning: row.burning || '',
    wearLocation: row.wear_location || '', wearPattern: row.wear_pattern || '',
    postMfgMod: row.post_mfg_mod || '', decorated: row.decorated || '',
    decorations: Array.isArray(row.decorations) ? row.decorations : [],
    baseMark: row.base_mark || '', baseMarkColor: row.base_mark_color || '',
    baseMarkRef: row.base_mark_ref || '', thickness: row.thickness ?? '', maxSize: row.max_size ?? '',
    weight: row.weight ?? '', mendedWeight: row.mended_weight ?? '', rimLength: row.rim_length ?? '',
    rimDiam: row.rim_diam ?? '', mendedRimDiam: row.mended_rim_diam ?? '',
    baseLength: row.base_length ?? '', baseDiam: row.base_diam ?? '',
    mendedBaseDiam: row.mended_base_diam ?? '', notes: row.notes || '',
  };
}

async function initializeSupabase() {
  if (!window.supabase) {
    setSyncStatus('error', 'Sync unavailable');
    return null;
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const { data: { session } } = await supabaseClient.auth.getSession();
  await updateAccountUI(session);
  supabaseClient.auth.onAuthStateChange((event, nextSession) => {
    if (event === 'PASSWORD_RECOVERY' && typeof openPasswordResetModal === 'function') {
      openPasswordResetModal();
    }
    updateAccountUI(nextSession);
  });
  return session;
}

async function updateAccountUI(session) {
  const accountButton = document.getElementById('account-btn');
  if (!accountButton) return;
  if (!session) {
    accountButton.textContent = 'Sign in';
    accountButton.title = 'Sign in to sync shared records';
    setSyncStatus('offline', 'Local only');
    return;
  }
  accountButton.textContent = 'Sign out';
  accountButton.title = session.user.email || 'Sign out';
  setSyncStatus('synced', 'Loading shared records');
  if (typeof hydrateRemoteRecords === 'function') await hydrateRemoteRecords();
}

async function signInWithPassword(email, password) {
  if (!supabaseClient) throw new Error('Supabase is not available.');
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

async function updatePassword(password) {
  if (!supabaseClient) throw new Error('Supabase is not available.');
  const { error } = await supabaseClient.auth.updateUser({ password });
  if (error) throw error;
}

async function signOut() {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

async function getSupabaseSession() {
  if (!supabaseClient) return null;
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}

async function loadRecords() {
  if (!supabaseClient) return [];
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return [];
  const { data, error } = await supabaseClient.from('ceramic_records').select('*').order('created_at');
  if (error) throw error;
  return data.map(mapDatabaseToRecord);
}

async function syncRecordToSupabase(record) {
  if (!supabaseClient) return false;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return false;
  setSyncStatus('sending', 'Saving record');
  const { data, error } = await supabaseClient.from('ceramic_records')
    .insert(mapRecordToDatabase(record))
    .select('created_at, created_by, updated_at, modified_by')
    .single();
  if (error) throw error;
  record.createdOn = data.created_at || '';
  record.createdBy = data.created_by || '';
  record.modifiedOn = data.updated_at || '';
  record.modifiedBy = data.modified_by || data.created_by || '';
  record.syncStatus = 'synced';
  setSyncStatus('synced', 'All records synced');
  return true;
}
