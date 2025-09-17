/* eslint-disable no-undef */
// Firebase Messaging service worker (compat)
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyB4nSpGhucC0NR57Zpu_syg86sjdFtLtaU",
  authDomain: "hs-jig-b2093.firebaseapp.com",
  projectId: "hs-jig-b2093",
  storageBucket: "hs-jig-b2093.appspot.com",
  messagingSenderId: "117861579792",
  appId: "1:117861579792:web:93de9aeca7771940745e95"
});

const messaging = firebase.messaging();

// Background messages
messaging.setBackgroundMessageHandler(function(payload) {
  const title = (payload && payload.notification && payload.notification.title) || '백그라운드 알림';
  const options = {
    body: (payload && payload.notification && payload.notification.body) || '',
    icon: (payload && payload.notification && payload.notification.icon) || undefined,
    data: payload?.data || {}
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(targetUrl));
});


