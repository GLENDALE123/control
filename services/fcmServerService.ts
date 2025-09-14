// Firebase Functions를 사용한 FCM 서비스
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

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

// Firebase Functions 초기화
const functions = getFunctions(getApp());

/**
 * 사용자의 FCM 토큰을 Firebase Functions를 통해 저장
 */
export const saveUserFCMToken = async (userId: string, token: string, deviceType: 'web' | 'mobile' = 'web') => {
  try {
    const saveToken = httpsCallable(functions, 'saveFCMToken');
    
    const result = await saveToken({
      userId,
      token,
      deviceType
    });
    
    console.log(`FCM 토큰이 저장되었습니다: ${userId}`);
    return result.data.success;
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
    const sendToUser = httpsCallable(functions, 'sendFCMToUser');
    
    const result = await sendToUser({
      userId,
      notification
    });
    
    console.log(`사용자 ${userId}에게 FCM 전송 결과:`, result.data);
    return result.data.success;
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
    const sendBroadcast = httpsCallable(functions, 'sendBroadcastFCM');
    
    const result = await sendBroadcast({
      notification
    });
    
    console.log('브로드캐스트 FCM 전송 결과:', result.data);
    return result.data.success;
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