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

    // Link token to authenticated user when available
    if (token) {
      const save = async (uid: string) => {
        try {
          const userAgent = navigator.userAgent;
          const language = navigator.language;
          const tokenRef = db
            .collection('users')
            .doc(uid)
            .collection('fcmTokens')
            .doc(token);
          await tokenRef.set(
            {
              token,
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
        } catch (err) {
          console.error('Failed to save FCM token for user:', err);
        }
      };

      // If already signed in, save immediately; otherwise wait for sign-in
      const currentUser = auth.currentUser;
      if (currentUser?.uid) {
        save(currentUser.uid);
      } else {
        const unsub = auth.onAuthStateChanged((user) => {
          if (user?.uid) {
            save(user.uid);
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

    return { token, permission };
  } catch (error) {
    console.error('FCM init error:', error);
    return { token: null, permission: Notification.permission };
  }
}


