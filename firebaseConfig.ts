import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAFdnBgl1jlKGUYEvK2zNncm4T_z5t2kBc",
  authDomain: "control-6a11d.firebaseapp.com",
  projectId: "control-6a11d",
  storageBucket: "control-6a11d.firebasestorage.app",
  messagingSenderId: "739974091539",
  appId: "1:739974091539:web:6de6536e2178ed3d0440e6",
  measurementId: "G-YDJBRPW5BY"
};

// Firebase app initialization
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Get Firebase service instances
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

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
export { db, storage, auth };