import { useState, useEffect, useCallback } from 'react';
import { messaging } from '../firebaseConfig';
import { saveFCMToken } from '../services/fcmService';

interface FCMToken {
  token: string | null;
  error: string | null;
}

interface FCMHook {
  token: string | null;
  error: string | null;
  isSupported: boolean;
  requestPermission: () => Promise<boolean>;
  refreshToken: () => Promise<void>;
  saveTokenToServer: (userId: string) => Promise<boolean>;
}

export const useFCM = (): FCMHook => {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // FCM 지원 여부 확인
  useEffect(() => {
    const checkSupport = () => {
      if ('Notification' in window && 'serviceWorker' in navigator) {
        setIsSupported(true);
      } else {
        setIsSupported(false);
        setError('이 브라우저는 FCM을 지원하지 않습니다.');
      }
    };

    checkSupport();
  }, []);

  // 권한 요청
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('FCM을 지원하지 않는 브라우저입니다.');
      return false;
    }

    try {
      // 이미 권한이 있는지 확인
      if (Notification.permission === 'granted') {
        console.log('알림 권한이 이미 허용되어 있습니다.');
        return true;
      }

      // 권한이 차단된 경우 - 다시 시도 허용
      if (Notification.permission === 'denied') {
        // 일부 브라우저에서는 거부된 후에도 다시 요청할 수 있음
        console.log('알림 권한이 거부되었습니다. 다시 시도합니다...');
        setError('알림 권한이 거부되었습니다. 다시 시도하거나 브라우저 설정에서 알림을 허용해주세요.');
      }

      // 권한 요청 (거부된 경우에도 다시 시도)
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('알림 권한이 허용되었습니다.');
        setError(null);
        return true;
      } else {
        setError('알림 권한이 거부되었습니다.');
        return false;
      }
    } catch (err) {
      console.error('권한 요청 중 오류:', err);
      setError('권한 요청 중 오류가 발생했습니다.');
      return false;
    }
  }, [isSupported]);

  // 토큰 가져오기
  const getToken = useCallback(async () => {
    if (!isSupported) return;

    try {
      const currentToken = await messaging.getToken({
        vapidKey: 'BCiXh2gG9sI7meQzRYxF6cm1gLDY94KPb_IV3tChfzW1nVQLjw7IAxCb253nNarOYpaqmVz5t0SEHY83P8DFph8'
      });

      if (currentToken) {
        setToken(currentToken);
        setError(null);
        console.log('FCM 토큰을 가져왔습니다:', currentToken);
        
        // 토큰을 Firestore에 저장 (선택사항)
        // await saveTokenToFirestore(currentToken);
      } else {
        setError('토큰을 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('토큰 가져오기 오류:', err);
      setError('토큰을 가져오는 중 오류가 발생했습니다.');
    }
  }, [isSupported]);

  // 토큰 새로고침
  const refreshToken = useCallback(async () => {
    await getToken();
  }, [getToken]);

  // 토큰을 서버에 저장
  const saveTokenToServer = useCallback(async (userId: string): Promise<boolean> => {
    if (!token) {
      console.warn('FCM 토큰이 없어서 서버에 저장할 수 없습니다.');
      return false;
    }

    try {
      return await saveFCMToken(userId, token);
    } catch (error) {
      console.error('FCM 토큰 서버 저장 실패:', error);
      return false;
    }
  }, [token]);

  // 초기 토큰 가져오기
  useEffect(() => {
    if (isSupported) {
      getToken();
    }
  }, [isSupported, getToken]);

  // 토큰 갱신 감지 (Firebase v9+에서는 onTokenRefresh가 없으므로 주기적으로 확인)
  useEffect(() => {
    if (!isSupported || !token) return;

    // 5분마다 토큰 상태 확인
    const interval = setInterval(async () => {
      try {
        const currentToken = await messaging.getToken({
          vapidKey: 'BCiXh2gG9sI7meQzRYxF6cm1gLDY94KPb_IV3tChfzW1nVQLjw7IAxCb253nNarOYpaqmVz5t0SEHY83P8DFph8'
        });
        
        if (currentToken !== token) {
          console.log('토큰이 갱신되었습니다.');
          setToken(currentToken);
        }
      } catch (error) {
        console.warn('토큰 갱신 확인 중 오류:', error);
      }
    }, 5 * 60 * 1000); // 5분마다

    return () => clearInterval(interval);
  }, [isSupported, token]);

  // 포그라운드 메시지 수신 처리
  useEffect(() => {
    if (!isSupported) return;

    const unsubscribe = messaging.onMessage((payload) => {
      console.log('포그라운드에서 메시지를 받았습니다:', payload);
      
      // 브라우저 알림 표시
      if (payload.notification) {
        const notification = new Notification(payload.notification.title || '새 알림', {
          body: payload.notification.body || '새로운 알림이 있습니다.',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          data: payload.data
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    });

    return () => unsubscribe();
  }, [isSupported]);

  return {
    token,
    error,
    isSupported,
    requestPermission,
    refreshToken,
    saveTokenToServer
  };
};