import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/auth';
import 'firebase/compat/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB4nSpGhucC0NR57Zpu_syg86sjdFtLtaU",
  authDomain: "hs-jig-b2093.firebaseapp.com",
  projectId: "hs-jig-b2093",
  storageBucket: "hs-jig-b2093.firebasestorage.app",
  messagingSenderId: "117861579792",
  appId: "1:117861579792:web:93de9aeca7771940745e95"
};

// Firebase app initialization
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Get Firebase service instances
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();
const messaging = firebase.messaging();

// Firestore settings must be configured before any other Firestore methods are called.
// Force long-polling to work around potential network restrictions (e.g., firewalls
// blocking WebSockets).
db.settings({
  experimentalForceLongPolling: true,
});

// Enable persistence. This should be called after settings but before any data operations.
db.enablePersistence()
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // This is okay, happens when multiple tabs are open.
      console.warn('Firestore persistence failed, likely due to multiple tabs open.');
    } else if (err.code == 'unimplemented') {
      // The browser does not support all of the features required to enable persistence.
      console.warn('Firestore persistence is not supported in this browser.');
    }
  });

// Export Firebase service instances for use in other components
export { db, storage, auth, messaging };