
import React, { useState, ChangeEvent, FormEvent, useEffect, useMemo, useRef } from 'react';
import { JigRequest, MasterData } from '../types';

interface RequestFormProps {
  onSave: (
    requestData: Omit<JigRequest, 'id' | 'status' | 'history' | 'receivedQuantity' | 'requestDate' | 'comments' | 'imageUrls'>,
    imageFiles: File[]
  ) => Promise<void>;
  onCancel: () => void;
  existingRequest?: JigRequest | null;
  masterData: MasterData;
}

// Helper Components for form fields
const baseInputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200";
const labelClasses = "block text-sm font-medium text-gray-700 dark:text-slate-300";

interface InputFieldProps {
    label: string;
    name: string;
    value: string | number;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    required?: boolean;
}
const InputField: React.FC<InputFieldProps> = ({ label, name, value, onChange, type = 'text', required = false }) => (
    <div>
        <label htmlFor={name} className={labelClasses}>{label}</label>
        <input type={type} id={name} name={name} value={value} onChange={onChange} required={required} className={baseInputClasses} lang="ko" />
    </div>
);

interface SelectFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    options: string[];
    required?: boolean;
}
const SelectField: React.FC<SelectFieldProps> = ({ label, name, value, onChange, options, required = false }) => (
    <div>
        <label htmlFor={name} className={labelClasses}>{label}</label>
        <select id={name} name={name} value={value} onChange={onChange} required={required} className={baseInputClasses} lang="ko">
            <option value="">선택...</option>
            {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
    </div>
);

interface TextareaFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
    rows?: number;
}
const TextareaField: React.FC<TextareaFieldProps> = ({ label, name, value, onChange, rows = 3 }) => (
    <div>
        <label htmlFor={name} className={labelClasses}>{label}</label>
        <textarea id={name} name={name} value={value} onChange={onChange} rows={rows} className={baseInputClasses} lang="ko" />
    </div>
);

const RequestForm: React.FC<RequestFormProps> = ({ onSave, onCancel, existingRequest, masterData }) => {
  const [formData, setFormData] = useState({
    requestType: existingRequest?.requestType || '',
    requester: existingRequest?.requester || '',
    destination: existingRequest?.destination || '',
    deliveryDate: existingRequest?.deliveryDate || '',
    itemName: existingRequest?.itemName || '',
    partName: existingRequest?.partName || '',
    itemNumber: existingRequest?.itemNumber || '',
    jigHandleLength: existingRequest?.jigHandleLength?.toString() ?? '',
    quantity: existingRequest?.quantity?.toString() ?? '',
    coreCost: existingRequest?.coreCost?.toString() ?? '',
    unitPrice: existingRequest?.unitPrice?.toString() ?? '',
    remarks: existingRequest?.remarks || '',
    specification: existingRequest?.specification || ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Cleanup object URLs to avoid memory leaks
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (['itemNumber', 'jigHandleLength', 'quantity', 'coreCost', 'unitPrice'].includes(name)) {
        const numericValue = value.replace(/[^0-9]/g, '');
        setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
        const dataToSave = {
          ...formData,
          quantity: parseInt(formData.quantity, 10) || 0,
          jigHandleLength: formData.jigHandleLength ? parseInt(formData.jigHandleLength, 10) : undefined,
          coreCost: parseInt(formData.coreCost, 10) || 0,
          unitPrice: parseInt(formData.unitPrice, 10) || 0,
        };

        await onSave(dataToSave, imageFiles);
        // On success, the parent component navigates away, so no need to reset the saving state here.
    } catch (error) {
        // The error is logged and a toast is shown by the parent component (App.tsx).
        // We just need to re-enable the form for the user to try again.
        setIsSaving(false);
    }
  };
  
  const newRequestTypes = ['신규제작', '새지그교체', '새지그(감합확인필요)'];

  // When editing, provide the new request types plus the existing type to prevent data loss.
  // This makes the dropdown behave like a new request form while being safe.
  const requestTypesToShowForEdit = useMemo(() => {
    const types = new Set(newRequestTypes);
    if (existingRequest?.requestType) {
        types.add(existingRequest.requestType);
    }
    // Also include types from master data if they exist, for more comprehensive options.
    masterData.requestTypes.forEach(type => types.add(type));
    return Array.from(types);
  }, [existingRequest, masterData.requestTypes]);
  
  const requestTypesToShow = existingRequest ? requestTypesToShowForEdit : newRequestTypes;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form id="request-form" onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{existingRequest ? '요청 수정' : '신규 요청 작성'}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                  <SelectField label="요청 유형" name="requestType" value={formData.requestType} onChange={handleChange} options={requestTypesToShow} required />
                  <SelectField label="요청자" name="requester" value={formData.requester} onChange={handleChange} options={masterData.requesters.map(r => r.name)} required />
                  <SelectField label="수신처" name="destination" value={formData.destination} onChange={handleChange} options={masterData.destinations.map(d => d.name)} required />
                  <InputField label="완료 요청일" name="deliveryDate" type="date" value={formData.deliveryDate} onChange={handleChange} required />
                  <InputField label="제품명" name="itemName" value={formData.itemName} onChange={handleChange} required />
                  <InputField label="부속명" name="partName" value={formData.partName} onChange={handleChange} />
                  <div>
                      <label htmlFor="itemNumber" className={labelClasses}>지그번호</label>
                      <input type="text" id="itemNumber" name="itemNumber" value={formData.itemNumber} onChange={handleChange} className={baseInputClasses} inputMode="numeric" pattern="[0-9]*" lang="ko" />
                  </div>
                  <div>
                      <label htmlFor="jigHandleLength" className={labelClasses}>지그손잡이길이</label>
                      <div className="relative mt-1">
                          <input 
                              type="text" 
                              id="jigHandleLength" 
                              name="jigHandleLength" 
                              value={formData.jigHandleLength} 
                              onChange={handleChange} 
                              className={`${baseInputClasses} pr-12`} 
                              inputMode="numeric" 
                              pattern="[0-9]*"
                              lang="ko"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 dark:text-slate-400 sm:text-sm">
                                  mm
                              </span>
                          </div>
                      </div>
                  </div>
                  <div>
                      <label htmlFor="quantity" className={labelClasses}>발주수량</label>
                      <input type="text" id="quantity" name="quantity" value={formData.quantity} onChange={handleChange} required className={baseInputClasses} inputMode="numeric" pattern="[0-9]*" lang="ko" />
                  </div>
                  <div>
                      <label htmlFor="coreCost" className={labelClasses}>코어제작비</label>
                      <input type="text" id="coreCost" name="coreCost" value={formData.coreCost} onChange={handleChange} className={baseInputClasses} inputMode="numeric" pattern="[0-9]*" lang="ko" />
                  </div>
                  <div>
                      <label htmlFor="unitPrice" className={labelClasses}>단가</label>
                      <input type="text" id="unitPrice" name="unitPrice" value={formData.unitPrice} onChange={handleChange} className={baseInputClasses} inputMode="numeric" pattern="[0-9]*" lang="ko" />
                  </div>
              </div>
              
              <div className="space-y-4">
                   <TextareaField label="비고" name="remarks" value={formData.remarks} onChange={handleChange} rows={5} />
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
              </div>
            </div>
          </form>
      </div>

      <div className="flex-shrink-0 flex justify-end gap-4 p-4 border-t dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors">
          취소
        </button>
        <button 
          type="submit" 
          form="request-form"
          className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-primary-400 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              저장 중...
            </>
          ) : (
            existingRequest ? '수정 저장' : '요청 저장'
          )}
        </button>
      </div>
    </div>
  );
};

export default RequestForm;
