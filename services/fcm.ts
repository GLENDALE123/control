import firebase from 'firebase/compat/app';
import 'firebase/compat/messaging';
import 'firebase/compat/firestore';
import { db, auth } from '../firebaseConfig';

const VAPID_PUBLIC_KEY = 'BJJPTFCxIgh2ddhl1vUAzQ-Cj_0RvUCx9xuxRdM9pb061G9YkCWqe9561VQDTnrPVm8j4SldzEl_2h0NPNlh_tE';

export type FcmInitResult = { token: string | null; permission: NotificationPermission };

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

// FCM 초기화 상태를 추적하여 중복 초기화 방지
let isFCMInitialized = false;

// Stable client identifier to distinguish browser/PWA instances on the same device
function getClientId(): string {
  try {
    const key = 'fcmClientId';
    let id = localStorage.getItem(key);
    if (!id) {
      // Prefer crypto.randomUUID when available
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return 'unknown-client';
  }
}

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
    if (token) {
      await migrateExistingTokens();
      await saveToken(token, permission);
    }

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
  const clientId = getClientId();
  const tokensCol = db.collection('users').doc(uid).collection('fcmTokens');
  const ref = tokensCol.doc(token);
  await ref.set({ token, platform: 'web', clientId, permission, userAgent, language, enabled: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });

  // Disable older tokens for the same client to prevent duplicate notifications on the same device/app instance
  try {
    const snapshot = await tokensCol.where('platform', '==', 'web').where('clientId', '==', clientId).get();
    snapshot.forEach((doc) => {
      if (doc.id !== token) {
        doc.ref.set({ enabled: false, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }
    });
  } catch (e) {
    // best-effort cleanup
  }
  try { localStorage.setItem('fcmToken', token); } catch {}
}

// Migrate existing tokens to add clientId and disable duplicates
async function migrateExistingTokens(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  
  try {
    const tokensCol = db.collection('users').doc(uid).collection('fcmTokens');
    const snapshot = await tokensCol.where('platform', '==', 'web').where('enabled', '==', true).get();
    
    if (snapshot.empty) return;
    
    const clientId = getClientId();
    const batch = db.batch();
    let hasUpdates = false;
    
    // Group tokens by userAgent (same device/browser type)
    const tokensByAgent: { [key: string]: any[] } = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const agent = data.userAgent || 'unknown';
      if (!tokensByAgent[agent]) tokensByAgent[agent] = [];
      tokensByAgent[agent].push({ doc, data });
    });
    
    // For each userAgent group, keep only the latest token and disable others
    Object.entries(tokensByAgent).forEach(([agent, tokens]) => {
      if (tokens.length <= 1) return;
      
      // Sort by updatedAt (newest first)
      tokens.sort((a, b) => {
        const aTime = a.data.updatedAt?.toMillis?.() || 0;
        const bTime = b.data.updatedAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      // Keep the first (newest) token, disable the rest
      for (let i = 1; i < tokens.length; i++) {
        batch.update(tokens[i].doc.ref, { 
          enabled: false, 
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          disabledReason: 'duplicate-token-cleanup'
        });
        hasUpdates = true;
      }
      
      // Add clientId to the kept token if it doesn't have one
      if (!tokens[0].data.clientId) {
        batch.update(tokens[0].doc.ref, { 
          clientId,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        hasUpdates = true;
      }
    });
    
    if (hasUpdates) {
      await batch.commit();
      console.log('FCM token migration completed: disabled duplicate tokens');
    }
  } catch (e) {
    console.error('FCM token migration failed:', e);
  }
}


