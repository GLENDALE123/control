import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

type NotificationDoc = {
  message: string;
  date: string;
  requestId: string;
  type?: 'jig' | 'quality' | 'work' | 'sample';
  readBy?: string[];
};

type NotificationType = 'jig' | 'quality' | 'work' | 'sample';

async function getTargetUserIds(notification: NotificationDoc): Promise<string[]> {
  // 기본 정책: 모든 활성 사용자에게 발송 (role/부서 기반 정책이 있으면 여기서 필터)
  const snapshot = await db.collection('users').get();
  const uids: string[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data() || {};
    const disabled = data.disabled === true;
    if (!disabled) {
      uids.push(doc.id);
    }
  });
  return uids;
}

async function userPrefAllows(uid: string, type: NotificationType): Promise<boolean> {
  try {
    const snap = await db.collection('users').doc(uid).collection('preferences').doc('singleton').get();
    if (!snap.exists) return true; // 기본 허용
    const data = snap.data() as any;
    const enabled = data?.notificationPrefs?.[type];
    if (enabled === false) return false;
    return true;
  } catch (e) {
    console.warn('Failed to read preferences for', uid, e);
    return true; // 실패 시 기본 허용
  }
}

async function collectTokensForUsers(userIds: string[], type: NotificationType): Promise<string[]> {
  const tokens: Set<string> = new Set();
  const chunks: string[][] = [];
  const chunkSize = 10;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    chunks.push(userIds.slice(i, i + chunkSize));
  }
  await Promise.all(
    chunks.map(async (chunk) => {
      await Promise.all(
        chunk.map(async (uid) => {
          const allowed = await userPrefAllows(uid, type);
          if (!allowed) return;
          const snap = await db.collection('users').doc(uid).collection('fcmTokens').get();
          snap.forEach((doc) => {
            const data = doc.data() || {};
            if (data.enabled !== false) {
              tokens.add(data.token || doc.id);
            }
          });
        })
      );
    })
  );
  return Array.from(tokens);
}

export const onNotificationCreated = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notification = snap.data() as NotificationDoc;
    const title = notification.type ? `TMS - ${notification.type}` : 'TMS 알림';
    const body = notification.message || '';
    const notifType: NotificationType = (notification.type as NotificationType) || 'jig';

    try {
      const userIds = await getTargetUserIds(notification);
      if (userIds.length === 0) {
        console.log('No users to notify');
        return;
      }

      const tokens = await collectTokensForUsers(userIds, notifType);
      if (tokens.length === 0) {
        console.log('No tokens to send');
        return;
      }

      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
        },
        data: {
          requestId: notification.requestId || '',
          type: notification.type || 'jig',
          url: '/',
        },
        webpush: {
          fcmOptions: {
            link: '/',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      const failures: { token: string; error: admin.FirebaseError | undefined }[] = [];
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          failures.push({ token: tokens[idx], error: res.error });
        }
      });

      if (failures.length > 0) {
        console.warn('Some tokens failed:', failures.length);
        // 비정상 토큰 정리
        await Promise.all(
          failures.map(async (f) => {
            const token = f.token;
            // users/*/fcmTokens/{token} 문서 삭제
            const uidsSnap = await db.collection('users').get();
            await Promise.all(
              uidsSnap.docs.map(async (userDoc) => {
                const ref = userDoc.ref.collection('fcmTokens').doc(token);
                const tokenDoc = await ref.get();
                if (tokenDoc.exists) {
                  await ref.delete();
                }
              })
            );
          })
        );
      }

      console.log('Push sent. Success:', response.successCount, 'Failure:', response.failureCount);
    } catch (err) {
      console.error('onNotificationCreated error:', err);
    }
  });


