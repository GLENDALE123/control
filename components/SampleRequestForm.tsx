import React, { useState } from 'react';
import { SampleRequest, SampleRequestItem } from '../types';

interface SampleRequestFormProps {
  onSave: (data: Omit<SampleRequest, 'id' | 'createdAt' | 'requesterInfo' | 'status' | 'history' | 'comments' | 'imageUrls' | 'workData'>, images: File[]) => Promise<void>;
  onCancel: () => void;
  existingRequest?: SampleRequest | null;
  addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

const inputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200";
const labelClasses = "block text-sm font-medium text-gray-700 dark:text-slate-300";

const coatingMethods = ['증착', '컬러코팅', '클리어코팅', '무광코팅', '내부코팅'];
const postProcessingOptions = ['인쇄', '박', '라벨', '조립'];

type FormItem = Omit<SampleRequestItem, 'quantity'> & { quantity: string };

const SampleRequestForm: React.FC<SampleRequestFormProps> = ({ onSave, onCancel, existingRequest, addToast }) => {
    const getLocalDate = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().split('T')[0];
    };
    
    const [formData, setFormData] = useState({
        clientName: existingRequest?.clientName || '',
        productName: existingRequest?.productName || '',
        dueDate: existingRequest?.dueDate || '',
        remarks: existingRequest?.remarks || '',
        requestDate: existingRequest?.requestDate || getLocalDate(),
        requesterName: existingRequest?.requesterName || '',
        contact: existingRequest?.contact || '',
    });
    const [items, setItems] = useState<FormItem[]>(
        existingRequest?.items ? existingRequest.items.map(item => ({...item, quantity: String(item.quantity)})) : [{ partName: '', colorSpec: '', quantity: '', postProcessing: [], coatingMethod: '' }]
    );
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleItemChange = (index: number, field: keyof Omit<FormItem, 'postProcessing'>, value: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleItemPostProcessingChange = (itemIndex: number, option: string) => {
        const newItems = [...items];
        const currentPostProcessing = newItems[itemIndex].postProcessing || [];
        const newSelection = currentPostProcessing.includes(option)
            ? currentPostProcessing.filter(item => item !== option)
            : [...currentPostProcessing, option];
        newItems[itemIndex] = { ...newItems[itemIndex], postProcessing: newSelection };
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { partName: '', colorSpec: '', quantity: '', postProcessing: [], coatingMethod: '' }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // 원본 비율 유지하면서 크기 조정
                const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                
                // 이미지 그리기
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // 압축된 이미지를 Blob으로 변환
                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    } else {
                        resolve(file); // 압축 실패 시 원본 반환
                    }
                }, 'image/jpeg', quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            
            // 이미지 압축
            const compressedFiles = await Promise.all(
                files.map(file => {
                    // 이미지 파일만 압축 (5MB 이상인 경우)
                    if (file.type.startsWith('image/') && file.size > 5 * 1024 * 1024) {
                        return compressImage(file, 1920, 0.8);
                    }
                    return file;
                })
            );
            
            setImageFiles(compressedFiles);
            
            // 미리보기 생성
            const previews = compressedFiles.map(file => {
                return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.readAsDataURL(file);
                });
            });
            
            Promise.all(previews).then(setImagePreviews);
        }
    };
    
    const removeImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const dataToSave = {
                ...formData,
                items: items.map(item => ({
                    ...item,
                    quantity: parseInt(item.quantity, 10) || 0
                })).filter(item => item.partName && item.colorSpec && item.quantity > 0 && item.coatingMethod)
            }
            if (dataToSave.items.length === 0) {
                addToast({ message: '최소 하나 이상의 유효한 품목(부속명, 색상, 코팅방식, 수량 포함)을 입력해야 합니다.', type: 'error' });
                setIsSaving(false);
                return;
            }
            await onSave(dataToSave, imageFiles);
        } catch (error) {
            setIsSaving(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <form id="sample-request-form" onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2 dark:border-slate-700">요청 정보</h3>
                            <div><label htmlFor="requestDate" className={labelClasses}>요청일</label><input type="date" name="requestDate" value={formData.requestDate} onChange={handleChange} required className={inputClasses} /></div>
                            <div><label htmlFor="requesterName" className={labelClasses}>요청담당자명</label><input type="text" name="requesterName" value={formData.requesterName} onChange={handleChange} required className={inputClasses} /></div>
                            <div><label htmlFor="contact" className={labelClasses}>연락처</label><input type="tel" name="contact" value={formData.contact} onChange={handleChange} required className={inputClasses} /></div>
                            <div><label htmlFor="clientName" className={labelClasses}>고객사명</label><input type="text" name="clientName" value={formData.clientName} onChange={handleChange} required className={inputClasses} /></div>
                            <div><label htmlFor="productName" className={labelClasses}>제품명</label><input type="text" name="productName" value={formData.productName} onChange={handleChange} required className={inputClasses} /></div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2 dark:border-slate-700">공통 사양</h3>
                            <div><label htmlFor="dueDate" className={labelClasses}>납기 요청일</label><input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} required className={inputClasses} /></div>
                            <div><label htmlFor="remarks" className={labelClasses}>비고</label><textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={3} className={inputClasses} /></div>
                            {!existingRequest && (
                                <div>
                                    <label htmlFor="images" className={labelClasses}>참고 이미지</label>
                                    <input type="file" name="images" onChange={handleImageChange} multiple accept="image/*" className={`${inputClasses} p-0 file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0 file:bg-slate-100 dark:file:bg-slate-600 file:cursor-pointer`} />
                                    
                                    {/* 이미지 미리보기 */}
                                    {imagePreviews.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                선택된 이미지 ({imagePreviews.length}개)
                                            </p>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                {imagePreviews.map((preview, index) => (
                                                    <div key={index} className="relative group">
                                                        <img 
                                                            src={preview} 
                                                            alt={`미리보기 ${index + 1}`}
                                                            className="w-full h-24 object-cover rounded-md border border-gray-200 dark:border-gray-600"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeImage(index)}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t dark:border-slate-700">
                        <h3 className="text-lg font-semibold">품목 리스트</h3>
                        {items.map((item, index) => (
                            <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_0.5fr_auto] gap-3">
                                    <div><label className={labelClasses}>부속명</label><input type="text" value={item.partName} onChange={e => handleItemChange(index, 'partName', e.target.value)} required className={inputClasses} /></div>
                                    <div><label className={labelClasses}>색상(사양)</label><input type="text" value={item.colorSpec} onChange={e => handleItemChange(index, 'colorSpec', e.target.value)} required className={inputClasses} /></div>
                                    <div><label className={labelClasses}>코팅/증착 방식</label><select value={item.coatingMethod} onChange={e => handleItemChange(index, 'coatingMethod', e.target.value)} required className={inputClasses}><option value="">선택...</option>{coatingMethods.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                                    <div><label className={labelClasses}>요청 수량</label><input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} min="0" required className={inputClasses} /></div>
                                    <div className="flex items-end">
                                        {items.length > 1 && <button type="button" onClick={() => removeItem(index)} className="bg-red-500 text-white h-10 w-10 flex items-center justify-center rounded-md hover:bg-red-600">-</button>}
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClasses}>후가공 (복수선택 가능)</label>
                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">{postProcessingOptions.map(opt => <label key={opt} className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={item.postProcessing.includes(opt)} onChange={() => handleItemPostProcessingChange(index, opt)} /><span>{opt}</span></label>)}</div>
                                </div>
                            </div>
                        ))}
                         <button type="button" onClick={addItem} className="w-full mt-2 py-2 border-2 border-dashed rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">품목 추가</button>
                    </div>
                </form>
            </div>

            <div className="flex-shrink-0 flex justify-end gap-4 p-4 border-t dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-slate-600 px-6 py-2 rounded-lg">취소</button>
                <button type="submit" form="sample-request-form" disabled={isSaving} className="bg-primary-600 text-white px-6 py-2 rounded-lg disabled:opacity-50">{isSaving ? '저장 중...' : '요청 제출'}</button>
            </div>
        </div>
    );
};

export default SampleRequestForm;