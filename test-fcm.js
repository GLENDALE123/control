// FCM 서버 테스트 스크립트
const fetch = require('node-fetch');

const SERVER_URL = 'http://localhost:3001';

async function testFCMServer() {
  console.log('🚀 FCM 서버 테스트를 시작합니다...\n');

  try {
    // 1. 서버 상태 확인
    console.log('1. 서버 상태 확인...');
    const healthResponse = await fetch(`${SERVER_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ 서버 상태:', healthData);
    console.log('');

    // 2. 브로드캐스트 알림 테스트
    console.log('2. 브로드캐스트 알림 테스트...');
    const broadcastResponse = await fetch(`${SERVER_URL}/api/fcm/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notification: {
          title: '🎉 FCM 서버 테스트',
          body: 'FCM 서버가 정상적으로 작동하고 있습니다!',
          icon: '/favicon.ico',
          data: {
            type: 'test',
            timestamp: new Date().toISOString()
          }
        }
      })
    });

    const broadcastData = await broadcastResponse.json();
    console.log('✅ 브로드캐스트 결과:', broadcastData);
    console.log('');

    // 3. 특정 사용자에게 알림 테스트 (테스트용 사용자 ID)
    console.log('3. 특정 사용자 알림 테스트...');
    const userResponse = await fetch(`${SERVER_URL}/api/fcm/send-to-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test-user-id',
        notification: {
          title: '👤 개별 알림 테스트',
          body: '특정 사용자에게 전송된 알림입니다.',
          icon: '/favicon.ico',
          data: {
            type: 'user-test',
            timestamp: new Date().toISOString()
          }
        }
      })
    });

    const userData = await userResponse.json();
    console.log('✅ 개별 알림 결과:', userData);
    console.log('');

    // 4. 역할별 알림 테스트
    console.log('4. 역할별 알림 테스트...');
    const roleResponse = await fetch(`${SERVER_URL}/api/fcm/send-to-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'admin',
        notification: {
          title: '👥 역할별 알림 테스트',
          body: '관리자 역할 사용자들에게 전송된 알림입니다.',
          icon: '/favicon.ico',
          data: {
            type: 'role-test',
            role: 'admin',
            timestamp: new Date().toISOString()
          }
        }
      })
    });

    const roleData = await roleResponse.json();
    console.log('✅ 역할별 알림 결과:', roleData);
    console.log('');

    console.log('🎉 모든 테스트가 완료되었습니다!');
    console.log('📱 앱에서 알림을 확인해보세요.');

  } catch (error) {
    console.error('❌ 테스트 중 오류가 발생했습니다:', error.message);
    console.log('\n💡 FCM 서버가 실행 중인지 확인해주세요:');
    console.log('   cd server && npm start');
  }
}

// 테스트 실행
testFCMServer();