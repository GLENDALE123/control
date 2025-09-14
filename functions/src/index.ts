/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onCall} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Firebase Admin SDK 초기화
admin.initializeApp();

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// FCM 토큰 저장 함수
export const saveFCMToken = onCall(async (request) => {
  try {
    const {userId, token, deviceType = "web"} = request.data;

    if (!userId || !token) {
      throw new Error("userId와 token이 필요합니다.");
    }

    const tokenData = {
      userId,
      token,
      deviceType,
      lastUsed: new Date().toISOString(),
    };

    // Firestore에 토큰 저장
    await admin.firestore().collection("fcm_tokens").doc(token).set(tokenData);

    logger.info(`FCM 토큰 저장 완료: ${userId}`);
    return {success: true, message: "FCM 토큰이 저장되었습니다."};
  } catch (error) {
    logger.error("FCM 토큰 저장 실패:", error);
    throw new Error("FCM 토큰 저장에 실패했습니다.");
  }
});

// 브로드캐스트 FCM 전송 함수
export const sendBroadcastFCM = onCall(async (request) => {
  try {
    const {notification} = request.data;

    if (!notification) {
      throw new Error("notification이 필요합니다.");
    }

    // 모든 활성 FCM 토큰 조회 (30일 이내 사용된 토큰만)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString();
    const tokensSnapshot = await admin.firestore()
      .collection("fcm_tokens")
      .where("lastUsed", ">", thirtyDaysAgo)
      .get();

    if (tokensSnapshot.empty) {
      return {
        success: false,
        message: "활성 FCM 토큰을 찾을 수 없습니다.",
      };
    }

    const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);
    const results = [];

    // 각 토큰에 대해 FCM 전송
    for (const token of tokens) {
      try {
        const message = {
          token: token,
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon || "/favicon.ico",
          },
          data: notification.data || {},
        };

        const response = await admin.messaging().send(message);
        results.push({token, success: true, messageId: response});
        logger.info(`브로드캐스트 FCM 전송 성공: ${token} -> ${response}`);
      } catch (error) {
        results.push({token, success: false, error: String(error)});
        logger.error(`브로드캐스트 FCM 전송 실패: ${token}`, error);
      }
    }

    return {
      success: true,
      results,
      message: `${results.length}개의 토큰에 브로드캐스트 FCM을 전송했습니다.`,
    };
  } catch (error) {
    logger.error("브로드캐스트 FCM API 오류:", error);
    throw new Error("브로드캐스트 FCM 전송에 실패했습니다.");
  }
});

// 특정 사용자에게 FCM 전송 함수
export const sendFCMToUser = onCall(async (request) => {
  try {
    const {userId, notification} = request.data;

    if (!userId || !notification) {
      throw new Error("userId와 notification이 필요합니다.");
    }

    // 사용자의 모든 FCM 토큰 조회
    const tokensSnapshot = await admin.firestore()
      .collection("fcm_tokens")
      .where("userId", "==", userId)
      .get();

    if (tokensSnapshot.empty) {
      return {
        success: false,
        message: "사용자의 FCM 토큰을 찾을 수 없습니다.",
      };
    }

    const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);
    const results = [];

    // 각 토큰에 대해 FCM 전송
    for (const token of tokens) {
      try {
        const message = {
          token: token,
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon || "/favicon.ico",
          },
          data: notification.data || {},
        };

        const response = await admin.messaging().send(message);
        results.push({token, success: true, messageId: response});
        logger.info(`사용자 FCM 전송 성공: ${userId} -> ${response}`);
      } catch (error) {
        results.push({token, success: false, error: String(error)});
        logger.error(`사용자 FCM 전송 실패: ${userId}`, error);
      }
    }

    return {
      success: true,
      results,
      message: `사용자 ${userId}에게 FCM을 전송했습니다.`,
    };
  } catch (error) {
    logger.error("사용자 FCM API 오류:", error);
    throw new Error("사용자 FCM 전송에 실패했습니다.");
  }
});

