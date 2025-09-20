import React, { useState, useRef, useEffect, ChangeEvent } from 'react';

interface ImageUploadProps {
  images: File[];
  imagePreviews: string[];
  existingImages?: string[];
  deletedImages?: string[];
  onImagesChange: (files: File[], previews: string[], deleted?: string[]) => void;
  accept?: string;
  maxImages?: number;
  showCamera?: boolean;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  imagePreviews,
  existingImages = [],
  deletedImages = [],
  onImagesChange,
  accept = "image/*,image/heic,image/heif",
  maxImages = 10,
  showCamera = true,
  className = ""
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Cleanup object URLs to avoid memory leaks
    return () => {
      imagePreviews.forEach(preview => {
        if (!existingImages.includes(preview)) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [imagePreviews, existingImages]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      
      const updatedImages = [...images, ...files];
      const updatedPreviews = [...imagePreviews, ...newPreviews];
      
      onImagesChange(updatedImages, updatedPreviews, deletedImages);
    }
  };

  const removeImage = (index: number) => {
    const imageUrl = imagePreviews[index];
    
    // 기존 이미지인지 새 이미지인지 확인
    if (existingImages.includes(imageUrl)) {
      // 기존 이미지 삭제 - deletedImages에 추가
      const updatedDeletedImages = [...deletedImages, imageUrl];
      onImagesChange(images, imagePreviews, updatedDeletedImages);
    } else {
      // 새 이미지 삭제 - images에서 제거
      const fileIndex = imagePreviews.findIndex((_, i) => i === index) - existingImages.length;
      const updatedImages = fileIndex >= 0 ? images.filter((_, i) => i !== fileIndex) : images;
      const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
      
      // URL 정리
      URL.revokeObjectURL(imageUrl);
      
      onImagesChange(updatedImages, updatedPreviews, deletedImages);
    }
  };

  const labelClasses = "block text-sm font-medium text-gray-700 dark:text-slate-300";

  return (
    <div className={className}>
      <label className={labelClasses}>이미지 첨부</label>
      <div className="mt-1 flex items-center gap-2">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageChange} 
          multiple 
          accept={accept} 
          className="hidden" 
        />
        {showCamera && (
          <input 
            type="file" 
            ref={cameraInputRef} 
            onChange={handleImageChange} 
            accept={accept} 
            capture="environment" 
            className="hidden" 
          />
        )}
        
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()} 
          disabled={imagePreviews.length >= maxImages}
          className="px-4 py-2 text-sm font-semibold border rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          파일 선택
        </button>
        
        {showCamera && (
          <button 
            type="button" 
            onClick={() => cameraInputRef.current?.click()} 
            disabled={imagePreviews.length >= maxImages}
            className="px-4 py-2 text-sm font-semibold border rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            사진 촬영
          </button>
        )}
      </div>
      
      {imagePreviews.length > 0 && (
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative">
              <img 
                src={preview} 
                alt={`preview ${index}`} 
                className="w-full h-24 object-cover rounded" 
              />
              <button 
                type="button" 
                onClick={() => removeImage(index)} 
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
      
      {imagePreviews.length >= maxImages && (
        <p className="mt-1 text-sm text-gray-500">
          최대 {maxImages}개의 이미지만 업로드할 수 있습니다.
        </p>
      )}
    </div>
  );
};

export default ImageUpload;
