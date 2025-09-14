import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ProductionSchedule, UserProfile } from '../types';
import FullScreenModal from './FullScreenModal';
import ConfirmationModal from './ConfirmationModal';

interface ProductionScheduleListProps {
    schedules: ProductionSchedule[];
    onSave: (newSchedules: Omit<ProductionSchedule, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
    onDelete: (scheduleId: string) => void;
    currentUserProfile: UserProfile | null;
}

type ParsedSchedule = Omit<ProductionSchedule, 'id' | 'createdAt' | 'updatedAt'>;

interface UpdateScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (schedules: ParsedSchedule[]) => Promise<void>;
    currentDate: string;
}

const getLocalDateString = (date = new Date()) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

const headerMapping: { [key: string]: keyof ParsedSchedule } = {
    '계획일자': 'planDate',
    '진행': 'progress',
    '출하': 'shipping',
    '라인': 'line',
    '사출': 'injection',
    '발주번호': 'orderNumber',
    '발주처': 'client',
    '제품명': 'productName',
    '부속명': 'partName',
    '발주': 'orderQuantity',
    '사양': 'specification',
    '후공정': 'postProcess',
    '참고': 'remarks',
    '담당자': 'manager',
    '내/수': 'domesticOrExport',
    '사용지그': 'jigUsed',
    '신/재': 'newOrRe',
    '부족수량': 'shortageQuantity'
};

const fixedHeaderOrder: (keyof ParsedSchedule)[] = [
    'planDate', 'progress', 'shipping', 'line', 'injection', 'orderNumber', 'client',
    'productName', 'partName', 'orderQuantity', 'specification', 'postProcess',
    'remarks', 'manager', 'domesticOrExport', 'jigUsed', 'newOrRe', 'shortageQuantity'
];

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


const UpdateScheduleModal: React.FC<UpdateScheduleModalProps> = ({
    isOpen,
    onClose,
    onSave,
    currentDate,
}) => {
    const [pastedText, setPastedText] = useState('');
    const [parsedSchedules, setParsedSchedules] = useState<ParsedSchedule[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const displayHeaders = useMemo(() => {
        const reverseMapping: { [key in keyof ParsedSchedule]?: string } = {};
        for (const key in headerMapping) {
            reverseMapping[headerMapping[key as keyof typeof headerMapping]] = key;
        }
        return fixedHeaderOrder.map(key => reverseMapping[key] || String(key));
    }, []);

    const parseData = useCallback((text: string) => {
        setError(null);
        if (!text.trim()) {
            setParsedSchedules([]);
            return;
        }

        const rows = text.trim().split('\n').map(row => row.split('\t'));
        if (rows.length === 0) {
            setError('데이터가 없습니다.');
            return;
        }

        const year = new Date(currentDate).getFullYear();
        const monthFromFilter = new Date(currentDate).getMonth() + 1;
        let lastValidDate = currentDate;

        const parseDateCell = (cell: string): string => {
            if (!cell || !cell.trim()) return lastValidDate;

            const match = cell.match(/(\d{1,2})\/(\d{1,2})/);
            if (match) {
                const month = match[1].padStart(2, '0');
                const day = match[2].padStart(2, '0');
                lastValidDate = `${year}-${month}-${day}`;
                return lastValidDate;
            }

            if (/^\d{4}-\d{2}-\d{2}$/.test(cell.trim())) {
                lastValidDate = cell.trim();
                return lastValidDate;
            }

            if (/^\d{1,2}$/.test(cell.trim())) {
                const day = cell.trim().padStart(2, '0');
                lastValidDate = `${year}-${String(monthFromFilter).padStart(2, '0')}-${day}`;
                return lastValidDate;
            }
            
            return lastValidDate;
        };

        const parsed: ParsedSchedule[] = [];
        for (const row of rows) {
            if (row.every(cell => !cell.trim())) continue;

            const scheduleData: { [key: string]: any } = {};
            fixedHeaderOrder.forEach((key, index) => {
                scheduleData[key] = row[index] || '';
            });

            if (!scheduleData.productName) {
                continue; // Skip rows without product name
            }

            const schedule: ParsedSchedule = {
                planDate: parseDateCell(scheduleData.planDate),
                progress: scheduleData.progress,
                shipping: scheduleData.shipping,
                line: scheduleData.line,
                injection: scheduleData.injection,
                orderNumber: scheduleData.orderNumber,
                client: scheduleData.client,
                productName: scheduleData.productName,
                partName: scheduleData.partName,
                orderQuantity: parseInt(String(scheduleData.orderQuantity).replace(/,/g, ''), 10) || 0,
                specification: scheduleData.specification,
                postProcess: scheduleData.postProcess,
                remarks: scheduleData.remarks,
                manager: scheduleData.manager,
                domesticOrExport: scheduleData.domesticOrExport,
                jigUsed: scheduleData.jigUsed,
                newOrRe: scheduleData.newOrRe,
                shortageQuantity: parseInt(String(scheduleData.shortageQuantity).replace(/,/g, ''), 10) || 0,
            };
            parsed.push(schedule);
        }

        if (parsed.length === 0 && rows.length > 0) {
            setError('붙여넣은 데이터에서 유효한 일정을 찾을 수 없습니다. 제품명이 있는지, 데이터 형식이 올바른지 확인해주세요.');
        }

        setParsedSchedules(parsed);
    }, [currentDate]);

    const handleSaveClick = async () => {
        setIsSaving(true);
        try {
            await onSave(parsedSchedules);
            onClose();
            setPastedText('');
            setParsedSchedules([]);
        } catch (e) {
            // Error toast is shown by parent
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <FullScreenModal isOpen={isOpen} onClose={onClose} title="생산일정 등록/업데이트">
            <div className="p-4 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">엑셀에서 데이터 영역만(컬럼명 제외) 복사하여 아래 칸에 붙여넣으세요. 데이터는 정해진 순서대로 입력되어야 합니다. 기존에 동일한 날짜에 등록된 일정은 모두 삭제되고 새로 붙여넣은 데이터로 덮어씌워집니다.</p>
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
                
                <h3 className="font-semibold">미리보기 ({parsedSchedules.length}개 항목)</h3>
                <div className="max-h-64 overflow-auto border rounded dark:border-slate-700">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700">
                            <tr>
                                {displayHeaders.map(h => <th key={h} className="p-2 text-left whitespace-nowrap">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {parsedSchedules.map((s, i) => (
                                <tr key={i} className="border-t dark:border-slate-700">
                                    {fixedHeaderOrder.map(key => (
                                        <td key={key} className="p-2 whitespace-nowrap">
                                            {typeof s[key] === 'number' ? (s[key] as number).toLocaleString() : s[key]}
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
                <button onClick={handleSaveClick} disabled={parsedSchedules.length === 0 || isSaving} className="bg-primary-600 text-white px-4 py-2 rounded-md disabled:opacity-50">
                    {isSaving ? '저장 중...' : '저장하기'}
                </button>
            </div>
        </FullScreenModal>
    );
};

const getLineGroup = (line?: string): string => {
    if (!line) return 'unknown';
    if (line.includes('증착1')) return '증착1세트';
    if (line.includes('증착2')) return '증착2세트';
    return line;
};


export const ProductionScheduleList: React.FC<ProductionScheduleListProps> = ({ schedules, onSave, onDelete, currentUserProfile }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const today = getLocalDateString(new Date());
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [activeQuickFilter, setActiveQuickFilter] = useState<'today' | 'yesterday' | 'week' | 'all' | 'custom' | 'tomorrow' | 'nextWeek'>('today');
    const [itemToDelete, setItemToDelete] = useState<ProductionSchedule | null>(null);
    const [isFilterVisible, setIsFilterVisible] = useState(false);

    const canManage = currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Manager';

    const handleQuickFilter = (filter: 'today' | 'yesterday' | 'week' | 'all' | 'tomorrow' | 'nextWeek') => {
        setActiveQuickFilter(filter);
        const todayDate = new Date();
        
        if (filter === 'today') {
            const todayStr = getLocalDateString(todayDate);
            setStartDate(todayStr);
            setEndDate(todayStr);
        } else if (filter === 'yesterday') {
            const yesterdayDate = new Date();
            yesterdayDate.setDate(todayDate.getDate() - 1);
            const yesterdayStr = getLocalDateString(yesterdayDate);
            setStartDate(yesterdayStr);
            setEndDate(yesterdayStr);
        } else if (filter === 'tomorrow') {
            const tomorrowDate = new Date();
            tomorrowDate.setDate(todayDate.getDate() + 1);
            const tomorrowStr = getLocalDateString(tomorrowDate);
            setStartDate(tomorrowStr);
            setEndDate(tomorrowStr);
        } else if (filter === 'week') {
            const firstDayOfWeek = new Date(todayDate);
            firstDayOfWeek.setDate(todayDate.getDate() - todayDate.getDay());
            const lastDayOfWeek = new Date(firstDayOfWeek);
            lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
            setStartDate(getLocalDateString(firstDayOfWeek));
            setEndDate(getLocalDateString(lastDayOfWeek));
        } else if (filter === 'nextWeek') {
            const firstDayOfNextWeek = new Date(todayDate);
            firstDayOfNextWeek.setDate(todayDate.getDate() - todayDate.getDay() + 7);
            const lastDayOfNextWeek = new Date(firstDayOfNextWeek);
            lastDayOfNextWeek.setDate(firstDayOfNextWeek.getDate() + 6);
            setStartDate(getLocalDateString(firstDayOfNextWeek));
            setEndDate(getLocalDateString(lastDayOfNextWeek));
        } else if (filter === 'all') {
            setStartDate('');
            setEndDate('');
        }
    };
    
    const QuickFilterButton: React.FC<{ filter: 'today' | 'yesterday' | 'week' | 'all' | 'tomorrow' | 'nextWeek'; label: string }> = ({ filter, label }) => (
        <button
            onClick={() => handleQuickFilter(filter)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeQuickFilter === filter
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-500'
            }`}
        >
            {label}
        </button>
    );
    
    const filteredSchedules = useMemo(() => {
        const filtered = schedules.filter(s => {
            const dateMatch = (!startDate || s.planDate >= startDate) && (!endDate || s.planDate <= endDate);
            
            if (!searchTerm) {
                return dateMatch;
            }

            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            
            const searchFields: (keyof ProductionSchedule)[] = [
                'progress', 
                'line', 
                'orderNumber', 
                'client', 
                'productName', 
                'postProcess'
            ];
            
            const searchMatch = searchFields.some(field => 
                s[field] && String(s[field]).toLowerCase().includes(lowerCaseSearchTerm)
            );

            return dateMatch && searchMatch;
        });

        return filtered.sort((a, b) => {
            const dateComparison = a.planDate.localeCompare(b.planDate);
            if (dateComparison !== 0) return dateComparison;

            const aLine = a.line || '';
            const bLine = b.line || '';
            const aIndex = productionLineSortOrder.indexOf(aLine);
            const bIndex = productionLineSortOrder.indexOf(bLine);
            
            const aSortIndex = aIndex === -1 ? Infinity : aIndex;
            const bSortIndex = bIndex === -1 ? Infinity : bIndex;
            
            if (aSortIndex !== bSortIndex) {
                return aSortIndex - bSortIndex;
            }

            return aLine.localeCompare(bLine, 'ko');
        });
    }, [schedules, startDate, endDate, searchTerm]);
    
    const schedulesByDate = useMemo(() => {
        return filteredSchedules.reduce((acc, schedule) => {
            const date = schedule.planDate;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(schedule);
            return acc;
        }, {} as Record<string, ProductionSchedule[]>);
    }, [filteredSchedules]);

    const handleDeleteClick = (schedule: ProductionSchedule) => {
        setItemToDelete(schedule);
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            onDelete(itemToDelete.id);
            setItemToDelete(null);
        }
    };

    const displayHeaders = useMemo(() => {
        const reverseMapping: { [key in keyof ParsedSchedule]?: string } = {};
        for (const key in headerMapping) {
            reverseMapping[headerMapping[key as keyof typeof headerMapping]] = key;
        }
        return fixedHeaderOrder.map(key => reverseMapping[key] || String(key));
    }, []);

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <header className="flex-shrink-0 p-4 border-b dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">생산 일정</h2>
                    <button
                        onClick={() => setIsFilterVisible(!isFilterVisible)}
                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"
                        aria-label={isFilterVisible ? '필터 숨기기' : '필터 보기'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 dark:text-slate-400 transition-transform duration-300 ${isFilterVisible ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
                {canManage && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700"
                    >
                        일괄 등록/업데이트
                    </button>
                )}
            </header>
            
            {isFilterVisible && (
                <div className="flex-shrink-0 p-4 border-b dark:border-slate-700 space-y-3 animate-fade-in-down">
                    <div className="flex flex-wrap items-center gap-2">
                        <QuickFilterButton filter="yesterday" label="어제" />
                        <QuickFilterButton filter="today" label="오늘" />
                        <QuickFilterButton filter="tomorrow" label="내일" />
                        <QuickFilterButton filter="week" label="이번 주" />
                        <QuickFilterButton filter="nextWeek" label="다음주" />
                        <QuickFilterButton filter="all" label="전체" />
                    </div>
                    <div className="flex flex-col md:flex-row gap-2 items-center">
                        <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setActiveQuickFilter('custom'); }} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"/>
                        <span className="text-gray-500 dark:text-slate-400">~</span>
                        <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setActiveQuickFilter('custom'); }} min={startDate} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"/>
                        <input
                            type="text"
                            placeholder="진행, 라인, 발주번호, 발주처, 제품명, 후공정 검색..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="flex-grow px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                        />
                    </div>
                </div>
            )}

            <main className="flex-1 overflow-auto p-4">
                <table className="w-full min-w-max text-xs text-left text-gray-500 dark:text-slate-400 border-separate" style={{ borderSpacing: '0 1rem' }}>
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-slate-400">
                        <tr>
                            {displayHeaders.map(header => (
                                <th key={header} scope="col" className="px-2 py-3 whitespace-nowrap">{header}</th>
                            ))}
                            {canManage && <th scope="col" className="px-2 py-3">작업</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(schedulesByDate).map(([date, schedulesForDate]) => (
                             <React.Fragment key={date}>
                                {schedulesForDate.map((s, index) => {
                                    const isFirstRowInGroup = index === 0;
                                    const isLastRowInGroup = index === schedulesForDate.length - 1;

                                    const currentLineGroup = getLineGroup(s.line);
                                    const prevLineGroup = index > 0 ? getLineGroup(schedulesForDate[index - 1].line) : null;
                                    const needsLineSeparator = index > 0 && currentLineGroup !== prevLineGroup;

                                    const borderClass = 'border-primary-300 dark:border-primary-700';
                                    const colCount = displayHeaders.length + (canManage ? 1 : 0);
                                    
                                    const getCellClass = (cellIndex: number): string => {
                                        let classes = "px-2 py-2 whitespace-nowrap bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50";
                                        
                                        if (isFirstRowInGroup) classes += ` border-t ${borderClass}`;
                                        if (isLastRowInGroup) classes += ` border-b ${borderClass}`;
                                        if (cellIndex === 0) classes += ` border-l ${borderClass}`;
                                        if (cellIndex === colCount - 1) classes += ` border-r ${borderClass}`;

                                        if (isFirstRowInGroup && cellIndex === 0) classes += ' rounded-tl-lg';
                                        if (isFirstRowInGroup && cellIndex === colCount - 1) classes += ' rounded-tr-lg';
                                        if (isLastRowInGroup && cellIndex === 0) classes += ' rounded-bl-lg';
                                        if (isLastRowInGroup && cellIndex === colCount - 1) classes += ' rounded-br-lg';
                                        
                                        const key = fixedHeaderOrder[cellIndex];
                                        if (key === 'line') classes += " font-semibold";
                                        if (key === 'productName') classes += " text-gray-900 dark:text-white";
                                        if (key === 'orderQuantity' || key === 'shortageQuantity') classes += " text-right";
                                        if (key === 'remarks') classes += " max-w-xs truncate";

                                        return classes;
                                    };

                                    return (
                                        <React.Fragment key={s.id}>
                                            {needsLineSeparator && (
                                                <tr>
                                                    <td colSpan={colCount} className={`py-1 px-2 border-l border-r ${borderClass} bg-white dark:bg-slate-800`}>
                                                        <div className="h-0.5 bg-primary-300 dark:bg-primary-700"></div>
                                                    </td>
                                                </tr>
                                            )}
                                            <tr className="group">
                                                {fixedHeaderOrder.map((key, cellIndex) => {
                                                    const value = s[key];
                                                    let content = value;
                                                    if (key === 'orderQuantity' || key === 'shortageQuantity') {
                                                        content = typeof value === 'number' ? value.toLocaleString() : value;
                                                    }
                                                    return (
                                                        <td key={key} className={getCellClass(cellIndex)} title={key === 'remarks' && typeof value === 'string' ? value : undefined}>
                                                            {content as React.ReactNode}
                                                        </td>
                                                    );
                                                })}
                                                {canManage && (
                                                    <td className={getCellClass(colCount - 1)}>
                                                        <button onClick={() => handleDeleteClick(s)} className="font-medium text-red-600 dark:text-red-500 hover:underline">삭제</button>
                                                    </td>
                                                )}
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
                {filteredSchedules.length === 0 && <p className="text-center p-8 text-slate-500">표시할 일정이 없습니다.</p>}
            </main>
            
            <UpdateScheduleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={onSave} currentDate={startDate || today} />
            <ConfirmationModal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} onConfirm={confirmDelete} title="일정 삭제 확인" message={`'${itemToDelete?.planDate}'의 '${itemToDelete?.productName}' 일정을 정말 삭제하시겠습니까?`} />
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
