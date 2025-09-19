import React, { useState, useMemo, useEffect } from 'react';
import { SampleRequest, UserProfile, SampleStatus } from '../types';
import { SAMPLE_STATUS_COLORS, SAMPLE_STATUS_FILTERS } from '../constants';
import SampleRequestCard from './SampleRequestCard';
import SampleRequestTable from './SampleRequestTable';

// --- Reusable Components for Dashboard ---

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; onClick?: () => void; className?: string }> = ({ title, value, icon, onClick, className }) => (
    <div 
        onClick={onClick} 
        className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md flex items-center transition-all hover:shadow-lg hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
        <div className="flex-shrink-0">{icon}</div>
        <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400 truncate">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    </div>
);

const DashboardSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md flex flex-col ${className}`}>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex-shrink-0">{title}</h3>
        <div className="flex-1 overflow-auto scrollbar-hide">
            {children}
        </div>
    </div>
);

const SimpleBarChart: React.FC<{ data: { label: string; value: number }[]; colorClass: string }> = ({ data, colorClass }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="space-y-2">
            {data.map(item => (
                <div key={item.label} className="flex items-center text-sm">
                    <div className="w-1/3 truncate pr-2 text-gray-600 dark:text-slate-300">{item.label}</div>
                    <div className="w-2/3 flex items-center">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                            <div
                                className={`${colorClass} h-4 rounded-full`}
                                style={{ width: `${(item.value / maxValue) * 100}%` }}
                            />
                        </div>
                        <span className="ml-2 font-semibold text-gray-800 dark:text-white">{item.value}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const COATING_METHODS = ['증착', '컬러코팅', '무광코팅', '클리어코팅', '내부코팅'];

const StatusBoard: React.FC<{ sampleRequests: SampleRequest[], onCellClick: (status: SampleStatus, coatingMethod: string) => void }> = ({ sampleRequests, onCellClick }) => {
    const statusCounts = useMemo(() => {
        const counts = new Map<string, number>(); // key: "coatingMethod-status"
        sampleRequests.forEach(req => {
            const uniqueMethods = new Set(req.items.map(item => item.coatingMethod));
            uniqueMethods.forEach(method => {
                if(COATING_METHODS.includes(method as string)) {
                    const key = `${method}-${req.status}`;
                    counts.set(key, (counts.get(key) || 0) + 1);
                }
            });
        });
        return counts;
    }, [sampleRequests]);

    return (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">실시간 샘플 현황 보드</h3>
            <div className="overflow-x-auto">
                <table className="w-full min-w-max text-center border-collapse">
                    <thead>
                        <tr className="bg-slate-100 dark:bg-slate-700/50">
                            <th className="p-2 border border-slate-200 dark:border-slate-700">코팅/증착 방식</th>
                            {SAMPLE_STATUS_FILTERS.map(status => (
                                <th key={status} className="p-2 border border-slate-200 dark:border-slate-700 text-sm font-medium">{status}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {COATING_METHODS.map(method => (
                            <tr key={method}>
                                <td className="p-2 border border-slate-200 dark:border-slate-700 font-semibold">{method}</td>
                                {SAMPLE_STATUS_FILTERS.map(status => {
                                    const count = statusCounts.get(`${method}-${status}`) || 0;
                                    return (
                                        <td key={status} 
                                            className={`p-2 border border-slate-200 dark:border-slate-700 ${count > 0 ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700' : 'text-slate-400'}`}
                                            onClick={() => count > 0 && onCellClick(status, method)}
                                        >
                                            <span className={`font-bold text-lg ${count > 0 ? 'text-primary-600 dark:text-primary-400' : ''}`}>
                                                {count}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// --- Dashboard Component ---

const SampleDashboard: React.FC<{
    sampleRequests: SampleRequest[];
    kpiData: { total: number; received: number; inProgress: number; completedThisMonth: number; };
    kpiIcons: { [key: string]: React.ReactNode; };
    onSelectRequest: (request: SampleRequest) => void;
    onQuickFilter: (status: SampleStatus, coatingMethod: string) => void;
}> = ({ sampleRequests, kpiData, kpiIcons, onSelectRequest, onQuickFilter }) => {

    const chartData = useMemo(() => {
        const clientCounts = new Map<string, number>();
        const requesterCounts = new Map<string, number>();
        const coatingCounts = new Map<string, number>();

        sampleRequests.forEach(req => {
            clientCounts.set(req.clientName, (clientCounts.get(req.clientName) || 0) + 1);
            requesterCounts.set(req.requesterInfo.displayName, (requesterCounts.get(req.requesterInfo.displayName) || 0) + 1);
            req.items.forEach(item => {
                if (item.coatingMethod) {
                    coatingCounts.set(item.coatingMethod, (coatingCounts.get(item.coatingMethod) || 0) + 1);
                }
            });
        });

        const sortAndSlice = (map: Map<string, number>) => Array.from(map.entries())
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        return {
            clients: sortAndSlice(clientCounts),
            requesters: sortAndSlice(requesterCounts),
            coatings: sortAndSlice(coatingCounts),
        };
    }, [sampleRequests]);
    
    const recentRequests = useMemo(() => {
      return [...sampleRequests].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
    }, [sampleRequests])
    
    return (
        <div className="h-full overflow-y-auto space-y-4 p-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="총 요청" value={kpiData.total} icon={kpiIcons.total} />
                <KpiCard title="신규 접수" value={kpiData.received} icon={kpiIcons.received} />
                <KpiCard title="진행중" value={kpiData.inProgress} icon={kpiIcons.inProgress} />
                <KpiCard title="이달 완료" value={kpiData.completedThisMonth} icon={kpiIcons.completed} />
            </div>

            <StatusBoard sampleRequests={sampleRequests} onCellClick={onQuickFilter} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <DashboardSection title="최근 요청 5건" className="lg:col-span-2">
                    <div className="space-y-2">
                        {recentRequests.map(req => (
                            <div key={req.id} onClick={() => onSelectRequest(req)} className="p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer">
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold text-gray-800 dark:text-white truncate">{req.productName} ({req.clientName})</p>
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${SAMPLE_STATUS_COLORS[req.status]}`}>{req.status}</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{new Date(req.createdAt).toLocaleDateString('ko-KR')} by {req.requesterInfo.displayName}</p>
                            </div>
                        ))}
                    </div>
                </DashboardSection>
                <DashboardSection title="고객사별 요청 Top 5">
                    <SimpleBarChart data={chartData.clients} colorClass="bg-blue-500" />
                </DashboardSection>
                <DashboardSection title="요청 담당자별 Top 5">
                    <SimpleBarChart data={chartData.requesters} colorClass="bg-green-500" />
                </DashboardSection>
                <DashboardSection title="코팅/증착 방식별 Top 5" className="lg:col-span-2">
                    <SimpleBarChart data={chartData.coatings} colorClass="bg-purple-500" />
                </DashboardSection>
            </div>
        </div>
    );
};


// --- Main Component ---

interface SampleCenterProps {
    addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
    currentUserProfile: UserProfile | null;
    sampleRequests: SampleRequest[];
    onOpenNewRequest: () => void;
    onSelectRequest: (request: SampleRequest) => void;
}

const SampleCenter: React.FC<SampleCenterProps> = ({ addToast, currentUserProfile, sampleRequests, onOpenNewRequest, onSelectRequest }) => {
    const [activeView, setActiveView] = useState<'dashboard' | 'list'>('dashboard');
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState<Set<SampleStatus>>(new Set());
    const [selectedCoatingMethods, setSelectedCoatingMethods] = useState<Set<string>>(new Set());
    const [quickFilters, setQuickFilters] = useState<{ status: SampleStatus; coatingMethod: string } | null>(null);

    const handleQuickFilter = (status: SampleStatus, coatingMethod: string) => {
        setQuickFilters({ status, coatingMethod });
        setActiveView('list');
    };

    useEffect(() => {
        if (activeView === 'list' && quickFilters) {
            setSelectedStatuses(new Set([quickFilters.status]));
            setSelectedCoatingMethods(new Set([quickFilters.coatingMethod]));
            setSearchTerm('');
            setQuickFilters(null); // Reset after applying
        }
    }, [activeView, quickFilters]);


    const filteredRequests = useMemo(() => {
        return sampleRequests
            .filter(req => selectedStatuses.size === 0 || selectedStatuses.has(req.status))
            .filter(req => {
                if (selectedCoatingMethods.size === 0) return true;
                return req.items.some(item => selectedCoatingMethods.has(item.coatingMethod));
            })
            .filter(req => {
                const search = searchTerm.toLowerCase();
                if (!search) return true;
                return (
                    req.id.toLowerCase().includes(search) ||
                    req.clientName.toLowerCase().includes(search) ||
                    req.productName.toLowerCase().includes(search) ||
                    (req.items || []).some(item => 
                        item.partName.toLowerCase().includes(search) ||
                        item.colorSpec.toLowerCase().includes(search)
                    )
                );
            });
    }, [sampleRequests, searchTerm, selectedStatuses, selectedCoatingMethods]);

    const kpiData = useMemo(() => {
        const total = sampleRequests.length;
        const received = sampleRequests.filter(r => r.status === SampleStatus.Received).length;
        const inProgress = sampleRequests.filter(r => r.status === SampleStatus.InProgress).length;
        const completedThisMonth = sampleRequests.filter(r => {
            if (r.status !== SampleStatus.Completed) return false;
            const completedAction = r.history.find(h => h.status === SampleStatus.Completed);
            if (!completedAction) return false;
            const completedDate = new Date(completedAction.date);
            const today = new Date();
            return completedDate.getMonth() === today.getMonth() && completedDate.getFullYear() === today.getFullYear();
        }).length;

        return { total, received, inProgress, completedThisMonth };
    }, [sampleRequests]);

    const kpiIcons = {
        total: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
        received: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        inProgress: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9h5V4M20 15h-5v5" /></svg>,
        completed: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    };
    
    const TabButton: React.FC<{ tab: 'dashboard' | 'list', label: string, icon: React.ReactNode }> = ({ tab, label, icon }) => (
        <button
            onClick={() => setActiveView(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeView === tab 
                ? 'bg-primary-600 text-white' 
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    const resetFilters = () => {
        setSelectedStatuses(new Set());
        setSelectedCoatingMethods(new Set());
        setSearchTerm('');
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">샘플 센터</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">샘플 요청 현황을 확인하고 관리합니다.</p>
                </div>
                <button
                    onClick={onOpenNewRequest}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 shadow flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    신규 요청
                </button>
            </header>

            <nav className="flex-shrink-0 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2">
                    <TabButton tab="dashboard" label="대시보드" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.95a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707zm-2.12-10.607a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" /></svg>} />
                    <TabButton tab="list" label="요청 목록" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>} />
                </div>
            </nav>

            <div className="flex-1 overflow-hidden">
                {activeView === 'dashboard' ? (
                    <SampleDashboard sampleRequests={sampleRequests} kpiData={kpiData} kpiIcons={kpiIcons} onSelectRequest={onSelectRequest} onQuickFilter={handleQuickFilter} />
                ) : (
                    <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                        <div className="p-4 border-b dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="w-full sm:w-72">
                                <input
                                    type="text"
                                    placeholder="ID, 고객사, 제품명 등으로 검색..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    lang="ko"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-700"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                {(selectedStatuses.size > 0 || selectedCoatingMethods.size > 0) && (
                                <button onClick={resetFilters} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                                    필터 초기화
                                </button>
                                )}
                                <div className="flex items-center gap-1 bg-gray-200 dark:bg-slate-700 p-1 rounded-lg">
                                    <button onClick={() => setViewMode('card')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'card' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                        <span className="hidden sm:inline">카드형</span>
                                    </button>
                                    <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                        <span className="hidden sm:inline">리스트형</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {filteredRequests.length > 0 ? (
                                viewMode === 'card' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {filteredRequests.map(req => <SampleRequestCard key={req.id} request={req} onSelect={() => onSelectRequest(req)} />)}
                                    </div>
                                ) : (
                                    <SampleRequestTable requests={filteredRequests} onSelectRequest={onSelectRequest} />
                                )
                            ) : (
                                <p className="text-center text-gray-500 dark:text-slate-400 py-10">
                                {sampleRequests.length === 0 ? "등록된 샘플 요청이 없습니다." : "조건에 맞는 요청이 없습니다."}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SampleCenter;
