/* eslint-disable no-undef */
try {
  importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

  self.addEventListener('install', () => { try { self.skipWaiting(); } catch (e) {} });
  self.addEventListener('activate', (event) => { event.waitUntil((async () => { try { await self.clients.claim(); } catch (e) {} })()); });

  firebase.initializeApp({
    apiKey: "AIzaSyB4nSpGhucC0NR57Zpu_syg86sjdFtLtaU",
    authDomain: "hs-jig-b2093.firebaseapp.com",
    projectId: "hs-jig-b2093",
    messagingSenderId: "117861579792",
    appId: "1:117861579792:web:93de9aeca7771940745e95"
  });

  const messaging = firebase.messaging();
  function buildOptions(payload) {
    const n = payload?.notification || {};
    return {
      body: n.body || '',
      icon: n.icon || undefined,
      data: payload?.data || {},
      vibrate: [150, 80, 150],
      tag: (payload?.data && payload.data.tag) || 'tms-notification',
      renotify: true,
      requireInteraction: false,
      actions: [
        { action: 'open', title: '열기' }
      ],
      timestamp: Date.now()
    };
  }

  if (messaging && typeof messaging.onBackgroundMessage === 'function') {
    messaging.onBackgroundMessage(function (payload) {
      const title = (payload?.notification?.title) || '알림';
      const options = buildOptions(payload);
      self.registration.showNotification(title, options);
    });
  } else if (messaging && typeof messaging.setBackgroundMessageHandler === 'function') {
    messaging.setBackgroundMessageHandler(function (payload) {
      const title = (payload?.notification?.title) || '알림';
      const options = buildOptions(payload);
      return self.registration.showNotification(title, options);
    });
  }

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.action === 'open' ? (event.notification?.data?.url || '/') : (event.notification?.data?.url || '/');
    event.waitUntil((async () => {
      const clientsArr = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of clientsArr) { if (c.url === url && 'focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow(url);
    })());
  });
} catch (e) {
  // fail-safe
}


