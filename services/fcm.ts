import firebase from 'firebase/compat/app';
import 'firebase/compat/messaging';
import 'firebase/compat/firestore';
import { db, auth } from '../firebaseConfig';

const VAPID_PUBLIC_KEY = 'BCiXh2gG9sI7meQzRYxF6cm1gLDY94KPb_IV3tChfzW1nVQLjw7IAxCb253nNarOYpaqmVz5t0SEHY83P8DFph8';

export type FcmInitResult = { token: string | null; permission: NotificationPermission };

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export async function initFCM(): Promise<FcmInitResult> {
  if (!isSupported()) return { token: null, permission: 'denied' };
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted') return { token: null, permission };

    const messaging = firebase.messaging.isSupported ? (firebase.messaging.isSupported() ? firebase.messaging() : null) : firebase.messaging();
    if (!messaging) return { token: null, permission };

    const token = await messaging.getToken({ vapidKey: VAPID_PUBLIC_KEY, serviceWorkerRegistration: registration as ServiceWorkerRegistration });
    if (token) await saveToken(token, permission);

    const anyMessaging: any = messaging as any;
    if (anyMessaging && typeof anyMessaging.onTokenRefresh === 'function') {
      anyMessaging.onTokenRefresh(async () => {
        const refreshed = await messaging.getToken({ vapidKey: VAPID_PUBLIC_KEY, serviceWorkerRegistration: registration as ServiceWorkerRegistration });
        if (refreshed) await saveToken(refreshed, permission);
      });
    }

    messaging.onMessage(async (payload) => {
      const title = payload.notification?.title ?? '알림';
      const body = payload.notification?.body ?? '';
      const icon = payload.notification?.icon;
      const options: NotificationOptions = {
        body,
        icon,
        data: payload.data || {},
        vibrate: [150, 80, 150],
        tag: (payload?.data as any)?.tag || 'tms-notification',
        renotify: true,
        requireInteraction: false,
        actions: [{ action: 'open', title: '열기' }],
        timestamp: Date.now()
      } as any;
      if (!document.hidden) registration.showNotification(title, options);
    });

    return { token, permission };
  } catch (e) {
    console.error('FCM init error:', e);
    return { token: null, permission: Notification.permission };
  }
}

async function saveToken(token: string, permission: NotificationPermission) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  const ref = db.collection('users').doc(uid).collection('fcmTokens').doc(token);
  await ref.set({ token, platform: 'web', permission, userAgent, language, enabled: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  try { localStorage.setItem('fcmToken', token); } catch {}
}


