import React, { useMemo } from 'react';
import { JigRequest, Notification, Status } from '../types';
import { STATUS_COLORS, STATUS_FILTERS } from '../constants';

const timeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "년 전";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "달 전";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "일 전";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "시간 전";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "분 전";
    return "방금 전";
};

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

interface DashboardProps {
  requests: JigRequest[];
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onSelectRequest: (request: JigRequest) => void;
}

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode, color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-5 flex items-center space-x-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
        </div>
    </div>
);

const StatusBarChart: React.FC<{ requests: JigRequest[] }> = ({ requests }) => {
    const statusCounts = useMemo(() => {
        const counts = new Map<Status, number>();
        requests.forEach(req => {
            counts.set(req.status, (counts.get(req.status) || 0) + 1);
        });
        return Array.from(counts.entries())
            .map(([status, count]) => ({ status, count }))
            .sort((a, b) => STATUS_FILTERS.indexOf(a.status) - STATUS_FILTERS.indexOf(b.status));
    }, [requests]);

    const total = requests.length;

    if (total === 0) {
        return <p className="text-center text-gray-500 dark:text-slate-400 py-4">데이터가 없습니다.</p>;
    }

    return (
        <div>
            <div className="w-full flex rounded-md h-6 overflow-hidden bg-gray-200 dark:bg-slate-700">
                {statusCounts.map(({ status, count }) => (
                    <div
                        key={status}
                        className="h-full"
                        style={{
                            width: `${(count / total) * 100}%`,
                            backgroundColor: getStatusColorHex(status),
                        }}
                        title={`${status}: ${count}건`}
                    />
                ))}
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-xs">
                {statusCounts.map(({ status, count }) => (
                    <div key={status} className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getStatusColorHex(status) }}></span>
                        <span className="text-gray-600 dark:text-slate-300">{status}</span>
                        <span className="font-semibold text-gray-700 dark:text-slate-200">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const RecentRequestsTable: React.FC<{ requests: JigRequest[]; onSelectRequest: (request: JigRequest) => void }> = ({ requests, onSelectRequest }) => {
    const recentRequests = useMemo(() => requests.slice(0, 5), [requests]);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="text-left text-gray-500 dark:text-slate-400">
                    <tr>
                        <th className="p-2 font-medium">제품명</th>
                        <th className="p-2 font-medium">요청자</th>
                        <th className="p-2 font-medium">상태</th>
                        <th className="p-2 font-medium text-right">요청일</th>
                    </tr>
                </thead>
                <tbody>
                    {recentRequests.map(req => (
                        <tr key={req.id} onClick={() => onSelectRequest(req)} className="border-t dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer">
                            <td className="p-2 font-semibold text-gray-800 dark:text-slate-100">{req.itemName}</td>
                            <td className="p-2 text-gray-600 dark:text-slate-300">{req.requester}</td>
                            <td className="p-2">
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[req.status]}`}>{req.status}</span>
                            </td>
                            <td className="p-2 text-gray-500 dark:text-slate-400 text-right">{new Date(req.requestDate).toLocaleDateString('ko-KR')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const RecentNotifications: React.FC<{ notifications: Notification[], onNotificationClick: (notification: Notification) => void }> = ({ notifications, onNotificationClick }) => {
    const unreadNotifications = useMemo(() => notifications.filter(n => !n.read), [notifications]);

    return (
        <div className="space-y-2">
            {unreadNotifications.slice(0, 10).map(notif => (
                <div key={notif.id} onClick={() => onNotificationClick(notif)} className="flex items-start gap-3 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                    <div className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-primary-500" />
                    <div className="flex-1">
                        <p className="text-sm text-gray-700 dark:text-slate-200 leading-snug">{notif.message}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{timeAgo(notif.date)}</p>
                    </div>
                </div>
            ))}
            {unreadNotifications.length === 0 && <p className="text-sm text-center text-gray-500 dark:text-slate-400 py-4">새 알림이 없습니다.</p>}
        </div>
    );
};

const VendorSummary: React.FC<{ requests: JigRequest[] }> = ({ requests }) => {
    const vendorData = useMemo(() => {
        const data = new Map<string, {
            statusCounts: Map<Status, number>;
            totalQuantity: number;
            totalReceived: number;
            totalCost: number;
        }>();

        requests.forEach(req => {
            if (!req.destination) return;
            if (!data.has(req.destination)) {
                data.set(req.destination, {
                    statusCounts: new Map(),
                    totalQuantity: 0,
                    totalReceived: 0,
                    totalCost: 0,
                });
            }
            const vendor = data.get(req.destination)!;
            vendor.statusCounts.set(req.status, (vendor.statusCounts.get(req.status) || 0) + 1);
            vendor.totalQuantity += req.quantity;
            vendor.totalReceived += req.receivedQuantity;

            if (![Status.Rejected, Status.Hold].includes(req.status)) {
                const coreCost = req.coreCost ?? 0;
                const unitPrice = req.unitPrice ?? 0;
                let amount = 0;
                 if (req.status === Status.Completed) {
                    amount = (req.quantity * unitPrice) + coreCost;
                } else {
                    amount = (req.receivedQuantity * unitPrice);
                }
                vendor.totalCost += amount;
            }
        });

        return Array.from(data.entries()).map(([name, values]) => ({
            name,
            ...values,
            statusCounts: Array.from(values.statusCounts.entries())
                             .sort(([statusA], [statusB]) => STATUS_FILTERS.indexOf(statusA) - STATUS_FILTERS.indexOf(statusB))
        })).sort((a,b) => b.totalCost - a.totalCost);
    }, [requests]);

    if (vendorData.length === 0) {
        return <p className="text-center text-gray-500 dark:text-slate-400 py-4">진행 중인 업체 데이터가 없습니다.</p>;
    }

    return (
        <div className="space-y-4">
            {vendorData.map(vendor => {
                const progress = vendor.totalQuantity > 0 ? (vendor.totalReceived / vendor.totalQuantity) * 100 : 0;
                return (
                    <div key={vendor.name} className="border dark:border-slate-700 rounded-lg p-3 space-y-2 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 dark:text-white text-sm">{vendor.name}</h3>
                            <span className="font-bold text-sm text-primary-600 dark:text-primary-400">{vendor.totalCost.toLocaleString()} 원</span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-slate-400">
                                <span>입고 진행률</span>
                                <span>{vendor.totalReceived.toLocaleString()} / {vendor.totalQuantity.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            {vendor.statusCounts.map(([status, count]) => (
                                <div key={status} className="flex items-center space-x-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColorHex(status) }}></span>
                                    <span className="text-gray-600 dark:text-slate-300">{status}</span>
                                    <span className="font-semibold text-gray-700 dark:text-slate-200">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ requests, notifications, onNotificationClick, onSelectRequest }) => {
     const kpiData = useMemo(() => {
        return {
            total: requests.length,
            pending: requests.filter(r => r.status === Status.Request).length,
            inProgress: requests.filter(r => [Status.InProgress, Status.Receiving].includes(r.status)).length,
            completedThisMonth: requests.filter(r => {
                if (r.status !== Status.Completed) return false;
                const completedAction = r.history.find(h => h.status === Status.Completed);
                if (!completedAction) return false;
                const completedDate = new Date(completedAction.date);
                const today = new Date();
                return completedDate.getMonth() === today.getMonth() && completedDate.getFullYear() === today.getFullYear();
            }).length,
        };
    }, [requests]);

    return (
         <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50 dark:bg-slate-900/50">
            <header className="flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">대시보드</h1>
                <p className="text-gray-500 dark:text-slate-400 mt-1">지그 요청 현황을 요약하여 보여줍니다.</p>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
                <KpiCard title="총 요청" value={kpiData.total} color="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} />
                <KpiCard title="신규 요청" value={kpiData.pending} color="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-300" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <KpiCard title="진행중" value={kpiData.inProgress} color="bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-300" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9h5V4M20 15h-5v5" /></svg>} />
                <KpiCard title="이달 완료" value={kpiData.completedThisMonth} color="bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 flex flex-col overflow-hidden">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex-shrink-0">최근 요청 5건</h2>
                    <div className="flex-1 overflow-y-auto -mx-4 px-4">
                        <RecentRequestsTable requests={requests} onSelectRequest={onSelectRequest} />
                    </div>
                </div>

                <div className="flex flex-col gap-4 overflow-hidden">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 flex-shrink-0">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">상태별 요청 현황</h2>
                        <StatusBarChart requests={requests} />
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 flex-1 flex flex-col overflow-hidden">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex-shrink-0">업체별 현황 요약</h2>
                        <div className="flex-1 overflow-y-auto -mx-2 px-2 scrollbar-hide">
                             <VendorSummary requests={requests} />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 sm:p-6 flex-col overflow-hidden hidden xl:flex">
                     <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex-shrink-0">최근 알림</h2>
                     <div className="flex-1 overflow-y-auto -mx-2 px-2 scrollbar-hide">
                        <RecentNotifications notifications={notifications} onNotificationClick={onNotificationClick} />
                     </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;