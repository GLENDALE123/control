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
  // Deduplication set for message IDs
  const displayedMessageIds = new Set();

  function getMessageId(payload) {
    return (payload && (payload.messageId || (payload.data && (payload.data['google.message_id'] || payload.data['message_id'])))) || undefined;
  }

  function buildOptions(payload) {
    const n = payload?.notification || {};
    return {
      body: n.body || '',
      icon: n.icon || undefined,
      data: payload?.data || {},
      vibrate: [150, 80, 150],
      tag: (payload?.data && (payload.data.tag || getMessageId(payload))) || 'tms-notification',
      renotify: true,
      requireInteraction: false,
      actions: [
        { action: 'open', title: '열기' }
      ],
      timestamp: Date.now()
    };
  }

  function maybeShowNotification(payload) {
    // If notification payload exists, the browser may auto-show; avoid double showing
    if (payload && payload.notification) {
      return; // Let the platform handle it
    }
    const msgId = getMessageId(payload);
    if (msgId && displayedMessageIds.has(msgId)) return;
    if (msgId) displayedMessageIds.add(msgId);
    const title = (payload?.data && (payload.data.title)) || '알림';
    const options = buildOptions(payload);
    self.registration.showNotification(title, options);
  }

  if (messaging && typeof messaging.onBackgroundMessage === 'function') {
    messaging.onBackgroundMessage(function (payload) {
      maybeShowNotification(payload);
    });
  } else if (messaging && typeof messaging.setBackgroundMessageHandler === 'function') {
    messaging.setBackgroundMessageHandler(function (payload) {
      maybeShowNotification(payload);
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


