'use strict';

const FIREBASE_ALLOWED_EMAILS = new Set([
  'hoy.joshua@gmail.com',
  's.payne1191@gmail.com',
]);

let firebaseAuth = null;
let firebaseDb = null;
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

async function initializeFirebase() {
  const config = window.FIREBASE_CONFIG;
  if (!config?.apiKey || !config?.projectId) {
    setSyncStatus('error', 'Firebase is not configured');
    return null;
  }

  const [appModule, authModule, firestoreModule] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js'),
  ]);
  firebaseApi = { ...authModule, ...firestoreModule };
  const app = appModule.initializeApp(config);
  firebaseAuth = authModule.getAuth(app);
  firebaseDb = firestoreModule.getFirestore(app);
  authModule.onAuthStateChanged(firebaseAuth, handleAuthStateChange);
  return firebaseAuth.currentUser;
}

async function handleAuthStateChange(user) {
  if (!user) {
    stopRecordSubscription();
    updateAccountUI(null);
    setSyncStatus('offline', 'Local only');
    if (typeof showLocalRecords === 'function') showLocalRecords();
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
  if (!accountButton) return;
  accountButton.textContent = user ? 'Sign out' : 'Sign in with Google';
  accountButton.title = user?.email || 'Sign in with Google';
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

async function createRecord(record) {
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
  Object.assign(record, row);
  setSyncStatus('synced', 'All records synced');
  return true;
}

async function updateRecord(record) {
  const user = getFirebaseUser();
  if (!user) throw new Error('Sign in to save changes.');
  setSyncStatus('sending', 'Saving changes');
  const row = normalizeRecord({ ...record, modifiedOn: new Date().toISOString(), modifiedBy: user.email });
  await firebaseApi.setDoc(firebaseApi.doc(firebaseDb, 'ceramicRecords', row.remoteId), row, { merge: true });
  setSyncStatus('synced', 'Changes saved');
  return row;
}