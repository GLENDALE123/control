import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as sharp from 'sharp';

// Firebase Admin 초기화
admin.initializeApp();

// 이미지 처리 함수
export const processInspectionImages = functions.https.onCall(async (data, context) => {
    // 인증 확인
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { inspectionId, imageFiles, inspectionType } = data;
    
    if (!inspectionId || !imageFiles || !Array.isArray(imageFiles)) {
        throw new functions.https.HttpsError('invalid-argument', '필수 매개변수가 누락되었습니다.');
    }

    try {
        console.log(`이미지 처리 시작: ${inspectionId}, 파일 수: ${imageFiles.length}`);
        
        // 이미지 처리 결과
        const processedImages = [];
        const errors = [];

        // 각 이미지 파일을 병렬로 처리
        const processPromises = imageFiles.map(async (fileData: any, index: number) => {
            try {
                const { name, type, data: base64Data } = fileData;
                
                // Base64 데이터를 Buffer로 변환
                const buffer = Buffer.from(base64Data.split(',')[1], 'base64');
                
                // HEIC/HEIF 파일인지 확인
                const isHeicFile = type.toLowerCase() === 'image/heic' || 
                                 type.toLowerCase() === 'image/heif' ||
                                 name.toLowerCase().endsWith('.heic') ||
                                 name.toLowerCase().endsWith('.heif');
                
                let processedBuffer: Buffer;
                
                if (isHeicFile) {
                    // HEIC 파일은 JPEG로 변환
                    processedBuffer = await sharp(buffer)
                        .jpeg({ quality: 80 })
                        .resize(1920, 1920, { 
                            fit: 'inside', 
                            withoutEnlargement: true 
                        })
                        .toBuffer();
                } else {
                    // 일반 이미지 압축
                    processedBuffer = await sharp(buffer)
                        .resize(1920, 1920, { 
                            fit: 'inside', 
                            withoutEnlargement: true 
                        })
                        .jpeg({ quality: 80 })
                        .toBuffer();
                }
                
                // 파일명 생성 (기존 경로 구조 유지)
                const timestamp = Date.now();
                const uniqueFileName = `${timestamp}-${index}-${name.replace(/\.(heic|heif)$/i, '.jpg')}`;
                
                // Storage 경로 설정 (기존 경로 구조 유지)
                let storagePath: string;
                switch (inspectionType) {
                    case 'quality':
                        storagePath = `quality-inspections/${inspectionId}/${uniqueFileName}`;
                        break;
                    case 'jig-request':
                        storagePath = `jig-request-images/${inspectionId}/${uniqueFileName}`;
                        break;
                    case 'jig-master':
                        storagePath = `jig-master-images/${inspectionId}/${uniqueFileName}`;
                        break;
                    case 'sample-request':
                        storagePath = `sample-request-images/${inspectionId}/${uniqueFileName}`;
                        break;
                    case 'production-request':
                        storagePath = `production-request-images/${inspectionId}/${uniqueFileName}`;
                        break;
                    case 'quality-issue':
                        storagePath = `quality-issue-images/${inspectionId}/${uniqueFileName}`;
                        break;
                    default:
                        storagePath = `quality-inspections/${inspectionId}/${uniqueFileName}`;
                }
                
                // Firebase Storage에 업로드
                const bucket = admin.storage().bucket();
                const file = bucket.file(storagePath);
                
                await file.save(processedBuffer, {
                    metadata: {
                        contentType: 'image/jpeg',
                        metadata: {
                            originalName: name,
                            originalType: type,
                            processedAt: new Date().toISOString(),
                            processedBy: context.auth.uid
                        }
                    }
                });
                
                // 공개 URL 생성
                const [downloadURL] = await file.getSignedUrl({
                    action: 'read',
                    expires: '03-01-2500' // 2500년까지 유효
                });
                
                console.log(`이미지 처리 완료: ${name} -> ${storagePath}`);
                
                return {
                    success: true,
                    url: downloadURL,
                    originalName: name,
                    processedName: uniqueFileName,
                    size: processedBuffer.length
                };
                
            } catch (error) {
                console.error(`이미지 처리 실패 (${fileData.name}):`, error);
                return {
                    success: false,
                    originalName: fileData.name,
                    error: error instanceof Error ? error.message : '알 수 없는 오류'
                };
            }
        });
        
        // 모든 이미지 처리 완료 대기
        const results = await Promise.allSettled(processPromises);
        
        // 결과 정리
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                if (result.value.success) {
                    processedImages.push(result.value);
                } else {
                    errors.push(result.value);
                }
            } else {
                errors.push({
                    success: false,
                    originalName: imageFiles[index]?.name || '알 수 없는 파일',
                    error: result.reason?.message || '처리 실패'
                });
            }
        });
        
        console.log(`이미지 처리 완료: 성공 ${processedImages.length}개, 실패 ${errors.length}개`);
        
        return {
            success: true,
            processedImages: processedImages.map(img => img.url),
            results: {
                successful: processedImages.length,
                failed: errors.length,
                errors: errors
            }
        };
        
    } catch (error) {
        console.error('이미지 처리 함수 오류:', error);
        throw new functions.https.HttpsError('internal', '이미지 처리 중 오류가 발생했습니다.');
    }
});

// 이미지 삭제 함수
export const deleteInspectionImages = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { imageUrls } = data;
    
    if (!imageUrls || !Array.isArray(imageUrls)) {
        throw new functions.https.HttpsError('invalid-argument', '삭제할 이미지 URL이 필요합니다.');
    }

    try {
        const bucket = admin.storage().bucket();
        const results = {
            success: [],
            failed: []
        };

        // 각 이미지 URL 삭제
        for (const url of imageUrls) {
            try {
                // URL에서 파일 경로 추출
                const urlObj = new URL(url);
                const path = decodeURIComponent(urlObj.pathname);
                const firebaseStoragePathMatch = path.match(/\/o\/(.+)$/);
                
                if (firebaseStoragePathMatch && firebaseStoragePathMatch[1]) {
                    const storagePath = decodeURIComponent(firebaseStoragePathMatch[1]);
                    const file = bucket.file(storagePath);
                    await file.delete();
                    results.success.push(url);
                    console.log(`이미지 삭제 성공: ${storagePath}`);
                } else {
                    results.failed.push({ url, error: '유효하지 않은 URL 형식' });
                }
            } catch (error) {
                console.error(`이미지 삭제 실패 (${url}):`, error);
                results.failed.push({ 
                    url, 
                    error: error instanceof Error ? error.message : '알 수 없는 오류' 
                });
            }
        }

        return {
            success: true,
            results
        };
        
    } catch (error) {
        console.error('이미지 삭제 함수 오류:', error);
        throw new functions.https.HttpsError('internal', '이미지 삭제 중 오류가 발생했습니다.');
    }
});
