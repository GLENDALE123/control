import React, { useState, ChangeEvent, useRef } from 'react';
import { JigMasterItem, UserProfile } from '../types';
import ConfirmationModal from './ConfirmationModal';
import ImageLightbox from './ImageLightbox';
import { storage } from '../firebaseConfig';
import { uploadBytes, getDownloadURL } from 'firebase/storage';

interface JigMasterDetailProps {
  jig: JigMasterItem;
  onSave: (id: string, updates: Partial<Omit<JigMasterItem, 'id' | 'imageUrls' | 'createdAt'>>) => Promise<void>;
  onDelete: (id: string) => void;
  currentUserProfile: UserProfile | null;
  addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

declare const html2canvas: any;

const baseInputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200";
const labelClasses = "block text-sm font-medium text-gray-700 dark:text-slate-300";

const DetailField: React.FC<{ label: string, value: string | React.ReactNode, isEditing?: boolean, className?: string }> = ({ label, value, isEditing, className }) => (
    <div className={className}>
        <label className={labelClasses}>{label}</label>
        <div className={`mt-1 text-gray-900 dark:text-slate-200 ${isEditing ? 'hidden' : ''}`}>{value}</div>
    </div>
);

const JigMasterDetail: React.FC<JigMasterDetailProps> = ({ jig, onSave, onDelete, currentUserProfile, addToast }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    requestType: jig.requestType,
    itemName: jig.itemName,
    partName: jig.partName,
    itemNumber: jig.itemNumber,
    remarks: jig.remarks,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(jig.imageUrls || []);
  const [deletedImages, setDeletedImages] = useState<string[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const canManage = currentUserProfile?.role !== 'Member';

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImageFiles(prev => [...prev, ...files]);
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      // 기존 이미지 삭제
      const imageToDelete = existingImages[index];
      setExistingImages(prev => prev.filter((_, i) => i !== index));
      setDeletedImages(prev => [...prev, imageToDelete]);
    } else {
      // 새로 추가한 이미지 삭제
      setImageFiles(prev => prev.filter((_, i) => i !== index));
      setImagePreviews(prev => {
        URL.revokeObjectURL(prev[index]);
        return prev.filter((_, i) => i !== index);
      });
    }
  };

  
  const handleShare = async () => {
    const elementToCapture = detailRef.current;
    if (!elementToCapture) {
        addToast({ message: '공유할 대상을 찾을 수 없습니다.', type: 'error' });
        return;
    }
    
    addToast({ message: '이미지 생성 중...', type: 'info' });

    try {
        const canvas = await html2canvas(elementToCapture, {
            useCORS: true,
            backgroundColor: window.getComputedStyle(elementToCapture).backgroundColor,
            scale: 2,
        });
        
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        
        if (!blob) {
            addToast({ message: '이미지 파일 생성에 실패했습니다.', type: 'error' });
            return;
        }

        const fileName = `jig-master-${jig.id}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        const isDesktop = !/Mobi|Android/i.test(navigator.userAgent);

        if (isDesktop && navigator.clipboard?.write) {
            await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
            addToast({ message: '이미지가 클립보드에 복사되었습니다.', type: 'success' });
        } else if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: `지그 정보: ${jig.itemName}`,
                text: `T.M.S. 지그 마스터 정보 공유`
            });
            addToast({ message: '지그 정보가 공유되었습니다.', type: 'success' });
        } else {
             addToast({ message: '공유 기능이 지원되지 않아 이미지를 다운로드합니다.', type: 'info' });
             const link = document.createElement('a');
             link.download = fileName;
             link.href = URL.createObjectURL(blob);
             link.click();
             URL.revokeObjectURL(link.href);
        }
    } catch (err: any) {
        if (err.name !== 'AbortError') {
            console.error('Sharing/Copying failed:', err);
            addToast({ message: '공유 또는 복사에 실패했습니다.', type: 'error' });
        }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let updatedImageUrls = [...existingImages];
      
      // 새 이미지 업로드
      if (imageFiles.length > 0) {
        addToast({ message: '이미지 업로드 중...', type: 'info' });
        
        const uploadedUrls = await Promise.all(
          imageFiles.map(async (file) => {
            try {
              const uniqueFileName = `${Date.now()}-${file.name}`;
              const imageRef = storage.ref(`jig-images/${jig.id}/${uniqueFileName}`);
              
              const snapshot = await uploadBytes(imageRef, file, {
                contentType: file.type || 'image/jpeg',
                customMetadata: {
                  originalName: file.name,
                  uploadedAt: new Date().toISOString()
                }
              });
              return await getDownloadURL(snapshot.ref);
            } catch (error) {
              console.error(`이미지 업로드 실패 (${file.name}):`, error);
              throw new Error(`이미지 업로드 실패: ${file.name}`);
            }
          })
        );
        
        updatedImageUrls = [...updatedImageUrls, ...uploadedUrls];
      }
      
      // 삭제된 이미지들을 Storage에서 제거
      if (deletedImages.length > 0) {
        for (const imageUrl of deletedImages) {
          try {
            const imageRef = storage.refFromURL(imageUrl);
            await imageRef.delete();
          } catch (error) {
            console.error('이미지 삭제 실패:', error);
          }
        }
      }
      
      // 업데이트된 데이터로 저장
      await onSave(jig.id, { ...formData, imageUrls: updatedImageUrls });
      
      // 상태 초기화
      setImageFiles([]);
      setImagePreviews([]);
      setExistingImages(updatedImageUrls);
      setDeletedImages([]);
      
      addToast({ message: '지그 정보가 성공적으로 저장되었습니다.', type: 'success' });
      setIsEditing(false);
    } catch (error) {
      console.error("Save failed", error);
      addToast({ message: '저장에 실패했습니다.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleConfirmDelete = () => {
    onDelete(jig.id);
    setIsDeleteModalOpen(false);
  };
  
  const handleCancelEdit = () => {
      setFormData({
        requestType: jig.requestType,
        itemName: jig.itemName,
        partName: jig.partName,
        itemNumber: jig.itemNumber,
        remarks: jig.remarks,
      });
      // 이미지 상태 초기화
      setImageFiles([]);
      setImagePreviews([]);
      setExistingImages(jig.imageUrls || []);
      setDeletedImages([]);
      setIsEditing(false);
  }

  return (
    <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div ref={detailRef} className="p-4 bg-white dark:bg-slate-800 rounded-lg">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 md:col-span-2">
                         <DetailField label="생산구분" value={jig.requestType} isEditing={isEditing} />
                         {isEditing && <input name="requestType" value={formData.requestType} onChange={handleChange} className={baseInputClasses} lang="ko" />}
    
                         <DetailField label="제품명" value={<span className="font-bold text-lg">{jig.itemName}</span>} isEditing={isEditing} />
                         {isEditing && <input name="itemName" value={formData.itemName} onChange={handleChange} className={baseInputClasses} required lang="ko" />}
    
                         <DetailField label="부속명" value={jig.partName} isEditing={isEditing} />
                         {isEditing && <input name="partName" value={formData.partName} onChange={handleChange} className={baseInputClasses} lang="ko" />}
    
                         <DetailField label="지그번호" value={jig.itemNumber} isEditing={isEditing} />
                         {isEditing && <input name="itemNumber" value={formData.itemNumber} onChange={handleChange} className={baseInputClasses} lang="ko" />}
                    </div>
                    
                     <div className="md:col-span-2">
                        <DetailField label="특이사항" value={<p className="whitespace-pre-wrap p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">{jig.remarks || '없음'}</p>} isEditing={isEditing} />
                        {isEditing && <textarea name="remarks" value={formData.remarks} onChange={handleChange} className={baseInputClasses} rows={5} lang="ko" />}
                    </div>
                    
                    {/* 첨부 이미지 섹션 */}
                    <div className="md:col-span-2">
                        <label className={labelClasses}>첨부 이미지</label>
                        
                        {/* 기존 이미지들 */}
                        {existingImages.length > 0 && (
                            <div className="mt-2 mb-4">
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
                                    {existingImages.map((url, index) => (
                                        <div key={`existing-${index}`} className="group relative">
                                            <img
                                                src={url}
                                                alt=""
                                                aria-label={`첨부 이미지 ${index + 1}`}
                                                width={160}
                                                height={96}
                                                loading="lazy"
                                                decoding="async"
                                                fetchPriority="low"
                                                className="w-full h-24 object-cover rounded-md cursor-pointer transition-transform hover:scale-105"
                                                onClick={() => {
                                                    if (!isEditing) {
                                                        setLightboxImage(url);
                                                    }
                                                }}
                                            />
                                            {isEditing && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index, true)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                                                >
                                                    &times;
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* 새로 추가된 이미지들 */}
                        {imagePreviews.length > 0 && (
                            <div className="mt-2 mb-4">
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={`new-${index}`} className="group relative">
                                            <img
                                                src={preview}
                                                alt=""
                                                aria-label={`첨부 이미지 ${index + 1}`}
                                                width={160}
                                                height={96}
                                                loading="lazy"
                                                decoding="async"
                                                fetchPriority="low"
                                                className="w-full h-24 object-cover rounded-md cursor-pointer transition-transform hover:scale-105"
                                                onClick={() => setLightboxImage(preview)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index, false)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* 이미지 업로드 버튼 (수정 모드에서만) */}
                        {isEditing && (
                            <div className="mt-4">
                                <div className="flex items-center gap-2">
                                    <input type="file" ref={fileInputRef} onChange={handleImageChange} multiple accept="image/*,image/heic,image/heif" className="hidden" />
                                    <input type="file" ref={cameraInputRef} onChange={handleImageChange} accept="image/*,image/heic,image/heif" capture="environment" className="hidden" />
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-sm font-semibold border rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">파일 선택</button>
                                    <button type="button" onClick={() => cameraInputRef.current?.click()} className="px-4 py-2 text-sm font-semibold border rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">사진 촬영</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
        <div className="flex-shrink-0 flex justify-end gap-4 p-4 border-t dark:border-slate-700">
            {isEditing ? (
                <>
                    <button type="button" onClick={handleCancelEdit} className="bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-slate-500">
                        취소
                    </button>
                    <button type="button" onClick={handleSave} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700" disabled={isSaving}>
                        {isSaving ? '저장 중...' : '변경사항 저장'}
                    </button>
                </>
            ) : (
                <>
                     <button onClick={handleShare} className="bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-600">이미지로 공유</button>
                     {currentUserProfile?.role === 'Admin' && (
                        <button type="button" onClick={() => setIsDeleteModalOpen(true)} className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700">
                           삭제
                        </button>
                     )}
                     {canManage && (
                        <button type="button" onClick={() => setIsEditing(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700">
                           수정
                        </button>
                     )}
                </>
            )}
        </div>
        <ConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleConfirmDelete}
            title="지그 삭제 확인"
            message={`정말로 '${jig.itemName}' 지그 정보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        />
        {lightboxImage && <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />}
    </div>
  );
};
export default JigMasterDetail;