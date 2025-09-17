/* eslint-disable no-undef */
// Firebase Messaging service worker (compat, safe)
try {
  importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

  // Ensure immediate control
  self.addEventListener('install', () => {
    try { self.skipWaiting(); } catch (e) {}
  });
  self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
      try { await self.clients.claim(); } catch (e) {}
    })());
  });

  firebase.initializeApp({
    apiKey: "AIzaSyB4nSpGhucC0NR57Zpu_syg86sjdFtLtaU",
    authDomain: "hs-jig-b2093.firebaseapp.com",
    projectId: "hs-jig-b2093",
    storageBucket: "hs-jig-b2093.appspot.com",
    messagingSenderId: "117861579792",
    appId: "1:117861579792:web:93de9aeca7771940745e95"
  });

  const messaging = firebase.messaging();

  if (messaging && typeof messaging.onBackgroundMessage === 'function') {
    messaging.onBackgroundMessage(function (payload) {
      var n = (payload && payload.notification) || {};
      var title = n.title || '알림';
      var options = {
        body: n.body || '',
        icon: n.icon || undefined,
        data: (payload && payload.data) || {}
      };
      self.registration.showNotification(title, options);
    });
  } else if (messaging && typeof messaging.setBackgroundMessageHandler === 'function') {
    messaging.setBackgroundMessageHandler(function (payload) {
      var n = (payload && payload.notification) || {};
      var title = n.title || '알림';
      var options = {
        body: n.body || '',
        icon: n.icon || undefined,
        data: (payload && payload.data) || {}
      };
      return self.registration.showNotification(title, options);
    });
  }

  self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    try {
      var data = (event.notification && event.notification.data) || {};
      var targetUrl = data.url || '/';
      event.waitUntil((async () => {
        var windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })());
    } catch (e) {}
  });
} catch (e) {
  // Silently fail to avoid breaking app if SW bootstrap fails
}


