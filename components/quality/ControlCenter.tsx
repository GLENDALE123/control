import React, { useState, useMemo, useCallback } from 'react';
import { GroupedInspectionData, QualityInspection, DefectReason } from '../../types';

interface ControlCenterProps {
    groupedData: GroupedInspectionData[];
    isLoading: boolean;
    onSelectDetails: (details: GroupedInspectionData) => void;
    filters: { type: string, value: any } | null;
    onClearFilters: () => void;
}

const getLocalDate = (date = new Date()) => {
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - userTimezoneOffset);
    return localDate.toISOString().split('T')[0];
};

const ControlCenter: React.FC<ControlCenterProps> = ({ 
    groupedData, 
    isLoading, 
    onSelectDetails, 
    filters, 
    onClearFilters 
}) => {
    // FIX: Use getLocalDate to correctly determine today and yesterday in the user's timezone.
    const today = useMemo(() => getLocalDate(new Date()), []);
    const yesterday = useMemo(() => {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        return getLocalDate(y);
    }, []);
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(true);

    const handleReset = () => {
        setStartDate(today);
        setEndDate(today);
        setSearchTerm('');
        onClearFilters();
    };

    const deepSearch = useCallback((obj: any, term: string): boolean => {
        if (obj === null || obj === undefined) return false;
    
        const lowerCaseTerm = term.toLowerCase();
    
        if (typeof obj === 'string') {
            return obj.toLowerCase().includes(lowerCaseTerm);
        }
        if (typeof obj === 'number' || typeof obj === 'boolean') {
            return String(obj).toLowerCase().includes(lowerCaseTerm);
        }
        if (Array.isArray(obj)) {
            return obj.some(item => deepSearch(item, lowerCaseTerm));
        }
        if (typeof obj === 'object') {
            if (React.isValidElement(obj) || typeof obj === 'function') {
                return false;
            }
            return Object.values(obj).some(value => deepSearch(value, lowerCaseTerm));
        }
        return false;
    }, []);

    const filteredData = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();

        if (term) {
            // If there's a search term, filter the entire dataset, ignoring dates and other filters.
            return groupedData.filter(group => deepSearch(group, term));
        }

        // If no search term, apply date or dashboard filters.
        let data = groupedData;

        if (filters) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            switch (filters.type) {
                case 'today':
                    data = data.filter(group => new Date(group.latestDate) >= todayStart);
                    break;
                case 'urgent':
                    data = data.filter(group => {
                        const isToday = new Date(group.latestDate) >= todayStart;
                        if (!isToday) return false;
                        const allInspections = [...group.incoming, ...group.inProcess, ...group.outgoing];
                        return allInspections.some(insp => insp.result === '불합격' || insp.result === '한도대기');
                    });
                    break;
                case 'defectType':
                    data = data.filter(group => {
                        const allInspections = [...group.incoming, ...group.inProcess, ...group.outgoing];
                        return allInspections.some(insp => 
                            insp.keywordPairs?.some(p => p.defect === filters.value) || 
                            insp.workers?.some(w => w.defectReasons?.includes(filters.value as DefectReason))
                        );
                    });
                    break;
                case 'worker':
                     data = data.filter(group => 
                        group.outgoing.some(insp => 
                            insp.workers?.some(w => w.name === filters.value && w.result === '불합격')
                        )
                    );
                    break;
                case 'reason':
                    data = data.filter(group => 
                        group.outgoing.some(insp => 
                            insp.workers?.some(w => w.defectReasons?.includes(filters.value as DefectReason))
                        )
                    );
                    break;
            }
        } else {
             // Apply local date filters only if no dashboard filter is active and no search term.
            data = data.filter(group => {
                const groupDate = group.latestDate.split('T')[0];
                return groupDate >= startDate && groupDate <= endDate;
            });
        }
        
        return data;
    }, [groupedData, searchTerm, filters, startDate, endDate, deepSearch]);
    
    const StatusBadge: React.FC<{ data: QualityInspection[] | null }> = ({ data }) => {
        if (!data || data.length === 0) {
            return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300">미등록</span>;
        }
        if (data.some(d => d.result === '불합격')) {
            return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">불합격</span>;
        }
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">완료</span>;
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div></div>;
    }

    const filterLabels: { [key: string]: string } = {
        today: '오늘 검사',
        urgent: '긴급 알림',
        defectType: '불량 유형',
        worker: '작업자',
        reason: '불합격 사유'
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <div className="p-4 border-b dark:border-slate-700">
                <div 
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setIsFilterPanelVisible(prev => !prev)}
                >
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">품질 관제센터</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400">모든 검사 현황을 통합하여 보여줍니다.</p>
                    </div>
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
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end animate-fade-in-down">
                        <div className="md:col-span-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">조회 기간</label>
                            <div className="flex flex-wrap items-center gap-2">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"/>
                                <span className="text-gray-500 dark:text-slate-400">~</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"/>
                                <div className="flex gap-1">
                                    <button onClick={() => { setStartDate(yesterday); setEndDate(yesterday); }} className="px-3 py-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-500 rounded-md text-sm font-medium">어제</button>
                                    <button onClick={() => { setStartDate(today); setEndDate(today); }} className="px-3 py-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-500 rounded-md text-sm font-medium">오늘</button>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-6">
                            <label htmlFor="report-search" className="block text-sm font-medium text-gray-700 dark:text-slate-300">통합 검색</label>
                             <input 
                                id="report-search"
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="전체 항목에서 검색..."
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                                lang="ko"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-transparent">.</label>
                             <button onClick={handleReset} className="w-full bg-gray-200 dark:bg-slate-600 px-4 py-2 rounded-md text-sm font-semibold">초기화</button>
                        </div>
                    </div>
                 )}
                 {filters && (
                    <div className="mt-3 bg-blue-100 dark:bg-blue-900/50 p-2 rounded-md flex items-center justify-between">
                        <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                            활성 필터: {filterLabels[filters.type] || filters.type}
                            {typeof filters.value === 'string' && `: "${filters.value}"`}
                        </span>
                        <button onClick={onClearFilters} className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 font-bold p-1 rounded-full text-lg leading-none flex items-center justify-center h-6 w-6">&times;</button>
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-auto">
                <table className="w-full min-w-max text-sm text-left text-gray-600 dark:text-slate-300">
                    <thead className="text-xs text-gray-700 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-700 sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">아이디</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">최근업데이트</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">발주번호</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">발주처</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">제품명</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">부속명</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">사출원료</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">사출색상</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">발주수량</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">사양</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">후공정</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap">작업라인</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap text-center">수입</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap text-center">공정</th>
                            <th scope="col" className="px-2 py-3 whitespace-nowrap text-center">출하</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                        {filteredData.map(group => (
                            <tr key={group.orderNumber} onClick={() => onSelectDetails(group)} className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer">
                                <td className="px-2 py-2 font-mono text-xs whitespace-nowrap">Q{group.common?.sequentialId || 'N/A'}</td>
                                <td className="px-2 py-2 text-xs whitespace-nowrap">{new Date(group.latestDate).toLocaleString('ko-KR')}</td>
                                <td className="px-2 py-2 font-mono text-xs whitespace-nowrap">{group.common?.orderNumber}</td>
                                <td className="px-2 py-2 text-xs whitespace-nowrap">{group.common?.supplier}</td>
                                <td className="px-2 py-2 font-semibold text-gray-800 dark:text-white whitespace-nowrap">{group.common?.productName}</td>
                                <td className="px-2 py-2 whitespace-nowrap">{group.common?.partName}</td>
                                <td className="px-2 py-2 whitespace-nowrap">{group.common?.injectionMaterial}</td>
                                <td className="px-2 py-2 whitespace-nowrap">{group.common?.injectionColor}</td>
                                <td className="px-2 py-2 text-right whitespace-nowrap">{group.common?.orderQuantity ? parseInt(group.common.orderQuantity, 10).toLocaleString('ko-KR') : ''}</td>
                                <td className="px-2 py-2 whitespace-nowrap">{group.common?.specification}</td>
                                <td className="px-2 py-2 whitespace-nowrap">{group.common?.postProcess}</td>
                                <td className="px-2 py-2 whitespace-nowrap">{group.common?.workLine}</td>
                                <td className="px-2 py-2 text-center whitespace-nowrap">
                                    <StatusBadge data={group.incoming} />
                                </td>
                                <td className="px-2 py-2 text-center whitespace-nowrap">
                                    <StatusBadge data={group.inProcess} />
                                </td>
                                <td className="px-2 py-2 text-center whitespace-nowrap">
                                    <StatusBadge data={group.outgoing} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredData.length === 0 && <p className="text-center p-8 text-gray-500">조건에 맞는 검사 데이터가 없습니다.</p>}
            </div>
            <div className="flex-shrink-0 p-3 text-sm text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-700 rounded-b-lg">
                총 {filteredData.length}개의 항목이 표시됩니다.
            </div>
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

export default ControlCenter;
