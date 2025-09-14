// Firebase 서비스 워커 스크립트
// 백그라운드에서 푸시 알림을 처리합니다

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyB4nSpGhucC0NR57Zpu_syg86sjdFtLtaU",
  authDomain: "hs-jig-b2093.firebaseapp.com",
  projectId: "hs-jig-b2093",
  storageBucket: "hs-jig-b2093.appspot.com",
  messagingSenderId: "117861579792",
  appId: "1:117861579792:web:93de9aeca7771940745e95"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// 메시징 인스턴스 가져오기
const messaging = firebase.messaging();

// 백그라운드 메시지 처리
messaging.onBackgroundMessage((payload) => {
  console.log('백그라운드에서 메시지를 받았습니다:', payload);
  
  const notificationTitle = payload.notification?.title || '새 알림';
  const notificationOptions = {
    body: payload.notification?.body || '새로운 알림이 있습니다.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data,
    actions: [
      {
        action: 'open',
        title: '열기'
      },
      {
        action: 'close',
        title: '닫기'
      }
    ]
  };

  // 알림 표시
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('알림이 클릭되었습니다:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    // 앱 열기
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // 이미 열린 창이 있으면 포커스
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // 새 창 열기
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});