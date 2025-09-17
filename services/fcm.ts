import firebase from 'firebase/compat/app';
import 'firebase/compat/messaging';
import 'firebase/compat/firestore';
import { db, auth } from '../firebaseConfig';

// IMPORTANT: Use the provided VAPID public key for Web Push
const VAPID_PUBLIC_KEY = 'BCiXh2gG9sI7meQzRYxF6cm1gLDY94KPb_IV3tChfzW1nVQLjw7IAxCb253nNarOYpaqmVz5t0SEHY83P8DFph8';

export type FcmInitResult = {
  token: string | null;
  permission: NotificationPermission;
};

function isSupportedBrowser(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export async function initFCM(): Promise<FcmInitResult> {
  if (!isSupportedBrowser()) {
    return { token: null, permission: 'denied' };
  }

  try {
    // Register service worker at project root
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    // Request notification permission if needed
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return { token: null, permission };
    }

    const messaging = firebase.messaging.isSupported ? (firebase.messaging.isSupported() ? firebase.messaging() : null) : firebase.messaging();
    if (!messaging) {
      return { token: null, permission };
    }

    // Get token with VAPID key and service worker registration
    const token = await messaging.getToken({ vapidKey: VAPID_PUBLIC_KEY, serviceWorkerRegistration: registration as ServiceWorkerRegistration });

    const saveTokenForUser = async (uid: string, newToken: string) => {
      try {
        const userAgent = navigator.userAgent;
        const language = navigator.language;
        const tokenRef = db
          .collection('users')
          .doc(uid)
          .collection('fcmTokens')
          .doc(newToken);

        const previousToken = ((): string | null => {
          try { return localStorage.getItem('fcmToken'); } catch { return null; }
        })();

        await tokenRef.set(
          {
            token: newToken,
            platform: 'web',
            permission,
            userAgent,
            language,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            enabled: true,
          },
          { merge: true }
        );

        try { localStorage.setItem('fcmToken', newToken); } catch {}

        // Disable older tokens for this device (same userAgent) to avoid duplicates
        const snap = await db.collection('users').doc(uid).collection('fcmTokens').get();
        const batch = db.batch();
        snap.docs.forEach((doc) => {
          const data = doc.data() || {};
          const docToken = doc.id;
          if (docToken !== newToken && data.userAgent === userAgent && data.enabled !== false) {
            batch.update(doc.ref, { enabled: false, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
          }
        });
        // Also explicitly disable previousToken if present and different
        if (previousToken && previousToken !== newToken) {
          const prevRef = db.collection('users').doc(uid).collection('fcmTokens').doc(previousToken);
          batch.set(prevRef, { enabled: false, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }
        await batch.commit();
      } catch (err) {
        console.error('Failed to save/rotate FCM token:', err);
      }
    };

    // Link token to authenticated user when available
    if (token) {
      const currentUser = auth.currentUser;
      if (currentUser?.uid) {
        saveTokenForUser(currentUser.uid, token);
      } else {
        const unsub = auth.onAuthStateChanged((user) => {
          if (user?.uid) {
            saveTokenForUser(user.uid, token);
          }
          unsub();
        });
      }
    }

    // Foreground message handler
    messaging.onMessage((payload) => {
      // Fallback to simple notification if page is in focus
      const title = payload.notification?.title ?? '알림';
      const body = payload.notification?.body ?? '';
      const icon = payload.notification?.icon;
      if (document.hidden === false) {
        // Show a basic notification via SW to keep UX consistent
        registration.showNotification(title, { body, icon });
      }
      // You can hook into your in-app toast system here if desired
      // e.g., toast(`${title}: ${body}`)
    });

    // Token refresh handler (if supported by compat SDK)
    const anyMessaging: any = messaging as any;
    if (anyMessaging && typeof anyMessaging.onTokenRefresh === 'function') {
      anyMessaging.onTokenRefresh(async () => {
        try {
          const refreshedToken = await messaging.getToken({ vapidKey: VAPID_PUBLIC_KEY, serviceWorkerRegistration: registration as ServiceWorkerRegistration });
          const currentUser = auth.currentUser;
          if (currentUser?.uid && refreshedToken) {
            await saveTokenForUser(currentUser.uid, refreshedToken);
          }
        } catch (e) {
          console.error('FCM token refresh failed:', e);
        }
      });
    }

    return { token, permission };
  } catch (error) {
    console.error('FCM init error:', error);
    return { token: null, permission: Notification.permission };
  }
}


