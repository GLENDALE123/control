import { storage } from '../firebaseConfig';

/**
 * 이미지 URL에서 Firebase Storage 경로를 추출합니다
 * @param url Firebase Storage URL
 * @returns Storage 경로
 */
export const extractStoragePathFromURL = (url: string): string => {
    try {
        // Firebase Storage URL에서 경로 부분을 추출
        // 예: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile.jpg?alt=media&token=xxx
        const urlObj = new URL(url);
        const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
        if (pathMatch) {
            // URL 인코딩된 경로를 디코딩
            return decodeURIComponent(pathMatch[1]);
        }
        return '';
    } catch (error) {
        console.error('URL 파싱 실패:', error);
        return '';
    }
};

/**
 * 이미지가 구 경로에 있는지 확인합니다
 * @param url 이미지 URL
 * @returns 구 경로 여부
 */
export const isLegacyImagePath = (url: string): boolean => {
    const path = extractStoragePathFromURL(url);
    return path.startsWith('quality-inspection-images/');
};

/**
 * 구 경로를 신 경로로 변환합니다
 * @param url 구 경로 이미지 URL
 * @returns 신 경로 이미지 URL (실제 변환은 하지 않음, 경로만 반환)
 */
export const convertLegacyPathToNewPath = (url: string): string => {
    const path = extractStoragePathFromURL(url);
    if (path.startsWith('quality-inspection-images/')) {
        // quality-inspection-images/docId/filename -> quality-inspections/docId/filename
        return path.replace('quality-inspection-images/', 'quality-inspections/');
    }
    return path;
};

/**
 * 이미지 삭제 시 경로 호환성을 처리합니다
 * @param url 삭제할 이미지 URL
 * @returns 삭제 성공 여부
 */
export const deleteImageWithPathCompatibility = async (url: string): Promise<boolean> => {
    try {
        // refFromURL은 URL에서 경로를 자동으로 추출하므로 경로 변경에 관계없이 작동해야 함
        const ref = storage.refFromURL(url);
        await ref.delete();
        console.log('이미지 삭제 성공:', url);
        return true;
    } catch (error) {
        console.error('이미지 삭제 실패:', error, url);
        
        // 삭제 실패 시 경로를 수동으로 추출해서 시도
        try {
            const path = extractStoragePathFromURL(url);
            if (path) {
                const ref = storage.ref(path);
                await ref.delete();
                console.log('경로 기반 이미지 삭제 성공:', path);
                return true;
            }
        } catch (secondError) {
            console.error('경로 기반 삭제도 실패:', secondError);
        }
        
        return false;
    }
};

/**
 * 여러 이미지를 삭제합니다 (경로 호환성 처리 포함)
 * @param urls 삭제할 이미지 URL 배열
 * @returns 삭제 결과
 */
export const deleteImagesWithCompatibility = async (urls: string[]): Promise<{
    success: string[];
    failed: string[];
}> => {
    const results = await Promise.allSettled(
        urls.map(async (url) => {
            const success = await deleteImageWithPathCompatibility(url);
            return { url, success };
        })
    );
    
    const success: string[] = [];
    const failed: string[] = [];
    
    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
            success.push(urls[index]);
        } else {
            failed.push(urls[index]);
        }
    });
    
    return { success, failed };
};

/**
 * 이미지 경로 마이그레이션 정보를 로깅합니다
 * @param imageUrls 이미지 URL 배열
 */
export const logImagePathMigration = (imageUrls: string[]): void => {
    const legacyImages = imageUrls.filter(isLegacyImagePath);
    const newImages = imageUrls.filter(url => !isLegacyImagePath(url));
    
    if (legacyImages.length > 0) {
        console.log(`구 경로 이미지 ${legacyImages.length}개 발견:`, legacyImages);
        console.log(`신 경로 이미지 ${newImages.length}개 발견:`, newImages);
    }
};
