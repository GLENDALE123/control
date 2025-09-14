import React, { useMemo } from 'react';
import { JigRequest, Status } from '../types';

interface CompactMetricProps {
    label: string;
    value: number | string;
    colorClass?: string;
}

const CompactMetric: React.FC<CompactMetricProps> = ({ label, value, colorClass = 'text-primary-600 dark:text-primary-400' }) => (
    <div className="flex items-center space-x-1.5 text-xs sm:text-sm">
        <span className="text-gray-500 dark:text-slate-400">{label}:</span>
        <strong className={`font-bold ${colorClass}`}>{value}</strong>
    </div>
);

const DashboardMetrics: React.FC<{ requests: JigRequest[] }> = ({ requests }) => {
    const metrics = useMemo(() => {
        return {
            total: requests.length,
            pending: requests.filter(r => r.status === Status.Request).length,
            inProgress: requests.filter(r => r.status === Status.InProgress).length,
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
        <div className="flex items-center flex-wrap gap-x-3 sm:gap-x-4">
            <CompactMetric label="전체" value={metrics.total} colorClass="text-gray-700 dark:text-slate-200" />
            <CompactMetric label="대기" value={metrics.pending} colorClass="text-blue-600 dark:text-blue-400" />
            <CompactMetric label="진행" value={metrics.inProgress} colorClass="text-yellow-600 dark:text-yellow-400" />
            <CompactMetric label="이달 완료" value={metrics.completedThisMonth} colorClass="text-green-600 dark:text-green-400" />
        </div>
    );
};

export default DashboardMetrics;