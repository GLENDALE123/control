import React, { useState, useMemo, useRef, useEffect, FC, ChangeEvent, useCallback } from 'react';
import { UserProfile, PackagingReport, PackagedBox, ShortageRequest, HistoryEntry, ProductionRequest, ProductionRequestStatus, ProductionSchedule, Order, ProcessCoat, ProductionRequestType } from '../types';
import { db } from '../firebaseConfig';
import FullScreenModal from './FullScreenModal';
import ConfirmationModal from './ConfirmationModal';
import firebase from 'firebase/compat/app';
// FIX: Module '"file:///components/ProductionScheduleList"' has no default export. Changed to named import.
import { ProductionScheduleList } from './ProductionScheduleList';
import OrderRegistrationList from './OrderRegistrationList';
import { PRODUCTION_REQUEST_STATUS_COLORS } from '../constants';


declare const html2canvas: any;

interface WorkPerformanceCenterProps {
    addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
    currentUserProfile: UserProfile | null;
    productionRequests: ProductionRequest[];
    onOpenNewProductionRequest: () => void;
    onSelectProductionRequest: (request: ProductionRequest) => void;
    productionSchedules: ProductionSchedule[];
    onSaveProductionSchedules: (schedules: Omit<ProductionSchedule, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
    onDeleteProductionSchedule: (scheduleId: string) => Promise<void>;
    onDeleteProductionSchedulesByDate: (date: string) => Promise<void>;
    orders: Order[];
    onSaveOrders: (orders: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
}

const productionLineOptions = ['증착1', '증착2', '증착1하도', '증착1상도', '증착2하도', '증착2상도', '2코팅', '1코팅', '내부코팅1호기', '내부코팅2호기', '내부코팅3호기', '증착1하도(아)', '증착1상도(아)', '증착2하도(아)', '증착2상도(아)'].sort((a,b) => a.localeCompare(b, 'ko'));
const xToOneRatioOptions = ['1:1', '2:1', '3:1', '4:1', '5:1', '6:1'];
const oneToXRatioOptions = ['1:2', '1:3', '1:4', '1:5', '1:6', '1:7'];

// FIX: Add a constant for sorting production lines in a logical order.
const productionLineSortOrder = [
    '증착1하도(아)',
    '증착1상도(아)',
    '증착1',
    '증착1하도',
    '증착1상도',
    '증착2하도(아)',
    '증착2상도(아)',
    '증착2',
    '증착2하도',
    '증착2상도',
    '2코팅',
    '1코팅',
    '내부코팅1호기',
    '내부코팅2호기',
    '내부코팅3호기'
];


interface PackagedBoxData {
    boxNumber: string;
    type: '정상' | 'B급' | '구분출하' | '';
    quantity: string;
    reason: string;
}

interface PackagingFormData {
    workDate: string;
    authorName: string;
    productionLine: string;
    orderNumbers: string[];
    supplier: string;
    productName: string;
    partName: string;
    orderQuantity: string;
    specification: string;
    lineRatio: string;
    productionPerMinute: string;
    uph: string;
    inputQuantity: string;
    goodQuantity: string;
    defectQuantity: string;
    yieldRate: string;
    defectRate: string;
    personnelCount: string;
    startTime: string;
    endTime: string;
    packagingUnit: string;
    boxCount: string;
    remainder: string;
    packagedBoxes: PackagedBoxData[];
    memo: string;
}

const PreviewField: FC<{ label: string; value?: string | number | null; fullWidth?: boolean; className?: string; valueClassName?: string }> = ({ label, value, fullWidth, className, valueClassName }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div className={`${fullWidth ? 'col-span-3' : 'col-span-1'} ${className}`}>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400" style={{ fontSize: '0.525rem' }}>{label}</p>
            <p className={`whitespace-pre-wrap break-words ${valueClassName || 'text-sm text-gray-800 dark:text-slate-200'}`} style={{ fontSize: '0.6125rem' }}>{String(value)}</p>
        </div>
    );
};

const PackagingPreviewCard: FC<{ data: PackagingFormData; addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void; }> = ({ data, addToast }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const highlightClass = 'font-bold text-gray-800 dark:text-white';
    const yellowHighlightClass = 'font-bold text-yellow-500';

    const handleShare = useCallback(async () => {
        const elementToCapture = cardRef.current;
        if (!elementToCapture) {
            addToast({ message: '미리보기 영역을 찾을 수 없습니다.', type: 'error' });
            return;
        }

        const isDarkMode = document.documentElement.classList.contains('dark');
        const bgColor = isDarkMode ? '#1e293b' : '#ffffff'; // slate-800 for dark, white for light

        addToast({ message: '이미지 생성 중...', type: 'info' });
        try {
            const canvas = await html2canvas(elementToCapture, {
                useCORS: true,
                backgroundColor: bgColor,
                scale: 2,
            });

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            
            if (!blob) {
                addToast({ message: '이미지 파일 생성 실패.', type: 'error' });
                return;
            }

            const fileName = `production-report-${data.workDate}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            const isDesktop = !/Mobi|Android/i.test(navigator.userAgent);

            if (isDesktop && navigator.clipboard?.write) {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                addToast({ message: '생산 라벨 이미지가 클립보드에 복사되었습니다.', type: 'success' });
            } else if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `생산일보: ${data.productName}`,
                    text: `T.M.S. 생산일보 공유`
                });
                addToast({ message: '생산일보가 공유되었습니다.', type: 'success' });
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
    }, [addToast, data]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg flex flex-col h-full">
            <div ref={cardRef} className="flex-1 flex flex-col">
                <div className="p-4 border-b dark:border-slate-700 space-y-2">
                    <div className="flex justify-between items-baseline">
                        <h4 className={`${yellowHighlightClass} break-all`} style={{ fontSize: '0.9rem' }}>{data.productName || '제품명'} / {data.partName || '부속명'}</h4>
                        <span className={yellowHighlightClass} style={{ fontSize: '0.9rem' }}>{data.workDate}</span>
                    </div>
                    <p className={`${yellowHighlightClass} font-mono`} style={{ fontSize: '0.9rem' }}>{data.orderNumbers.join(', ')}</p>
                </div>
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                        <PreviewField label="생산라인" value={data.productionLine} valueClassName={yellowHighlightClass} />
                        <PreviewField label="라인비율" value={data.lineRatio} valueClassName={yellowHighlightClass} />
                        <PreviewField label="발주처" value={data.supplier} valueClassName={yellowHighlightClass} />
                        <PreviewField label="발주수량" value={data.orderQuantity ? Number(data.orderQuantity).toLocaleString() : ''} valueClassName={highlightClass} />
                        <PreviewField label="인원" value={data.personnelCount ? Number(data.personnelCount).toLocaleString() + ' 명' : ''} valueClassName={yellowHighlightClass} />
                        <PreviewField label="작성자" value={data.authorName} valueClassName={highlightClass} />
                        <PreviewField label="사양" value={data.specification} fullWidth valueClassName={highlightClass}/>
                        <PreviewField label="투입" value={data.inputQuantity ? Number(data.inputQuantity).toLocaleString() : ''} valueClassName={yellowHighlightClass} />
                        <PreviewField label="양품" value={data.goodQuantity ? Number(data.goodQuantity).toLocaleString() : ''} valueClassName={highlightClass} />
                        <PreviewField label="불량" value={data.defectQuantity ? Number(data.defectQuantity).toLocaleString() : ''} valueClassName={highlightClass} />
                        <PreviewField label="양품률" value={data.yieldRate} valueClassName={highlightClass} />
                        <PreviewField label="불량률" value={data.defectRate} valueClassName={highlightClass} />
                        <PreviewField label="1분당 생산량" value={data.productionPerMinute ? Number(data.productionPerMinute).toLocaleString() : ''} valueClassName={highlightClass} />
                        <PreviewField label="시간당생산량(UPH)" value={data.uph ? Number(data.uph.replace(/,/g, '')).toLocaleString() : ''} valueClassName={yellowHighlightClass} />
                        <PreviewField label="시작시간" value={data.startTime} valueClassName={yellowHighlightClass} />
                        <PreviewField label="종료시간" value={data.endTime} valueClassName={yellowHighlightClass} />
                    </div>
                     {data.packagedBoxes.some(b => b.boxNumber || b.type || b.quantity) && (
                        <div className="pt-3 border-t dark:border-slate-700">
                            <p className="font-medium text-gray-500 dark:text-slate-400 mb-2" style={{ fontSize: '0.6rem' }}>포장 정보</p>
                            <div className="space-y-1" style={{ fontSize: '0.6rem' }}>
                            {data.packagedBoxes.map((box, index) => (
                                (box.boxNumber || box.type || box.quantity) &&
                                <div key={index} className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-700/50 p-1 rounded">
                                    <span>{box.boxNumber ? `${box.boxNumber}호박스` : ''}</span>
                                    <span>{box.type}</span>
                                    <span className="text-right">{box.quantity ? Number(box.quantity).toLocaleString() : ''}</span>
                                    {(box.type === 'B급' || box.type === '구분출하') && box.reason && (
                                        <div className="col-span-3 text-red-400 pl-1" style={{ fontSize: '0.5rem' }}>사유: {box.reason}</div>
                                    )}
                                </div>
                            ))}
                            </div>
                        </div>
                    )}
                    <PreviewField label="메모" value={data.memo} fullWidth valueClassName={highlightClass} />
                </div>
            </div>
            <div className="p-2 border-t dark:border-slate-700">
                <button
                    type="button"
                    onClick={handleShare}
                    className="w-full bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-600"
                >
                    미리보기 이미지로 복사
                </button>
            </div>
        </div>
    );
};

const NumericInput: FC<{ value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void; name: string; label: string; disabled?: boolean; className?: string }> = ({ value, onChange, name, label, disabled, className }) => {
    const displayValue = useMemo(() => {
        if (value === '' || value === null || value === undefined) return '';
        const num = parseInt(value, 10);
        return isNaN(num) ? '' : num.toLocaleString();
    }, [value]);

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>
            <input 
                type="text" 
                name={name} 
                value={displayValue} 
                onChange={onChange} 
                disabled={disabled} 
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 focus:ring-primary-500 focus:border-primary-500 ${className}`}
                inputMode="numeric"
            />
        </div>
    );
};

const PackagingFormSection: FC<{ 
    addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void; 
    currentUserProfile: UserProfile | null;
    existingReport: PackagingReport | null;
    onSaveComplete: () => void;
    onCancelEdit: () => void;
}> = ({ addToast, currentUserProfile, existingReport, onSaveComplete, onCancelEdit }) => {
    
    const getInitialState = useCallback((user: UserProfile | null): PackagingFormData => ({
        workDate: getLocalDateString(new Date()),
        authorName: user?.displayName || '',
        productionLine: '',
        orderNumbers: ['T'],
        supplier: '', productName: '', partName: '', orderQuantity: '', specification: '',
        lineRatio: '',
        productionPerMinute: '',
        uph: '',
        inputQuantity: '0',
        goodQuantity: '0',
        defectQuantity: '',
        yieldRate: '',
        defectRate: '',
        personnelCount: '',
        startTime: '', endTime: '',
        packagingUnit: '0',
        boxCount: '0',
        remainder: '0',
        packagedBoxes: [{ boxNumber: '', type: '', quantity: '', reason: '' }],
        memo: '',
    }), []);
    
    const [formData, setFormData] = useState<PackagingFormData>(() => {
        const savedDraft = sessionStorage.getItem('packagingFormDraft');
        if (savedDraft && !existingReport) {
            try {
                const parsedDraft = JSON.parse(savedDraft);
                parsedDraft.workDate = getLocalDateString(new Date());
                return parsedDraft;
            } catch (e) {
                console.error("Error parsing packaging draft from sessionStorage", e);
            }
        }
        return getInitialState(currentUserProfile);
    });
    const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');
    
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if(existingReport) {
             setFormData({
                workDate: existingReport.workDate,
                authorName: existingReport.author.displayName,
                productionLine: existingReport.productionLine,
                orderNumbers: existingReport.orderNumbers.length > 0 ? existingReport.orderNumbers : ['T'],
                supplier: existingReport.supplier,
                productName: existingReport.productName,
                partName: existingReport.partName,
                orderQuantity: String(existingReport.orderQuantity || ''),
                specification: existingReport.specification || '',
                lineRatio: existingReport.lineRatio,
                productionPerMinute: String(existingReport.productionPerMinute || ''),
                uph: String(existingReport.uph || ''),
                inputQuantity: String(existingReport.inputQuantity || ''),
                goodQuantity: String(existingReport.goodQuantity || ''),
                defectQuantity: String(existingReport.defectQuantity || ''),
                yieldRate: '',
                defectRate: '',
                personnelCount: String(existingReport.personnelCount || ''),
                startTime: existingReport.startTime,
                endTime: existingReport.endTime,
                packagingUnit: String(existingReport.packagingUnit || ''),
                boxCount: String(existingReport.boxCount || ''),
                remainder: String(existingReport.remainder || ''),
                packagedBoxes: existingReport.packagedBoxes.length > 0 ? existingReport.packagedBoxes.map(b => ({...b, quantity: String(b.quantity), reason: b.reason || ''})) : [{ boxNumber: '', type: '', quantity: '', reason: '' }],
                memo: existingReport.memo || '',
            });
            sessionStorage.removeItem('packagingFormDraft');
        } else {
             const savedDraft = sessionStorage.getItem('packagingFormDraft');
             if(savedDraft) {
                try {
                     const parsedDraft = JSON.parse(savedDraft);
                     parsedDraft.workDate = getLocalDateString(new Date());
                     setFormData(parsedDraft);
                } catch (e) {
                    setFormData(getInitialState(currentUserProfile));
                }
             } else {
                 setFormData(getInitialState(currentUserProfile));
             }
        }
    }, [existingReport, getInitialState, currentUserProfile]);
    
    useEffect(() => {
        if (!existingReport) {
            sessionStorage.setItem('packagingFormDraft', JSON.stringify(formData));
        }
    }, [formData, existingReport]);

    useEffect(() => {
        if (Number(formData.packagingUnit) || Number(formData.boxCount) || Number(formData.remainder)) {
            const unit = parseInt(formData.packagingUnit, 10) || 0;
            const count = parseInt(formData.boxCount, 10) || 0;
            const rem = parseInt(formData.remainder, 10) || 0;
            const totalGood = unit * count + rem;
            setFormData(prev => ({...prev, goodQuantity: String(totalGood)}));
        }
    }, [formData.packagingUnit, formData.boxCount, formData.remainder]);

    useEffect(() => {
        const input = parseInt(formData.inputQuantity, 10) || 0;
        const good = parseInt(formData.goodQuantity, 10) || 0;
        const perMinute = parseInt(formData.productionPerMinute, 10) || 0;

        const updates: Partial<Pick<PackagingFormData, 'defectQuantity' | 'yieldRate' | 'defectRate' | 'uph'>> = {};

        if (input >= good) {
            const defect = input - good;
            updates.defectQuantity = String(defect);
            if (input > 0) {
                updates.yieldRate = ((good / input) * 100).toFixed(1) + '%';
                updates.defectRate = ((defect / input) * 100).toFixed(1) + '%';
            } else {
                updates.yieldRate = '';
                updates.defectRate = '';
            }
        }
        
        if (perMinute > 0) {
            updates.uph = String(perMinute * 60);
        } else {
            updates.uph = '';
        }

        if (Object.keys(updates).length > 0) {
            setFormData(prev => ({ ...prev, ...updates }));
        }
    }, [formData.inputQuantity, formData.goodQuantity, formData.productionPerMinute]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (['orderQuantity', 'inputQuantity', 'goodQuantity', 'personnelCount', 'productionPerMinute', 'packagingUnit', 'boxCount', 'remainder'].includes(name)) {
            setFormData(prev => ({...prev, [name]: value.replace(/[^0-9]/g, '')}));
        } else {
            setFormData(prev => ({...prev, [name]: value}));
        }
    };
    
    const handleOrderNumberChange = (index: number, value: string) => {
        const numericPart = value.replace(/^T/i, '').replace(/[^0-9-]/g, '');
        
        let formatted = 'T';
        if (numericPart.length > 0) {
            if (numericPart.length <= 5) {
                formatted += numericPart;
            } else {
                formatted += `${numericPart.substring(0, 5)}-${numericPart.substring(5)}`;
            }
        }
        
        const newOrderNumbers = [...formData.orderNumbers];
        newOrderNumbers[index] = formatted;
        setFormData(prev => ({...prev, orderNumbers: newOrderNumbers}));
    };
    const addOrderNumber = () => setFormData(prev => ({...prev, orderNumbers: [...prev.orderNumbers, 'T']}));

    const handleBoxChange = (index: number, field: keyof PackagedBoxData, value: string) => {
        const newBoxes = [...formData.packagedBoxes];
        const currentBox = { ...newBoxes[index] };
    
        if (field === 'quantity' || field === 'boxNumber') {
            (currentBox as any)[field] = value.replace(/[^0-9]/g, '');
        } else {
            (currentBox as any)[field] = value;
        }
    
        if (field === 'type' && value === '정상') {
            currentBox.reason = '';
        }
    
        newBoxes[index] = currentBox;
        setFormData(prev => ({ ...prev, packagedBoxes: newBoxes }));
    };
    const addBox = () => setFormData(prev => ({...prev, packagedBoxes: [...prev.packagedBoxes, { boxNumber: '', type: '', quantity: '', reason: '' }]}));
    const removeBox = (index: number) => setFormData(prev => ({...prev, packagedBoxes: prev.packagedBoxes.filter((_, i) => i !== index)}));
    
    const formatTime = (date: Date) => date.toTimeString().slice(0, 5);
    const handleStartTime = () => setFormData(prev => ({...prev, startTime: formatTime(new Date())}));
    const handleEndTime = () => setFormData(prev => ({...prev, endTime: formatTime(new Date())}));
    
    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            const reportData: Omit<PackagingReport, 'id' | 'createdAt'> & {createdAt?: string} = {
                workDate: formData.workDate,
                author: { uid: currentUserProfile!.uid, displayName: currentUserProfile!.displayName },
                productionLine: formData.productionLine,
                orderNumbers: formData.orderNumbers.filter(on => on.trim() !== '' && on.trim() !== 'T'),
                supplier: formData.supplier,
                productName: formData.productName,
                partName: formData.partName,
                orderQuantity: Number(formData.orderQuantity) || 0,
                specification: formData.specification,
                lineRatio: formData.lineRatio,
                productionPerMinute: Number(formData.productionPerMinute) || 0,
                uph: Number(formData.uph.replace(/,/g, '')) || 0,
                inputQuantity: Number(formData.inputQuantity) || 0,
                goodQuantity: Number(formData.goodQuantity) || 0,
                defectQuantity: Number(formData.defectQuantity) || 0,
                personnelCount: Number(formData.personnelCount) || 0,
                startTime: formData.startTime,
                endTime: formData.endTime,
                packagingUnit: Number(formData.packagingUnit) || 0,
                boxCount: Number(formData.boxCount) || 0,
                remainder: Number(formData.remainder) || 0,
                packagedBoxes: formData.packagedBoxes
                    .filter(b => b.boxNumber || b.type || b.quantity)
                    .map(b => ({ ...b, quantity: b.quantity ? Number(b.quantity) : 0, reason: b.reason })),
                memo: formData.memo
            };

            if (existingReport) {
                await db.collection('packaging-reports').doc(existingReport.id).update(reportData);
                addToast({ message: '생산일보가 수정되었습니다.', type: 'success' });
            } else {
                reportData.createdAt = new Date().toISOString();
                await db.collection('packaging-reports').add(reportData);
                addToast({ message: '생산일보가 저장되었습니다.', type: 'success' });
                sessionStorage.removeItem('packagingFormDraft');
                setFormData(getInitialState(currentUserProfile));
            }
            onSaveComplete();
        } catch (e) {
            console.error(e);
            addToast({ message: '저장 중 오류 발생', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleReset = () => {
        if (existingReport) {
            onCancelEdit();
        } else {
            sessionStorage.removeItem('packagingFormDraft');
            setFormData(getInitialState(currentUserProfile));
            addToast({ message: '입력 양식이 초기화되었습니다.', type: 'info' });
        }
    };

    const inputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-primary-500 focus:border-primary-500";
    
    return (
        <div className="h-full flex flex-col">
            <div className="lg:hidden sticky top-0 bg-slate-50 dark:bg-slate-900/50 backdrop-blur-sm z-10 p-2 -mx-2 mb-4 border-b dark:border-slate-700">
                <div className="flex justify-center items-center p-1 bg-gray-200 dark:bg-slate-700 rounded-lg">
                    <button type="button" onClick={() => setMobileView('form')} className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mobileView === 'form' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>입력</button>
                    <button type="button" onClick={() => setMobileView('preview')} className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mobileView === 'preview' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>미리보기</button>
                </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
                <div className={`flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm ${mobileView === 'preview' ? 'hidden lg:block' : 'block'} flex flex-col overflow-hidden`}>
                     <form className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div><label className="block text-sm font-medium">작업일자</label><input type="date" name="workDate" value={formData.workDate} onChange={handleChange} className={inputClasses} /></div>
                            <div><label className="block text-sm font-medium">작성자</label><input type="text" value={formData.authorName} disabled className={`${inputClasses} bg-slate-100 dark:bg-slate-800`} /></div>
                            <div><label className="block text-sm font-medium">생산라인</label><select name="productionLine" value={formData.productionLine} onChange={handleChange} className={inputClasses}><option value="">선택...</option>{productionLineOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                            <div><label className="block text-sm font-medium">라인비율</label><select name="lineRatio" value={formData.lineRatio} onChange={handleChange} className={inputClasses}><option value="">선택...</option><optgroup label="X:1 형식">{xToOneRatioOptions.map(o => <option key={o} value={o}>{o}</option>)}</optgroup><optgroup label="1:X 형식">{oneToXRatioOptions.map(o => <option key={o} value={o}>{o}</option>)}</optgroup></select></div>
                            <NumericInput label="인원" name="personnelCount" value={formData.personnelCount} onChange={handleChange} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2"><label className="block text-sm font-medium">발주번호</label>{formData.orderNumbers.map((on, i) => <input key={i} type="text" value={on} onChange={e => handleOrderNumberChange(i, e.target.value)} className={inputClasses} />)}<button type="button" onClick={addOrderNumber} className="w-full text-xs py-1 border rounded hover:bg-slate-50 dark:hover:bg-slate-700">+</button></div>
                            <div><label className="block text-sm font-medium">발주처</label><input type="text" name="supplier" value={formData.supplier} onChange={handleChange} className={inputClasses} /></div>
                            <div><label className="block text-sm font-medium">제품명</label><input type="text" name="productName" value={formData.productName} onChange={handleChange} className={inputClasses} /></div>
                            <div><label className="block text-sm font-medium">부속명</label><input type="text" name="partName" value={formData.partName} onChange={handleChange} className={inputClasses} /></div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <NumericInput label="발주수량" name="orderQuantity" value={formData.orderQuantity} onChange={handleChange} />
                            <div><label className="block text-sm font-medium">사양</label><input type="text" name="specification" value={formData.specification} onChange={handleChange} className={inputClasses} /></div>
                            <NumericInput label="1분당생산량" name="productionPerMinute" value={formData.productionPerMinute} onChange={handleChange} />
                            <NumericInput label="시간당생산량(UPH)" name="uph" value={formData.uph} onChange={handleChange} disabled />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <label className="block text-sm font-medium">시작시간</label>
                                <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className={inputClasses} />
                                <button type="button" onClick={handleStartTime} className="absolute right-2 bottom-2 text-xs bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded">현재</button>
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium">종료시간</label>
                                <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className={inputClasses} />
                                <button type="button" onClick={handleEndTime} className="absolute right-2 bottom-2 text-xs bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded">현재</button>
                            </div>
                        </div>
                        <div className="pt-4 border-t dark:border-slate-700">
                             <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center text-xs mb-2">
                                <div className="font-semibold">박스번호</div>
                                <div className="font-semibold">구분</div>
                                <div className="font-semibold">수량</div>
                                <div className="font-semibold">사유(B급/구분출하)</div>
                            </div>
                             {formData.packagedBoxes.map((box, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start mb-2">
                                    <input type="text" value={box.boxNumber} onChange={e => handleBoxChange(index, 'boxNumber', e.target.value)} placeholder="숫자만" className={inputClasses} inputMode="numeric" />
                                    <select value={box.type} onChange={e => handleBoxChange(index, 'type', e.target.value)} className={inputClasses}><option value="">선택</option><option value="정상">정상</option><option value="B급">B급</option><option value="구분출하">구분출하</option></select>
                                    <input type="text" value={box.quantity} onChange={e => handleBoxChange(index, 'quantity', e.target.value)} placeholder="숫자만" className={inputClasses} inputMode="numeric" />
                                    <div className="flex items-start gap-2">
                                    <input type="text" value={box.reason} onChange={e => handleBoxChange(index, 'reason', e.target.value)} className={`${inputClasses} flex-grow`} disabled={box.type === '정상'}/>
                                    {formData.packagedBoxes.length > 1 && <button type="button" onClick={() => removeBox(index)} className="w-10 h-10 bg-red-500 text-white rounded-md mt-1">-</button>}
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={addBox} className="w-full text-xs py-2 border rounded hover:bg-slate-50 dark:hover:bg-slate-700 mt-2">+</button>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <NumericInput label="포장단위" name="packagingUnit" value={formData.packagingUnit} onChange={handleChange} />
                            <NumericInput label="박스수량" name="boxCount" value={formData.boxCount} onChange={handleChange} />
                            <NumericInput label="잔량" name="remainder" value={formData.remainder} onChange={handleChange} />
                            <NumericInput label="투입" name="inputQuantity" value={formData.inputQuantity} onChange={handleChange} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <NumericInput label="양품" name="goodQuantity" value={formData.goodQuantity} onChange={handleChange} />
                            <NumericInput label="불량" name="defectQuantity" value={formData.defectQuantity} onChange={handleChange} disabled />
                            <NumericInput label="양품률" name="yieldRate" value={formData.yieldRate} onChange={handleChange} disabled className="font-bold" />
                            <NumericInput label="불량률" name="defectRate" value={formData.defectRate} onChange={handleChange} disabled className="font-bold text-red-500" />
                        </div>
                         <div className="pt-4 border-t dark:border-slate-700">
                            <label className="block text-sm font-medium">메모</label>
                            <textarea name="memo" value={formData.memo} onChange={handleChange} rows={3} className={inputClasses} />
                        </div>
                    </form>
                    <div className="flex-shrink-0 p-4 border-t dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex justify-end gap-2">
                        <button type="button" onClick={handleReset} disabled={isSaving} className="bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white font-bold py-2.5 px-6 rounded-lg disabled:opacity-50">{existingReport ? '수정 취소' : '초기화'}</button>
                        <button type="button" onClick={handleSubmit} disabled={isSaving} className="bg-primary-900 hover:bg-primary-800 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-colors disabled:bg-primary-700 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]">
                        {isSaving ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                저장 중...
                            </>
                        ) : (existingReport ? '수정 저장' : '저장하기')}
                        </button>
                    </div>
                </div>
                <div className={`w-full lg:w-[24rem] flex-shrink-0 ${mobileView === 'form' ? 'hidden lg:block' : 'block'}`}>
                     <div className="lg:sticky top-4 h-full"><PackagingPreviewCard data={formData} addToast={addToast} /></div>
                </div>
            </div>
        </div>
    );
};

const MemoModal: FC<{ content: string; onClose: () => void }> = ({ content, onClose }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">메모 내용</h3>
            <p className="whitespace-pre-wrap text-gray-700 dark:text-slate-300 max-h-80 overflow-y-auto">{content}</p>
            <div className="flex justify-end mt-4">
                <button onClick={onClose} className="bg-primary-600 text-white px-4 py-2 rounded-lg">닫기</button>
            </div>
        </div>
    </div>
);


const ReportList: FC<{ reports: PackagingReport[], onEdit: (report: PackagingReport) => void, onDelete: (reportId: string) => void, onShortageRequest: (report: PackagingReport) => void, onSelectShortageDetail: (report: PackagingReport) => void, shortageRequests: ShortageRequest[], currentUserProfile: UserProfile | null, onOpenProcessConditionsModal: (report: PackagingReport) => void, productionRequests: ProductionRequest[], onSelectProductionRequest: (request: ProductionRequest) => void, onToggleReportSelection: (id: string) => void, selectedReportIds: Set<string>, handleSelectAllOnPage: () => void, areAllOnPageSelected: boolean }> = ({ reports, onEdit, onDelete, onShortageRequest, onSelectShortageDetail, shortageRequests, currentUserProfile, onOpenProcessConditionsModal, productionRequests, onSelectProductionRequest, onToggleReportSelection, selectedReportIds, handleSelectAllOnPage, areAllOnPageSelected }) => {
    const [itemToDelete, setItemToDelete] = useState<PackagingReport | null>(null);
    const [memoToShow, setMemoToShow] = useState<string | null>(null);

    const logisticsRequestsBySourceId = useMemo(() => {
        const map = new Map<string, ProductionRequest>();
        productionRequests.forEach(req => {
            if (req.requestType === ProductionRequestType.LogisticsTransfer && req.sourceReportIds) {
                req.sourceReportIds.forEach(id => {
                    map.set(id, req);
                });
            }
        });
        return map;
    }, [productionRequests]);


    const handleDeleteClick = (report: PackagingReport) => {
        setItemToDelete(report);
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            onDelete(itemToDelete.id);
            setItemToDelete(null);
        }
    };
    
    return (
        <div>
            <table className="w-full min-w-max text-sm text-left text-gray-500 dark:text-slate-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-slate-400 sticky top-0 z-10">
                    <tr>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">작업일자</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">상태</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">생산라인</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">발주번호</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">발주처</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">제품명/부속명</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">발주수량</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">사양</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">인원</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">시작시간</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">종료시간</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">시간당생산량(UPH)</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">투입</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">양품</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">불량</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">양품률</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">작성자</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">공정조건</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">메모</th>
                        <th scope="col" className="px-2 py-3 whitespace-nowrap">작업</th>
                         <th scope="col" className="px-2 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={areAllOnPageSelected} onChange={handleSelectAllOnPage} className="form-checkbox h-4 w-4 rounded text-primary-600 focus:ring-primary-500 bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500" />
                                <span>물류이동</span>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map(report => {
                        const status = report.endTime ? '생산완료' : (report.startTime ? '작업중' : '대기');
                        const statusColor = report.endTime ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : (report.startTime ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300');
                        const hasShortageRequest = shortageRequests.some(sr => sr.sourceReportId === report.id);
                        const logisticsRequest = logisticsRequestsBySourceId.get(report.id);
                        return (
                            <tr key={report.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                                <td className="px-2 py-2 whitespace-nowrap">{report.workDate}</td>
                                <td className="px-2 py-2 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                        {status}
                                    </span>
                                </td>
                                <td className="px-2 py-2 whitespace-nowrap">{report.productionLine}</td>
                                <td className="px-2 py-2 whitespace-nowrap font-mono text-xs">{report.orderNumbers.join(', ')}</td>
                                <td className="px-2 py-2 whitespace-nowrap">{report.supplier}</td>
                                <td className="px-2 py-2 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{report.productName} / {report.partName}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-right">{report.orderQuantity?.toLocaleString()}</td>
                                <td className="px-2 py-2 whitespace-nowrap">{report.specification}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-right">{report.personnelCount ? `${report.personnelCount}명` : ''}</td>
                                <td className="px-2 py-2 whitespace-nowrap">{report.startTime}</td>
                                <td className="px-2 py-2 whitespace-nowrap">{report.endTime}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-right font-bold text-yellow-500">{report.uph?.toLocaleString()}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-right">{report.inputQuantity?.toLocaleString()}</td>
                                <td className="px-2 py-2 text-green-600 dark:text-green-400 whitespace-nowrap text-right">{report.goodQuantity?.toLocaleString()}</td>
                                <td className="px-2 py-2 text-red-500 dark:text-red-400 whitespace-nowrap text-right">{report.defectQuantity?.toLocaleString()}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-right">{report.goodQuantity && report.inputQuantity ? ((report.goodQuantity / report.inputQuantity) * 100).toFixed(1) + '%' : ''}</td>
                                <td className="px-2 py-2 whitespace-nowrap">{report.author.displayName}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-center">
                                    <button 
                                        onClick={() => onOpenProcessConditionsModal(report)} 
                                        className="w-full text-center hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded p-1 transition-colors"
                                    >
                                        {report.processConditions && (Object.values(report.processConditions).some(v => v?.conditions || v?.remarks)) ? (
                                            <span className="font-bold text-green-500 text-lg">O</span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </button>
                                </td>
                                <td className="px-2 py-2 whitespace-nowrap text-center">
                                    {report.memo && (
                                        <button onClick={() => setMemoToShow(report.memo!)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                            메모
                                        </button>
                                    )}
                                </td>
                                <td className="px-2 py-2 whitespace-nowrap flex items-center gap-2">
                                    <button onClick={() => onEdit(report)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">수정</button>
                                    {currentUserProfile?.role === 'Admin' && <button onClick={() => handleDeleteClick(report)} className="font-medium text-red-600 dark:text-red-500 hover:underline">삭제</button>}
                                    {hasShortageRequest ? (
                                        <button onClick={() => onSelectShortageDetail(report)} className="text-xs font-semibold text-green-500 hover:underline cursor-pointer">신청완료</button>
                                    ) : (
                                        <button onClick={() => onShortageRequest(report)} className="font-medium text-purple-600 dark:text-purple-500 hover:underline">부족분신청</button>
                                    )}
                                </td>
                                 <td className="px-2 py-2 whitespace-nowrap text-center">
                                    {logisticsRequest ? (
                                        <button
                                            onClick={() => onSelectProductionRequest(logisticsRequest)}
                                            className="text-sm font-semibold text-green-600 dark:text-green-400 hover:underline"
                                        >
                                            리포트보기
                                        </button>
                                    ) : (
                                        <input
                                            type="checkbox"
                                            checked={selectedReportIds.has(report.id)}
                                            onChange={() => onToggleReportSelection(report.id)}
                                            className="form-checkbox h-4 w-4 rounded text-primary-600 focus:ring-primary-500 bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500"
                                        />
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
             {memoToShow && <MemoModal content={memoToShow} onClose={() => setMemoToShow(null)} />}
             <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={confirmDelete}
                title="일보 삭제 확인"
                message={`'${itemToDelete?.workDate}' 일자 '${itemToDelete?.productName}' 생산일보를 정말 삭제하시겠습니까?`}
            />
        </div>
    );
};

type ActiveWorkCenterTab = 'reportList' | 'reportForm' | 'scheduleList' | 'orderList' | 'prodMgmt';

const ComingSoonPlaceholder: FC<{ title: string }> = ({ title }) => (
    <div className="flex items-center justify-center h-full text-center p-4 bg-white dark:bg-slate-800 rounded-lg">
        <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white">{title}</h2>
            <p className="mt-2 text-gray-500 dark:text-slate-400">해당 기능은 현재 개발 중입니다. 곧 더 좋은 모습으로 찾아뵙겠습니다.</p>
        </div>
    </div>
);

// FIX: Add a helper function to get the local date string to fix timezone issues.
const getLocalDateString = (date = new Date()) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

const ShortageRequestModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    report: PackagingReport;
    existingRequest?: ShortageRequest;
    onSave: (data: { shortageReason: string, requestedShortageQuantity: number }) => void;
    isSaving: boolean;
}> = ({ isOpen, onClose, report, existingRequest, onSave, isSaving }) => {
    const [reason, setReason] = useState(existingRequest?.shortageReason || '');
    const [quantity, setQuantity] = useState(existingRequest?.requestedShortageQuantity?.toString() || '');

    useEffect(() => {
        if (isOpen) {
            setReason(existingRequest?.shortageReason || '');
            setQuantity(existingRequest?.requestedShortageQuantity?.toString() || '');
        }
    }, [isOpen, existingRequest]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numQuantity = parseInt(quantity, 10);
        if (!reason.trim() || isNaN(numQuantity) || numQuantity <= 0) {
            alert('유효한 사유와 부족 수량을 입력해주세요.');
            return;
        }
        onSave({ shortageReason: reason, requestedShortageQuantity: numQuantity });
    };

    return (
        <FullScreenModal isOpen={isOpen} onClose={onClose} title={existingRequest ? "부족분 신청 수정" : "부족분 생산 요청"}>
            <div className="p-6 space-y-4">
                <h3 className="text-lg font-semibold">{report.productName} ({report.partName})</h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <p><strong>발주번호:</strong> {report.orderNumbers.join(', ')}</p>
                    <p><strong>생산라인:</strong> {report.productionLine}</p>
                    <p><strong>투입수량:</strong> {report.inputQuantity?.toLocaleString()}</p>
                    <p><strong>양품수량:</strong> {report.goodQuantity?.toLocaleString()}</p>
                    <p className="text-red-500 font-semibold"><strong>불량수량:</strong> {report.defectQuantity?.toLocaleString()}</p>
                </div>
                <form id="shortage-form" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium">부족분 사유</label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            rows={4}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">부족분 요청 수량</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            required
                            min="1"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                        />
                    </div>
                </form>
            </div>
            <div className="flex-shrink-0 p-4 border-t dark:border-slate-700 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-slate-600 px-4 py-2 rounded-lg">취소</button>
                <button type="submit" form="shortage-form" disabled={isSaving} className="bg-primary-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
                    {isSaving ? '저장 중...' : (existingRequest ? '수정 저장' : '신청 저장')}
                </button>
            </div>
        </FullScreenModal>
    );
};

const ShortageRequestDetailModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    request: ShortageRequest;
    onEdit: (request: ShortageRequest) => void;
    onDelete: () => void;
    currentUserProfile: UserProfile | null;
}> = ({ isOpen, onClose, request, onEdit, onDelete, currentUserProfile }) => {
    
    const canManage = currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Manager';

    return (
        <FullScreenModal isOpen={isOpen} onClose={onClose} title="부족분 신청 상세 내역">
            <div className="p-6 space-y-6">
                <div>
                    <h3 className="text-xl font-bold">{request.productName} ({request.partName})</h3>
                    <p className="text-sm text-slate-500">{request.orderNumbers.join(', ')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-3">
                        <h4 className="font-semibold text-lg border-b pb-2">신청 정보</h4>
                        <p><strong>신청일:</strong> {new Date(request.createdAt).toLocaleString('ko-KR')}</p>
                        <p><strong>신청자:</strong> {request.author.displayName}</p>
                        <p className="font-bold text-lg"><strong>요청수량:</strong> <span className="text-red-500">{request.requestedShortageQuantity.toLocaleString()} EA</span></p>
                        <div>
                            <p><strong>사유:</strong></p>
                            <p className="p-2 bg-white dark:bg-slate-800 rounded mt-1 whitespace-pre-wrap">{request.shortageReason}</p>
                        </div>
                        <p><strong>상태:</strong> {request.status}</p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-3">
                        <h4 className="font-semibold text-lg border-b pb-2">원본 생산 정보</h4>
                        <p><strong>생산라인:</strong> {request.productionLine}</p>
                        <p><strong>투입수량:</strong> {request.inputQuantity?.toLocaleString()}</p>
                        <p><strong>양품수량:</strong> {request.goodQuantity?.toLocaleString()}</p>
                        <p className="text-red-500"><strong>불량수량:</strong> {request.defectQuantity?.toLocaleString()}</p>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold text-lg mb-2">처리 이력</h4>
                    <ul className="space-y-2 text-sm">
                        {request.history?.map((h, i) => (
                            <li key={i} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                                <span className="font-semibold">{new Date(h.date).toLocaleString('ko-KR')}</span>
                                <span className="font-medium">{h.status} by {h.user}</span>
                                {h.reason && <span className="text-slate-500">- {h.reason}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
             <div className="flex-shrink-0 p-4 border-t dark:border-slate-700 flex justify-end gap-2">
                {canManage && <button onClick={() => onEdit(request)} className="bg-blue-600 text-white px-4 py-2 rounded-lg">수정</button>}
                {currentUserProfile?.role === 'Admin' && <button onClick={onDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg">삭제</button>}
                <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-slate-600 px-4 py-2 rounded-lg">닫기</button>
            </div>
        </FullScreenModal>
    );
};

const ProcessConditionsModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    report: PackagingReport | null;
    onSave: (reportId: string, conditions: PackagingReport['processConditions']) => void;
    canManage: boolean;
}> = ({ isOpen, onClose, report, onSave, canManage }) => {
    const [conditionsData, setConditionsData] = useState<NonNullable<PackagingReport['processConditions']>>({});

    useEffect(() => {
        if (report) {
            setConditionsData(report.processConditions || {});
        }
    }, [report]);

    const handleChange = (coat: 'undercoat' | 'midcoat' | 'topcoat', field: 'conditions' | 'remarks', value: string) => {
        setConditionsData(prev => ({
            ...prev,
            [coat]: {
                ...(prev[coat] || { conditions: '', remarks: '' }),
                [field]: value,
            },
        }));
    };

    const handleSave = () => {
        if (report) {
            onSave(report.id, conditionsData);
        }
    };
    
    if (!report) return null;

    return (
        <FullScreenModal isOpen={isOpen} onClose={onClose} title={`${report.productName} 공정 조건`}>
            <div className="p-6 space-y-6">
                <div className="space-y-4">
                    <h4 className="text-lg font-semibold">하도</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">작업조건</label>
                            <textarea value={conditionsData.undercoat?.conditions || ''} onChange={e => handleChange('undercoat', 'conditions', e.target.value)} disabled={!canManage} rows={4} className="mt-1 w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">특이사항</label>
                            <textarea value={conditionsData.undercoat?.remarks || ''} onChange={e => handleChange('undercoat', 'remarks', e.target.value)} disabled={!canManage} rows={4} className="mt-1 w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600"/>
                        </div>
                    </div>
                </div>
                 <div className="space-y-4">
                    <h4 className="text-lg font-semibold">중도</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">작업조건</label>
                            <textarea value={conditionsData.midcoat?.conditions || ''} onChange={e => handleChange('midcoat', 'conditions', e.target.value)} disabled={!canManage} rows={4} className="mt-1 w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">특이사항</label>
                            <textarea value={conditionsData.midcoat?.remarks || ''} onChange={e => handleChange('midcoat', 'remarks', e.target.value)} disabled={!canManage} rows={4} className="mt-1 w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600"/>
                        </div>
                    </div>
                </div>
                 <div className="space-y-4">
                    <h4 className="text-lg font-semibold">상도</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">작업조건</label>
                            <textarea value={conditionsData.topcoat?.conditions || ''} onChange={e => handleChange('topcoat', 'conditions', e.target.value)} disabled={!canManage} rows={4} className="mt-1 w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">특이사항</label>
                            <textarea value={conditionsData.topcoat?.remarks || ''} onChange={e => handleChange('topcoat', 'remarks', e.target.value)} disabled={!canManage} rows={4} className="mt-1 w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600"/>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-shrink-0 p-4 border-t dark:border-slate-700 flex justify-end gap-2">
                <button onClick={onClose} className="bg-slate-200 dark:bg-slate-600 px-4 py-2 rounded-md">취소</button>
                {canManage && <button onClick={handleSave} className="bg-primary-600 text-white px-4 py-2 rounded-md">저장하기</button>}
            </div>
        </FullScreenModal>
    );
};

// FIX: Changed component to a named export to resolve module resolution issues.
export const WorkPerformanceCenter: React.FC<WorkPerformanceCenterProps> = ({ addToast, currentUserProfile, productionRequests, onOpenNewProductionRequest, onSelectProductionRequest, productionSchedules, onSaveProductionSchedules, onDeleteProductionSchedule, onDeleteProductionSchedulesByDate, orders, onSaveOrders }) => {
    const [activeTab, setActiveTab] = useState<ActiveWorkCenterTab>('reportList');
    const [reports, setReports] = useState<PackagingReport[]>([]);
    const [shortageRequests, setShortageRequests] = useState<ShortageRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingReport, setEditingReport] = useState<PackagingReport | null>(null);
    
    const [shortageModalState, setShortageModalState] = useState<{ mode: 'new' | 'edit'; report: PackagingReport; request?: ShortageRequest } | null>(null);
    const [selectedShortageDetail, setSelectedShortageDetail] = useState<ShortageRequest | null>(null);
    const [itemToDelete, setItemToDelete] = useState<ShortageRequest | null>(null);
    const [isSavingShortage, setIsSavingShortage] = useState(false);
    const [processConditionsModalState, setProcessConditionsModalState] = useState<{ isOpen: boolean; report: PackagingReport | null }>({ isOpen: false, report: null });
    
    const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
    const [isBulkRequestModalOpen, setIsBulkRequestModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [additionalDetails, setAdditionalDetails] = useState<Record<string, { details: string; destination: string }>>({});

    const [prodRequestTypeFilter, setProdRequestTypeFilter] = useState<string>('all');


    // Filter states
    const todayStr = getLocalDateString(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [filterStatus, setFilterStatus] = useState<'all' | '생산완료' | '작업중' | '대기'>('all');
    const [filterLine, setFilterLine] = useState<string>('all');
    const [isSummaryVisible, setIsSummaryVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(false);


    useEffect(() => {
        setIsLoading(true);
        const unsubscribeReports = db.collection('packaging-reports').orderBy('workDate', 'desc').limit(500).onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PackagingReport));
            
            const sortedData = data.sort((a, b) => {
                const dateComparison = new Date(b.workDate).getTime() - new Date(a.workDate).getTime();
                if (dateComparison !== 0) return dateComparison;

                const aIndex = productionLineSortOrder.indexOf(a.productionLine);
                const bIndex = productionLineSortOrder.indexOf(b.productionLine);
                const aSortIndex = aIndex === -1 ? Infinity : aIndex;
                const bSortIndex = bIndex === -1 ? Infinity : bIndex;
                if (aSortIndex !== bSortIndex) {
                    return aSortIndex - bSortIndex;
                }

                // Sort by startTime ascending
                if (a.startTime && b.startTime) {
                    return a.startTime.localeCompare(b.startTime);
                }
                if (a.startTime) { // only a has startTime, it should come first
                    return -1;
                }
                if (b.startTime) { // only b has startTime, it should come first
                    return 1;
                }
                return 0; // both have no startTime
            });

            setReports(sortedData);
            setIsLoading(false);
        });

        const unsubscribeShortage = db.collection('shortage-requests').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShortageRequest));
            setShortageRequests(data);
        });

        return () => {
            unsubscribeReports();
            unsubscribeShortage();
        };
    }, []);
    
    const filteredReports = useMemo(() => {
        const search = searchTerm.toLowerCase().trim();

        if (search) {
            return reports.filter(report => {
                 const searchMatch =
                    report.workDate.includes(search) ||
                    report.author.displayName.toLowerCase().includes(search) ||
                    report.productionLine.toLowerCase().includes(search) ||
                    report.orderNumbers.some(num => num.toLowerCase().includes(search)) ||
                    report.supplier.toLowerCase().includes(search) ||
                    report.productName.toLowerCase().includes(search) ||
                    report.partName.toLowerCase().includes(search) ||
                    report.specification.toLowerCase().includes(search) ||
                    (report.memo && report.memo.toLowerCase().includes(search)) ||
                    String(report.orderQuantity || '').includes(search) ||
                    String(report.inputQuantity || '').includes(search) ||
                    String(report.goodQuantity || '').includes(search) ||
                    String(report.defectQuantity || '').includes(search) ||
                    String(report.personnelCount || '').includes(search) ||
                    report.startTime.includes(search) ||
                    report.endTime.includes(search) ||
                    (report.lineRatio || '').toLowerCase().includes(search) ||
                    String(report.productionPerMinute || '').includes(search) ||
                    String(report.uph || '').includes(search) ||
                    String(report.packagingUnit || '').includes(search) ||
                    String(report.boxCount || '').includes(search) ||
                    String(report.remainder || '').includes(search) ||
                    report.packagedBoxes.some(box => 
                        box.boxNumber.toLowerCase().includes(search) ||
                        box.type.toLowerCase().includes(search) ||
                        String(box.quantity).includes(search) ||
                        (box.reason && box.reason.toLowerCase().includes(search))
                    );
                return searchMatch;
            });
        }

        return reports.filter(report => {
            if (startDate && report.workDate < startDate) return false;
            if (endDate && report.workDate > endDate) return false;

            if (filterStatus !== 'all') {
                const status = report.endTime ? '생산완료' : (report.startTime ? '작업중' : '대기');
                if (status !== filterStatus) return false;
            }
            if (filterLine !== 'all' && report.productionLine !== filterLine) {
                return false;
            }

            return true;
        });
    }, [reports, startDate, endDate, filterStatus, filterLine, searchTerm]);


    const summaryData = useMemo(() => {
        const dataForSummary = reports.filter(r => r.workDate >= startDate && r.workDate <= endDate);
        if (dataForSummary.length === 0) return null;

        const total = { input: 0, good: 0, defect: 0 };
        const byLine = new Map<string, typeof total>();

        dataForSummary.forEach(report => {
            const input = report.inputQuantity || 0;
            const good = report.goodQuantity || 0;
            const defect = report.defectQuantity || 0;
            
            total.input += input;
            total.good += good;
            total.defect += defect;

            if (!byLine.has(report.productionLine)) {
                byLine.set(report.productionLine, { input: 0, good: 0, defect: 0 });
            }
            const lineData = byLine.get(report.productionLine)!;
            lineData.input += input;
            lineData.good += good;
            lineData.defect += defect;
        });

        return {
            total,
            byLine: Array.from(byLine.entries()).sort((a, b) => {
                const aIndex = productionLineSortOrder.indexOf(a[0]);
                const bIndex = productionLineSortOrder.indexOf(b[0]);
                return (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex);
            })
        };
    }, [reports, startDate, endDate]);
    
    const { byLineGroup1, byLineGroup2 } = useMemo(() => {
        if (!summaryData) return { byLineGroup1: [], byLineGroup2: [] };
        
        const lineGroup1 = ['증착1', '증착1하도', '증착1상도', '증착2', '증착2하도', '증착2상도'];
        const lineGroup2 = ['2코팅', '1코팅', '내부코팅1호기', '내부코팅2호기', '내부코팅3호기'];
    
        return {
            byLineGroup1: summaryData.byLine.filter(([line]) => lineGroup1.includes(line)),
            byLineGroup2: summaryData.byLine.filter(([line]) => lineGroup2.includes(line))
        };
    }, [summaryData]);

    const handleOpenNewShortageForm = (report: PackagingReport) => {
        setShortageModalState({ mode: 'new', report });
    };

    const handleOpenEditShortageForm = (request: ShortageRequest) => {
        const sourceReport = reports.find(r => r.id === request.sourceReportId);
        if (sourceReport) {
            setSelectedShortageDetail(null);
            setShortageModalState({ mode: 'edit', report: sourceReport, request: request });
        } else {
            addToast({ message: '원본 생산일보를 찾을 수 없어 수정할 수 없습니다.', type: 'error' });
        }
    };
    
    const handleSelectShortageDetail = (report: PackagingReport) => {
        const request = shortageRequests.find(sr => sr.sourceReportId === report.id);
        if (request) {
            setSelectedShortageDetail(request);
        } else {
            addToast({ message: '신청 내역을 찾을 수 없습니다.', type: 'error' });
        }
    };

    const handleSaveShortageRequest = async (data: { shortageReason: string, requestedShortageQuantity: number }) => {
        if (!shortageModalState || !currentUserProfile) {
            addToast({ message: "데이터가 없습니다.", type: 'error' });
            return;
        }

        setIsSavingShortage(true);
        try {
            if (shortageModalState.mode === 'edit' && shortageModalState.request) {
                const requestRef = db.collection('shortage-requests').doc(shortageModalState.request.id);
                const historyEntry: HistoryEntry = {
                    status: '수정',
                    date: new Date().toISOString(),
                    user: currentUserProfile.displayName,
                    reason: `사유 또는 수량 수정됨`
                };
                await requestRef.update({
                    ...data,
                    history: firebase.firestore.FieldValue.arrayUnion(historyEntry)
                });
                addToast({ message: '부족분 신청이 수정되었습니다.', type: 'success' });
            } else {
                 const newShortageRequest: Omit<ShortageRequest, 'id'> = {
                    createdAt: new Date().toISOString(),
                    author: { uid: currentUserProfile.uid, displayName: currentUserProfile.displayName },
                    sourceReportId: shortageModalState.report.id,
                    productionLine: shortageModalState.report.productionLine,
                    orderNumbers: shortageModalState.report.orderNumbers,
                    supplier: shortageModalState.report.supplier,
                    productName: shortageModalState.report.productName,
                    partName: shortageModalState.report.partName,
                    orderQuantity: shortageModalState.report.orderQuantity,
                    specification: shortageModalState.report.specification,
                    inputQuantity: shortageModalState.report.inputQuantity,
                    goodQuantity: shortageModalState.report.goodQuantity,
                    defectQuantity: shortageModalState.report.defectQuantity,
                    ...data,
                    status: 'requested',
                    history: [{
                        status: '생성',
                        date: new Date().toISOString(),
                        user: currentUserProfile.displayName,
                        reason: '부족분 신청 생성됨'
                    }]
                };
                await db.collection('shortage-requests').add(newShortageRequest);
                addToast({ message: '부족분 신청이 완료되었습니다.', type: 'success' });
            }
           setShortageModalState(null);
        } catch (error) {
            console.error(error);
            addToast({ message: '부족분 신청 저장 중 오류가 발생했습니다.', type: 'error' });
        } finally {
            setIsSavingShortage(false);
        }
    };
    
    const handleDeleteShortageRequest = async () => {
        if (!itemToDelete) return;
        try {
            await db.collection('shortage-requests').doc(itemToDelete.id).delete();
            addToast({ message: '부족분 신청 내역이 삭제되었습니다.', type: 'success' });
            setItemToDelete(null);
        } catch (error) {
            addToast({ message: '삭제 중 오류가 발생했습니다.', type: 'error' });
        }
    };

    const handleEditReport = (report: PackagingReport) => {
        setEditingReport(report);
        setActiveTab('reportForm');
    };

    const handleDeleteReport = async (reportId: string) => {
        try {
            await db.collection('packaging-reports').doc(reportId).delete();
            addToast({ message: '생산일보가 삭제되었습니다.', type: 'success' });
        } catch (e) {
            addToast({ message: '삭제 중 오류가 발생했습니다.', type: 'error' });
        }
    };
    
    const handleSaveComplete = () => {
        setEditingReport(null);
        setActiveTab('reportList');
    };

    const handleCancelEdit = () => {
        setEditingReport(null);
        setActiveTab('reportList');
    };
    
    const handleOpenProcessConditionsModal = (report: PackagingReport) => {
        setProcessConditionsModalState({ isOpen: true, report });
    };

    const handleSaveProcessConditions = async (reportId: string, conditions: PackagingReport['processConditions']) => {
        try {
            await db.collection('packaging-reports').doc(reportId).update({
                processConditions: conditions
            });
            addToast({ message: '공정 조건이 저장되었습니다.', type: 'success' });
            setProcessConditionsModalState({ isOpen: false, report: null });
        } catch (error) {
            console.error(error);
            addToast({ message: '공정 조건 저장에 실패했습니다.', type: 'error' });
        }
    };
    
    const handleToggleReportSelection = (reportId: string) => {
        setSelectedReportIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(reportId)) {
                newSet.delete(reportId);
            } else {
                newSet.add(reportId);
            }
            return newSet;
        });
    };

    const selectedReportsForBulk = useMemo(() => 
        reports.filter(r => selectedReportIds.has(r.id)), 
        [reports, selectedReportIds]
    );

    const handleAdditionalDetailChange = (reportId: string, field: 'details' | 'destination', value: string) => {
        setAdditionalDetails(prev => ({
            ...prev,
            [reportId]: {
                ...(prev[reportId] || { details: '', destination: '' }),
                [field]: value
            },
        }));
    };

    const handleCloseBulkModal = () => {
        setIsBulkRequestModalOpen(false);
        setAdditionalDetails({});
    };

    const handleConfirmBulkRequest = async () => {
        if (!currentUserProfile || selectedReportsForBulk.length === 0) return;

        setIsSaving(true);
        addToast({ message: "통합 물류 이동 요청을 생성하는 중...", type: 'info' });

        try {
            const totalQuantity = selectedReportsForBulk.reduce((sum, r) => sum + (r.goodQuantity || 0), 0);
            const productNames = [...new Set(selectedReportsForBulk.map(r => r.productName))];
            const partNames = [...new Set(selectedReportsForBulk.map(r => r.partName))];
            const suppliers = [...new Set(selectedReportsForBulk.map(r => r.supplier))];
            const orderNumbers = [...new Set(selectedReportsForBulk.flatMap(r => r.orderNumbers))];

            const content = `통합 벌크 이동 요청 (${selectedReportsForBulk.length}건):\n` +
                selectedReportsForBulk.map(r => {
                    const details = additionalDetails[r.id]?.details || '없음';
                    const destination = additionalDetails[r.id]?.destination || '미지정';
                    return `\n---------------------\n` +
                           `- 제품: ${r.productName} / ${r.partName}\n` +
                           `- 발주번호: ${r.orderNumbers.join(', ')}\n` +
                           `- 발주처: ${r.supplier}\n` +
                           `- 사양: ${r.specification}\n` +
                           `- 양품수량: ${r.goodQuantity?.toLocaleString()} EA\n` +
                           `- 포장단위: ${r.packagingUnit?.toLocaleString() || '0'}\n` +
                           `- 박스수량: ${r.boxCount?.toLocaleString() || '0'}\n` +
                           `- 잔량: ${r.remainder?.toLocaleString() || '0'}\n` +
                           `- 도착처: ${destination}\n` +
                           `- 추가 요청: ${details}`;
                }).join('');

            const counterRef = db.collection('counters').doc('production-requests-counter');
            const today = new Date();
            const dateString = `${today.getFullYear().toString().slice(-2)}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

            const newId = await db.runTransaction(async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                const newCount = (counterDoc.data()?.count || 0) + 1;
                const generatedId = `P-${dateString}-${newCount.toString().padStart(3, '0')}`;
                
                const newRequestRef = db.collection('production-requests').doc(generatedId);
                
                const newRequestPayload: Omit<ProductionRequest, 'id'> = {
                    createdAt: new Date().toISOString(),
                    author: { uid: currentUserProfile.uid, displayName: currentUserProfile.displayName },
                    status: ProductionRequestStatus.Requested,
                    history: [{ status: ProductionRequestStatus.Requested, date: new Date().toISOString(), user: currentUserProfile.displayName, reason: '통합 벌크 이동 요청으로 생성됨' }],
                    requestType: ProductionRequestType.LogisticsTransfer,
                    requester: currentUserProfile.displayName,
                    orderNumber: orderNumbers.join(', '),
                    productName: productNames.length > 1 ? `${productNames[0]} 외 ${productNames.length - 1}건` : productNames[0],
                    partName: partNames.join(', '),
                    supplier: suppliers.join(', '),
                    quantity: totalQuantity,
                    content: content,
                    sourceReportIds: selectedReportsForBulk.map(r => r.id)
                };
                
                transaction.set(newRequestRef, newRequestPayload);
                transaction.set(counterRef, { count: newCount });
                return generatedId;
            });
            
            await db.collection('notifications').add({
                message: `신규 통합 물류이동 요청이 등록되었습니다.`,
                date: new Date().toISOString(),
                requestId: newId,
                readBy: [],
                type: 'work',
            });
            
            addToast({ message: "통합 물류이동 요청이 등록되었습니다.", type: 'success' });
            handleCloseBulkModal();
            setSelectedReportIds(new Set());

        } catch (error) {
            console.error("Error saving bulk logistics request:", error);
            addToast({ message: "요청 저장에 실패했습니다.", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const areAllOnPageSelected = useMemo(() => {
        const currentPageIds = new Set(filteredReports.map(r => r.id));
        if (currentPageIds.size === 0) return false;
        return Array.from(currentPageIds).every(id => selectedReportIds.has(id));
    }, [filteredReports, selectedReportIds]);
    
    const handleSelectAllOnPage = () => {
        const logisticsRequestsBySourceId = new Map<string, ProductionRequest>();
        productionRequests.forEach(req => {
            if (req.requestType === ProductionRequestType.LogisticsTransfer && req.sourceReportIds) {
                req.sourceReportIds.forEach(id => {
                    logisticsRequestsBySourceId.set(id, req);
                });
            }
        });

        const unrequestedIdsOnPage = filteredReports
            .map(r => r.id)
            .filter(id => !logisticsRequestsBySourceId.has(id));

        setSelectedReportIds(prev => {
            const newSet = new Set(prev);
            const allSelected = unrequestedIdsOnPage.every(id => newSet.has(id));
            
            if (allSelected) {
                unrequestedIdsOnPage.forEach(id => newSet.delete(id));
            } else {
                unrequestedIdsOnPage.forEach(id => newSet.add(id));
            }
            return newSet;
        });
    };
    
    const filteredProdRequests = useMemo(() => {
        if (prodRequestTypeFilter === 'all') return productionRequests;
        return productionRequests.filter(req => req.requestType === prodRequestTypeFilter);
    }, [productionRequests, prodRequestTypeFilter]);

    const handleBulkUpdateStatus = useCallback(async (ids: string[], status: ProductionRequestStatus, reason?: string) => {
        if (!currentUserProfile || ids.length === 0) return;
        
        addToast({ message: `${ids.length}건의 상태를 업데이트하는 중...`, type: 'info' });
        
        const historyEntry: HistoryEntry = { status, date: new Date().toISOString(), user: currentUserProfile.displayName, reason: reason || '상태 업데이트됨' };
    
        const batch = db.batch();
        ids.forEach(id => {
            const docRef = db.collection('production-requests').doc(id);
            batch.update(docRef, {
                status: status,
                history: firebase.firestore.FieldValue.arrayUnion(historyEntry)
            });
        });
    
        try {
            await batch.commit();
            addToast({ message: `${ids.length}건의 상태가 성공적으로 업데이트되었습니다.`, type: 'success' });
        } catch (error) {
            console.error("Error updating statuses in bulk:", error);
            addToast({ message: '상태 업데이트에 실패했습니다.', type: 'error' });
        }
    }, [currentUserProfile, addToast]);

    const tabs: { id: ActiveWorkCenterTab; label: string; icon: React.ReactNode }[] = [
        { id: 'reportList', label: '생산일보', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
        { id: 'reportForm', label: '일보 등록', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
        { id: 'scheduleList', label: '생산일정', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        { id: 'orderList', label: '수주등록', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
        { id: 'prodMgmt', label: '생산관리부', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-2.236 9.168-5.584C18.354 1.832 18 3.057 18 4.508v8.584a6 6 0 01-7.72 5.732" /></svg> },
    ];

    const TabButton: React.FC<{ tab: { id: ActiveWorkCenterTab; label: string; icon: React.ReactNode } }> = ({ tab }) => (
        <button
            onClick={() => {
                if (tab.id === 'reportForm') {
                    setEditingReport(null);
                }
                setActiveTab(tab.id)
            }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.id 
                ? 'bg-primary-600 text-white' 
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
        >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
        </button>
    );

    return (
        <div className="h-full flex flex-col gap-4">
            <nav className="flex-shrink-0 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
                    {tabs.map(tab => (
                        <TabButton key={tab.id} tab={tab} />
                    ))}
                </div>
            </nav>
            <div className="flex-1 overflow-hidden">
                 {activeTab === 'reportForm' && <PackagingFormSection addToast={addToast} currentUserProfile={currentUserProfile} existingReport={editingReport} onSaveComplete={handleSaveComplete} onCancelEdit={handleCancelEdit} />}
                 {activeTab === 'prodMgmt' && (
                    <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
                        <header className="flex-shrink-0 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">생산관리부 요청사항</h3>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-gray-200 dark:bg-slate-700 p-1 rounded-lg text-xs">
                                    <button onClick={() => setProdRequestTypeFilter('all')} className={`px-2 py-1 rounded ${prodRequestTypeFilter === 'all' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>전체</button>
                                    {Object.values(ProductionRequestType).map(type => (
                                        <button key={type} onClick={() => setProdRequestTypeFilter(type)} className={`px-2 py-1 rounded ${prodRequestTypeFilter === type ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>{type}</button>
                                    ))}
                                </div>
                                {currentUserProfile?.role !== 'Member' && (
                                    <button 
                                        onClick={onOpenNewProductionRequest} 
                                        className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700"
                                    >
                                        신규 요청
                                    </button>
                                )}
                            </div>
                        </header>
                        <main className="flex-1 overflow-y-auto">
                            {filteredProdRequests.length > 0 ? (
                                <table className="w-full min-w-max text-sm text-left text-gray-500 dark:text-slate-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-slate-400 sticky top-0 z-10">
                                        <tr>
                                            <th scope="col" className="px-2 py-3">요청일시</th>
                                            <th scope="col" className="px-2 py-3">요청유형</th>
                                            <th scope="col" className="px-2 py-3">상태</th>
                                            <th scope="col" className="px-2 py-3">요청자</th>
                                            <th scope="col" className="px-2 py-3">발주번호</th>
                                            <th scope="col" className="px-2 py-3">발주처</th>
                                            <th scope="col" className="px-2 py-3">제품명</th>
                                            <th scope="col" className="px-2 py-3">수량</th>
                                            <th scope="col" className="px-2 py-3">요청내용</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProdRequests.map(req => {
                                            const hasUnreadComments = currentUserProfile && req.comments?.some(c => !c.readBy?.includes(currentUserProfile.uid));
                                            return (
                                                <tr key={req.id} onClick={() => onSelectProductionRequest(req)} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                                                    <td className="px-2 py-2 text-xs">{new Date(req.createdAt).toLocaleString('ko-KR')}</td>
                                                    <td className="px-2 py-2">{req.requestType}</td>
                                                    <td className="px-2 py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${PRODUCTION_REQUEST_STATUS_COLORS[req.status]}`}>{req.status === ProductionRequestStatus.InProgress && req.requestType === ProductionRequestType.LogisticsTransfer ? '물류이동중' : req.status}</span></td>
                                                    <td className="px-2 py-2">{req.requester}</td>
                                                    <td className="px-2 py-2 font-mono text-xs">
                                                        {req.requestType === ProductionRequestType.LogisticsTransfer
                                                            ? (
                                                                (() => {
                                                                    const orderNumbers = req.orderNumber.split(',').map(s => s.trim()).filter(Boolean);
                                                                    if (orderNumbers.length > 1) {
                                                                        return `${orderNumbers[0]} 외 ${orderNumbers.length - 1}건`;
                                                                    }
                                                                    return req.orderNumber;
                                                                })()
                                                            )
                                                            : req.orderNumber
                                                        }
                                                    </td>
                                                    <td className="px-2 py-2">{req.supplier}</td>
                                                    <td className="px-2 py-2 font-semibold text-gray-900 dark:text-white">{req.productName} ({req.partName})</td>
                                                    <td className="px-2 py-2 text-right">{req.quantity.toLocaleString()}</td>
                                                    <td className="px-2 py-2 text-xs max-w-xs" title={req.content}>
                                                        <div className="flex items-center gap-2">
                                                            {hasUnreadComments && (
                                                                <span title="새로운 댓글" className="flex-shrink-0 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
                                                            )}
                                                            <span className="truncate">{req.content}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-center text-gray-500 dark:text-slate-400 py-10">
                                    아직 등록된 요청사항이 없습니다.
                                </p>
                            )}
                        </main>
                    </div>
                )}
                 {activeTab === 'reportList' && (
                    <div className="h-full flex flex-col gap-4">
                        <div className="flex-shrink-0 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                             <div 
                                className="p-4 flex justify-between items-center cursor-pointer"
                                onClick={() => setIsFilterPanelVisible(prev => !prev)}
                                aria-expanded={isFilterPanelVisible}
                                aria-controls="production-report-filters"
                            >
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">생산일보 검색 및 필터</h3>
                                <button
                                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"
                                    aria-label={isFilterPanelVisible ? '필터 숨기기' : '필터 보기'}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 dark:text-slate-400 transition-transform duration-300 ${isFilterPanelVisible ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            {isFilterPanelVisible && (
                                <div id="production-report-filters" className="p-4 border-t dark:border-slate-700 grid grid-cols-1 md:grid-cols-12 gap-4 items-end animate-fade-in-down">
                                    <div className="md:col-span-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">조회 기간</label>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"/>
                                            <span className="text-gray-500 dark:text-slate-400">~</span>
                                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"/>
                                            <div className="flex gap-1">
                                                <button onClick={() => { setStartDate(yesterdayStr); setEndDate(yesterdayStr); }} className="px-3 py-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-500 rounded-md text-sm font-medium">어제</button>
                                                <button onClick={() => { setStartDate(todayStr); setEndDate(todayStr); }} className="px-3 py-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-500 rounded-md text-sm font-medium">오늘</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="filter-status" className="text-sm font-medium text-gray-700 dark:text-slate-300">상태</label>
                                        <select id="filter-status" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700">
                                            <option value="all">전체</option>
                                            <option value="생산완료">생산완료</option>
                                            <option value="작업중">작업중</option>
                                            <option value="대기">대기</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="filter-line" className="text-sm font-medium text-gray-700 dark:text-slate-300">생산라인</label>
                                        <select id="filter-line" value={filterLine} onChange={e => setFilterLine(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700">
                                            <option value="all">전체 라인</option>
                                            {productionLineOptions.map(line => <option key={line} value={line}>{line}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label htmlFor="report-search" className="text-sm font-medium text-gray-700 dark:text-slate-300">통합 검색</label>
                                        <input 
                                            id="report-search"
                                            type="text"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            placeholder="전체 항목에서 검색..."
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-medium text-transparent">.</label>
                                        <button onClick={() => { setStartDate(todayStr); setEndDate(todayStr); setFilterStatus('all'); setFilterLine('all'); setSearchTerm(''); }} className="w-full bg-gray-200 dark:bg-slate-600 px-4 py-2 rounded-md text-sm font-semibold">초기화</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {selectedReportIds.size > 0 && (
                            <div className="flex-shrink-0 p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-between animate-fade-in-down">
                                <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">{selectedReportIds.size}개 항목 선택됨</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setSelectedReportIds(new Set())} className="px-3 py-1.5 text-sm font-medium rounded-md bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                                        선택 해제
                                    </button>
                                    <button onClick={() => setIsBulkRequestModalOpen(true)} className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white">
                                        선택 항목으로 리포트 생성
                                    </button>
                                </div>
                            </div>
                        )}

                        {summaryData && (
                            <div className="flex-shrink-0 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{startDate === endDate ? startDate : `${startDate} ~ ${endDate}`} 생산 실적 요약</h3>
                                    <button
                                        onClick={() => setIsSummaryVisible(!isSummaryVisible)}
                                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                                    >
                                        <span>{isSummaryVisible ? '요약 숨기기' : '요약 보기'}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isSummaryVisible ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isSummaryVisible ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md text-sm mb-4">
                                        <span><strong>총 투입:</strong> {summaryData.total.input.toLocaleString()}</span>
                                        <span><strong>총 양품:</strong> {summaryData.total.good.toLocaleString()}</span>
                                        <span className="text-red-500"><strong>총 불량:</strong> {summaryData.total.defect.toLocaleString()}</span>
                                        <span className="font-bold"><strong>총 양품률:</strong> {summaryData.total.input > 0 ? ((summaryData.total.good / summaryData.total.input) * 100).toFixed(1) + '%' : 'N/A'}</span>
                                    </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                            <h4 className="font-semibold mb-2 text-center text-sm">2층 증착</h4>
                                             {byLineGroup1.map(([line, data]) => <div key={line} className="grid grid-cols-4 gap-2 border-b dark:border-slate-600 last:border-b-0 py-1"><span>{line}</span><span className="text-right">{data.input.toLocaleString()}</span><span className="text-right">{data.good.toLocaleString()}</span><span className="text-right text-red-500">{data.defect.toLocaleString()}</span></div>)}
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                            <h4 className="font-semibold mb-2 text-center text-sm">1층 코팅</h4>
                                             {byLineGroup2.map(([line, data]) => <div key={line} className="grid grid-cols-4 gap-2 border-b dark:border-slate-600 last:border-b-0 py-1"><span>{line}</span><span className="text-right">{data.input.toLocaleString()}</span><span className="text-right">{data.good.toLocaleString()}</span><span className="text-right text-red-500">{data.defect.toLocaleString()}</span></div>)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 rounded-b-lg">
                             <ReportList reports={filteredReports} onEdit={handleEditReport} onDelete={handleDeleteReport} onShortageRequest={handleOpenNewShortageForm} onSelectShortageDetail={handleSelectShortageDetail} shortageRequests={shortageRequests} currentUserProfile={currentUserProfile} onOpenProcessConditionsModal={handleOpenProcessConditionsModal} productionRequests={productionRequests} onSelectProductionRequest={onSelectProductionRequest} selectedReportIds={selectedReportIds} onToggleReportSelection={handleToggleReportSelection} handleSelectAllOnPage={handleSelectAllOnPage} areAllOnPageSelected={areAllOnPageSelected}/>
                        </div>
                    </div>
                )}
                {activeTab === 'scheduleList' && (
                    <ProductionScheduleList schedules={productionSchedules} onSave={onSaveProductionSchedules} onDelete={onDeleteProductionSchedule} onDeleteByDate={onDeleteProductionSchedulesByDate} currentUserProfile={currentUserProfile} />
                )}
                {activeTab === 'orderList' && (
                    <OrderRegistrationList orders={orders} onSave={onSaveOrders} currentUserProfile={currentUserProfile} />
                )}
            </div>

            {shortageModalState && (
                <ShortageRequestModal 
                    isOpen={!!shortageModalState}
                    onClose={() => setShortageModalState(null)}
                    report={shortageModalState.report}
                    existingRequest={shortageModalState.request}
                    onSave={handleSaveShortageRequest}
                    isSaving={isSavingShortage}
                />
            )}
            
             {selectedShortageDetail && (
                <ShortageRequestDetailModal
                    isOpen={!!selectedShortageDetail}
                    onClose={() => setSelectedShortageDetail(null)}
                    request={selectedShortageDetail}
                    onEdit={handleOpenEditShortageForm}
                    onDelete={() => {
                        setItemToDelete(selectedShortageDetail);
                        setSelectedShortageDetail(null);
                    }}
                    currentUserProfile={currentUserProfile}
                />
            )}
            
            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleDeleteShortageRequest}
                title="신청 삭제 확인"
                message={`'${itemToDelete?.productName}' 부족분 신청 내역을 정말 삭제하시겠습니까?`}
            />

            <ProcessConditionsModal
                isOpen={processConditionsModalState.isOpen}
                onClose={() => setProcessConditionsModalState({ isOpen: false, report: null })}
                report={processConditionsModalState.report}
                onSave={handleSaveProcessConditions}
                canManage={currentUserProfile?.role !== 'Member'}
            />
             <FullScreenModal isOpen={isBulkRequestModalOpen} onClose={handleCloseBulkModal} title="물류 이동 리포트 생성" maxWidth="max-w-7xl">
                <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto p-6">
                        <h3 className="text-lg font-bold mb-4">선택된 생산일보 목록 ({selectedReportsForBulk.length}건)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1200px] text-sm">
                                <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                                    <tr className="border-b dark:border-slate-700">
                                        <th className="p-2 text-left font-semibold text-gray-600 dark:text-slate-300">발주번호</th>
                                        <th className="p-2 text-left font-semibold text-gray-600 dark:text-slate-300">발주처</th>
                                        <th className="p-2 text-left font-semibold text-gray-600 dark:text-slate-300">제품명/부속명</th>
                                        <th className="p-2 text-left font-semibold text-gray-600 dark:text-slate-300">사양</th>
                                        <th className="p-2 text-right font-semibold text-gray-600 dark:text-slate-300">양품수량</th>
                                        <th className="p-2 text-right font-semibold text-gray-600 dark:text-slate-300">포장단위</th>
                                        <th className="p-2 text-right font-semibold text-gray-600 dark:text-slate-300">박스수량</th>
                                        <th className="p-2 text-right font-semibold text-gray-600 dark:text-slate-300">잔량</th>
                                        <th className="p-2 text-left font-semibold text-gray-600 dark:text-slate-300">도착처</th>
                                        <th className="p-2 text-left font-semibold text-gray-600 dark:text-slate-300 w-1/4">추가 요청 내용</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedReportsForBulk.map(report => (
                                        <tr key={report.id} className="border-t dark:border-slate-700">
                                            <td className="p-2 font-mono text-xs">{report.orderNumbers.join(', ')}</td>
                                            <td className="p-2">{report.supplier}</td>
                                            <td className="p-2 font-semibold">{report.productName} / {report.partName}</td>
                                            <td className="p-2">{report.specification}</td>
                                            <td className="p-2 text-right">{report.goodQuantity?.toLocaleString()}</td>
                                            <td className="p-2 text-right">{report.packagingUnit?.toLocaleString()}</td>
                                            <td className="p-2 text-right">{report.boxCount?.toLocaleString()}</td>
                                            <td className="p-2 text-right">{report.remainder?.toLocaleString()}</td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={additionalDetails[report.id]?.destination || ''}
                                                    onChange={(e) => handleAdditionalDetailChange(report.id, 'destination', e.target.value)}
                                                    className="w-full p-1 border rounded bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                                                    placeholder="도착처 입력"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input 
                                                    type="text"
                                                    value={additionalDetails[report.id]?.details || ''}
                                                    onChange={(e) => handleAdditionalDetailChange(report.id, 'details', e.target.value)}
                                                    className="w-full p-1 border rounded bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                                                    placeholder="추가 요청사항 입력"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="flex-shrink-0 p-4 border-t dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                        <div className="flex justify-between items-center w-full">
                            <div className="text-lg font-bold">
                                총 수량: {selectedReportsForBulk.reduce((sum, r) => sum + (r.goodQuantity || 0), 0).toLocaleString()} EA
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleCloseBulkModal} className="bg-slate-200 dark:bg-slate-600 px-4 py-2 rounded-md">취소</button>
                                <button onClick={handleConfirmBulkRequest} disabled={isSaving} className="bg-primary-600 text-white px-4 py-2 rounded-md disabled:opacity-50">
                                    {isSaving ? '생성 중...' : '리포트 생성'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </FullScreenModal>

            <style>{`
                @keyframes fade-in-down {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-down {
                  animation: fade-in-down 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};