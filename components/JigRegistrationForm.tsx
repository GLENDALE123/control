import React, { useState, ChangeEvent, FormEvent, useRef, useEffect } from 'react';

interface JigRegistrationFormProps {
  isOpen: boolean;
  onSave: (formData: { requestType: string; itemName: string; partName: string; itemNumber: string; remarks: string; }, imageFiles: File[]) => void;
  onClose: () => void;
  autocompleteData: {
    itemNames: string[];
    partNames: string[];
    itemNumbers: string[];
  };
}

const baseInputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200";
const labelClasses = "block text-sm font-medium text-gray-700 dark:text-slate-300";

interface InputFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    suggestions?: string[];
}
const InputField: React.FC<InputFieldProps> = ({ label, name, value, onChange, required = false, suggestions }) => (
    <div>
        <label htmlFor={name} className={labelClasses}>{label}</label>
        <input type="text" id={name} name={name} value={value} onChange={onChange} required={required} className={baseInputClasses} list={suggestions ? `${name}-suggestions` : undefined} lang="ko" />
        {suggestions && suggestions.length > 0 && (
            <datalist id={`${name}-suggestions`}>
                {suggestions.map(option => <option key={option} value={option} />)}
            </datalist>
        )}
    </div>
);

const SelectField: React.FC<{ label: string; name: string; value: string; onChange: (e: ChangeEvent<HTMLSelectElement>) => void; options: string[]; required?: boolean; }> = ({ label, name, value, onChange, options, required = false }) => (
    <div>
        <label htmlFor={name} className={labelClasses}>{label}</label>
        <select id={name} name={name} value={value} onChange={onChange} required={required} className={baseInputClasses} lang="ko">
            <option value="">선택...</option>
            {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
    </div>
);

const TextareaField: React.FC<{ label: string; name: string; value: string; onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void; rows?: number; }> = ({ label, name, value, onChange, rows = 3 }) => (
    <div>
        <label htmlFor={name} className={labelClasses}>{label}</label>
        <textarea id={name} name={name} value={value} onChange={onChange} rows={rows} className={baseInputClasses} lang="ko" />
    </div>
);

const JigRegistrationForm: React.FC<JigRegistrationFormProps> = ({ isOpen, onSave, onClose, autocompleteData }) => {
  const [formData, setFormData] = useState({
    requestType: '',
    itemName: '',
    partName: '',
    itemNumber: '',
    remarks: ''
  });
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(formData, imageFiles);
  };
  
  if (!isOpen) return null;

  const productionTypes = ['증착용', '코팅용', '내부코팅용'];

  return (
    <div className="h-full flex flex-col">
        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto flex-1 p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <SelectField label="생산구분" name="requestType" value={formData.requestType} onChange={handleChange} options={productionTypes} required />
                    <InputField label="제품명" name="itemName" value={formData.itemName} onChange={handleChange} required suggestions={autocompleteData.itemNames} />
                    <InputField label="부속명" name="partName" value={formData.partName} onChange={handleChange} suggestions={autocompleteData.partNames} />
                    <InputField label="지그번호" name="itemNumber" value={formData.itemNumber} onChange={handleChange} suggestions={autocompleteData.itemNumbers} />
                    <TextareaField label="특이사항" name="remarks" value={formData.remarks} onChange={handleChange} rows={5} />
                </div>
                <div className="space-y-4">
                     <div>
                        <label className={labelClasses}>이미지 첨부</label>
                        <div className="mt-1 flex items-center gap-2">
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} multiple accept="image/*" className="hidden" />
                            <input type="file" ref={cameraInputRef} onChange={handleImageChange} accept="image/*" capture="environment" className="hidden" />
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
                </div>
            </div>
        </form>
        <div className="flex-shrink-0 flex justify-end gap-4 p-4 border-t dark:border-slate-700">
            <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors">
            취소
            </button>
            <button type="submit" onClick={handleSubmit} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors">
            등록
            </button>
        </div>
    </div>
  );
};

export default JigRegistrationForm;