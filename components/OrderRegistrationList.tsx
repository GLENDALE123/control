import React, { useState, useMemo, useCallback, FC, ChangeEvent, useRef, useEffect } from 'react';
import { Order, UserProfile } from '../types';
import FullScreenModal from './FullScreenModal';

interface OrderRegistrationListProps {
    orders: Order[];
    onSave: (newOrders: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
    currentUserProfile: UserProfile | null;
}

const getLocalDateString = (date = new Date()) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

const excelHeaderOrder = [
    '년', '월', '일', '분류', '발주번호', '발주처', '제품명', '부속명', '발주수량', '사양', 
    '후공정', '생산', '잔량', '진행', '견본', '출하일', '담당', 
    '출하구분', '지그', '등록', '라인구분', '단가', '발주금액', '기타'
];

type ParsedOrder = Omit<Order, 'id' | 'createdAt' | 'updatedAt'>;

const UpdateOrderModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (orders: ParsedOrder[]) => Promise<void>;
}> = ({ isOpen, onClose, onSave }) => {
    const [pastedText, setPastedText] = useState('');
    const [parsedOrders, setParsedOrders] = useState<(ParsedOrder & { year: string; month: string; day: string; })[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [currentDate] = useState(getLocalDateString());

    const displayHeaders = useMemo(() => excelHeaderOrder, []);

    const displayKeys = useMemo((): (keyof (ParsedOrder & { year: string, month: string, day: string }))[] => {
        return [
            'year', 'month', 'day', 'category', 'orderNumber', 'client', 'productName', 'partName', 'orderQuantity', 'specification',
            'postProcess', 'productionQuantity', 'remainingQuantity', 'progress', 'sampleStatus',
            'shippingDate', 'manager', 'shippingType', 'jigUsed', 'registrationStatus',
            'lineType', 'unitPrice', 'orderAmount', 'remarks'
        ];
    }, []);

    const parseData = useCallback((text: string) => {
        setError(null);
        if (!text.trim()) {
            setParsedOrders([]);
            return;
        }

        const rows = text.trim().split('\n').map(row => row.split('\t'));
        if (rows.length === 0) {
            setError('데이터가 없습니다.');
            return;
        }

        let lastYear = new Date().getFullYear().toString();
        let lastMonth = '', lastDay = '';

        try {
            const parsed: (ParsedOrder & { year: string; month: string; day: string; })[] = rows.map((row, rowIndex) => {
                const year = row[0]?.trim() || lastYear;
                const month = row[1]?.trim() || lastMonth;
                const day = row[2]?.trim() || lastDay;
                
                if (year) lastYear = year;
                if (month) lastMonth = month;
                if (day) lastDay = day;

                const orderDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                
                return {
                    year,
                    month,
                    day,
                    orderDate: orderDate,
                    category: row[3] || '',
                    orderNumber: row[4] || '',
                    client: row[5] || '',
                    productName: row[6] || '',
                    partName: row[7] || '',
                    orderQuantity: parseInt(String(row[8]).replace(/,/g, ''), 10) || 0,
                    specification: row[9] || '',
                    postProcess: row[10] || '',
                    productionQuantity: parseInt(String(row[11]).replace(/,/g, ''), 10) || 0,
                    remainingQuantity: parseInt(String(row[12]).replace(/,/g, ''), 10) || 0,
                    progress: row[13] || '',
                    sampleStatus: row[14] || '',
                    shippingDate: row[15] || '',
                    manager: row[16] || '',
                    shippingType: row[17] || '',
                    jigUsed: row[18] || '',
                    registrationStatus: row[19] || '',
                    lineType: row[20] || '',
                    unitPrice: parseInt(String(row[21]).replace(/,/g, ''), 10) || 0,
                    orderAmount: parseInt(String(row[22]).replace(/,/g, ''), 10) || 0,
                    remarks: row[23] || '',
                    orderIndex: rowIndex
                };
            }).filter(order => order.productName);

            setParsedOrders(parsed);
            if (parsed.length === 0 && rows.length > 0) {
                setError('유효한 데이터를 찾을 수 없습니다. 제품명 컬럼이 비어있는지 확인하세요.');
            }
        } catch (e) {
            console.error(e);
            setError('데이터 파싱 중 오류가 발생했습니다. 형식을 확인해주세요.');
        }
    }, [currentDate]);

    const handleSaveClick = async () => {
        setIsSaving(true);
        try {
            await onSave(parsedOrders);
            onClose();
            setPastedText('');
            setParsedOrders([]);
        } catch (error) {
            // Error is handled by App.tsx, which shows a toast.
            // The finally block will reset the button state.
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <FullScreenModal isOpen={isOpen} onClose={onClose} title="수주 일괄 등록/업데이트">
            <div className="p-4 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">엑셀에서 데이터 영역만(컬럼명 제외) 복사하여 아래 칸에 붙여넣으세요. 데이터는 정해진 순서대로 입력되어야 합니다.<br/>기존에 동일한 날짜에 등록된 일정은 모두 삭제되고 새로 붙여넣은 데이터로 덮어씌워집니다.</p>
                <textarea
                    className="w-full h-40 p-2 border rounded dark:bg-slate-700 dark:border-slate-600 font-mono text-sm"
                    placeholder="여기에 엑셀 데이터를 붙여넣으세요..."
                    value={pastedText}
                    onChange={e => {
                        setPastedText(e.target.value);
                        parseData(e.target.value);
                    }}
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                
                <h3 className="font-semibold">미리보기 ({parsedOrders.length}개 항목)</h3>
                <div className="max-h-64 overflow-auto border rounded dark:border-slate-700">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700">
                            <tr>
                                {displayHeaders.map(h => <th key={h} className="p-2 text-left whitespace-nowrap">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {parsedOrders.map((order, i) => (
                                <tr key={i} className="border-t dark:border-slate-700">
                                    {displayKeys.map(key => (
                                        <td key={key} className="p-2 whitespace-nowrap">
                                            {typeof order[key as keyof typeof order] === 'number' ? (order[key as keyof typeof order] as number).toLocaleString() : order[key as keyof typeof order] as string}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="flex-shrink-0 p-4 border-t dark:border-slate-700 flex justify-end gap-2">
                <button onClick={onClose} className="bg-slate-200 dark:bg-slate-600 px-4 py-2 rounded-md">취소</button>
                <button onClick={handleSaveClick} disabled={parsedOrders.length === 0 || isSaving} className="bg-primary-600 text-white px-4 py-2 rounded-md disabled:opacity-50">
                    {isSaving ? '저장 중...' : '저장하기'}
                </button>
            </div>
        </FullScreenModal>
    );
};

const MemoizedOrderRow: FC<{ order: Order }> = React.memo(({ order }) => {
    const dateParts = typeof order.orderDate === 'string' ? order.orderDate.split('-') : ['', '', ''];
    const year = dateParts[0] || '';
    const month = dateParts[1] || '';
    const day = dateParts[2] || '';
    
    return (
        <tr className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
            <td className="px-2 py-2 whitespace-nowrap">{year}</td>
            <td className="px-2 py-2 whitespace-nowrap">{month}</td>
            <td className="px-2 py-2 whitespace-nowrap">{day}</td>
            <td className="px-2 py-2 whitespace-nowrap">{order.category}</td>
            <td className="px-2 py-2 whitespace-nowrap">{order.orderNumber}</td>
            <td className="px-2 py-2 whitespace-nowrap">{order.client}</td>
            <td className="px-2 py-2 whitespace-nowrap">{order.productName}</td>
            <td className="px-2 py-2 whitespace-nowrap">{order.partName}</td>
            <td className="px-2 py-2 whitespace-nowrap text-right">{order.orderQuantity?.toLocaleString()}</td>
            <td className="px-2 py-2 whitespace-nowrap">{order.specification}</td>
            <td className="px-2 py-2 whitespace-nowrap">{order.postProcess}</td>
            <td className="px-2 py-2 whitespace-nowrap text-right">{order.productionQuantity?.toLocaleString()}</td>
            <td className="px-2 py-2 whitespace-nowrap text-right">{order.remainingQuantity?.toLocaleString()}</td>
            <td className="px-2 py-2 whitespace-nowrap">{order.progress}</td>
            <td className="px-2 py-2 whitespace-nowrap">{order.sampleStatus}</td>
            <td className="px-2 py-2 whitespace-nowrap">{order.shippingDate}</td>
            <td className="px-2 py-2 whitespace-nowrap">{order.manager}</td>
            <td className="px-2 py-2 whitespace-nowrap">{order.shippingType}</td>
            <td className="px-2 py-2 whitespace-nowrap">{order.jigUsed}</td>
            <td className="px-2 py-2 whitespace-nowrap">{order.registrationStatus}</td>
            <td className="px-2 py-2 whitespace-nowrap">{order.lineType}</td>
            <td className="px-2 py-2 whitespace-nowrap text-right">{order.unitPrice?.toLocaleString()}</td>
            <td className="px-2 py-2 whitespace-nowrap text-right">{order.orderAmount?.toLocaleString()}</td>
            <td className="px-2 py-2 whitespace-nowrap" title={order.remarks}>{order.remarks}</td>
        </tr>
    );
});


const OrderRegistrationList: FC<OrderRegistrationListProps> = ({ orders, onSave, currentUserProfile }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<Record<string, Set<string>>>({});
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const filterPopupRef = useRef<HTMLDivElement>(null);
    const [defaultFiltersApplied, setDefaultFiltersApplied] = useState(false);
    const [isShowingAll, setIsShowingAll] = useState(false);

    const canManage = currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Manager';
    
    const applyDefaultFilters = useCallback(() => {
        if (orders && orders.length > 0) {
            const progressOptions = new Set(orders.map(o => o.progress).filter(Boolean) as string[]);
            const excludedStatuses = ['작업완료', '발주취소', '생산보류', '외주처리'];
            excludedStatuses.forEach(status => progressOptions.delete(status));
            setFilters({ progress: progressOptions });
            setIsShowingAll(false);
        }
    }, [orders]);
    
    useEffect(() => {
        if (orders && orders.length > 0 && !defaultFiltersApplied) {
            applyDefaultFilters();
            setDefaultFiltersApplied(true);
        }
    }, [orders, defaultFiltersApplied, applyDefaultFilters]);
    
    const handleShowAll = useCallback(() => {
        setFilters({});
        setActiveFilter(null);
        setIsShowingAll(true);
    }, []);

    const columnOptions = useMemo(() => {
        const options: Record<string, string[]> = {};
        if (!orders || orders.length === 0) return options;
        
        const keys: (keyof Order)[] = [
            'orderDate', 'category', 'orderNumber', 'client', 'productName', 'partName', 'specification', 
            'postProcess', 'progress', 'sampleStatus', 'shippingDate', 'manager', 
            'shippingType', 'jigUsed', 'registrationStatus', 'lineType', 'remarks'
        ];

        keys.forEach(key => {
            const values = new Set(orders.map(o => {
                const val = o[key];
                return (val === null || val === undefined || val === '') ? '(비어 있음)' : String(val);
            }));
            options[key] = Array.from(values).sort((a, b) => a.localeCompare(b, 'ko'));
        });
        
        return options;
    }, [orders]);

    const filteredOrders = useMemo(() => {
        let filteredData = [...(orders ?? [])];

        Object.entries(filters).forEach(([key, selectedValues]) => {
            const allOptions = columnOptions[key];
            if (!allOptions || selectedValues.size === allOptions.length) {
                return; 
            }
            if (selectedValues.size === 0) {
                 filteredData = [];
            } else {
                 filteredData = filteredData.filter(order => {
                    const value = order[key as keyof Order];
                    const valueStr = (value === null || value === undefined || value === '') ? '(비어 있음)' : String(value);
                    return selectedValues.has(valueStr);
                });
            }
        });

        if (searchTerm.trim()) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filteredData = filteredData.filter(order =>
                Object.values(order).some(val =>
                    val !== null && val !== undefined && String(val).toLowerCase().includes(lowerCaseSearchTerm)
                )
            );
        }
        
        return filteredData;
    }, [orders, filters, searchTerm, columnOptions]);

    const displayHeaders = ['년', '월', '일', '분류', '발주번호', '발주처', '제품명', '부속명', '발주수량', '사양', '후공정', '생산', '잔량', '진행', '견본', '출하일', '담당', '출하구분', '지그', '등록', '라인구분', '단가', '발주금액', '기타'];
    const headerKeys: (keyof Order | null)[] = [null, null, null, 'category', 'orderNumber', 'client', 'productName', 'partName', 'orderQuantity', 'specification', 'postProcess', 'productionQuantity', 'remainingQuantity', 'progress', 'sampleStatus', 'shippingDate', 'manager', 'shippingType', 'jigUsed', 'registrationStatus', 'lineType', 'unitPrice', 'orderAmount', 'remarks'];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterPopupRef.current && !filterPopupRef.current.contains(event.target as Node) && !(event.target as HTMLElement).closest('.filter-btn')) {
                setActiveFilter(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const FunnelIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M2.929 2.929a1 1 0 011.414 0L10 8.586l5.657-5.657a1 1 0 111.414 1.414L11.414 10l5.657 5.657a1 1 0 01-1.414 1.414L10 11.414l-5.657 5.657a1 1 0 01-1.414-1.414L8.586 10 2.929 4.343a1 1 0 010-1.414z" clipRule="evenodd" />
        <path d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zM17 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1z" />
         <path d="M2.343 3.757A1 1 0 013.586 3h12.828a1 1 0 01.832 1.573l-4.501 6.302a1 1 0 00-.331.724v4.5a1 1 0 01-1.658.743l-2.5-1.5a1 1 0 01-.342-.743v-3a1 1 0 00-.331-.724L3.173 4.573A1 1 0 012.343 3.757z" />
      </svg>
    );

    const FilterPopup: FC<{
        options: string[];
        selected: Set<string>;
        onApply: (selected: Set<string>) => void;
        onClose: () => void;
    }> = ({ options, selected, onApply, onClose }) => {
        const [localSelected, setLocalSelected] = useState(new Set(selected));
        const [searchTerm, setSearchTerm] = useState('');

        const filteredOptions = options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));

        const handleToggle = (option: string) => {
            setLocalSelected(prev => {
                const newSet = new Set(prev);
                if (newSet.has(option)) {
                    newSet.delete(option);
                } else {
                    newSet.add(option);
                }
                return newSet;
            });
        };

        const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.checked) {
                setLocalSelected(new Set([...localSelected, ...filteredOptions]));
            } else {
                setLocalSelected(prev => {
                    const newSet = new Set(prev);
                    filteredOptions.forEach(opt => newSet.delete(opt));
                    return newSet;
                });
            }
        };

        return (
            <div ref={filterPopupRef} className="absolute top-full mt-2 left-0 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-md shadow-lg z-20 w-64 p-3">
                <input type="text" placeholder="검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-2 py-1 border rounded mb-2 dark:bg-slate-800 dark:border-slate-600" />
                <div className="flex items-center border-b pb-2 mb-2 dark:border-slate-700">
                    <input type="checkbox" onChange={handleSelectAll} checked={filteredOptions.length > 0 && filteredOptions.every(opt => localSelected.has(opt))} id={`select-all-${options.join('-')}`} />
                    <label htmlFor={`select-all-${options.join('-')}`} className="ml-2">모두 선택</label>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredOptions.map(option => (
                        <div key={option} className="flex items-center">
                            <input type="checkbox" id={`opt-${option}`} checked={localSelected.has(option)} onChange={() => handleToggle(option)} />
                            <label htmlFor={`opt-${option}`} className="ml-2 truncate">{option}</label>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t dark:border-slate-700">
                    <button onClick={() => {
                        const allOptionsSet = new Set(options);
                        onApply(allOptionsSet);
                    }} className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400">초기화</button>
                    <button onClick={onClose} className="px-3 py-1 text-sm bg-slate-200 dark:bg-slate-600 rounded">취소</button>
                    <button onClick={() => onApply(localSelected)} className="px-3 py-1 text-sm bg-primary-600 text-white rounded">적용</button>
                </div>
            </div>
        );
    };

    const ThWithFilter: FC<{ columnKey: keyof Order, label: string }> = ({ columnKey, label }) => {
        const options = columnOptions[columnKey] || [];
        const isFilterActive = filters[columnKey] !== undefined;

        const handleApplyFilter = (selected: Set<string>) => {
            setFilters(prev => ({...prev, [columnKey]: selected}));
            setActiveFilter(null);
        };
        
        return (
            <th scope="col" className="px-2 py-3 whitespace-nowrap relative">
                <div className="flex items-center gap-1">
                    <span>{label}</span>
                    <button 
                        onClick={() => setActiveFilter(activeFilter === columnKey ? null : columnKey)}
                        className="filter-btn p-1 rounded-full hover:bg-slate-600"
                    >
                        <FunnelIcon className={`h-4 w-4 ${isFilterActive ? 'text-blue-400' : 'text-slate-500'}`} />
                    </button>
                </div>
                {activeFilter === columnKey && (
                    <FilterPopup
                        options={options}
                        selected={filters[columnKey] ?? new Set(options)}
                        onApply={handleApplyFilter}
                        onClose={() => setActiveFilter(null)}
                    />
                )}
            </th>
        );
    };
    
    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <header className="flex-shrink-0 p-4 border-b dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">수주 등록 (목록)</h2>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {isShowingAll ? (
                        <button onClick={applyDefaultFilters} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600">
                            기본 필터로 복귀
                        </button>
                    ) : (
                        <button onClick={handleShowAll} className="bg-slate-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-slate-600">
                            전체수주등록보기
                        </button>
                    )}
                    {canManage && (
                        <button onClick={() => setIsModalOpen(true)} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-teal-700">
                            발주등록/수정
                        </button>
                    )}
                    {canManage && (
                        <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700">
                            일괄 등록/업데이트
                        </button>
                    )}
                </div>
            </header>
            <div className="flex-shrink-0 p-4 border-b dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-grow w-full">
                    <input
                        type="text"
                        placeholder="검색..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    />
                </div>
            </div>
            <main className="flex-1 overflow-auto p-4">
                <table className="w-full min-w-max text-xs text-left text-gray-500 dark:text-slate-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-slate-400 sticky top-0 z-10">
                        <tr>
                            {displayHeaders.map((header, index) => {
                                const key = headerKeys[index];
                                return key ? <ThWithFilter key={header} columnKey={key} label={header} /> : <th key={header} scope="col" className="px-2 py-3 whitespace-nowrap">{header}</th>;
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map((order) => (
                            <MemoizedOrderRow key={order.id} order={order} />
                        ))}
                    </tbody>
                </table>
                {filteredOrders.length === 0 && <p className="text-center p-8 text-slate-500">표시할 수주 데이터가 없습니다.</p>}
            </main>
            
            <UpdateOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={onSave} />
        </div>
    );
};

export default OrderRegistrationList;
