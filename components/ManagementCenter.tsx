import React, { useMemo, FC } from 'react';
import { QualityInspection, SampleRequest, PackagingReport, SampleStatus, DefectReason } from '../types';

interface ManagementCenterProps {
    qualityInspections: QualityInspection[];
    sampleRequests: SampleRequest[];
    packagingReports: PackagingReport[];
    addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

const KpiCard: FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md flex items-start">
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg">
            {icon}
        </div>
        <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400 truncate">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    </div>
);

const DashboardSection: FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md flex flex-col ${className}`}>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex-shrink-0">{title}</h3>
        <div className="flex-1 overflow-auto scrollbar-hide">
            {children}
        </div>
    </div>
);

const HorizontalBarChart: FC<{ data: { label: string, value: number }[], color: string }> = ({ data, color }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);
    if (data.length === 0) {
        return <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">데이터 없음</p>;
    }
    return (
        <div className="space-y-3">
            {data.map(({ label, value }) => (
                <div key={label} className="flex items-center text-sm">
                    <div className="w-2/5 truncate pr-2 text-gray-600 dark:text-slate-300" title={label}>{label}</div>
                    <div className="w-3/5 flex items-center">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 relative">
                            <div className={`h-4 rounded-full ${color}`} style={{ width: `${maxValue > 0 ? (value / maxValue) * 100 : 0}%` }} />
                        </div>
                        <span className="ml-2 font-semibold text-gray-800 dark:text-white">{value}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const LineChart: FC<{ data: { date: string, good: number, defect: number }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.flatMap(d => [d.good, d.defect]), 1);
    const width = 300, height = 150;

    const toPath = (points: {x: number, y: number}[]) => {
        if (points.length === 0) return "";
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    };

    const goodPoints = data.map((d, i) => ({ x: (i / (data.length - 1 || 1)) * width, y: height - (d.good / maxValue) * height }));
    const defectPoints = data.map((d, i) => ({ x: (i / (data.length - 1 || 1)) * width, y: height - (d.defect / maxValue) * height }));

    return (
        <div className="w-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                <path d={toPath(goodPoints)} stroke="#22c55e" fill="none" strokeWidth="2" />
                <path d={toPath(defectPoints)} stroke="#ef4444" fill="none" strokeWidth="2" />
                {goodPoints.map((p, i) => <circle key={`g-${i}`} cx={p.x} cy={p.y} r="3" fill="#22c55e" />)}
                {defectPoints.map((p, i) => <circle key={`d-${i}`} cx={p.x} cy={p.y} r="3" fill="#ef4444" />)}
            </svg>
             <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>{data[0]?.date.substring(5)}</span>
                <span>{data[Math.floor(data.length / 2)]?.date.substring(5)}</span>
                <span>{data[data.length - 1]?.date.substring(5)}</span>
            </div>
            <div className="flex justify-center gap-4 text-xs mt-2">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div>양품</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div>불량</div>
            </div>
        </div>
    );
};


const ManagementCenter: FC<ManagementCenterProps> = ({ qualityInspections, sampleRequests, packagingReports, addToast }) => {

    const kpiData = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const reportsToday = packagingReports.filter(r => r.workDate === today);
        const totalProduction = reportsToday.reduce((sum, r) => sum + (r.goodQuantity || 0), 0);
        const totalGoal = reportsToday.reduce((sum, r) => sum + (r.inputQuantity || 0), 0);
        const achievementRate = totalGoal > 0 ? ((totalProduction / totalGoal) * 100).toFixed(0) : '0';

        const qualityIssues24h = qualityInspections.filter(i => new Date(i.createdAt) > twentyFourHoursAgo && i.result === '불합격').length;
        
        const delayedSamples = sampleRequests.filter(s => s.status !== SampleStatus.Completed && new Date(s.dueDate) < new Date()).length;

        return {
            achievementRate: `${achievementRate}%`,
            qualityIssues24h,
            delayedSamples,
            totalProduction: totalProduction.toLocaleString(),
        };
    }, [qualityInspections, sampleRequests, packagingReports]);

    const productionTrendData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const dataByDate = new Map<string, { good: number, defect: number }>();
        last7Days.forEach(date => dataByDate.set(date, { good: 0, defect: 0 }));

        packagingReports.forEach(r => {
            if (dataByDate.has(r.workDate)) {
                const dayData = dataByDate.get(r.workDate)!;
                dayData.good += r.goodQuantity || 0;
                dayData.defect += r.defectQuantity || 0;
            }
        });

        return Array.from(dataByDate.entries()).map(([date, values]) => ({ date, ...values }));
    }, [packagingReports]);
    
    const realtimeProductionData = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const reportsToday = packagingReports.filter(r => r.workDate === today);
        const byLine = new Map<string, { products: Set<string>, goal: number, actual: number }>();

        reportsToday.forEach(r => {
            if (!byLine.has(r.productionLine)) {
                byLine.set(r.productionLine, { products: new Set(), goal: 0, actual: 0 });
            }
            const lineData = byLine.get(r.productionLine)!;
            lineData.products.add(r.productName);
            lineData.goal += r.inputQuantity || 0;
            lineData.actual += r.goodQuantity || 0;
        });

        return Array.from(byLine.entries()).map(([line, data]) => ({
            line,
            product: Array.from(data.products).join(', '),
            goal: data.goal,
            actual: data.actual,
            rate: data.goal > 0 ? (data.actual / data.goal * 100).toFixed(0) + '%' : '0%',
            status: '가동중'
        }));
    }, [packagingReports]);
    
    const top5DefectReasons = useMemo(() => {
        const reasonCounts = new Map<string, number>();
        qualityInspections.forEach(i => {
            i.keywordPairs?.forEach(p => {
                if (p.defect) reasonCounts.set(p.defect, (reasonCounts.get(p.defect) || 0) + 1);
            });
            i.workers?.forEach(w => {
                w.defectReasons?.forEach(reason => {
                    reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
                });
            });
        });
        return [...reasonCounts.entries()]
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [qualityInspections]);

    const delayedSampleList = useMemo(() => {
        return sampleRequests
            .filter(s => s.status !== SampleStatus.Completed && new Date(s.dueDate) < new Date())
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [sampleRequests]);

    return (
        <div className="h-full overflow-y-auto p-1 space-y-4 bg-slate-50 dark:bg-slate-900/50">
            <header>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">종합관리센터</h1>
                <p className="text-gray-500 dark:text-slate-400 mt-1">공장 운영의 핵심 지표를 한 눈에 파악합니다.</p>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="금일 목표 달성률" value={kpiData.achievementRate} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
                <KpiCard title="24시간 내 품질 이슈" value={kpiData.qualityIssues24h + ' 건'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
                <KpiCard title="납기 지연 샘플" value={kpiData.delayedSamples + ' 건'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <KpiCard title="금일 총 생산량" value={kpiData.totalProduction + ' EA'} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} />
            </section>
            
            <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-10 gap-4">
                <div className="xl:col-span-6 space-y-4">
                    <DashboardSection title="생산량 추이 (최근 7일)">
                        <LineChart data={productionTrendData} />
                    </DashboardSection>
                    <DashboardSection title="라인별 실시간 생산 현황">
                        <table className="w-full text-sm">
                            <thead><tr className="text-left text-slate-500 dark:text-slate-400"><th className="p-2">라인</th><th className="p-2">생산 제품</th><th className="p-2">목표</th><th className="p-2">실적</th><th className="p-2">달성률</th></tr></thead>
                            <tbody>
                                {realtimeProductionData.map(d => (
                                <tr key={d.line} className="border-t dark:border-slate-700">
                                    <td className="p-2 font-semibold">{d.line}</td><td className="p-2">{d.product}</td><td className="p-2">{d.goal.toLocaleString()}</td><td className="p-2">{d.actual.toLocaleString()}</td><td className="p-2 font-bold">{d.rate}</td>
                                </tr>))}
                                {realtimeProductionData.length === 0 && <tr><td colSpan={5} className="text-center p-4 text-slate-500">금일 생산 데이터 없음</td></tr>}
                            </tbody>
                        </table>
                    </DashboardSection>
                </div>

                <div className="xl:col-span-4 space-y-4">
                    <DashboardSection title="주요 불량 원인 Top 5">
                        <HorizontalBarChart data={top5DefectReasons} color="bg-red-500" />
                    </DashboardSection>
                    <DashboardSection title="납기 지연 샘플 목록">
                        <table className="w-full text-sm">
                            <thead><tr className="text-left text-slate-500 dark:text-slate-400"><th className="p-2">고객사</th><th className="p-2">제품명</th><th className="p-2">납기일</th></tr></thead>
                            <tbody>
                                {delayedSampleList.slice(0, 5).map(s => (
                                <tr key={s.id} className="border-t dark:border-slate-700">
                                    <td className="p-2 font-semibold">{s.clientName}</td><td className="p-2">{s.productName}</td><td className="p-2 text-red-500">{s.dueDate}</td>
                                </tr>))}
                                {delayedSampleList.length === 0 && <tr><td colSpan={3} className="text-center p-4 text-slate-500">납기 지연 샘플 없음</td></tr>}
                            </tbody>
                        </table>
                    </DashboardSection>
                </div>
            </section>
        </div>
    );
};

export default ManagementCenter;
