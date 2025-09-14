

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { JigRequest, Status, MasterData } from '../types';
import { STATUS_FILTERS } from '../constants';
import JigRequestCard from './JigRequestCard';
import JigRequestTable from './JigRequestTable';
import JigRequestKanban from './JigRequestKanban';
import DashboardMetrics from './DashboardMetrics';

interface ManagementLedgerProps {
  requests: JigRequest[];
  onSelectRequest: (request: JigRequest) => void;
  theme: 'light' | 'dark';
  masterData: MasterData;
  onShowNewRequestForm: () => void;
}

const getStatusColorHex = (status: Status) => {
    switch(status) {
        case Status.Request: return '#3b82f6';
        case Status.InProgress: return '#f59e0b';
        case Status.Receiving: return '#06b6d4';
        case Status.Hold: return '#f97316';
        case Status.Completed: return '#22c55e';
        case Status.Rejected: return '#ef4444';
        default: return '#64748b';
    }
}

const ViewModeButton = ({ mode, currentView, setView, label, children }: { 
    mode: 'excel' | 'app' | 'kanban'; 
    currentView: string; 
    setView: (mode: 'excel' | 'app' | 'kanban') => void; 
    label: string; 
    children: React.ReactNode 
}) => (
    <button 
        onClick={() => setView(mode)} 
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${
            currentView === mode 
            ? 'bg-white dark:bg-slate-600 shadow text-gray-800 dark:text-white' 
            : 'text-gray-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`} 
        aria-label={`${label} 보기`}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

const ManagementLedger: React.FC<ManagementLedgerProps> = ({ requests, onSelectRequest, theme, masterData, onShowNewRequestForm }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'excel' | 'app' | 'kanban'>('excel');
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  
  const [selectedStatuses, setSelectedStatuses] = useState<Set<Status>>(new Set());
  const [selectedRequesters, setSelectedRequesters] = useState<Set<string>>(new Set());
  const [selectedDestinations, setSelectedDestinations] = useState<Set<string>>(new Set());
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());

  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);

  const requesters = useMemo(() => Array.from(new Set(masterData.requesters.map(r => r.name))), [masterData.requesters]);
  const destinations = useMemo(() => Array.from(new Set(masterData.destinations.map(d => d.name))), [masterData.destinations]);
  const months = useMemo(() => {
    const monthSet = new Set<string>();
    requests.forEach(request => {
      const date = new Date(request.requestDate);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      monthSet.add(`${year}-${month}`);
    });
    return Array.from(monthSet).sort().reverse();
  }, [requests]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterContainerRef.current && !filterContainerRef.current.contains(event.target as Node)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMultiSelectChange = (setter: React.Dispatch<React.SetStateAction<Set<any>>>, value: any) => {
    setter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return newSet;
    });
  };

  const filteredRequests = useMemo(() => {
    return requests
      .filter(request => selectedStatuses.size === 0 || selectedStatuses.has(request.status))
      .filter(request => selectedRequesters.size === 0 || selectedRequesters.has(request.requester))
      .filter(request => selectedDestinations.size === 0 || selectedDestinations.has(request.destination))
      .filter(request => {
        if (selectedMonths.size === 0) return true;
        const date = new Date(request.requestDate);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const requestMonth = `${year}-${month}`;
        return selectedMonths.has(requestMonth);
      })
      .filter(request => {
        const search = searchTerm.toLowerCase();
        if (!search) return true;

        return (
          request.id.toLowerCase().includes(search) ||
          request.requestType.toLowerCase().includes(search) ||
          request.requester.toLowerCase().includes(search) ||
          request.destination.toLowerCase().includes(search) ||
          request.deliveryDate.toLowerCase().includes(search) ||
          request.itemName.toLowerCase().includes(search) ||
          request.partName.toLowerCase().includes(search) ||
          request.itemNumber.toLowerCase().includes(search) ||
          request.jigHandleLength?.toString().includes(search) ||
          request.specification.toLowerCase().includes(search) ||
          request.quantity.toString().toLowerCase().includes(search) ||
          request.receivedQuantity.toString().toLowerCase().includes(search) ||
          request.remarks.toLowerCase().includes(search) ||
          request.status.toLowerCase().includes(search) ||
          new Date(request.requestDate).toLocaleString('ko-KR').toLowerCase().includes(search) ||
          request.history.some(h => h.user.toLowerCase().includes(search))
        );
      });
  }, [requests, searchTerm, selectedStatuses, selectedRequesters, selectedDestinations, selectedMonths]);

  const summaryData = useMemo(() => {
    const statsByStatus = STATUS_FILTERS.reduce((acc, status) => {
        acc[status] = { count: 0, totalQuantity: 0, totalReceived: 0 };
        return acc;
    }, {} as Record<Status, { count: number, totalQuantity: number, totalReceived: number }>);

    let grandTotalQuantity = 0;
    let grandTotalReceived = 0;

    filteredRequests.forEach(request => {
        if (statsByStatus[request.status]) {
            statsByStatus[request.status].count++;
            statsByStatus[request.status].totalQuantity += request.quantity;
            statsByStatus[request.status].totalReceived += request.receivedQuantity;
        }
        grandTotalQuantity += request.quantity;
        grandTotalReceived += request.receivedQuantity;
    });
    return { statsByStatus, grandTotalQuantity, grandTotalReceived };
  }, [filteredRequests]);

  const filterConfig = useMemo(() => ({
    '상태': { options: STATUS_FILTERS, selected: selectedStatuses, setter: setSelectedStatuses },
    '요청자': { options: requesters, selected: selectedRequesters, setter: setSelectedRequesters },
    '수신처': { options: destinations, selected: selectedDestinations, setter: setSelectedDestinations },
    '월별': { options: months, selected: selectedMonths, setter: setSelectedMonths }
  }), [requesters, destinations, months, selectedStatuses, selectedRequesters, selectedDestinations, selectedMonths]);

  const openFilterData = openFilter ? filterConfig[openFilter as keyof typeof filterConfig] : null;

  const FilterButton = ({ name, selected, isActive }: { name: string; selected: Set<string>; isActive: boolean; }) => (
    <button
      onClick={() => setOpenFilter(openFilter === name ? null : name)}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center ${
        isActive ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600'
      }`}
    >
      {name} {selected.size > 0 && <span className={`ml-1.5 text-xs rounded-full h-5 w-5 flex items-center justify-center ${isActive ? 'bg-white text-primary-600' : 'bg-primary-600 text-white'}`}>{selected.size}</span>}
      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 text-gray-500 dark:text-slate-400 transition-transform ${isActive ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </button>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-shrink-0">
          <div className="flex flex-wrap justify-between items-center mb-2 px-1 gap-2">
              <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200">필터 및 보기 설정</h3>
                  <button
                    onClick={() => setIsFilterVisible(!isFilterVisible)}
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"
                    aria-label={isFilterVisible ? '필터 숨기기' : '필터 보기'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 dark:text-slate-400 transition-transform duration-300 ${isFilterVisible ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
              </div>
              <div className="flex items-center gap-4">
                  <DashboardMetrics requests={requests} />
                  <button
                      onClick={onShowNewRequestForm}
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 shadow text-sm"
                  >
                      신규 요청
                  </button>
              </div>
          </div>

          {isFilterVisible && (
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm animate-fade-in-down" ref={filterContainerRef}>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                      <div className="lg:col-span-1">
                      <input
                          type="text"
                          placeholder="검색..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-700"
                          lang="ko"
                      />
                      </div>
                      <div className="lg:col-span-2 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-2">
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          <FilterButton name="상태" selected={selectedStatuses} isActive={openFilter === '상태'} />
                          <FilterButton name="요청자" selected={selectedRequesters} isActive={openFilter === '요청자'} />
                          <FilterButton name="수신처" selected={selectedDestinations} isActive={openFilter === '수신처'} />
                          <FilterButton name="월별" selected={selectedMonths} isActive={openFilter === '월별'} />
                      </div>
                      <div className="flex-shrink-0 flex items-center space-x-1 bg-gray-200 dark:bg-slate-700 p-1 rounded-lg">
                          <ViewModeButton mode="kanban" currentView={viewMode} setView={setViewMode} label="상태별">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm4 2v10h4V6H6zm6 0v4h4V6h-4zm0 6v4h4v-4h-4z" /></svg>
                          </ViewModeButton>
                          <ViewModeButton mode="excel" currentView={viewMode} setView={setViewMode} label="리스트">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                          </ViewModeButton>
                          <ViewModeButton mode="app" currentView={viewMode} setView={setViewMode} label="카드형">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                          </ViewModeButton>
                      </div>
                      </div>
                  </div>
                  {openFilter && openFilterData && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 animate-fade-in-down">
                          <div className="flex justify-between items-center mb-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-200">{openFilter} 필터 선택</h4>
                              <button
                                  onClick={() => openFilterData.setter(new Set())}
                                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                              >
                                  선택 초기화
                              </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                          {openFilterData.options.map(option => (
                              <label key={option} className={`cursor-pointer px-3 py-1.5 text-sm rounded-full transition-colors ${
                                  openFilterData.selected.has(option)
                                      ? 'bg-primary-600 text-white'
                                      : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600'
                                  }`}>
                                  <input
                                  type="checkbox"
                                  checked={openFilterData.selected.has(option)}
                                  onChange={() => handleMultiSelectChange(openFilterData.setter, option)}
                                  className="sr-only"
                                  />
                                  <span>{option}</span>
                              </label>
                          ))}
                          </div>
                      </div>
                  )}
              </div>
          )}
        </div>
        
        <div className="flex-shrink-0 my-4">
          <div className="flex items-center space-x-3 overflow-x-auto scrollbar-hide pb-2 -m-2 p-2">
            <div className="flex-shrink-0 flex items-center space-x-2.5 bg-slate-100 dark:bg-slate-900/50 px-3 py-1.5 rounded-full text-sm font-medium border border-slate-200 dark:border-slate-700">
              <span className="text-gray-600 dark:text-slate-300">
                총 <strong className="text-primary-600 dark:text-primary-400">{filteredRequests.length.toLocaleString()}</strong> 건
              </span>
              <span className="text-gray-300 dark:text-slate-600">|</span>
              <span className="text-gray-500 dark:text-slate-400">
                발주: <span className="font-semibold text-gray-700 dark:text-slate-200">{summaryData.grandTotalQuantity.toLocaleString()}</span>
              </span>
              <span className="text-gray-300 dark:text-slate-600">/</span>
              <span className="text-gray-500 dark:text-slate-400">
                입고: <span className="font-semibold text-gray-700 dark:text-slate-200">{summaryData.grandTotalReceived.toLocaleString()}</span>
              </span>
            </div>
            
            {filteredRequests.length > 0 && STATUS_FILTERS.map(status => {
              const stats = summaryData.statsByStatus[status];
              if (stats.count === 0) return null;
              return (
                <div key={status} className="flex-shrink-0 flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm text-xs border dark:border-slate-700">
                  <span className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: getStatusColorHex(status) }}></span>
                  <span className="font-semibold text-gray-700 dark:text-slate-200">{status}</span>
                  <span className="font-medium text-gray-600 dark:text-slate-300">{stats.count.toLocaleString()}건</span>
                  <span className="text-gray-400 dark:text-slate-500 hidden sm:inline">({stats.totalQuantity}/{stats.totalReceived})</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {filteredRequests.length > 0 ? (
              <>
                {viewMode === 'app' && (
                  <div className="h-full overflow-y-auto md:pr-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredRequests.map(request => (
                        <JigRequestCard key={request.id} request={request} onSelect={onSelectRequest} />
                    ))}
                    </div>
                  </div>
                )}
                {viewMode === 'excel' && (
                  <div className="h-full">
                    <JigRequestTable requests={filteredRequests} onSelectRequest={onSelectRequest} />
                  </div>
                )}
                {viewMode === 'kanban' && (
                  <div className="h-full">
                    <JigRequestKanban requests={filteredRequests} onSelectRequest={onSelectRequest} />
                  </div>
                )}
              </>
          ) : (
            <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <p className="text-gray-500 dark:text-slate-400">조건에 맞는 요청이 없습니다.</p>
            </div>
          )}
        </div>
      <style>{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ManagementLedger;