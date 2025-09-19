import { compressImageFiles, validateFileSizes, validateImageTypes } from './imageCompression';

export interface ImageUploadResult {
    success: boolean;
    files: File[];
    previews: string[];
    error?: string;
}

/**
 * 이미지 업로드를 위한 파일 처리를 수행합니다
 * @param files 업로드할 파일들
 * @param addToast 토스트 메시지 함수
 * @returns 처리 결과
 */
export const processImageFiles = async (
    files: File[],
    addToast: (message: { message: string; type: 'success' | 'error' | 'warning' | 'info' }) => void
): Promise<ImageUploadResult> => {
    try {
        // 파일 형식 검증
        const typeValidation = validateImageTypes(files);
        if (!typeValidation.isValid) {
            return {
                success: false,
                files: [],
                previews: [],
                error: typeValidation.message || '지원되지 않는 파일 형식입니다.'
            };
        }
        
        // 파일 크기 검증 (개별 파일당 최대 10MB)
        const sizeValidation = validateFileSizes(files, 10);
        if (!sizeValidation.isValid) {
            return {
                success: false,
                files: [],
                previews: [],
                error: sizeValidation.message || '파일 크기가 너무 큽니다.'
            };
        }
        
        // 이미지 압축 처리
        console.log('파일 처리 시작:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
        const { compressedFiles, results } = await compressImageFiles(files);
        console.log('압축된 파일:', compressedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
        const previews = compressedFiles.map(file => URL.createObjectURL(file));
        
        // 압축 결과 로깅
        const failedCount = results.filter(r => !r.success).length;
        if (failedCount > 0) {
            addToast({ 
                message: `${failedCount}개 파일 압축에 실패했습니다. 원본 파일로 업로드됩니다.`, 
                type: 'warning' 
            });
        }
        
        return {
            success: true,
            files: compressedFiles,
            previews
        };
    } catch (error) {
        console.error('파일 처리 실패:', error);
        return {
            success: false,
            files: [],
            previews: [],
            error: '파일 처리 중 오류가 발생했습니다.'
        };
    }
};

/**
 * 이미지 업로드 핸들러를 생성합니다
 * @param setImageFiles 이미지 파일 상태 설정 함수
 * @param setImagePreviews 이미지 미리보기 상태 설정 함수
 * @param addToast 토스트 메시지 함수
 * @returns 이미지 변경 핸들러 함수
 */
export const createImageChangeHandler = (
    setImageFiles: React.Dispatch<React.SetStateAction<File[]>>,
    setImagePreviews: React.Dispatch<React.SetStateAction<string[]>>,
    addToast: (message: { message: string; type: 'success' | 'error' | 'warning' | 'info' }) => void
) => {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const result = await processImageFiles(files, addToast);
            
            if (result.success) {
                setImageFiles(prev => [...prev, ...result.files]);
                setImagePreviews(prev => [...prev, ...result.previews]);
            } else {
                addToast({ 
                    message: result.error || '파일 처리에 실패했습니다.', 
                    type: 'error' 
                });
            }
        }
    };
};
