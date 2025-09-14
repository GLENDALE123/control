# FCM (Firebase Cloud Messaging) 프로덕션 설정 가이드

## ✅ VAPID 키 설정 완료

VAPID 키가 이미 설정되었습니다: `BCiXh2gG9sI7meQzRYxF6cm1gLDY94KPb_IV3tChfzW1nVQLjw7IAxCb253nNarOYpaqmVz5t0SEHY83P8DFph8`

## ✅ Firebase 서비스 계정 키 설정 완료

서비스 계정 키가 이미 `server/fcm-server.js`에 적용되었습니다.
- 프로젝트 ID: `hs-jig-b2093`
- 서비스 계정: `firebase-adminsdk-fbsvc@hs-jig-b2093.iam.gserviceaccount.com`

## 2. FCM 서버 설정

### 서버 설치 및 실행

#### 방법 1: 스크립트 사용 (권장)
```bash
# Windows
start-fcm-server.bat

# Linux/Mac
chmod +x start-fcm-server.sh
./start-fcm-server.sh
```

#### 방법 2: 수동 실행
```bash
# 서버 디렉토리로 이동
cd server

# 의존성 설치
npm install

# 서버 실행
npm start
```

#### 방법 3: 테스트 실행
```bash
# 서버 실행 후 다른 터미널에서
cd server
npm test
```

### 서버 API 엔드포인트

- `POST /api/fcm/send-to-user` - 특정 사용자에게 FCM 전송
- `POST /api/fcm/broadcast` - 모든 사용자에게 브로드캐스트 FCM 전송
- `POST /api/fcm/send-to-role` - 특정 역할의 사용자들에게 FCM 전송
- `GET /api/health` - 서버 상태 확인

## 3. 서비스 워커 등록

`public/firebase-messaging-sw.js` 파일이 이미 생성되어 있습니다. 이 파일은 백그라운드에서 푸시 알림을 처리합니다.

## 4. FCM 기능 확인

### ✅ 구현된 기능:
- ✅ FCM 토큰 생성 및 관리
- ✅ 알림 권한 요청
- ✅ 포그라운드 메시지 수신
- ✅ 백그라운드 메시지 수신 (서비스 워커)
- ✅ 알림 클릭 처리
- ✅ 기존 알림 시스템과 통합
- ✅ **서버 사이드 FCM 전송**
- ✅ **사용자 토큰 저장 시스템**
- ✅ **브로드캐스트 알림**
- ✅ **역할별 알림 전송**

### 알림이 전송되는 경우:
- 새로운 지그 요청 등록 시
- 지그 요청 상태 변경 시
- 기타 중요한 이벤트 발생 시

## 5. 테스트 방법

### 클라이언트 테스트
1. 브라우저에서 앱 실행
2. 로그인 후 알림 아이콘 클릭
3. "알림 허용" 버튼 클릭하여 권한 요청
4. 개발자 도구 콘솔에서 FCM 토큰 확인
5. Firestore에서 `fcm_tokens` 컬렉션에 토큰이 저장되는지 확인

### 서버 테스트
1. FCM 서버 실행 (`npm start`)
2. Postman 또는 curl로 API 테스트:

```bash
# 브로드캐스트 알림 테스트
curl -X POST http://localhost:3001/api/fcm/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "notification": {
      "title": "테스트 알림",
      "body": "FCM 서버가 정상 작동합니다.",
      "icon": "/favicon.ico"
    }
  }'
```

## 6. 프로덕션 배포

### 환경 변수 설정
```bash
# 서버 환경 변수
export FIREBASE_PROJECT_ID=hs-jig-b2093
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
export FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@hs-jig-b2093.iam.gserviceaccount.com
```

### Docker 배포 (선택사항)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 7. 보안 주의사항

- ✅ **서비스 계정 키는 절대 공개 저장소에 커밋하지 마세요**
- ✅ **환경 변수로 서비스 계정 키 관리**
- ✅ **VAPID 키는 공개되어도 안전합니다**
- ✅ **FCM 토큰은 Firestore에 암호화 없이 저장됩니다 (일반적)**

## 8. 모니터링

- FCM 전송 성공/실패 로그 확인
- Firestore `fcm_tokens` 컬렉션 모니터링
- 서버 API 응답 시간 모니터링