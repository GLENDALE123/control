// 서버 사이드 FCM 전송을 위한 서비스
// 실제 프로덕션에서는 Node.js 서버에서 FCM Admin SDK를 사용해야 합니다

interface FCMNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

interface FCMTokenData {
  userId: string;
  token: string;
  deviceType: 'web' | 'mobile';
  lastUsed: string;
}

/**
 * 사용자의 FCM 토큰을 Firestore에 저장
 */
export const saveUserFCMToken = async (userId: string, token: string, deviceType: 'web' | 'mobile' = 'web') => {
  try {
    const tokenData: FCMTokenData = {
      userId,
      token,
      deviceType,
      lastUsed: new Date().toISOString()
    };

    // Firestore에 토큰 저장
    const { db } = await import('../firebaseConfig');
    await db.collection('fcm_tokens').doc(token).set(tokenData);
    
    console.log(`FCM 토큰이 저장되었습니다: ${userId}`);
    return true;
  } catch (error) {
    console.error('FCM 토큰 저장 실패:', error);
    return false;
  }
};

/**
 * 사용자의 FCM 토큰을 Firestore에서 삭제
 */
export const removeUserFCMToken = async (token: string) => {
  try {
    const { db } = await import('../firebaseConfig');
    await db.collection('fcm_tokens').doc(token).delete();
    
    console.log(`FCM 토큰이 삭제되었습니다: ${token}`);
    return true;
  } catch (error) {
    console.error('FCM 토큰 삭제 실패:', error);
    return false;
  }
};

/**
 * 특정 사용자에게 FCM 알림 전송
 */
export const sendFCMToUser = async (userId: string, notification: FCMNotificationPayload) => {
  try {
    const { db } = await import('../firebaseConfig');
    
    // 사용자의 모든 FCM 토큰 조회
    const tokensSnapshot = await db.collection('fcm_tokens')
      .where('userId', '==', userId)
      .get();

    if (tokensSnapshot.empty) {
      console.log(`사용자 ${userId}의 FCM 토큰을 찾을 수 없습니다.`);
      return false;
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.data() as FCMTokenData);
    
    // 각 토큰에 대해 알림 전송 (실제로는 서버에서 FCM Admin SDK 사용)
    for (const tokenData of tokens) {
      console.log(`사용자 ${userId}에게 FCM 알림 전송:`, {
        token: tokenData.token,
        notification
      });
      
      // 실제 프로덕션에서는 여기서 FCM Admin SDK를 사용하여 푸시 알림을 전송합니다
      // await admin.messaging().send({
      //   token: tokenData.token,
      //   notification: {
      //     title: notification.title,
      //     body: notification.body,
      //     icon: notification.icon || '/favicon.ico'
      //   },
      //   data: notification.data || {}
      // });
    }

    return true;
  } catch (error) {
    console.error(`사용자 ${userId}에게 FCM 전송 실패:`, error);
    return false;
  }
};

/**
 * 모든 사용자에게 브로드캐스트 FCM 알림 전송
 */
export const sendBroadcastFCM = async (notification: FCMNotificationPayload) => {
  try {
    const { db } = await import('../firebaseConfig');
    
    // 모든 활성 FCM 토큰 조회
    const tokensSnapshot = await db.collection('fcm_tokens')
      .where('lastUsed', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 30일 이내 사용된 토큰만
      .get();

    if (tokensSnapshot.empty) {
      console.log('활성 FCM 토큰을 찾을 수 없습니다.');
      return false;
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.data() as FCMTokenData);
    
    // 각 토큰에 대해 알림 전송
    for (const tokenData of tokens) {
      console.log(`브로드캐스트 FCM 알림 전송:`, {
        token: tokenData.token,
        notification
      });
      
      // 실제 프로덕션에서는 여기서 FCM Admin SDK를 사용하여 푸시 알림을 전송합니다
      // await admin.messaging().send({
      //   token: tokenData.token,
      //   notification: {
      //     title: notification.title,
      //     body: notification.body,
      //     icon: notification.icon || '/favicon.ico'
      //   },
      //   data: notification.data || {}
      // });
    }

    return true;
  } catch (error) {
    console.error('브로드캐스트 FCM 전송 실패:', error);
    return false;
  }
};

/**
 * 특정 역할의 사용자들에게 FCM 알림 전송
 */
export const sendFCMToRole = async (role: string, notification: FCMNotificationPayload) => {
  try {
    const { db } = await import('../firebaseConfig');
    
    // 특정 역할의 사용자들 조회
    const usersSnapshot = await db.collection('users')
      .where('role', '==', role)
      .get();

    if (usersSnapshot.empty) {
      console.log(`역할 ${role}의 사용자를 찾을 수 없습니다.`);
      return false;
    }

    const userIds = usersSnapshot.docs.map(doc => doc.id);
    
    // 각 사용자에게 FCM 전송
    for (const userId of userIds) {
      await sendFCMToUser(userId, notification);
    }

    return true;
  } catch (error) {
    console.error(`역할 ${role}에게 FCM 전송 실패:`, error);
    return false;
  }
};