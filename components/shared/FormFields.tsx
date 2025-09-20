import React, { ChangeEvent } from 'react';

// 공통 스타일 클래스들
export const baseInputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200";
export const labelClasses = "block text-sm font-medium text-gray-700 dark:text-slate-300";

interface InputFieldProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  inputMode?: string;
  pattern?: string;
  className?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  name, 
  value, 
  onChange, 
  type = 'text', 
  required = false,
  placeholder,
  disabled = false,
  inputMode,
  pattern,
  className = ""
}) => (
  <div className={className}>
    <label htmlFor={name} className={labelClasses}>
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input 
      type={type} 
      id={name} 
      name={name} 
      value={value} 
      onChange={onChange} 
      required={required}
      placeholder={placeholder}
      disabled={disabled}
      inputMode={inputMode}
      pattern={pattern}
      className={baseInputClasses} 
      lang="ko" 
    />
  </div>
);

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({ 
  label, 
  name, 
  value, 
  onChange, 
  options, 
  required = false,
  placeholder,
  disabled = false,
  className = ""
}) => (
  <div className={className}>
    <label htmlFor={name} className={labelClasses}>
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <select 
      id={name} 
      name={name} 
      value={value} 
      onChange={onChange} 
      required={required}
      disabled={disabled}
      className={baseInputClasses}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

interface TextareaFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({ 
  label, 
  name, 
  value, 
  onChange, 
  rows = 3,
  required = false,
  placeholder,
  disabled = false,
  className = ""
}) => (
  <div className={className}>
    <label htmlFor={name} className={labelClasses}>
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <textarea 
      id={name} 
      name={name} 
      value={value} 
      onChange={onChange} 
      rows={rows} 
      required={required}
      placeholder={placeholder}
      disabled={disabled}
      className={baseInputClasses} 
      lang="ko" 
    />
  </div>
);

interface NumberFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const NumberField: React.FC<NumberFieldProps> = ({ 
  label, 
  name, 
  value, 
  onChange, 
  required = false,
  placeholder,
  disabled = false,
  min,
  max,
  step,
  className = ""
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // 숫자만 허용
    const numericValue = e.target.value.replace(/[^0-9.]/g, '');
    const modifiedEvent = {
      ...e,
      target: { ...e.target, value: numericValue }
    };
    onChange(modifiedEvent);
  };

  return (
    <div className={className}>
      <label htmlFor={name} className={labelClasses}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input 
        type="text" 
        id={name} 
        name={name} 
        value={value} 
        onChange={handleChange} 
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="numeric"
        pattern="[0-9]*"
        className={baseInputClasses} 
        lang="ko" 
      />
    </div>
  );
};

interface DateFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
}

export const DateField: React.FC<DateFieldProps> = ({ 
  label, 
  name, 
  value, 
  onChange, 
  required = false,
  disabled = false,
  min,
  max,
  className = ""
}) => (
  <div className={className}>
    <label htmlFor={name} className={labelClasses}>
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input 
      type="date" 
      id={name} 
      name={name} 
      value={value} 
      onChange={onChange} 
      required={required}
      disabled={disabled}
      min={min}
      max={max}
      className={baseInputClasses} 
    />
  </div>
);
