import firebase from 'firebase/compat/app';
import 'firebase/compat/messaging';
import 'firebase/compat/firestore';
import { db, auth } from '../firebaseConfig';

const VAPID_PUBLIC_KEY = 'BCiXh2gG9sI7meQzRYxF6cm1gLDY94KPb_IV3tChfzW1nVQLjw7IAxCb253nNarOYpaqmVz5t0SEHY83P8DFph8';

export type FcmInitResult = { token: string | null; permission: NotificationPermission };

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

// FCM 초기화 상태를 추적하여 중복 초기화 방지
let isFCMInitialized = false;

export async function initFCM(): Promise<FcmInitResult> {
  if (!isSupported()) return { token: null, permission: 'denied' };
  if (isFCMInitialized) return { token: null, permission: Notification.permission };
  
  try {
    isFCMInitialized = true;
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

    // onMessage 리스너는 한 번만 등록하고, notification payload가 있으면 수동 표시하지 않음
    const globalAny: any = (window as any);
    if (!globalAny.__FCM_onMessageRegistered) {
      globalAny.__FCM_onMessageRegistered = true;
      messaging.onMessage(async (payload) => {
        try {
          // 대부분의 브라우저는 notification payload를 자동 표시하므로 중복 방지
          if ((payload as any)?.notification) return;
          if (document.hidden) return; // 백그라운드는 SW가 처리
          const registration = await navigator.serviceWorker.getRegistration();
          if (!registration) return;
          const title = (payload as any)?.data?.title || '알림';
          const body = (payload as any)?.data?.body || '';
          const icon = (payload as any)?.data?.icon;
          const tag = (payload as any)?.data?.tag || (payload as any)?.data?.['google.message_id'] || 'tms-notification';
          await registration.showNotification(title, { body, icon, data: (payload as any)?.data || {}, tag });
        } catch (e) {
          // no-op
        }
      });
    }

    return { token, permission };
  } catch (e) {
    console.error('FCM init error:', e);
    isFCMInitialized = false; // 에러 시 초기화 상태 리셋
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


