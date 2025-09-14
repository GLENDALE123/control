

import React, { useState, useEffect } from 'react';
import { JigRequest, SampleRequest, QualityInspection, JigMasterItem } from '../types';

interface IntegratedSearchResultsProps {
    query: string;
    onClearSearch: () => void;
    // Data sources
    jigRequests: JigRequest[];
    sampleRequests: SampleRequest[];
    inspections: QualityInspection[];
    jigs: JigMasterItem[];
    // Click handlers
    onSelectJigRequest: (request: JigRequest) => void;
    onSelectSampleRequest: (request: SampleRequest) => void;
    onSelectJigMaster: (jig: JigMasterItem) => void;
}

interface SearchResults {
    jigRequests: JigRequest[];
    sampleRequests: SampleRequest[];
    jigs: JigMasterItem[];
}

const SearchResultCard: React.FC<{ title: string; subtitle: string; date: string; onClick: () => void; }> = ({ title, subtitle, date, onClick }) => (
    <div onClick={onClick} className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors">
        <h4 className="font-bold text-gray-800 dark:text-white truncate">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-slate-300 truncate">{subtitle}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{new Date(date).toLocaleDateString('ko-KR')}</p>
    </div>
);

const ResultSection: React.FC<{ title: string; count: number; children: React.ReactNode; }> = ({ title, count, children }) => (
    <section>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-slate-200 mb-3">{title} ({count}건)</h3>
        {count > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {children}
            </div>
        ) : (
            <p className="text-gray-500 dark:text-slate-400">검색 결과가 없습니다.</p>
        )}
    </section>
);


const IntegratedSearchResults: React.FC<IntegratedSearchResultsProps> = (props) => {
    const { query, onClearSearch, jigRequests, sampleRequests, inspections, jigs, onSelectJigRequest, onSelectSampleRequest, onSelectJigMaster } = props;
    const [currentQuery, setCurrentQuery] = useState(query);
    const [results, setResults] = useState<SearchResults>({ jigRequests: [], sampleRequests: [], jigs: [] });

    useEffect(() => {
        const lowerCaseQuery = currentQuery.toLowerCase();
        
        const filteredJigRequests = jigRequests.filter(r =>
            Object.values(r).some(val => String(val).toLowerCase().includes(lowerCaseQuery))
        );

        const filteredSampleRequests = sampleRequests.filter(r => {
             const topLevelMatch = Object.entries(r)
                .filter(([key]) => key !== 'items')
                .some(([, val]) => String(val).toLowerCase().includes(lowerCaseQuery));

            if (topLevelMatch) return true;
            
            return (r.items || []).some(item => 
                item.partName.toLowerCase().includes(lowerCaseQuery) ||
                item.colorSpec.toLowerCase().includes(lowerCaseQuery) ||
                String(item.quantity).toLowerCase().includes(lowerCaseQuery) ||
                (item.coatingMethod || '').toLowerCase().includes(lowerCaseQuery) ||
                (item.postProcessing || []).some(p => p.toLowerCase().includes(lowerCaseQuery))
            );
        });

        const filteredJigs = jigs.filter(j =>
            Object.values(j).some(val => String(val).toLowerCase().includes(lowerCaseQuery))
        );
        
        setResults({
            jigRequests: filteredJigRequests,
            sampleRequests: filteredSampleRequests,
            jigs: filteredJigs
        });
    }, [currentQuery, jigRequests, sampleRequests, inspections, jigs]);

    const totalResults = results.jigRequests.length + results.sampleRequests.length + results.jigs.length;

    return (
        <div className="h-full flex flex-col p-4 bg-slate-100 dark:bg-slate-900">
            <header className="flex-shrink-0 mb-6 flex items-center gap-4">
                <button onClick={onClearSearch} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">'{currentQuery}'에 대한 통합 검색 결과</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">총 {totalResults}개의 결과를 찾았습니다.</p>
                </div>
            </header>
            
            <main className="flex-1 overflow-y-auto space-y-8 pr-2">
                <ResultSection title="지그 관리 요청" count={results.jigRequests.length}>
                    {results.jigRequests.map(r => 
                        <SearchResultCard 
                            key={r.id} 
                            title={`${r.itemName} (${r.partName})`} 
                            subtitle={`ID: ${r.id} | 요청자: ${r.requester}`}
                            date={r.requestDate}
                            onClick={() => onSelectJigRequest(r)}
                        />
                    )}
                </ResultSection>

                <ResultSection title="샘플 요청" count={results.sampleRequests.length}>
                    {results.sampleRequests.map(r => 
                        <SearchResultCard 
                            key={r.id} 
                            title={`${r.productName} (${r.clientName})`}
                            subtitle={`ID: ${r.id} | 요청자: ${r.requesterName} | ${(r.items || []).length}개 품목`}
                            date={r.requestDate}
                            onClick={() => onSelectSampleRequest(r)}
                        />
                    )}
                </ResultSection>
                
                <ResultSection title="지그 마스터" count={results.jigs.length}>
                     {results.jigs.map(j => 
                        <SearchResultCard 
                            key={j.id} 
                            title={`${j.itemName} (${j.partName})`}
                            subtitle={`지그번호: ${j.itemNumber}`}
                            date={j.createdAt}
                            onClick={() => onSelectJigMaster(j)}
                        />
                    )}
                </ResultSection>
            </main>
        </div>
    );
};

export default IntegratedSearchResults;