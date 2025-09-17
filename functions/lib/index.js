"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNotificationCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
async function getTargetUserIds(notification) {
    // 기본 정책: 모든 활성 사용자에게 발송 (role/부서 기반 정책이 있으면 여기서 필터)
    const snapshot = await db.collection('users').get();
    const uids = [];
    snapshot.forEach((doc) => {
        const data = doc.data() || {};
        const disabled = data.disabled === true;
        if (!disabled) {
            uids.push(doc.id);
        }
    });
    return uids;
}
async function userPrefAllows(uid, type) {
    try {
        const snap = await db.collection('users').doc(uid).collection('preferences').doc('singleton').get();
        if (!snap.exists)
            return true; // 기본 허용
        const data = snap.data();
        const enabled = data?.notificationPrefs?.[type];
        if (enabled === false)
            return false;
        return true;
    }
    catch (e) {
        console.warn('Failed to read preferences for', uid, e);
        return true; // 실패 시 기본 허용
    }
}
async function collectTokensForUsers(userIds, type) {
    const tokens = new Set();
    const chunks = [];
    const chunkSize = 10;
    for (let i = 0; i < userIds.length; i += chunkSize) {
        chunks.push(userIds.slice(i, i + chunkSize));
    }
    await Promise.all(chunks.map(async (chunk) => {
        await Promise.all(chunk.map(async (uid) => {
            const allowed = await userPrefAllows(uid, type);
            if (!allowed)
                return;
            const snap = await db.collection('users').doc(uid).collection('fcmTokens').get();
            snap.forEach((doc) => {
                const data = doc.data() || {};
                if (data.enabled !== false) {
                    tokens.add(data.token || doc.id);
                }
            });
        }));
    }));
    return Array.from(tokens);
}
exports.onNotificationCreated = functions.firestore
    .document('notifications/{notificationId}')
    .onCreate(async (snap, context) => {
    const notification = snap.data();
    const title = notification.type ? `TMS - ${notification.type}` : 'TMS 알림';
    const body = notification.message || '';
    const notifType = notification.type || 'jig';
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
        const message = {
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
        const failures = [];
        response.responses.forEach((res, idx) => {
            if (!res.success) {
                failures.push({ token: tokens[idx], error: res.error });
            }
        });
        if (failures.length > 0) {
            console.warn('Some tokens failed:', failures.length);
            // 비정상 토큰 정리
            await Promise.all(failures.map(async (f) => {
                const token = f.token;
                // users/*/fcmTokens/{token} 문서 삭제
                const uidsSnap = await db.collection('users').get();
                await Promise.all(uidsSnap.docs.map(async (userDoc) => {
                    const ref = userDoc.ref.collection('fcmTokens').doc(token);
                    const tokenDoc = await ref.get();
                    if (tokenDoc.exists) {
                        await ref.delete();
                    }
                }));
            }));
        }
        console.log('Push sent. Success:', response.successCount, 'Failure:', response.failureCount);
    }
    catch (err) {
        console.error('onNotificationCreated error:', err);
    }
});
