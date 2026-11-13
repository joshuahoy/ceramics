'use strict';

const FIREBASE_ALLOWED_EMAILS = new Set([
  'hoy.joshua@gmail.com',
  's.payne1191@gmail.com',
]);

let firebaseAuth = null;
let firebaseDb = null;
let firebaseStorage = null;
let firebaseApi = null;
let unsubscribeRecords = null;

function setSyncStatus(status, message) {
  const indicator = document.getElementById('sync-status');
  if (!indicator) return;
  indicator.dataset.status = status;
  indicator.textContent = message;
}

function isAllowedUser(user) {
  return Boolean(user?.email && FIREBASE_ALLOWED_EMAILS.has(user.email.toLowerCase()));
}

function isFirebaseAdmin(user = getFirebaseUser()) {
  return user?.email?.toLowerCase() === 'hoy.joshua@gmail.com';
}

async function initializeFirebase() {
  const config = window.FIREBASE_CONFIG;
  if (!config?.apiKey || !config?.projectId) {
    setSyncStatus('error', 'Firebase is not configured');
    return null;
  }

  const [appModule, authModule, firestoreModule, storageModule] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js'),
    import('https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js'),
  ]);
  firebaseApi = { ...authModule, ...firestoreModule, ...storageModule };
  const app = appModule.initializeApp(config);
  firebaseAuth = authModule.getAuth(app);
  firebaseDb = firestoreModule.getFirestore(app);
  firebaseStorage = storageModule.getStorage(app);
  authModule.onAuthStateChanged(firebaseAuth, handleAuthStateChange);
  return firebaseAuth.currentUser;
}

async function handleAuthStateChange(user) {
  if (!user) {
    stopRecordSubscription();
    updateAccountUI(null);
    setSyncStatus('offline', 'Local only');
    if (typeof showLocalRecords === 'function') showLocalRecords();
    if (typeof showRecordEntryView === 'function') showRecordEntryView();
    return;
  }
  if (!isAllowedUser(user)) {
    await firebaseApi.signOut(firebaseAuth);
    setSyncStatus('error', 'This Google account is not authorized');
    return;
  }
  updateAccountUI(user);
  setSyncStatus('sending', 'Loading shared records');
  subscribeToRecords();
}

function updateAccountUI(user) {
  const accountButton = document.getElementById('account-btn');
  const importButton = document.getElementById('import-btn');
  const recordsTab = document.getElementById('records-view-btn');
  if (!accountButton) return;
  accountButton.textContent = user ? 'Sign out' : 'Sign in with Google';
  accountButton.title = user?.email || 'Sign in with Google';
  if (importButton) importButton.classList.toggle('hidden', !isFirebaseAdmin(user));
  if (recordsTab) recordsTab.classList.toggle('hidden', !user);
}

async function signInWithGoogle() {
  if (!firebaseAuth) throw new Error('Firebase is not available.');
  const provider = new firebaseApi.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await firebaseApi.signInWithPopup(firebaseAuth, provider);
  if (!isAllowedUser(result.user)) {
    await firebaseApi.signOut(firebaseAuth);
    throw new Error('This Google account is not authorized.');
  }
  return result.user;
}

async function signOut() {
  if (firebaseAuth) await firebaseApi.signOut(firebaseAuth);
}

function getFirebaseUser() {
  return firebaseAuth?.currentUser || null;
}

function normalizeRecord(record) {
  return {
    ...record,
    remoteId: record.remoteId || crypto.randomUUID(),
    syncStatus: 'synced',
    decorations: Array.isArray(record.decorations) ? record.decorations : [],
    photos: Array.isArray(record.photos) ? record.photos : [],
    createdOn: record.createdOn || '',
    createdBy: record.createdBy || '',
    modifiedOn: record.modifiedOn || '',
    modifiedBy: record.modifiedBy || '',
  };
}

function subscribeToRecords() {
  stopRecordSubscription();
  const recordsQuery = firebaseApi.query(
    firebaseApi.collection(firebaseDb, 'ceramicRecords'),
    firebaseApi.orderBy('createdOn', 'asc')
  );
  unsubscribeRecords = firebaseApi.onSnapshot(recordsQuery, snapshots => {
    const records = snapshots.docs.map(snapshot => normalizeRecord({ ...snapshot.data(), remoteId: snapshot.id }));
    if (typeof replaceRemoteRecords === 'function') replaceRemoteRecords(records);
    setSyncStatus('synced', 'All records synced');
  }, error => setSyncStatus('error', error.message || 'Unable to load shared records'));
}

function stopRecordSubscription() {
  if (unsubscribeRecords) unsubscribeRecords();
  unsubscribeRecords = null;
}

async function createRecord(record, photoFiles = []) {
  const user = getFirebaseUser();
  if (!user) return false;
  setSyncStatus('sending', 'Saving record');
  const now = new Date().toISOString();
  const row = normalizeRecord({
    ...record,
    createdOn: record.createdOn || now,
    createdBy: record.createdBy || user.email,
    modifiedOn: now,
    modifiedBy: user.email,
  });
  await firebaseApi.setDoc(firebaseApi.doc(firebaseDb, 'ceramicRecords', row.remoteId), row);
  row.photos = [...row.photos, ...await uploadRecordPhotos(row.remoteId, photoFiles, user.email)];
  if (photoFiles.length) {
    await firebaseApi.updateDoc(firebaseApi.doc(firebaseDb, 'ceramicRecords', row.remoteId), { photos: row.photos });
  }
  Object.assign(record, row);
  setSyncStatus('synced', 'All records synced');
  return true;
}

async function updateRecord(record, photoFiles = [], photosToDelete = []) {
  const user = getFirebaseUser();
  if (!user) throw new Error('Sign in to save changes.');
  setSyncStatus('sending', 'Saving changes');
  const row = normalizeRecord({ ...record, modifiedOn: new Date().toISOString(), modifiedBy: user.email });
  await firebaseApi.setDoc(firebaseApi.doc(firebaseDb, 'ceramicRecords', row.remoteId), row, { merge: true });
  row.photos = [...row.photos, ...await uploadRecordPhotos(row.remoteId, photoFiles, user.email)];
  if (photoFiles.length) {
    await firebaseApi.updateDoc(firebaseApi.doc(firebaseDb, 'ceramicRecords', row.remoteId), { photos: row.photos });
  }
  const deletions = await Promise.allSettled(photosToDelete.map(photo => {
    if (!photo.path) throw new Error('Photo is missing its Storage path.');
    return firebaseApi.deleteObject(firebaseApi.ref(firebaseStorage, photo.path));
  }));
  const photoCleanupFailed = deletions.some(result => result.status === 'rejected');
  if (photoCleanupFailed) {
    console.error('Record saved, but some photo files could not be deleted.', deletions);
    setSyncStatus('error', 'Changes saved; photo cleanup failed');
  } else {
    setSyncStatus('synced', 'Changes saved');
  }
  return { record: row, photoCleanupFailed };
}

async function importLegacyCsv(file) {
  const user = getFirebaseUser();
  if (!isFirebaseAdmin(user)) throw new Error('Only the Firebase admin can import records.');
  if (!file?.name.toLowerCase().endsWith('.csv')) throw new Error('Select a CSV export file.');
  const rows = parseCsv(await file.text());
  if (rows.length < 2) throw new Error('The CSV file has no records.');
  const headers = rows[0];
  const requiredHeaders = ['ID', 'Ware', 'Material'];
  const missing = requiredHeaders.filter(header => !headers.includes(header));
  if (missing.length) throw new Error(`CSV is missing required columns: ${missing.join(', ')}.`);

  const records = rows.slice(1)
    .filter(row => row.some(value => value.trim()))
    .map(row => legacyRowToRecord(headers, row, user.email));
  if (!records.length) throw new Error('The CSV file has no importable records.');

  const existing = await firebaseApi.getDocs(firebaseApi.collection(firebaseDb, 'ceramicRecords'));
  const existingKeys = new Set(existing.docs.map(snapshot => {
    const record = snapshot.data();
    return `${record.id || ''}\u0000${record.createdOn || ''}`;
  }));
  const uniqueRecords = records.filter(record => !existingKeys.has(`${record.id}\u0000${record.createdOn}`));
  const skipped = records.length - uniqueRecords.length;

  for (let index = 0; index < uniqueRecords.length; index += 400) {
    const batch = firebaseApi.writeBatch(firebaseDb);
    uniqueRecords.slice(index, index + 400).forEach(record => {
      batch.set(firebaseApi.doc(firebaseDb, 'ceramicRecords', record.remoteId), record);
    });
    await batch.commit();
  }
  return { imported: uniqueRecords.length, skipped, total: records.length };
}

function legacyRowToRecord(headers, row, userEmail) {
  const values = Object.fromEntries(headers.map((header, index) => [header, row[index] || '']));
  const decoration = index => ({
    intExt: '', location: '', technique: values[`Dec Technique ${index}`] || '', color: values[`Dec Color ${index}`] || '',
    stylElement: values[`Stylistic Element ${index}`] || '', motif: values[`Motif ${index}`] || '',
    genre: values[`Genre ${index}`] || '', patternName: index === 1 ? values['Pattern Name'] || '' : '', patternNotes: '',
  });
  const decorations = [decoration(1), decoration(2)].filter(item => Object.values(item).some(Boolean));
  const now = new Date().toISOString();
  return normalizeRecord({
    remoteId: crypto.randomUUID(),
    createdOn: values['Created On'] || now,
    createdBy: values['Created By'] || userEmail,
    modifiedOn: values['Modified On'] || values['Created On'] || now,
    modifiedBy: values['Modified By'] || values['Created By'] || userEmail,
    id: values.ID || '', count: values.Count || '1', ware: values.Ware || '', material: values.Material || '',
    manuTech: values['Manu Tech'] || '', vesselCat: values.Category || '', form: values.Form || '', completeness: values.Completeness || '',
    extSurface: values['Ext Surface'] || '', extColor: values['Ext Color'] || '', intSurface: values['Int Surface'] || '', intColor: values['Int Color'] || '',
    pasteColor: values['Paste Color'] || '', oxidized: values['Oxidized vs Reduced'] || 'Not Reduced', burning: values.Burning || 'Unburned',
    postMfgMod: values['Post-Mfg Mod'] || 'No', wearLocation: values['Wear Location'] || '', wearPattern: values['Wear Pattern'] || '',
    decorated: values.Decorated || (decorations.length ? 'Yes' : 'No'), decorations,
    baseMark: values['Base Mark'] || 'Not Applicable', baseMarkColor: values['Base Mark Color'] || '', baseMarkRef: values['Base Mark Ref'] || '',
    thickness: values['Thickness (mm)'] || '', maxSize: values['Max Size (mm)'] || '', weight: values['Weight (g)'] || '',
    rimLength: values['Rim Length (mm)'] || '', rimDiam: values['Rim Diam (mm)'] || '',
    baseLength: values['Base Length (mm)'] || '', baseDiam: values['Base Diam (mm)'] || '', notes: values.Notes || '', photos: [],
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index++; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(value); value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index++;
      row.push(value); rows.push(row); row = []; value = '';
    } else value += character;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

async function uploadRecordPhotos(recordId, photoFiles, userEmail) {
  if (!photoFiles.length) return [];
  if (!firebaseStorage) throw new Error('Firebase Storage is not available.');
  const uploads = await Promise.all(photoFiles.map(async file => {
    const image = await compressImage(file);
    const photoId = crypto.randomUUID();
    const path = `ceramic-records/${recordId}/${photoId}.jpg`;
    const storageRef = firebaseApi.ref(firebaseStorage, path);
    await firebaseApi.uploadBytes(storageRef, image, { contentType: 'image/jpeg' });
    return {
      id: photoId,
      path,
      url: await firebaseApi.getDownloadURL(storageRef),
      name: file.name,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userEmail,
    };
  }));
  return uploads;
}

async function compressImage(file) {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image.`);
  if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10 MB.`);
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error(`Unable to process ${file.name}.`)), 'image/jpeg', 0.82);
  });
}