// FCM 서버 예제 (Node.js + Express)
// 실제 프로덕션 환경에서는 이 서버를 사용하여 FCM Admin SDK로 푸시 알림을 전송합니다

const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 설정
app.use(cors());
app.use(express.json());

// Firebase Admin SDK 초기화
const serviceAccount = {
  type: "service_account",
  project_id: "hs-jig-b2093",
  private_key_id: "d7bbbf3d7aecb4879715affb7c2bbe3d26fbff93",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDKcys7oOPVWK0I\n3JzV8pJZ4n/+b8UrDV1SiU6pG8UTuweQff74Jkn/bF7jIjwVVKpiGWxCaMVFC+lO\nUNOlLzZB9HCOWi3fIfmOOwXi7tT5kkhXZ+JSU7SiZl5BwWmen+Iw5LXj+jOCCCGu\nTfMdYgOpNN0K6+XltxWcJGJebxw1FyhuMk+eIpFgju0fSPQh132B7gtQcNIOKiJj\nKM5CtasFUXcdtLNRgm++bNcOFFhr+O++o+fx9ycuNI6UACXyli56V+i9GyC0Jnfk\nB8mjdKw43bkSXwgXwRGXAjfW8TyBKIus/jlpkNt2kLGKoT+GE33agpChu+TklJeN\nmhAQ2V0zAgMBAAECggEABCv8Y5WsrDxQEIMvTi9Z+bUzqwQVnY4Acs92igCS/pWX\nkdAu3WE4nCVZDTgq4culWTEp7HJpQkN9EsqSmfBPn2tQmHZeRJ9YG6i2tdbzF5N+\nnyJ6ZPTpn4EZhyRbr1OfHx/PabvBrPfK7eMYU+4toiJ/PZbf3Wx46wdK6aRDggqH\nMdaQ914lByn1zoOhRrJHKRDp5ikTg4DqDKhT/5kd6QkNgdXmn0U20XZgXodYORM8\n9TJ/xqd+k7+jBywj4I6xVh1e9Le/mvYwYl5DAANDDs+E5/IDyNgBL0qOmwvLhXjF\nYDEVlaj2mj9vFORnmRwdWG7XdrF8AhvLKHyc06G5zQKBgQD8EbMHk+WSuEEt2NhL\nM4t/6/x7u4u/naD4GW61Iz9mmhJclmGYwKTIppwjmB1Kp4E0RA8WaG6fNRtDYfL9\no18b+bcPUYAtLoi6T2lOjIh0IxaJ/HheSyWjzzSmn1NRj0j7iMWbDVfQcu6QUnd7\nRfudQdxGT6Wg0/F3Ms93IyuYpwKBgQDNm2GnBZKyBFZIbR9IquXwoWXct9+Ksy36\nIFTYBfHDfVs+wXEoLoP5bFJkPjGsum2t8AWEQ0ATWRHxeaxIf0FUIGM6pcLjFdCq\nnR8fMitsfAfgnVsy4KVH0ADEkXyjJWDG1iFYXdMzKSi/0Z01yzCHTgXAyeX8HAxg\nRx7kU6bclQKBgF4i0gRjdFn928GeePBkuJU2cV1YJhGScZoWDWUyW6wan/7Z3mro\njuGsbyVP2qiVs8fsHuJUb/OfJqZcfx3AFHXjJT1gR4kYFtHVdFN0YkVVEUbI9b7p\nO45YhKYxXDFaXHwrkPid3Aypz3QwiBSOhzAsd3H+rrFIVaYZYKdyiAaDAoGAV0Dt\nfBfdXTaB91J3yDreQfP8amKNtyq7BD7cQqCjLLbyFfu5rbevwhW6EVhjdE3ZZctK\nTArOEmfmOXfNKSb37l+gPK9DuWL0nrL3FiIQU4V/Qk8E+N5kxcj7ym+DWSjvnPIa\nTInkqv14kY6/DKkh+wmdX2dO9mJgzirgbT0ivtECgYEAsdGzjBSVPUQmae0jxpIH\nWhuyX5i53hr8Ux36DHugVDTtGQWsC3o3CQdH5eUWz8PHuG59a04f+jL5cgUmOtf/\nWWSgFxO8NLxgzWoDgZQ6aC5GejrmVRJsxm1I/u/0v3O0+RbmDgugBwiJFDgqtBYV\nHaqYRh31h0LPTrr3dzCxOu8=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@hs-jig-b2093.iam.gserviceaccount.com",
  client_id: "101300499510444234274",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40hs-jig-b2093.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'hs-jig-b2093'
  });
  console.log('Firebase Admin SDK 초기화 완료');
} catch (error) {
  console.error('Firebase Admin SDK 초기화 실패:', error);
}

// 특정 사용자에게 FCM 전송
app.post('/api/fcm/send-to-user', async (req, res) => {
  try {
    const { userId, notification } = req.body;
    
    if (!userId || !notification) {
      return res.status(400).json({ error: 'userId와 notification이 필요합니다.' });
    }

    // Firestore에서 사용자의 FCM 토큰 조회
    const db = admin.firestore();
    const tokensSnapshot = await db.collection('fcm_tokens')
      .where('userId', '==', userId)
      .get();

    if (tokensSnapshot.empty) {
      return res.status(404).json({ error: '사용자의 FCM 토큰을 찾을 수 없습니다.' });
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
    const results = [];

    // 각 토큰에 대해 FCM 전송
    for (const token of tokens) {
      try {
        const message = {
          token: token,
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/favicon.ico'
          },
          data: notification.data || {}
        };

        const response = await admin.messaging().send(message);
        results.push({ token, success: true, messageId: response });
        console.log(`FCM 전송 성공: ${token} -> ${response}`);
      } catch (error) {
        results.push({ token, success: false, error: error.message });
        console.error(`FCM 전송 실패: ${token}`, error);
      }
    }

    res.json({ 
      success: true, 
      results,
      message: `${results.length}개의 토큰에 FCM을 전송했습니다.`
    });

  } catch (error) {
    console.error('FCM 전송 API 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 모든 사용자에게 브로드캐스트 FCM 전송
app.post('/api/fcm/broadcast', async (req, res) => {
  try {
    const { notification } = req.body;
    
    if (!notification) {
      return res.status(400).json({ error: 'notification이 필요합니다.' });
    }

    // Firestore에서 모든 활성 FCM 토큰 조회
    const db = admin.firestore();
    const tokensSnapshot = await db.collection('fcm_tokens')
      .where('lastUsed', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .get();

    if (tokensSnapshot.empty) {
      return res.status(404).json({ error: '활성 FCM 토큰을 찾을 수 없습니다.' });
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
    const results = [];

    // 각 토큰에 대해 FCM 전송
    for (const token of tokens) {
      try {
        const message = {
          token: token,
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/favicon.ico'
          },
          data: notification.data || {}
        };

        const response = await admin.messaging().send(message);
        results.push({ token, success: true, messageId: response });
        console.log(`브로드캐스트 FCM 전송 성공: ${token} -> ${response}`);
      } catch (error) {
        results.push({ token, success: false, error: error.message });
        console.error(`브로드캐스트 FCM 전송 실패: ${token}`, error);
      }
    }

    res.json({ 
      success: true, 
      results,
      message: `${results.length}개의 토큰에 브로드캐스트 FCM을 전송했습니다.`
    });

  } catch (error) {
    console.error('브로드캐스트 FCM API 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 특정 역할의 사용자들에게 FCM 전송
app.post('/api/fcm/send-to-role', async (req, res) => {
  try {
    const { role, notification } = req.body;
    
    if (!role || !notification) {
      return res.status(400).json({ error: 'role과 notification이 필요합니다.' });
    }

    // Firestore에서 특정 역할의 사용자들 조회
    const db = admin.firestore();
    const usersSnapshot = await db.collection('users')
      .where('role', '==', role)
      .get();

    if (usersSnapshot.empty) {
      return res.status(404).json({ error: `역할 ${role}의 사용자를 찾을 수 없습니다.` });
    }

    const userIds = usersSnapshot.docs.map(doc => doc.id);
    const results = [];

    // 각 사용자의 FCM 토큰 조회 및 전송
    for (const userId of userIds) {
      const tokensSnapshot = await db.collection('fcm_tokens')
        .where('userId', '==', userId)
        .get();

      for (const tokenDoc of tokensSnapshot.docs) {
        const token = tokenDoc.data().token;
        try {
          const message = {
            token: token,
            notification: {
              title: notification.title,
              body: notification.body,
              icon: notification.icon || '/favicon.ico'
            },
            data: notification.data || {}
          };

          const response = await admin.messaging().send(message);
          results.push({ userId, token, success: true, messageId: response });
          console.log(`역할 ${role} FCM 전송 성공: ${userId} -> ${response}`);
        } catch (error) {
          results.push({ userId, token, success: false, error: error.message });
          console.error(`역할 ${role} FCM 전송 실패: ${userId}`, error);
        }
      }
    }

    res.json({ 
      success: true, 
      results,
      message: `역할 ${role}의 ${userIds.length}명에게 FCM을 전송했습니다.`
    });

  } catch (error) {
    console.error('역할별 FCM API 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 서버 상태 확인
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'FCM Server'
  });
});

app.listen(PORT, () => {
  console.log(`FCM 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});