import React, { useState, FC, ChangeEvent, FormEvent, useRef, useEffect } from 'react';
import { ProductionRequest, ProductionRequestType, UserProfile } from '../types';

interface ProductionRequestFormProps {
    onSave: (data: Omit<ProductionRequest, 'id' | 'createdAt' | 'author' | 'status' | 'history' | 'comments' | 'quantity' | 'imageUrls'> & { quantity: string }, imageFiles: File[] ) => Promise<void>;
    onCancel: () => void;
    currentUserProfile: UserProfile | null;
    existingRequest?: ProductionRequest | null;
}

const ProductionRequestForm: FC<ProductionRequestFormProps> = ({ onSave, onCancel, currentUserProfile, existingRequest }) => {
    
    const [formData, setFormData] = useState({
        requestType: existingRequest?.requestType || ProductionRequestType.Urgent,
        requester: existingRequest?.requester || currentUserProfile?.displayName || '',
        orderNumber: existingRequest?.orderNumber || 'T',
        supplier: existingRequest?.supplier || '',
        productName: existingRequest?.productName || '',
        partName: existingRequest?.partName || '',
        quantity: existingRequest?.quantity?.toString() || '',
        content: existingRequest?.content || '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
        };
    }, [imagePreviews]);

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newPreviews = files.map(file => URL.createObjectURL(file as Blob));
            setImageFiles(prev => [...prev, ...files]);
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => {
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({ ...formData }, imageFiles);
        } catch (error) {
            // Error is handled by parent, just re-enable the button
            setIsSaving(false);
        }
    };
    
    const inputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700";
    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-slate-300";
    const requestTypeOptions = Object.values(ProductionRequestType).filter(type => type !== ProductionRequestType.LogisticsTransfer);

    return (
        <div className="h-full flex flex-col">
            <form id="production-request-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClasses}>요청 유형</label><select name="requestType" value={formData.requestType} onChange={handleChange} required className={inputClasses}>{requestTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div><label className={labelClasses}>요청자</label><input type="text" name="requester" value={formData.requester} onChange={handleChange} required className={inputClasses} /></div>
                    <div><label className={labelClasses}>발주번호</label><input type="text" name="orderNumber" value={formData.orderNumber} onChange={handleChange} required className={inputClasses} /></div>
                    <div><label className={labelClasses}>발주처</label><input type="text" name="supplier" value={formData.supplier} onChange={handleChange} required className={inputClasses} /></div>
                    <div><label className={labelClasses}>제품명</label><input type="text" name="productName" value={formData.productName} onChange={handleChange} required className={inputClasses} /></div>
                    <div><label className={labelClasses}>부속명</label><input type="text" name="partName" value={formData.partName} onChange={handleChange} required className={inputClasses} /></div>
                    <div><label className={labelClasses}>요청수량</label><input type="number" name="quantity" value={formData.quantity} onChange={handleChange} required className={inputClasses} /></div>
                </div>
                <div><label className={labelClasses}>요청 내용</label><textarea name="content" value={formData.content} onChange={handleChange} required className={inputClasses} rows={4} /></div>
                 {!existingRequest && (
                    <div>
                        <label className={labelClasses}>이미지 첨부</label>
                        <div className="mt-1 flex items-center gap-2">
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} multiple accept="image/*,image/heic,image/heif" className="hidden" />
                            <input type="file" ref={cameraInputRef} onChange={handleImageChange} accept="image/*,image/heic,image/heif" className="hidden" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-sm font-semibold border rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">파일 선택</button>
                            <button type="button" onClick={() => cameraInputRef.current?.click()} className="px-4 py-2 text-sm font-semibold border rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">사진 촬영</button>
                        </div>
                        {imagePreviews.length > 0 && (
                            <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="relative">
                                        <img src={preview} alt={`preview ${index}`} className="w-full h-24 object-cover rounded" />
                                        <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </form>
            <div className="flex-shrink-0 flex justify-end gap-4 p-4 border-t dark:border-slate-700">
                <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-slate-600 px-6 py-2 rounded-lg">취소</button>
                <button type="submit" form="production-request-form" disabled={isSaving} className="bg-primary-600 text-white px-6 py-2 rounded-lg disabled:opacity-50">
                    {isSaving ? '저장 중...' : (existingRequest ? '수정 저장' : '요청 저장')}
                </button>
            </div>
        </div>
    );
};

export default ProductionRequestForm;