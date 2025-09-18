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

    // onMessage 리스너는 한 번만 등록
    messaging.onMessage(async (payload) => {
      // 브라우저가 자동으로 알림을 표시하므로 별도로 showNotification 호출하지 않음
      console.log('FCM 메시지 수신:', payload);
    });

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


