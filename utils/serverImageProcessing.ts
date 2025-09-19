import { getFunctions, httpsCallable } from 'firebase/functions';

// 이미지 파일을 Base64로 변환
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// 서버사이드 이미지 처리
export const processImagesOnServer = async (
    inspectionId: string,
    imageFiles: File[],
    inspectionType: string
): Promise<{
    success: boolean;
    processedImages: string[];
    results: {
        successful: number;
        failed: number;
        errors: any[];
    };
}> => {
    try {
        const functions = getFunctions();
        const processImages = httpsCallable(functions, 'processInspectionImages');
        
        // 파일들을 Base64로 변환
        const imageData = await Promise.all(
            imageFiles.map(async (file) => ({
                name: file.name,
                type: file.type,
                data: await fileToBase64(file)
            }))
        );
        
        const result = await processImages({
            inspectionId,
            imageFiles: imageData,
            inspectionType
        });
        
        return result.data as any;
    } catch (error) {
        console.error('서버 이미지 처리 실패:', error);
        throw error;
    }
};

// 서버사이드 이미지 삭제
export const deleteImagesOnServer = async (imageUrls: string[]): Promise<{
    success: boolean;
    results: {
        success: string[];
        failed: { url: string; error: string }[];
    };
}> => {
    try {
        const functions = getFunctions();
        const deleteImages = httpsCallable(functions, 'deleteInspectionImages');
        
        const result = await deleteImages({
            imageUrls
        });
        
        return result.data as any;
    } catch (error) {
        console.error('서버 이미지 삭제 실패:', error);
        throw error;
    }
};
