import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    fileType?: string;
    initialQuality?: number;
    alwaysKeepResolution?: boolean;
}

export interface CompressionResult {
    success: boolean;
    file?: File;
    error?: string;
    originalSize?: number;
    compressedSize?: number;
}

/**
 * 이미지 파일을 압축합니다
 * @param file 압축할 이미지 파일
 * @param options 압축 옵션
 * @returns 압축 결과
 */
export const compressImageFile = async (
    file: File, 
    options: CompressionOptions = {}
): Promise<CompressionResult> => {
    try {
        const defaultOptions: CompressionOptions = {
            maxSizeMB: 1.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/jpeg',
            initialQuality: 0.8,
            alwaysKeepResolution: false,
            ...options
        };

        // 파일 크기가 2MB 이상일 때만 압축
        if (file.size <= 2 * 1024 * 1024) {
            return {
                success: true,
                file: file,
                originalSize: file.size,
                compressedSize: file.size
            };
        }

        const compressedFile = await imageCompression(file, defaultOptions);
        
        console.log(`압축 완료: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
        
        return {
            success: true,
            file: compressedFile,
            originalSize: file.size,
            compressedSize: compressedFile.size
        };
    } catch (error) {
        console.error('이미지 압축 실패:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '알 수 없는 오류',
            originalSize: file.size
        };
    }
};

/**
 * 여러 이미지 파일을 압축합니다
 * @param files 압축할 이미지 파일 배열
 * @param options 압축 옵션
 * @returns 압축된 파일 배열과 결과 정보
 */
export const compressImageFiles = async (
    files: File[],
    options: CompressionOptions = {}
): Promise<{
    compressedFiles: File[];
    results: CompressionResult[];
    totalOriginalSize: number;
    totalCompressedSize: number;
}> => {
    const results: CompressionResult[] = [];
    const compressedFiles: File[] = [];
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    for (const file of files) {
        const result = await compressImageFile(file, options);
        results.push(result);
        totalOriginalSize += file.size;
        
        if (result.success && result.file) {
            compressedFiles.push(result.file);
            totalCompressedSize += result.file.size;
        } else {
            // 압축 실패 시 원본 파일 사용
            compressedFiles.push(file);
            totalCompressedSize += file.size;
        }
    }

    return {
        compressedFiles,
        results,
        totalOriginalSize,
        totalCompressedSize
    };
};

/**
 * 파일 크기를 검증합니다
 * @param files 검증할 파일 배열
 * @param maxSizeMB 최대 파일 크기 (MB)
 * @returns 검증 결과
 */
export const validateFileSizes = (files: File[], maxSizeMB: number = 10): {
    isValid: boolean;
    oversizedFiles: File[];
    message?: string;
} => {
    const oversizedFiles = files.filter(file => file.size > maxSizeMB * 1024 * 1024);
    
    if (oversizedFiles.length > 0) {
        return {
            isValid: false,
            oversizedFiles,
            message: `파일 크기가 너무 큽니다. 최대 ${maxSizeMB}MB까지 업로드 가능합니다. (${oversizedFiles.map(f => f.name).join(', ')})`
        };
    }
    
    return {
        isValid: true,
        oversizedFiles: []
    };
};

/**
 * 이미지 파일 형식을 검증합니다
 * @param files 검증할 파일 배열
 * @returns 검증 결과
 */
export const validateImageTypes = (files: File[]): {
    isValid: boolean;
    invalidFiles: File[];
    message?: string;
} => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type.toLowerCase()));
    
    if (invalidFiles.length > 0) {
        return {
            isValid: false,
            invalidFiles,
            message: `지원되지 않는 파일 형식입니다. (${invalidFiles.map(f => f.name).join(', ')})`
        };
    }
    
    return {
        isValid: true,
        invalidFiles: []
    };
};
