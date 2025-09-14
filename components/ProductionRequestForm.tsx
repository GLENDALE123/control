import React, { useState, FC, ChangeEvent, FormEvent } from 'react';
import { ProductionRequest, ProductionRequestType, UserProfile } from '../types';

interface ProductionRequestFormProps {
    onSave: (data: Omit<ProductionRequest, 'id' | 'createdAt' | 'author' | 'status' | 'history' | 'comments' | 'quantity'> & { quantity: string } ) => Promise<void>;
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

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({ ...formData });
        } catch (error) {
            // Error is handled by parent, just re-enable the button
            setIsSaving(false);
        }
    };
    
    const inputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700";
    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-slate-300";
    const requestTypeOptions = Object.values(ProductionRequestType);

    return (
        <div className="h-full flex flex-col">
            <form id="production-request-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClasses}>요청 유형</label><select name="requestType" value={formData.requestType} onChange={handleChange} required className={inputClasses}>{requestTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div><label className={labelClasses}>요청자</label><input type="text" name="requester" value={formData.requester} onChange={handleChange} required className={inputClasses} /></div>
                    <div><label className={labelClasses}>발주번호</label><input type="text" name="orderNumber" value={formData.orderNumber} onChange={handleChange} className={inputClasses} /></div>
                    <div><label className={labelClasses}>발주처</label><input type="text" name="supplier" value={formData.supplier} onChange={handleChange} required className={inputClasses} /></div>
                    <div><label className={labelClasses}>제품명</label><input type="text" name="productName" value={formData.productName} onChange={handleChange} required className={inputClasses} /></div>
                    <div><label className={labelClasses}>부속명</label><input type="text" name="partName" value={formData.partName} onChange={handleChange} className={inputClasses} /></div>
                    <div><label className={labelClasses}>요청 수량</label><input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" required className={inputClasses} /></div>
                </div>
                <div><label className={labelClasses}>요청 내용</label><textarea name="content" value={formData.content} onChange={handleChange} rows={5} required className={inputClasses} /></div>
            </form>
            <div className="flex-shrink-0 flex justify-end gap-4 p-4 border-t dark:border-slate-700">
                <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-slate-600 px-6 py-2 rounded-lg">취소</button>
                <button type="submit" form="production-request-form" disabled={isSaving} className="bg-primary-600 text-white px-6 py-2 rounded-lg disabled:opacity-50">{isSaving ? '저장 중...' : (existingRequest ? '수정 저장' : '요청 저장')}</button>
            </div>
        </div>
    );
};
export default ProductionRequestForm;