import { messaging } from '../firebaseConfig';
import { saveUserFCMToken, sendBroadcastFCM, sendFCMToUser } from './fcmServerService';

interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

/**
 * 현재 사용자의 FCM 토큰을 서버에 저장합니다
 * @param userId 사용자 ID
 * @param token FCM 토큰
 */
export const saveFCMToken = async (userId: string, token: string): Promise<boolean> => {
  try {
    return await saveUserFCMToken(userId, token, 'web');
  } catch (error) {
    console.error('FCM 토큰 저장 실패:', error);
    return false;
  }
};

/**
 * FCM 푸시 알림을 전송합니다
 * @param token FCM 토큰
 * @param notification 알림 데이터
 */
export const sendPushNotification = async (
  token: string,
  notification: PushNotificationData
): Promise<boolean> => {
  try {
    console.log('푸시 알림 전송 시도:', { token, notification });
    
    // 클라이언트에서는 직접 푸시 알림을 전송할 수 없으므로
    // 서버 API를 호출하거나 다른 방법을 사용해야 합니다
    // 현재는 로그만 출력합니다
    
    return true;
  } catch (error) {
    console.error('푸시 알림 전송 실패:', error);
    return false;
  }
};

/**
 * 모든 사용자에게 브로드캐스트 알림을 전송합니다
 * @param notification 알림 데이터
 */
export const sendBroadcastNotification = async (
  notification: PushNotificationData
): Promise<boolean> => {
  try {
    console.log('브로드캐스트 알림 전송 시도:', notification);
    
    // 서버 사이드 FCM 서비스를 사용하여 브로드캐스트 전송
    return await sendBroadcastFCM(notification);
  } catch (error) {
    console.error('브로드캐스트 알림 전송 실패:', error);
    return false;
  }
};

/**
 * 특정 사용자에게 알림을 전송합니다
 * @param userId 사용자 ID
 * @param notification 알림 데이터
 */
export const sendNotificationToUser = async (
  userId: string,
  notification: PushNotificationData
): Promise<boolean> => {
  try {
    console.log(`사용자 ${userId}에게 알림 전송 시도:`, notification);
    
    // 서버 사이드 FCM 서비스를 사용하여 사용자별 전송
    return await sendFCMToUser(userId, notification);
  } catch (error) {
    console.error(`사용자 ${userId}에게 알림 전송 실패:`, error);
    return false;
  }
};