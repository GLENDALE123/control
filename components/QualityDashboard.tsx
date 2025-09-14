
import React, { useMemo, useCallback } from 'react';
import { QualityInspection, InspectionType, DefectReason } from '../types';

interface QualityDashboardProps {
  inspections: QualityInspection[];
  onSelectGroup: (orderNumber: string) => void;
  onFilterChange: (filter: { type: string, value: any }) => void;
}

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode, color: string, onClick?: () => void }> = ({ title, value, icon, color, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white dark:bg-slate-800 rounded-lg shadow p-5 flex items-center space-x-4 ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-transform' : ''}`}
    >
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
        </div>
    </div>
);

const DashboardSection: React.FC<{ title: string, children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md flex flex-col ${className}`}>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex-shrink-0">{title}</h3>
        <div className="flex-1 overflow-auto scrollbar-hide">
            {children}
        </div>
    </div>
);

const IncomingSummary: React.FC<{ inspections: QualityInspection[] }> = ({ inspections }) => {
    const totalCount = inspections.length;
    const topKeywords = useMemo(() => {
        const keywordCounts = new Map<string, number>();
        inspections.forEach(i => {
            i.keywordPairs?.forEach(p => {
                if (p.process && p.defect) {
                    const key = `${p.process} - ${p.defect}`;
                    keywordCounts.set(key, (keywordCounts.get(key) || 0) + 1);
                }
            });
        });
        return [...keywordCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
    }, [inspections]);

    return (
        <div className="text-sm">
            <table className="w-full">
                <tbody>
                    <tr className="border-b dark:border-slate-700/50">
                        <td className="py-2 font-semibold">총 검사수</td>
                        <td className="py-2 text-right font-bold">{totalCount} 건</td>
                    </tr>
                    <tr>
                        <td className="pt-3 pb-1 font-semibold" colSpan={2}>공정/불량 키워드 Top 3</td>
                    </tr>
                    {topKeywords.length > 0 ? topKeywords.map(([keyword, count]) => (
                        <tr key={keyword}>
                            <td className="py-1 pl-4 text-xs">{keyword}</td>
                            <td className="py-1 text-right text-xs">{count} 건</td>
                        </tr>
                    )) : (
                        <tr><td colSpan={2} className="py-2 text-center text-xs text-gray-400">- 데이터 없음 -</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const InProcessSummary: React.FC<{ inspections: QualityInspection[] }> = ({ inspections }) => {
    const lineStats = useMemo(() => {
        const stats = new Map<string, { count: number; keywords: Map<string, number> }>();
        inspections.forEach(i => {
            const linesForThisInspection = new Set<string>();
            if (i.processLines && i.processLines.length > 0) {
                i.processLines.forEach(p => {
                    if (p.workLine) linesForThisInspection.add(p.workLine);
                });
            }
            if ((i as any).workLine) linesForThisInspection.add((i as any).workLine);
            if (linesForThisInspection.size === 0) linesForThisInspection.add('라인 미지정');

            linesForThisInspection.forEach(line => {
                if (!stats.has(line)) stats.set(line, { count: 0, keywords: new Map() });
                const lineData = stats.get(line)!;
                lineData.count++;
                i.keywordPairs?.forEach(p => {
                    if (p.process && p.defect) {
                        const key = `${p.process} - ${p.defect}`;
                        lineData.keywords.set(key, (lineData.keywords.get(key) || 0) + 1);
                    }
                });
            });
        });

        return Array.from(stats.entries()).map(([line, data]) => ({
            line,
            count: data.count,
            topKeywords: [...data.keywords.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
        })).sort((a,b) => a.line.localeCompare(b.line, 'ko'));
    }, [inspections]);

    return (
        <div className="text-sm">
            {lineStats.length > 0 ? (
                <table className="w-full">
                    <thead>
                        <tr className="border-b dark:border-slate-700/50 text-left">
                            <th className="py-2 font-semibold">라인</th>
                            <th className="py-2 text-right font-semibold">검사수</th>
                            <th className="py-2 font-semibold pl-4">Top 키워드</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lineStats.map(stat => (
                            <tr key={stat.line} className="border-b dark:border-slate-800 last:border-b-0">
                                <td className="py-2 font-medium">{stat.line}</td>
                                <td className="py-2 text-right font-bold">{stat.count} 건</td>
                                <td className="py-2 pl-4 text-xs">
                                    {stat.topKeywords.length > 0 ? (
                                        <ul>
                                            {stat.topKeywords.map(([keyword, count]) => (
                                                <li key={keyword}>{keyword} ({count}건)</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : <p className="text-sm text-center text-gray-400 mt-4">- 데이터 없음 -</p>}
        </div>
    );
};

const OutgoingSummary: React.FC<{ inspections: QualityInspection[] }> = ({ inspections }) => {
    const lineStats = useMemo(() => {
        const stats = new Map<string, { count: number; rejects: number; reasons: Map<string, number> }>();
        inspections.forEach(i => {
            const linesForThisInspection = new Set<string>();
            if (i.processLines && i.processLines.length > 0) {
                i.processLines.forEach(p => {
                    if (p.workLine) linesForThisInspection.add(p.workLine);
                });
            }
            if ((i as any).workLine) linesForThisInspection.add((i as any).workLine);
            if (linesForThisInspection.size === 0) linesForThisInspection.add('라인 미지정');

            let inspectionRejects = 0;
            const inspectionReasons = new Map<string, number>();
            i.workers?.forEach(w => {
                if (w.result === '불합격') {
                    inspectionRejects++;
                    (w.defectReasons || ['사유 미입력']).forEach(reason => {
                        inspectionReasons.set(reason, (inspectionReasons.get(reason) || 0) + 1);
                    });
                }
            });

            linesForThisInspection.forEach(line => {
                if (!stats.has(line)) stats.set(line, { count: 0, rejects: 0, reasons: new Map() });
                const lineData = stats.get(line)!;
                lineData.count++;
                if (inspectionRejects > 0) lineData.rejects++;
                inspectionReasons.forEach((count, reason) => {
                    lineData.reasons.set(reason, (lineData.reasons.get(reason) || 0) + count);
                });
            });
        });
        return Array.from(stats.entries()).map(([line, data]) => ({
            line,
            ...data,
            topReasons: [...data.reasons.entries()].sort((a,b) => b[1] - a[1])
        })).sort((a,b) => a.line.localeCompare(b.line, 'ko'));
    }, [inspections]);

    return (
        <div className="text-sm">
             {lineStats.length > 0 ? (
                 <table className="w-full">
                    <thead>
                        <tr className="border-b dark:border-slate-700/50 text-left">
                            <th className="py-2 font-semibold">라인</th>
                            <th className="py-2 text-right font-semibold">검사수</th>
                            <th className="py-2 text-right font-semibold">불합격</th>
                            <th className="py-2 font-semibold pl-4">불합격 사유</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lineStats.map(stat => (
                            <tr key={stat.line} className="border-b dark:border-slate-800 last:border-b-0">
                                <td className="py-2 font-medium">{stat.line}</td>
                                <td className="py-2 text-right font-bold">{stat.count} 건</td>
                                <td className="py-2 text-right font-bold text-red-500">{stat.rejects} 건</td>
                                <td className="py-2 pl-4 text-xs">
                                    {stat.topReasons.length > 0 ? (
                                        <ul>
                                            {stat.topReasons.map(([reason, count]) => (
                                                <li key={reason}>{reason}: {count}건</li>
                                            ))}
                                        </ul>
                                    ) : (
                                         stat.rejects > 0 ? <span>-</span> : null
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             ) : <p className="text-sm text-center text-gray-400 mt-4">- 데이터 없음 -</p>}
        </div>
    );
};

const DefectDistributionChart: React.FC<{ inspections: QualityInspection[]; onFilter: (filter: { type: string; value: any }) => void }> = ({ inspections, onFilter }) => {
    const topDefects = useMemo(() => {
        const defectCounts = new Map<string, number>();
        
        inspections.forEach(i => {
            i.keywordPairs?.forEach(p => {
                if (p.defect) {
                    const key = p.defect.trim();
                    if (key) defectCounts.set(key, (defectCounts.get(key) || 0) + 1);
                }
            });
            i.workers?.forEach(w => {
                w.defectReasons?.forEach(reason => {
                    const key = reason.trim();
                    if (key) defectCounts.set(key, (defectCounts.get(key) || 0) + 1);
                });
            });
        });

        return [...defectCounts.entries()]
            .map(([defect, count]) => ({ defect, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [inspections]);

    const maxCount = Math.max(...topDefects.map(d => d.count), 1);
    
    if(topDefects.length === 0) {
      return <div className="flex items-center justify-center h-full text-sm text-gray-400 dark:text-slate-500">데이터 없음</div>
    }
    
    return (
        <div className="space-y-3">
            {topDefects.map(({ defect, count }) => (
                 <button 
                    key={defect} 
                    onClick={() => onFilter({ type: 'defectType', value: defect })}
                    className="flex items-center text-sm w-full text-left p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                    <div className="w-1/3 truncate pr-2 text-gray-600 dark:text-slate-300" title={defect}>{defect}</div>
                    <div className="w-2/3 flex items-center">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                            <div
                                className="bg-red-500 h-4 rounded-full"
                                style={{ width: `${(count / maxCount) * 100}%` }}
                            />
                        </div>
                        <span className="ml-2 font-semibold text-gray-800 dark:text-white">{count}</span>
                    </div>
                </button>
            ))}
        </div>
    );
};

const RecentInspectionsColumn: React.FC<{
    title: string;
    items: QualityInspection[];
    onSelect: (orderNumber: string) => void;
    color: string;
}> = ({ title, items, onSelect, color }) => (
    <div className="flex flex-col">
        <h4 className={`font-semibold text-gray-800 dark:text-white mb-3 border-l-4 pl-2 ${color}`}>
            {title} ({items.length})
        </h4>
        <div className="space-y-2">
            {items.length > 0 ? items.map(item => (
                <div 
                    key={item.id} 
                    onClick={() => onSelect(item.orderNumber)} 
                    className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer"
                >
                    <p className="text-sm font-semibold text-gray-700 dark:text-slate-200 leading-snug truncate">{item.productName}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        {item.inspector} / {new Date(item.createdAt).toLocaleString('ko-KR')}
                    </p>
                </div>
            )) : <p className="text-sm text-center text-gray-500 dark:text-slate-400 py-4">데이터 없음</p>}
        </div>
    </div>
);

const RecentInspectionsColumns: React.FC<{ inspections: QualityInspection[]; onSelect: (orderNumber: string) => void; }> = ({ inspections, onSelect }) => {
    const sortedInspections = useMemo(() => 
        [...inspections].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [inspections]);

    const recentByType = useMemo(() => ({
        incoming: sortedInspections.filter(i => i.inspectionType === 'incoming').slice(0, 5),
        inProcess: sortedInspections.filter(i => i.inspectionType === 'inProcess').slice(0, 5),
        outgoing: sortedInspections.filter(i => i.inspectionType === 'outgoing').slice(0, 5),
    }), [sortedInspections]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RecentInspectionsColumn title="수입검사" items={recentByType.incoming} onSelect={onSelect} color="border-cyan-500" />
            <RecentInspectionsColumn title="공정검사" items={recentByType.inProcess} onSelect={onSelect} color="border-yellow-500" />
            <RecentInspectionsColumn title="출하검사" items={recentByType.outgoing} onSelect={onSelect} color="border-green-500" />
        </div>
    );
};

const TopFailingWorkers: React.FC<{ inspections: QualityInspection[]; onFilter: (filter: { type: string; value: any }) => void }> = ({ inspections, onFilter }) => {
    const workerFailureData = useMemo(() => {
        const failureCounts = new Map<string, number>();

        inspections.forEach(i => {
            if (i.workers) {
                i.workers.forEach(worker => {
                    if (worker.result === '불합격' && worker.name) {
                        failureCounts.set(worker.name, (failureCounts.get(worker.name) || 0) + 1);
                    }
                });
            }
        });

        return Array.from(failureCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [inspections]);

    if (workerFailureData.length === 0) {
        return <div className="flex items-center justify-center h-full text-sm text-gray-400 dark:text-slate-500">불합격 데이터 없음</div>;
    }

    return (
        <div className="space-y-3">
            {workerFailureData.map(({ name, count }, index) => (
                <button
                    key={`${name}-${index}`}
                    onClick={() => onFilter({ type: 'worker', value: name })}
                    className="flex items-center text-sm w-full text-left p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                    <span className="w-8 font-bold text-gray-500 dark:text-slate-400 text-center">{index + 1}.</span>
                    <span className="flex-1 truncate pr-2 text-gray-700 dark:text-slate-200">{name}</span>
                    <span className="font-semibold text-red-500">{count} 회</span>
                </button>
            ))}
        </div>
    );
};

const TopFailureReasons: React.FC<{ inspections: QualityInspection[]; onFilter: (filter: { type: string; value: any }) => void }> = ({ inspections, onFilter }) => {
    const reasonData = useMemo(() => {
        const reasonCounts = new Map<string, number>();

        inspections.forEach(i => {
            if (i.workers) {
                i.workers.forEach(worker => {
                    if (worker.result === '불합격' && worker.defectReasons) {
                        worker.defectReasons.forEach(reason => {
                            reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
                        });
                    }
                });
            }
        });

        return Array.from(reasonCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [inspections]);

    if (reasonData.length === 0) {
        return <div className="flex items-center justify-center h-full text-sm text-gray-400 dark:text-slate-500">불합격 사유 데이터 없음</div>;
    }

    return (
        <div className="space-y-3">
            {reasonData.map(({ name, count }, index) => (
                <button
                    key={`${name}-${index}`}
                    onClick={() => onFilter({ type: 'reason', value: name })}
                    className="flex items-center text-sm w-full text-left p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                    <span className="w-8 font-bold text-gray-500 dark:text-slate-400 text-center">{index + 1}.</span>
                    <span className="flex-1 truncate pr-2 text-gray-700 dark:text-slate-200">{name}</span>
                    <span className="font-semibold text-red-500">{count} 회</span>
                </button>
            ))}
        </div>
    );
};


const QualityDashboard: React.FC<QualityDashboardProps> = ({ inspections, onSelectGroup, onFilterChange }) => {
     const kpiData = useMemo(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayInspections = inspections.filter(i => new Date(i.createdAt) >= todayStart);
        const criticalAlerts = todayInspections.filter(i => i.result === '불합격' || i.result === '한도대기');
        const validResults = inspections.filter(i => i.result === '합격' || i.result === '불합격');
        const passRate = validResults.length > 0 ? (validResults.filter(i => i.result === '합격').length / validResults.length * 100) : 100;

        return {
            inspectionsToday: todayInspections.length,
            criticalAlertsCount: criticalAlerts.length,
            passRate: passRate.toFixed(1),
            totalInspections: inspections.length,
        };
    }, [inspections]);
    
    const { incomingInspections, inProcessInspections, outgoingInspections } = useMemo(() => {
        const incoming: QualityInspection[] = [];
        const inProcess: QualityInspection[] = [];
        const outgoing: QualityInspection[] = [];
        inspections.forEach(i => {
            if (i.inspectionType === 'incoming') incoming.push(i);
            else if (i.inspectionType === 'inProcess') inProcess.push(i);
            else if (i.inspectionType === 'outgoing') outgoing.push(i);
        });
        return { incomingInspections: incoming, inProcessInspections: inProcess, outgoingInspections: outgoing };
    }, [inspections]);

    const floor1Lines = useMemo(() => ['1코팅', '2코팅', '내부코팅1호기', '내부코팅2호기', '내부코팅3호기'], []);
    const floor2Lines = useMemo(() => ['증착1', '증착1하도', '증착1상도', '증착2', '증착2하도', '증착2상도'], []);

    const isLineInSet = useCallback((inspection: QualityInspection, lineSet: string[]): boolean => {
        const linesForThisInspection = new Set<string>();
        if (inspection.processLines && inspection.processLines.length > 0) {
            inspection.processLines.forEach(p => {
                if (p.workLine) linesForThisInspection.add(p.workLine);
            });
        }
        if ((inspection as any).workLine) linesForThisInspection.add((inspection as any).workLine);
        
        if (linesForThisInspection.size === 0) return false;

        for (const line of linesForThisInspection) {
            if (lineSet.includes(line)) return true;
        }
        return false;
    }, []);

    const floor1Inspections = useMemo(() => inProcessInspections.filter(i => isLineInSet(i, floor1Lines)), [inProcessInspections, isLineInSet, floor1Lines]);
    const floor2Inspections = useMemo(() => inProcessInspections.filter(i => isLineInSet(i, floor2Lines)), [inProcessInspections, isLineInSet, floor2Lines]);

     const KpiIcons = {
        total: <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>,
        today: <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>,
        alert: <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>,
        pass: <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>,
    };

    return (
         <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50 dark:bg-slate-900/50">
            <header>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">품질 현황 요약 대시보드</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">검사 단계별 데이터를 분석하고 주요 이슈를 빠르게 파악합니다.</p>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="총 검사" value={kpiData.totalInspections} color="bg-blue-100 dark:bg-blue-900/50" icon={KpiIcons.total} />
                <KpiCard title="오늘 검사" value={kpiData.inspectionsToday} color="bg-indigo-100 dark:bg-indigo-900/50" icon={KpiIcons.today} onClick={() => onFilterChange({ type: 'today', value: true })} />
                <KpiCard title="긴급 알림 (24H)" value={kpiData.criticalAlertsCount} color="bg-red-100 dark:bg-red-900/50" icon={KpiIcons.alert} onClick={() => onFilterChange({ type: 'urgent', value: true })} />
                <KpiCard title="전체 합격률" value={`${kpiData.passRate}%`} color="bg-green-100 dark:bg-green-900/50" icon={KpiIcons.pass} />
            </section>
            
            <section className="grid grid-cols-1 lg:grid-cols-10 gap-4">
                <div className="lg:col-span-7">
                    <DashboardSection title="최근 등록 활동">
                        <RecentInspectionsColumns inspections={inspections} onSelect={onSelectGroup} />
                    </DashboardSection>
                </div>
                <div className="lg:col-span-3">
                    <DashboardSection title="작업자별/사유별 불합격 Top 5">
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-slate-300 mb-2">작업자 순위</h4>
                        <TopFailingWorkers inspections={outgoingInspections} onFilter={onFilterChange} />
                        <div className="my-4 border-t border-slate-200 dark:border-slate-700" />
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-slate-300 mb-2">불합격 사유 순위</h4>
                        <TopFailureReasons inspections={outgoingInspections} onFilter={onFilterChange} />
                    </DashboardSection>
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <DashboardSection title="주요 불량 유형 Top 5">
                        <DefectDistributionChart inspections={inspections} onFilter={onFilterChange} />
                    </DashboardSection>
                    <DashboardSection title="수입검사 요약">
                        <IncomingSummary inspections={incomingInspections} />
                    </DashboardSection>
                    <DashboardSection title="출하검사 요약">
                        <OutgoingSummary inspections={outgoingInspections} />
                    </DashboardSection>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-4">
                    <DashboardSection title="1층 공정검사 요약 (코팅)">
                        <InProcessSummary inspections={floor1Inspections} />
                    </DashboardSection>
                    <DashboardSection title="2층 공정검사 요약 (증착)">
                        <InProcessSummary inspections={floor2Inspections} />
                    </DashboardSection>
                </div>
            </section>

        </div>
    );
};

export default QualityDashboard;