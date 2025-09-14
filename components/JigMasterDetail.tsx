import React, { useState, ChangeEvent, useRef } from 'react';
import { JigMasterItem, UserProfile } from '../types';
import ConfirmationModal from './ConfirmationModal';

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
  const detailRef = useRef<HTMLDivElement>(null);

  const canManage = currentUserProfile?.role !== 'Member';

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
        await onSave(jig.id, formData);
        setIsEditing(false);
    } catch (error) {
        console.error("Save failed", error);
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
    </div>
  );
};
export default JigMasterDetail;