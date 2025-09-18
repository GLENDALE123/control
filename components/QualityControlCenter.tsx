import React, { useState, useMemo, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import QualityNavigation from './QualityNavigation';
import { UserProfile, QualityInspection, InspectionType, HistoryEntry, Comment, Status, GroupedInspectionData, InspectionResult, WorkerResult, DefectReason, WorkerInspectionData, KeywordPair, TestResultDetail, ProcessLineData, ReliabilityReview } from '../types';
import { db, storage } from '../firebaseConfig';
import FullScreenModal from './FullScreenModal';
import ConfirmationModal from './ConfirmationModal';
import CommentsSection from './CommentsSection';
import { STATUS_COLORS } from '../constants';
import QualityDashboard from './QualityDashboard';
import TeamManagement from './TeamManagement';
import QualityIssueCenter from './QualityIssueCenter';
import ImageLightbox from './ImageLightbox';


declare const html2canvas: any;

type ActiveQualityMenu = 'dashboard' | 'issueCenter' | 'controlCenter' | 'circleCenter' | 'team' | 'settings' | 'guide';
type ActiveCircleCenterTab = 'incoming' | 'inProcess' | 'outgoing';
type Theme = 'light' | 'dark';

interface AutocompleteData {
    suppliers: string[];
    productNames: string[];
    partNames: string[];
    injectionColors: string[];
    specifications: string[];
    injectionCompanies: string[];
}

interface QualityControlCenterProps {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    currentUserProfile: UserProfile | null;
    addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
    deepLinkOrderNumber: string | null;
    onDeepLinkHandled: () => void;
    onUpdateInspection: (id: string, updates: Partial<QualityInspection>, reason?: string) => Promise<void>;
    onDeleteInspectionGroup: (orderNumber: string) => void;
    onAddComment: (orderNumber: string, commentText: string) => void;
}

const getLocalDate = (date = new Date()) => {
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - userTimezoneOffset);
    return localDate.toISOString().split('T')[0];
};

const sortKorean = (a: string, b: string) => a.localeCompare(b, 'ko');

// --- Constants for Datalists and Selects ---
const processKeywordOptions = ['DP', '내부코팅', '박', '사출', '인쇄', '조립', '증착', '코팅'].sort(sortKorean);
const defectKeywordOptions = ['가스', '기름', '기포', '기능불량', '내부코팅', '미성형', '미증착', '변형', '색상차이', '수축', '스크레치', '웰드', '과열', '찍힘', '침식', '크랙', '흑점', 'wetting'].sort(sortKorean);
const reinspectionKeywordOptions = ['스크레치발생', '이물불량다량혼입', '지문자국', '찍힘선별', '흑점불량다량혼입'].sort(sortKorean);
const incomingResultOptions: InspectionResult[] = (['반출', '불합격', '합격', '한도대기', '한도승인'] as InspectionResult[]).sort(sortKorean);
const consultationDeptOptions = ['군포', '군포품질', '사출실', '생산관리', '안양', '안양품질', '영업부', '임원', '인쇄실', '조립실'].sort(sortKorean);
const consultationNameOptions = ['김민현', '김영권', '김을한', '김재식', '배영길', '이동엽', '이현석', '전진표', '최유림', '최한수', '한상태', '한태경'].sort(sortKorean);
const consultationRankOptions = ['과장', '대리', '본부장', '부사장', '상무', '이사', '전무', '팀장'].sort(sortKorean);
const injectionMaterialOptions = ['ABS', 'AS', 'P.P', 'PC', 'PET', 'PETG'].sort(sortKorean);
const injectionColorOptions = ['검정', '백색', '원색', '잡색', '투명'].sort(sortKorean);
const postProcessOptions = ['디지털프린팅', '레이져컷팅', '인쇄', '인쇄/박', '전사', '조립', '패드인쇄', '출하', '박'].sort(sortKorean);
const workLineOptions = ['1코팅', '2코팅', '내부코팅1호기', '내부코팅2호기', '내부코팅3호기', '증착1', '증착1상도', '증착1하도', '증착2', '증착2상도', '증착2하도'].sort(sortKorean);
const jigUsed2Options = ['외주지그', '지그번호없음', '테이프지그(소)', '테이프지그(중)'].sort(sortKorean);
const workerResultOptions: WorkerResult[] = ['합격', '불합격'];
const defectReasonOptions: DefectReason[] = (['선별미흡', '지문자국', '취급불량', '조건불량'] as DefectReason[]).sort(sortKorean);
const reliabilityResultOptions: ('양호' | '부분박리' | '박리')[] = ['양호', '부분박리', '박리'];
const colorCheckResultOptions: ('견본과 색상동일' | '색상편차발생')[] = ['견본과 색상동일', '색상편차발생'];
const reliabilityMethodOptions: ReliabilityReview['method'][] = ['투명테이프', '616테이프', 'AP방식테스트'];
const reliabilityResultOptionsOutgoing: ReliabilityReview['result'][] = ['양호', '부분박리', '박리'];


// --- 실시간 미리보기 카드 컴포넌트 ---
const fieldLabels: { [key: string]: string } = {
    orderNumber: '발주번호',
    supplier: '발주처',
    productName: '제품명',
    partName: '부속명',
    orderQuantity: '발주수량',
    specification: '사양',
    postProcess: '후공정',
    injectionCompany: '사출처',
    injectionMaterial: '사출원료',
    injectionColor: '사출색상',
    packagingInfo: '사출포장',
    appearanceHistory: '외관검사이력',
    functionHistory: '기능검사이력',
    result: '결과',
    resultReason: '결과 사유',
    finalConsultationDept: '최종협의(소속)',
    finalConsultationName: '최종협의(이름)',
    finalConsultationRank: '최종협의(직급)',
    jigUsed: '사용지그-1',
    jigUsed2: '사용지그-2',
    internalJigLower: '내부코팅 사용지그 (하)',
    internalJigUpper: '내부코팅 사용지그 (상)',
    dryerUsed: '드라이기 사용',
    flameTreatment: '화염처리',
    lineSpeed: '라인속도',
    lampUsage: '램프사용',
    reliabilityTestResult: '신뢰성 테스트',
    colorCheckResult: '색상 체크',
    injectionPackaging: '사출포장',
    postProcessPackaging: '후가공포장',
    preInspectionHistory: '사전검사이력',
    inProcessInspectionHistory: '공정검사이력',
    workLine: '작업라인',
    workerCount: '작업자 인원수',
    reinspectionKeyword: '재검사요청 키워드',
    reinspectionContent: '재검사요청 내용',
};

const InspectionPreviewCard: React.FC<{
    inspectionType: '수입' | '공정' | '출하';
    formData: any;
    inspectorName: string;
}> = ({ inspectionType, formData, inspectorName }) => {
    const typeInfo = {
        '수입': {
            bgColor: 'bg-cyan-100 dark:bg-cyan-900/50',
            textColor: 'text-cyan-800 dark:text-cyan-200'
        },
        '공정': {
            bgColor: 'bg-yellow-100 dark:bg-yellow-900/50',
            textColor: 'text-yellow-800 dark:text-yellow-200'
        },
        '출하': {
            bgColor: 'bg-green-100 dark:bg-green-900/50',
            textColor: 'text-green-800 dark:text-green-200'
        }
    };
    
    const formattedQuantity = useMemo(() => {
        if (!formData.orderQuantity) return '';
        const num = parseInt(formData.orderQuantity.replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? '' : `${num.toLocaleString('ko-KR')} ea`;
    }, [formData.orderQuantity]);


    const renderField = (label: string, value: string | undefined | number[]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return null;
        const displayValue = Array.isArray(value) ? value.join(', ') : value;
        return (
            <>
                <dt className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</dt>
                <dd className="mt-1 text-sm text-gray-800 dark:text-slate-200 whitespace-pre-wrap break-words">{displayValue}</dd>
            </>
        );
    };
    
    const renderTestResult = (label: string, data: TestResultDetail | string | undefined) => {
        if (!data) return null;
        let displayValue: string;
        if (typeof data === 'string') {
            displayValue = data;
        } else if (data.result) {
            displayValue = [
                data.result,
                (data.action && `처리: ${data.action}`),
                (data.decisionMaker && `결정자: ${data.decisionMaker}`)
            ].filter(Boolean).join(' / ');
        } else {
            return null;
        }
        return renderField(label, displayValue);
    };

    const renderReliabilityReviewPreview = (label: string, data?: ReliabilityReview) => {
        if (!data || !data.method) return null;
        const parts = [
            `${data.method}: ${data.result || '결과 없음'}`,
        ];
        if (data.result === '부분박리' || data.result === '박리') {
            if (data.action) parts.push(`처리: ${data.action}`);
            if (data.decisionMaker) parts.push(`결정자: ${data.decisionMaker}`);
        }
        return renderField(label, parts.join(' / '));
    };


    const fieldsToDisplay = Object.entries(formData).filter(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '')) return false;
        if (key === 'orderNumber' && value === 'T') return false;
        if (key === 'result' && value === '합격') return false;
        return !['productName', 'orderNumber', 'inspectionDate', 'relatedOrderNumbers', 'keywordPairs', 'processLines', 'reliabilityTestResult', 'colorCheckResult', 'reliabilityReview'].includes(key);
    });
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg flex flex-col h-full">
            <div className="p-4 border-b dark:border-slate-700 flex-shrink-0">
                <div className="flex justify-between items-start">
                    <h4 className="text-lg font-bold text-gray-800 dark:text-white break-all">{formData.productName || '제품명'}</h4>
                    <span className={`${typeInfo[inspectionType].bgColor} ${typeInfo[inspectionType].textColor} text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0`}>{inspectionType}</span>
                </div>
                {(formData.orderNumber && formData.orderNumber !== 'T') && <p className="text-sm font-mono text-gray-500 dark:text-slate-400 mt-1">{formData.orderNumber}</p>}
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-hide">
                 <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                    {renderField('관련 발주번호', formData.relatedOrderNumbers?.filter((r: string) => r !== 'T').join(', '))}
                    {fieldsToDisplay.map(([key, value]) => {
                       const valStr = (key === 'orderQuantity') ? formattedQuantity : 
                                      (key === 'jigUsed' && value) ? `${value as string} 번지그` : 
                                      (key === 'internalJigLower' && value) ? `${value as string} 번지그` :
                                      (key === 'internalJigUpper' && value) ? `${value as string} 번지그` :
                                      (key === 'lineSpeed' && value) ? `${value as string} rpm` : (value as string | number[]);
                       const isLong = typeof valStr === 'string' && (valStr.length > 25 || ['appearanceHistory', 'functionHistory', 'preInspectionHistory', 'inProcessInspectionHistory', 'reinspectionContent', 'packagingInfo', 'injectionPackaging', 'postProcessPackaging', 'specification', 'resultReason'].includes(key));
                       return (
                            <div key={key} className={isLong ? 'col-span-1 sm:col-span-2 md:col-span-3' : 'col-span-1'}>
                                {renderField(fieldLabels[key] || key, valStr)}
                            </div>
                       );
                    })}
                    {renderTestResult(fieldLabels.reliabilityTestResult, formData.reliabilityTestResult)}
                    {renderTestResult(fieldLabels.colorCheckResult, formData.colorCheckResult)}
                    {inspectionType === '출하' && renderReliabilityReviewPreview('신뢰성 검토', formData.reliabilityReview)}
                     {formData.processLines && formData.processLines.length > 0 && formData.processLines.some((p: ProcessLineData) => p.workLine || p.lineSpeed) && (
                        <div className="col-span-1 sm:col-span-2 md:col-span-3">
                             <dt className="text-xs font-medium text-gray-500 dark:text-slate-400">라인 정보</dt>
                             <dd className="mt-1 text-sm text-gray-800 dark:text-slate-200 space-y-1">
                                 {formData.processLines.map((p: ProcessLineData, i: number) => (p.workLine || p.lineSpeed) && (
                                     <div key={i} className="text-xs p-1 bg-slate-100 dark:bg-slate-700/50 rounded">
                                         #{i+1}: {p.workLine} / {p.lineSpeed}rpm
                                     </div>
                                 ))}
                             </dd>
                        </div>
                     )}
                    {formData.keywordPairs && formData.keywordPairs.length > 0 && formData.keywordPairs.some((p: KeywordPair) => p.process || p.defect) && (
                        <div className="col-span-1 sm:col-span-2 md:col-span-3">
                            <dt className="text-xs font-medium text-gray-500 dark:text-slate-400">공정/불량 키워드</dt>
                            <dd className="mt-1 text-sm text-gray-800 dark:text-slate-200 space-y-1">
                                {formData.keywordPairs.map((p: KeywordPair, i: number) => (p.process || p.defect) && <div key={i} className="text-xs p-1 bg-slate-100 dark:bg-slate-700/50 rounded">{p.process} - {p.defect}</div>)}
                            </dd>
                        </div>
                    )}
                </dl>
            </div>
            <div className="p-4 border-t dark:border-slate-700 text-right flex-shrink-0">
                <p className="text-sm text-gray-500 dark:text-slate-400">{formData.inspectionDate || new Date().toLocaleDateString('ko-KR')}</p>
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">담당자: {inspectorName}</p>
            </div>
        </div>
    );
};

// --- 관제센터 컴포넌트 ---
const DetailSection: React.FC<{ title: string; data?: string | null | React.ReactNode }> = ({ title, data }) => {
    if (!data) return null;
    return (
        <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">{title}</dt>
            <dd className="mt-1 text-sm text-gray-800 dark:text-slate-200 whitespace-pre-wrap">{data}</dd>
        </div>
    );
};

const InspectionDetailsList: React.FC<{ inspection: QualityInspection; onImageClick: (url: string) => void; canManage?: boolean; }> = ({ inspection, onImageClick, canManage = false }) => {
    const renderStructuredResult = (title: string, data?: TestResultDetail | string | null) => {
        if (!data) return null;
        let content;
        if (typeof data === 'string') {
            content = data;
        } else if (typeof data === 'object' && data.result) {
            content = (
                <>
                    <p><strong>결과:</strong> {data.result}</p>
                    {data.action && <p className="mt-1"><strong>처리:</strong> {data.action}</p>}
                    {data.decisionMaker && <p className="mt-1"><strong>결정자:</strong> {data.decisionMaker}</p>}
                </>
            );
        } else {
            return null;
        }
        return <DetailSection title={title} data={<div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md">{content}</div>} />;
    }
    const renderReliabilityReview = (title: string, data?: ReliabilityReview | null) => {
        if (!data || !data.method) return null;
        let content = (
            <>
                <p><strong>방식:</strong> {data.method}</p>
                <p className="mt-1"><strong>결과:</strong> {data.result}</p>
                {(data.result === '부분박리' || data.result === '박리') && (
                    <>
                        {data.action && <p className="mt-1"><strong>처리:</strong> {data.action}</p>}
                        {data.decisionMaker && <p className="mt-1"><strong>결정자:</strong> {data.decisionMaker}</p>}
                    </>
                )}
            </>
        );
        return <DetailSection title={title} data={<div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md">{content}</div>} />;
    }

    return (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
            <DetailSection title="검사자" data={inspection.inspector} />
            <DetailSection title="검사일시" data={inspection.inspectionDate || new Date(inspection.createdAt).toLocaleString('ko-KR')} />
            <DetailSection title="관련 발주번호" data={inspection.relatedOrderNumbers?.join(', ')} />

            {inspection.imageUrls && inspection.imageUrls.length > 0 && (
                <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">첨부 이미지</dt>
                    <dd className="mt-1 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
                        {inspection.imageUrls.map((url, index) => (
                            <div key={index} className="group relative">
                                <img
                                    src={url}
                                    alt=""
                                    aria-label={`첨부 이미지 ${index + 1}`}
                                    width={160}
                                    height={96}
                                    loading="lazy"
                                    decoding="async"
                                    fetchpriority="low"
                                    className="w-full h-24 object-cover rounded-md cursor-pointer transition-transform hover:scale-105"
                                    onClick={() => onImageClick(url)}
                                />
                            </div>
                        ))}
                    </dd>
                </div>
            )}

            {inspection.inspectionType === 'incoming' && (
                <>
                    <DetailSection title="사출처" data={inspection.injectionCompany} />
                    {inspection.keywordPairs && inspection.keywordPairs.length > 0 && (
                        <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">공정/불량 키워드</dt>
                            <dd className="mt-1 text-sm text-gray-800 dark:text-slate-200">
                                <ul className="space-y-1">
                                    {inspection.keywordPairs.map((pair, index) => (
                                        <li key={index} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                                            <span className="font-semibold">{pair.process}:</span> {pair.defect}
                                        </li>
                                    ))}
                                </ul>
                            </dd>
                        </div>
                    )}
                    <DetailSection title="사출포장" data={inspection.packagingInfo} />
                    <DetailSection title="외관검사이력" data={inspection.appearanceHistory} />
                    <DetailSection title="기능검사이력" data={inspection.functionHistory} />
                    <DetailSection title="결과" data={inspection.result} />
                    <DetailSection title="결과 사유" data={inspection.resultReason} />
                    <DetailSection title="최종협의" data={inspection.finalConsultationDept ? `${inspection.finalConsultationDept} / ${inspection.finalConsultationName} ${inspection.finalConsultationRank}` : null} />
                </>
            )}
            {inspection.inspectionType === 'inProcess' && (
                <>
                    <DetailSection title="사출처" data={inspection.injectionCompany} />
                     {inspection.processLines && inspection.processLines.length > 0 && (
                        <div className="sm:col-span-2">
                             <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">라인 정보</dt>
                             <dd className="mt-1 text-sm text-gray-800 dark:text-slate-200 space-y-4">
                                 {inspection.processLines.map((line, index) => (
                                     <div key={index} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
                                         <h5 className="font-semibold mb-2 text-gray-600 dark:text-slate-300">라인 세트 #{index + 1}</h5>
                                         <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                                             <DetailSection title="작업라인" data={line.workLine} />
                                             <DetailSection title="라인속도" data={line.lineSpeed ? `${line.lineSpeed} rpm` : null} />
                                             <DetailSection title="램프사용" data={line.lampUsage?.sort((a,b) => a - b).join(', ')} />
                                             {line.lineConditions && line.lineConditions.some(c => c.value) && (
                                                <div className="col-span-2">
                                                    <dt className="text-xs font-medium text-gray-500 dark:text-slate-400">라인조건(I.R)</dt>
                                                    <dd className="mt-1 text-gray-800 dark:text-slate-200">
                                                        <ul className="space-y-1">
                                                            {line.lineConditions.map((cond, idx) => (
                                                                cond.value && 
                                                                <li key={idx} className="p-1 text-xs bg-slate-200 dark:bg-slate-700/50 rounded-md">
                                                                    <span className="font-semibold">{cond.type}:</span> {cond.value}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </dd>
                                                </div>
                                            )}
                                         </dl>
                                     </div>
                                 ))}
                             </dd>
                        </div>
                     )}
                    <DetailSection title="사용지그-1" data={inspection.jigUsed ? `${inspection.jigUsed} 번지그` : null} />
                    <DetailSection title="사용지그-2" data={inspection.jigUsed2} />
                    <DetailSection title="내부코팅 사용지그 (하측)" data={inspection.internalJigLower ? `${inspection.internalJigLower} 번지그` : null} />
                    <DetailSection title="내부코팅 사용지그 (상측)" data={inspection.internalJigUpper ? `${inspection.internalJigUpper} 번지그` : null} />
                    <DetailSection title="드라이기 사용" data={inspection.dryerUsed} />
                    <DetailSection title="화염처리" data={inspection.flameTreatment} />
                     {inspection.keywordPairs && inspection.keywordPairs.length > 0 && (
                        <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">공정/불량 키워드</dt>
                            <dd className="mt-1 text-sm text-gray-800 dark:text-slate-200">
                                <ul className="space-y-1">
                                    {inspection.keywordPairs.map((pair, index) => (
                                        <li key={index} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                                            <span className="font-semibold">{pair.process}:</span> {pair.defect}
                                        </li>
                                    ))}
                                </ul>
                            </dd>
                        </div>
                    )}
                    {renderStructuredResult("신뢰성테스트결과", inspection.reliabilityTestResult)}
                    {renderStructuredResult("색상체크결과", inspection.colorCheckResult)}
                    <DetailSection title="사출포장" data={inspection.injectionPackaging} />
                    <DetailSection title="후가공포장" data={inspection.postProcessPackaging} />
                    <DetailSection title="사전검사이력" data={inspection.preInspectionHistory} />
                    <DetailSection title="공정검사이력" data={inspection.inProcessInspectionHistory} />
                </>
            )}
            {inspection.inspectionType === 'outgoing' && (
                <>
                    <DetailSection title="작업라인" data={inspection.processLines?.map(p => p.workLine).filter(Boolean).join(', ')} />
                    <DetailSection title="작업자 인원수" data={inspection.workerCount} />
                    {renderReliabilityReview("신뢰성 검토", inspection.reliabilityReview)}
                    <div className="sm:col-span-2">
                         <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">작업자별 검사결과</dt>
                         <dd className="mt-1 text-sm text-gray-800 dark:text-slate-200">
                            <ul className="space-y-2">
                               {(inspection.workers || []).map((worker, index) => {
                                    const defectRate = (worker.totalInspected && worker.totalInspected > 0) ? (((worker.defectQuantity || 0) / worker.totalInspected) * 100).toFixed(2) : '0.00';
                                    return (
                                    <li key={index} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md space-y-2">
                                        <div className="flex justify-between items-center font-semibold">
                                            <span>{worker.name}</span>
                                            <span className={worker.result === '불합격' ? 'text-red-500' : 'text-green-500'}>{worker.result}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs text-center">
                                            <div><span className="block text-gray-400">총 검사</span><span>{(worker.totalInspected || 0).toLocaleString()}</span></div>
                                            <div><span className="block text-gray-400">불량</span><span>{(worker.defectQuantity || 0).toLocaleString()}</span></div>
                                            <div><span className="block text-gray-400">불량률</span><span>{defectRate}%</span></div>
                                        </div>
                                        {worker.result === '불합격' && (
                                            <div className="text-xs pt-2 border-t dark:border-slate-600 space-y-1">
                                                {worker.defectReasons && worker.defectReasons.length > 0 && <p><strong>사유:</strong> {worker.defectReasons.join(', ')}</p>}
                                                {worker.action && <p><strong>처리:</strong> {worker.action}</p>}
                                                {worker.decisionMaker && <p><strong>결정자:</strong> {worker.decisionMaker}</p>}
                                            </div>
                                        )}
                                        <p className="text-xs whitespace-pre-wrap pt-2 border-t dark:border-slate-600">{worker.directInputResult}</p>
                                    </li>
                               )})}
                            </ul>
                         </dd>
                    </div>
                </>
            )}
        </dl>
    );
};

const InspectionSection: React.FC<{ title: string; inspections: QualityInspection[] | null; onEdit: (inspection: QualityInspection) => void; canManage: boolean; onAddNew: () => void; onImageClick: (url: string) => void; }> = ({ title, inspections, onEdit, canManage, onAddNew, onImageClick }) => (
    <div className="py-5 border-b border-gray-200 dark:border-slate-700 last:border-b-0">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-semibold text-gray-800 dark:text-white">{title} ({inspections?.length || 0}건)</h3>
            {canManage && (
                <button onClick={onAddNew} className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
                    + 추가입력
                </button>
            )}
        </div>
        {inspections && inspections.length > 0 ? (
            <div className="space-y-6">
                {inspections.map(inspection => (
                    <div key={inspection.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                검사일시: {new Date(inspection.createdAt).toLocaleString('ko-KR')}
                            </p>
                            {canManage && (
                                <button onClick={() => onEdit(inspection)} className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">수정</button>
                            )}
                        </div>
                        <InspectionDetailsList inspection={inspection} onImageClick={onImageClick} canManage={canManage} />
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-sm text-gray-500">해당 검사 기록이 없습니다.</p>
        )}
    </div>
);

const InspectionDetailModal: React.FC<{ 
    details: GroupedInspectionData; 
    onClose: () => void;
    currentUserProfile: UserProfile | null;
    onEdit: (inspection: QualityInspection) => void;
    onDelete: (orderNumber: string) => void;
    onAddComment: (orderNumber: string, commentText: string) => void;
    onAddNew: (type: InspectionType, commonData: GroupedInspectionData['common']) => void;
    addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}> = ({ details, onClose, currentUserProfile, onEdit, onDelete, onAddComment, onAddNew, addToast }) => {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const detailContentRef = useRef<HTMLDivElement>(null);
    const canManage = currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Manager';
    const isAdmin = currentUserProfile?.role === 'Admin';
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    if (!details.common) {
        return (
            <FullScreenModal isOpen={true} onClose={onClose} title="데이터 오류">
                <div className="p-6 text-center">
                    <p className="text-red-500 font-semibold">상세 정보를 표시할 수 없습니다.</p>
                    <p className="text-sm text-slate-500 mt-2">필수 데이터가 누락되었습니다. 관리자에게 문의하세요.</p>
                </div>
            </FullScreenModal>
        );
    }

    const { common, incoming, inProcess, outgoing, history, comments } = details;
    
    const allRelatedOrderNumbers = useMemo(() => {
        const numbers = new Set<string>();
        [...details.incoming, ...details.inProcess, ...details.outgoing].forEach(insp => {
            insp.relatedOrderNumbers?.forEach(num => numbers.add(num));
        });
        return Array.from(numbers).join(', ');
    }, [details]);

    const handleAddNew = (type: InspectionType) => {
        onAddNew(type, common);
    };

    const handleShare = async () => {
        const elementToCapture = detailContentRef.current;
        if (!elementToCapture) {
            addToast({ message: '공유할 대상을 찾을 수 없습니다.', type: 'error' });
            return;
        }

        addToast({ message: '이미지 생성 중...', type: 'info' });

        try {
            const canvas = await html2canvas(elementToCapture, {
                useCORS: true,
                backgroundColor: window.getComputedStyle(elementToCapture).backgroundColor,
                scale: 2,
            });

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            
            if (!blob) {
                addToast({ message: '이미지 파일 생성에 실패했습니다.', type: 'error' });
                return;
            }

            const fileName = `quality-inspection-${common?.orderNumber}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            const isDesktop = !/Mobi|Android/i.test(navigator.userAgent);

            if (isDesktop && navigator.clipboard?.write) {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                addToast({ message: '상세 정보 이미지가 클립보드에 복사되었습니다.', type: 'success' });
            } else if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `품질검사: ${common?.productName}`,
                    text: `T.M.S. 품질검사 상세 정보 공유`
                });
                addToast({ message: '요청 정보가 공유되었습니다.', type: 'success' });
            } else {
                 addToast({ message: '공유 기능이 지원되지 않아 이미지를 다운로드합니다.', type: 'info' });
                 const link = document.createElement('a');
                 link.download = fileName;
                 link.href = URL.createObjectURL(blob);
                 link.click();
                 URL.revokeObjectURL(link.href);
            }
        } catch (err: any) {
             if (err.name !== 'AbortError') {
                console.error('Sharing/Copying failed:', err);
                addToast({ message: '공유 또는 복사에 실패했습니다.', type: 'error' });
            }
        }
    };
    
    return (
        <>
            <FullScreenModal isOpen={!!details} onClose={onClose} title={`Q${common?.sequentialId || 'N/A'} / ${common?.orderNumber || ''} - ${common?.productName || ''}`}>
                <div ref={detailContentRef} className="bg-white dark:bg-slate-800">
                    {/* 공통 정보 */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <h3 className="text-base font-semibold text-gray-700 dark:text-slate-200 mb-3">공통 정보</h3>
                        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4">
                            <DetailSection title="발주번호" data={common.orderNumber} />
                            <DetailSection title="제품명" data={common.productName} />
                             <DetailSection title="관련 발주번호" data={allRelatedOrderNumbers} />
                            <DetailSection title="부속명" data={common.partName} />
                            <DetailSection title="사출원료" data={common.injectionMaterial} />
                            <DetailSection title="사출색상" data={common.injectionColor} />
                            <DetailSection title="발주처" data={common.supplier} />
                            <DetailSection title="발주수량" data={common.orderQuantity ? `${parseInt(common.orderQuantity, 10).toLocaleString('ko-KR')} ea` : ''} />
                            <DetailSection title="사양" data={common.specification} />
                            <DetailSection title="후공정" data={common.postProcess} />
                            <DetailSection title="작업라인" data={common.workLine} />
                        </dl>
                    </div>

                    <div className="mt-4">
                        <InspectionSection title="수입검사" inspections={incoming} onEdit={onEdit} canManage={canManage} onAddNew={() => handleAddNew('incoming')} onImageClick={setLightboxImage} />
                        <InspectionSection title="공정검사" inspections={inProcess} onEdit={onEdit} canManage={canManage} onAddNew={() => handleAddNew('inProcess')} onImageClick={setLightboxImage}/>
                        <InspectionSection title="출하검사" inspections={outgoing} onEdit={onEdit} canManage={canManage} onAddNew={() => handleAddNew('outgoing')} onImageClick={setLightboxImage}/>
                    </div>
                    
                    {/* 처리 이력 */}
                    <div className="mt-6 border-t dark:border-slate-700 pt-4">
                        <h4 className="font-semibold text-gray-700 dark:text-slate-200 mb-2">처리 이력</h4>
                        <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-400">
                        {history.map((h, index) => (
                          <li key={index} className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-md">
                            <span className="font-semibold w-full sm:w-32">{new Date(h.date).toLocaleString('ko-KR')}</span>
                            <span className="font-semibold w-12 text-gray-800 dark:text-slate-200 text-center">{h.user}</span>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[h.status as Status]}`}>{h.status}</span>
                            <span>{h.reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 댓글 */}
                    <CommentsSection comments={comments || []} onAddComment={(text) => onAddComment(details.orderNumber, text)} canComment={canManage} />
                    
                    {/* 액션 버튼 */}
                    <div className="mt-6 border-t dark:border-slate-700 pt-4 flex flex-wrap gap-2 justify-end">
                        <button onClick={handleShare} className="bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-600">이미지로 공유</button>
                        {isAdmin && (
                            <button onClick={() => setIsDeleteModalOpen(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700">
                                전체 기록 삭제
                            </button>
                        )}
                    </div>
                </div>
            </FullScreenModal>
            {lightboxImage && <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={() => { onDelete(details.orderNumber); setIsDeleteModalOpen(false); onClose(); }}
                title="삭제 확인"
                message={`'${details.productName}' (${details.orderNumber})의 모든 검사 기록을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
            />
        </>
    );
};

const ControlCenter: React.FC<{
    groupedData: GroupedInspectionData[];
    isLoading: boolean;
    onSelectDetails: (details: GroupedInspectionData) => void;
    filters: { type: string, value: any } | null;
    onClearFilters: () => void;
}> = ({ groupedData, isLoading, onSelectDetails, filters, onClearFilters }) => {
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


// --- Common Form Components ---

const InputGroup: React.FC<{ label: string; children?: React.ReactNode; className?: string }> = ({ label, children, className }) => (
    <div className={className}>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{label}</label>
        {children}
    </div>
);

const DateInput: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; name: string; }> = ({ value, onChange, name }) => (
    <input
        type="date"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-slate-50 dark:bg-slate-700/50"
        lang="ko"
    />
);

const TextInput: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; name: string; disabled?: boolean; onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void; }> = ({ value, onChange, name, disabled = false, onBlur }) => (
    <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        onBlur={onBlur}
        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-slate-50 dark:bg-slate-700/50 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:cursor-not-allowed dark:disabled:text-slate-400"
        lang="ko"
        
    />
);

const TextAreaInput: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; name: string; rows?: number }> = ({ value, onChange, name, rows = 3 }) => (
    <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-slate-50 dark:bg-slate-700/50"
        lang="ko"
    />
);

const SelectInput: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; name: string; options: readonly string[]; }> = ({ value, onChange, name, options }) => (
    <select
        name={name}
        value={value}
        onChange={onChange}
        lang="ko"
        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-slate-50 dark:bg-slate-700/50"
    >
        <option value="">선택...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
);

const DatalistInput: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; name: string; options: string[]; onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void; disabled?: boolean; }> = ({ value, onChange, name, options, onBlur, disabled }) => (
    <>
    <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        list={`${name}-list`}
        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-slate-50 dark:bg-slate-700/50 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:cursor-not-allowed dark:disabled:text-slate-400"
        lang="ko"
        
    />
    <datalist id={`${name}-list`}>
        {options.map(opt => <option key={opt} value={opt} />)}
    </datalist>
    </>
);

const QuantityInput: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; name: string; }> = ({ value, onChange, name }) => {
    const displayValue = value ? `${parseInt(value, 10).toLocaleString('ko-KR')}` : '';
    return (
        <div className="relative">
            <input
                type="text"
                name={name}
                value={displayValue}
                onChange={onChange}
                
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-slate-50 dark:bg-slate-700/50"
                inputMode="numeric"
                lang="ko"
            />
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">
                ea
            </span>
        </div>
    );
};

interface InspectionFormProps {
    currentUserProfile: UserProfile | null;
    onSubmit: (data: any, imageFiles: File[], deletedImages?: string[]) => void;
    onCancel?: () => void;
    existingInspection?: QualityInspection | null;
    isSaving: boolean;
    canManage: boolean;
    autocompleteData: AutocompleteData;
    addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
    prefilledData?: Partial<QualityInspection> | null;
}

// --- Incoming Inspection Form ---
const IncomingInspectionForm: React.FC<InspectionFormProps> = ({ currentUserProfile, onSubmit, onCancel, existingInspection, isSaving, canManage, autocompleteData, addToast, prefilledData }) => {
    const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');

    const getInitialState = () => ({
        inspectionDate: getLocalDate(), 
        orderNumber: 'T', 
        relatedOrderNumbers: ['T'],
        supplier: '', 
        productName: '', 
        partName: '', 
        injectionMaterial: '',
        injectionColor: '',
        orderQuantity: '',
        specification: '', 
        postProcess: '', 
        injectionCompany: '', 
        packagingInfo: '',
        appearanceHistory: '', 
        functionHistory: '', 
        result: '합격',
        resultReason: '',
        finalConsultationDept: '', 
        finalConsultationName: '', 
        finalConsultationRank: '',
        keywordPairs: [{ process: '', defect: '' }],
    });
    
    const [formData, setFormData] = useState(getInitialState());
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [deletedImages, setDeletedImages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

     useEffect(() => {
        // Load existing images when in edit mode
        if (existingInspection && existingInspection.imageUrls && existingInspection.imageUrls.length > 0) {
            setExistingImages(existingInspection.imageUrls);
            setImagePreviews(existingInspection.imageUrls);
        }
    }, [existingInspection]);

     useEffect(() => {
        // Cleanup object URLs to avoid memory leaks
        return () => {
            imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
        };
    }, [imagePreviews]);

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newPreviews = files.map(file => URL.createObjectURL(file as Blob | MediaSource));
            setImageFiles(prev => [...prev, ...files] as File[]);
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number) => {
        const imageUrl = imagePreviews[index];
        
        // 기존 이미지인지 새 이미지인지 확인
        if (existingImages.includes(imageUrl)) {
            // 기존 이미지 삭제 - deletedImages에 추가
            setDeletedImages(prev => [...prev, imageUrl]);
        } else {
            // 새 이미지 삭제 - imageFiles에서 제거
            const fileIndex = imagePreviews.findIndex((_, i) => i === index) - existingImages.length;
            if (fileIndex >= 0) {
                setImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
            }
        }
        
        // 미리보기에서 제거
        setImagePreviews(prev => {
            const newPreviews = prev.filter((_, i) => i !== index);
            // 새 이미지가 아닌 경우 URL 정리
            if (!existingImages.includes(imageUrl)) {
                URL.revokeObjectURL(imageUrl);
            }
            return newPreviews;
        });
    };
    
    useEffect(() => {
        const dataToLoad = existingInspection || prefilledData;
        if (dataToLoad) {
            const inspectionDate = dataToLoad.inspectionDate || (dataToLoad.createdAt ? getLocalDate(new Date(dataToLoad.createdAt)) : getLocalDate());
            const relatedOrderNumbers = (dataToLoad.relatedOrderNumbers && dataToLoad.relatedOrderNumbers.length > 0) ? dataToLoad.relatedOrderNumbers : ['T'];
            const keywordPairs = (dataToLoad.keywordPairs && dataToLoad.keywordPairs.length > 0) ? dataToLoad.keywordPairs : [{ process: '', defect: '' }];
            setFormData({
                ...getInitialState(),
                ...dataToLoad,
                inspectionDate,
                relatedOrderNumbers,
                keywordPairs,
            });
        } else {
            setFormData(getInitialState());
        }
    }, [existingInspection, prefilledData]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'orderNumber') {
            const digits = value.replace(/[^0-9]/g, '');
            let formatted = 'T';
            if (digits.length > 0) {
                if (digits.length <= 5) {
                    formatted += digits;
                } else {
                    formatted += `${digits.substring(0, 5)}-${digits.substring(5)}`;
                }
            }
            setFormData(prev => ({ ...prev, orderNumber: formatted }));
        } else if (name === 'orderQuantity') {
            const numericValue = value.replace(/[^0-9]/g, '');
            setFormData(prev => ({...prev, orderQuantity: numericValue}));
        }
         else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleRelatedOrderNumberChange = (index: number, value: string) => {
        const newRelatedOrderNumbers = [...(formData.relatedOrderNumbers || [])];
        newRelatedOrderNumbers[index] = value;
        setFormData({ ...formData, relatedOrderNumbers: newRelatedOrderNumbers });
    };

    const addRelatedOrderNumber = () => {
        setFormData(prev => ({ ...prev, relatedOrderNumbers: [...(prev.relatedOrderNumbers || []), 'T']}));
    };

    const removeRelatedOrderNumber = (index: number) => {
        setFormData(prev => ({ ...prev, relatedOrderNumbers: prev.relatedOrderNumbers.filter((_, i) => i !== index) }));
    };

    const handleKeywordPairChange = (index: number, field: 'process' | 'defect', value: string) => {
        setFormData(prev => {
            const newKeywordPairs = [...prev.keywordPairs];
            newKeywordPairs[index] = { ...newKeywordPairs[index], [field]: value };
            return { ...prev, keywordPairs: newKeywordPairs };
        });
    };

    const addKeywordPair = () => {
        setFormData(prev => ({ ...prev, keywordPairs: [...prev.keywordPairs, { process: '', defect: '' }] }));
    };

    const removeKeywordPair = (index: number) => {
        setFormData(prev => ({ ...prev, keywordPairs: prev.keywordPairs.filter((_, i) => i !== index) }));
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submissionData = {
            ...formData,
            keywordPairs: formData.keywordPairs.filter(p => p.process.trim() !== '' || p.defect.trim() !== ''),
        };
        onSubmit(submissionData, imageFiles, deletedImages);
        
        // Clear image states after form submission
        setTimeout(() => {
            setImagePreviews([]);
            setImageFiles([]);
            setExistingImages([]);
            setDeletedImages([]);
        }, 100);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    };

    const needsReason = ['불합격', '반출', '한도대기'].includes(formData.result as string);
    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-slate-300";

    return (
        <div className="h-full flex flex-col">
            <div className="lg:hidden sticky top-0 bg-slate-50 dark:bg-slate-900/50 backdrop-blur-sm z-10 p-2 -mx-2 mb-4 border-b dark:border-slate-700">
                <div className="flex justify-center items-center p-1 bg-gray-200 dark:bg-slate-700 rounded-lg">
                    <button type="button" onClick={() => setMobileView('form')} className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mobileView === 'form' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>입력</button>
                    <button type="button" onClick={() => setMobileView('preview')} className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mobileView === 'preview' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>미리보기</button>
                </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
                <div className={`flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm ${mobileView === 'preview' ? 'hidden lg:block' : 'block'} flex flex-col overflow-hidden`}>
                    <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
                        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">{existingInspection ? '수입검사 수정' : '수입검사'}</h2>
                        <form id="incoming-inspection-form" onSubmit={handleFormSubmit} onKeyDown={handleKeyDown} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <InputGroup label="검사일자"><DateInput name="inspectionDate" value={formData.inspectionDate} onChange={handleChange} /></InputGroup>
                                <InputGroup label="발주번호"><DatalistInput name="orderNumber" value={formData.orderNumber} options={[]} onChange={handleChange} /></InputGroup>
                                <InputGroup label="발주처"><DatalistInput name="supplier" value={formData.supplier} options={autocompleteData.suppliers} onChange={handleChange} /></InputGroup>
                                <InputGroup label="제품명"><DatalistInput name="productName" value={formData.productName} options={autocompleteData.productNames} onChange={handleChange} /></InputGroup>
                                
                                <InputGroup label="부속명"><DatalistInput name="partName" value={formData.partName} options={autocompleteData.partNames} onChange={handleChange} /></InputGroup>
                                <InputGroup label="사출원료"><SelectInput name="injectionMaterial" value={formData.injectionMaterial} options={injectionMaterialOptions} onChange={handleChange} /></InputGroup>
                                <InputGroup label="사출색상"><DatalistInput name="injectionColor" value={formData.injectionColor} options={autocompleteData.injectionColors.length > 0 ? autocompleteData.injectionColors : injectionColorOptions} onChange={handleChange} /></InputGroup>
                                <InputGroup label="발주수량"><QuantityInput name="orderQuantity" value={formData.orderQuantity} onChange={handleChange} /></InputGroup>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <InputGroup label="사양"><DatalistInput name="specification" value={formData.specification} options={autocompleteData.specifications} onChange={handleChange} /></InputGroup>
                                <InputGroup label="후공정"><SelectInput name="postProcess" value={formData.postProcess} options={postProcessOptions} onChange={handleChange} /></InputGroup>
                                <InputGroup label="사출처"><DatalistInput name="injectionCompany" value={formData.injectionCompany} options={autocompleteData.injectionCompanies} onChange={handleChange} /></InputGroup>
                                <InputGroup label="사출포장"><TextInput name="packagingInfo" value={formData.packagingInfo} onChange={handleChange} /></InputGroup>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <InputGroup label="공정/불량 키워드">
                                    <div className="space-y-3">
                                        {formData.keywordPairs.map((pair, index) => (
                                            <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                                                <DatalistInput name={`process-${index}`} value={pair.process} options={processKeywordOptions} onChange={e => handleKeywordPairChange(index, 'process', e.target.value)} />
                                                <DatalistInput name={`defect-${index}`} value={pair.defect} options={defectKeywordOptions} onChange={e => handleKeywordPairChange(index, 'defect', e.target.value)} />
                                                {formData.keywordPairs.length > 1 ? (
                                                    <button type="button" onClick={() => removeKeywordPair(index)} className="p-2 h-10 w-10 flex-shrink-0 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center">-</button>
                                                ) : <div className="w-10"></div>}
                                            </div>
                                        ))}
                                        <button type="button" onClick={addKeywordPair} className="w-full py-2 border border-dashed border-gray-400 dark:border-slate-500 rounded-md text-sm hover:bg-slate-100 dark:hover:bg-slate-700">키워드 쌍 추가</button>
                                    </div>
                                </InputGroup>
                                <InputGroup label="관련 발주번호">
                                    <div className="space-y-2">
                                        {(formData.relatedOrderNumbers || []).map((ro, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <TextInput name={`relatedOrderNumber-${index}`} value={ro} onChange={(e) => handleRelatedOrderNumberChange(index, e.target.value)} />
                                                {(formData.relatedOrderNumbers.length > 1) && (
                                                    <button type="button" onClick={() => removeRelatedOrderNumber(index)} className="p-2 h-10 w-10 flex-shrink-0 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center">-</button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={addRelatedOrderNumber} className="w-full py-2 border border-dashed border-gray-400 dark:border-slate-500 rounded-md text-sm hover:bg-slate-100 dark:hover:bg-slate-700">관련 발주번호 추가</button>
                                    </div>
                                </InputGroup>
                            </div>
                            <InputGroup label="외관검사이력"><TextAreaInput name="appearanceHistory" value={formData.appearanceHistory} onChange={handleChange} /></InputGroup>
                            <InputGroup label="기능검사이력"><TextAreaInput name="functionHistory" value={formData.functionHistory} onChange={handleChange} /></InputGroup>
                            
                             {(
                                // 신규 + 수정 모두에서 이미지 추가 허용
                                true
                              ) && (
                                <InputGroup label="이미지 첨부" className="md:col-span-2">
                                    <div className="mt-1 flex items-center gap-2">
                                        <input type="file" ref={fileInputRef} onChange={handleImageChange} multiple accept="image/*,image/heic,image/heif" className="hidden" />
                                        <input type="file" ref={cameraInputRef} onChange={handleImageChange} accept="image/*,image/heic,image/heif" className="hidden" />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-sm font-semibold border rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">파일 선택</button>
                                        <button type="button" onClick={() => cameraInputRef.current?.click()} className="px-4 py-2 text-sm font-semibold border rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">사진 촬영</button>
                                    </div>
                                    {imagePreviews.length > 0 && (
                                        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
                                            {imagePreviews.map((preview, index) => (
                                                <div key={index} className="relative">
                                                    <img src={preview} alt={`preview ${index}`} className="w-full h-24 object-cover rounded" />
                                                    <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </InputGroup>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 pt-4 border-t dark:border-slate-700">
                                <InputGroup label="결과" className="md:col-span-1">
                                    <SelectInput name="result" value={formData.result} options={incomingResultOptions} onChange={handleChange} />
                                </InputGroup>
                                <InputGroup label="최종협의(소속)" className="md:col-span-1"><SelectInput name="finalConsultationDept" value={formData.finalConsultationDept} options={consultationDeptOptions} onChange={handleChange} /></InputGroup>
                                <InputGroup label="최종협의(이름)" className="md:col-span-1"><DatalistInput name="finalConsultationName" value={formData.finalConsultationName} options={consultationNameOptions} onChange={handleChange} /></InputGroup>
                                <InputGroup label="최종협의(직급)" className="md:col-span-1"><DatalistInput name="finalConsultationRank" value={formData.finalConsultationRank} options={consultationRankOptions} onChange={handleChange} /></InputGroup>
                            </div>
                            {needsReason && (
                                <InputGroup label="결과 사유 (필수)">
                                    <TextAreaInput name="resultReason" value={formData.resultReason || ''} onChange={handleChange} />
                                </InputGroup>
                            )}
                        </form>
                    </div>
                    <div className="flex-shrink-0 p-4 border-t dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex justify-end gap-2">
                        {onCancel && <button type="button" onClick={() => { setImagePreviews([]); setImageFiles([]); setExistingImages([]); setDeletedImages([]); onCancel(); }} disabled={isSaving} className="bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white font-bold py-2.5 px-6 rounded-lg disabled:opacity-50">취소</button>}
                        <button type="submit" form="incoming-inspection-form" disabled={isSaving || !canManage} className="bg-primary-900 hover:bg-primary-800 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-colors disabled:bg-primary-700 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]">
                        {isSaving ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                저장 중...
                            </>
                        ) : '저장하기'}
                        </button>
                    </div>
                </div>
                 {!existingInspection && (
                    <div className={`w-full lg:w-[24rem] flex-shrink-0 ${mobileView === 'form' ? 'hidden lg:block' : 'block'}`}>
                        <div className="lg:sticky top-4 h-full"><InspectionPreviewCard inspectionType="수입" formData={formData} inspectorName={currentUserProfile?.displayName || '이름 없음'} /></div>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- In-Process Inspection Form ---
const InProcessInspectionForm: React.FC<InspectionFormProps> = ({ currentUserProfile, onSubmit, onCancel, existingInspection, isSaving, canManage, autocompleteData, addToast, prefilledData }) => {
    const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');
    
    const getInitialState = () => ({
        inspectionDate: getLocalDate(),
        orderNumber: 'T',
        relatedOrderNumbers: ['T'],
        supplier: '',
        productName: '',
        partName: '',
        injectionMaterial: '',
        injectionColor: '',
        orderQuantity: '',
        specification: '',
        postProcess: '',
        injectionCompany: '',
        keywordPairs: [{ process: '', defect: '' }],
        jigUsed: '',
        jigUsed2: '',
        internalJigLower: '',
        internalJigUpper: '',
        dryerUsed: '미사용' as '사용' | '미사용' | '',
        flameTreatment: '미사용' as '사용' | '미사용' | '',
        reliabilityTestResult: { result: '양호', action: '', decisionMaker: '' },
        colorCheckResult: { result: '견본과 색상동일', action: '', decisionMaker: '' },
        injectionPackaging: '',
        postProcessPackaging: '',
        preInspectionHistory: '',
        inProcessInspectionHistory: '',
        processLines: [{ workLine: '', lineSpeed: '', lineConditions: [{ type: '하도', value: '' }, { type: '상도', value: '' }], lampUsage: [] }] as ProcessLineData[],
        workerCount: '',
    });

    const [formData, setFormData] = useState(getInitialState());
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [deletedImages, setDeletedImages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

     useEffect(() => {
        // Load existing images when in edit mode
        if (existingInspection && existingInspection.imageUrls && existingInspection.imageUrls.length > 0) {
            setExistingImages(existingInspection.imageUrls);
            setImagePreviews(existingInspection.imageUrls);
        }
    }, [existingInspection]);

     useEffect(() => {
        // Cleanup object URLs to avoid memory leaks
        return () => {
            imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
        };
    }, [imagePreviews]);

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newPreviews = files.map(file => URL.createObjectURL(file as Blob | MediaSource));
            setImageFiles(prev => [...prev, ...files] as File[]);
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number) => {
        const imageUrl = imagePreviews[index];
        
        // 기존 이미지인지 새 이미지인지 확인
        if (existingImages.includes(imageUrl)) {
            // 기존 이미지 삭제 - deletedImages에 추가
            setDeletedImages(prev => [...prev, imageUrl]);
        } else {
            // 새 이미지 삭제 - imageFiles에서 제거
            const fileIndex = imagePreviews.findIndex((_, i) => i === index) - existingImages.length;
            if (fileIndex >= 0) {
                setImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
            }
        }
        
        // 미리보기에서 제거
        setImagePreviews(prev => {
            const newPreviews = prev.filter((_, i) => i !== index);
            // 새 이미지가 아닌 경우 URL 정리
            if (!existingImages.includes(imageUrl)) {
                URL.revokeObjectURL(imageUrl);
            }
            return newPreviews;
        });
    };
    
    useEffect(() => {
        const dataToLoad = existingInspection || prefilledData;
        if (dataToLoad) {
            const inspectionDate = dataToLoad.inspectionDate || (dataToLoad.createdAt ? getLocalDate(new Date(dataToLoad.createdAt)) : getLocalDate());
            const relatedOrderNumbers = (dataToLoad.relatedOrderNumbers && dataToLoad.relatedOrderNumbers.length > 0) ? dataToLoad.relatedOrderNumbers : ['T'];
            const keywordPairs = (dataToLoad.keywordPairs && dataToLoad.keywordPairs.length > 0) ? dataToLoad.keywordPairs : [{ process: '', defect: '' }];
            
            let processLines = dataToLoad.processLines || [];
            // @ts-ignore - Backward compatibility for old data structure
            if (processLines.length === 0 && (dataToLoad.workLine || dataToLoad.lineSpeed || dataToLoad.lineConditions || dataToLoad.lampUsage)) {
                processLines.push({
                    // @ts-ignore
                    workLine: dataToLoad.workLine || '',
                    // @ts-ignore
                    lineSpeed: dataToLoad.lineSpeed || '',
                    // @ts-ignore
                    lineConditions: dataToLoad.lineConditions || [{ type: '하도', value: '' }, { type: '상도', value: '' }],
                    // @ts-ignore
                    lampUsage: dataToLoad.lampUsage || [],
                });
            }
            if (processLines.length === 0) {
                 processLines.push({ workLine: '', lineSpeed: '', lineConditions: [{ type: '하도', value: '' }, { type: '상도', value: '' }], lampUsage: [] });
            }


            const reliabilityTestResult = typeof dataToLoad.reliabilityTestResult === 'string' 
                ? { result: dataToLoad.reliabilityTestResult, action: '', decisionMaker: '' } 
                : { result: '양호', action: '', decisionMaker: '', ...(dataToLoad.reliabilityTestResult || {}) };
        
            const colorCheckResult = typeof dataToLoad.colorCheckResult === 'string' 
                ? { result: dataToLoad.colorCheckResult, action: '', decisionMaker: '' } 
                : { result: '견본과 색상동일', action: '', decisionMaker: '', ...(dataToLoad.colorCheckResult || {}) };

            setFormData({
                ...getInitialState(),
                ...dataToLoad,
                inspectionDate,
                relatedOrderNumbers,
                keywordPairs,
                processLines,
                reliabilityTestResult,
                colorCheckResult,
                dryerUsed: dataToLoad.dryerUsed || '미사용',
                flameTreatment: dataToLoad.flameTreatment || '미사용',
            });
        } else {
            setFormData(getInitialState());
        }
    }, [existingInspection, prefilledData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'orderNumber') {
            const digits = value.replace(/[^0-9]/g, '');
            let formatted = 'T';
            if (digits.length > 0) {
                if (digits.length <= 5) {
                    formatted += digits;
                } else {
                    formatted += `${digits.substring(0, 5)}-${digits.substring(5)}`;
                }
            }
            setFormData(prev => ({ ...prev, orderNumber: formatted }));
        } else if (name === 'orderQuantity' || name === 'jigUsed' || name === 'workerCount' || name === 'internalJigLower' || name === 'internalJigUpper') {
            const numericValue = value.replace(/[^0-9]/g, '');
            setFormData(prev => ({...prev, [name]: numericValue}));
        }
         else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleComplexChange = (
        fieldName: 'reliabilityTestResult' | 'colorCheckResult', 
        subField: 'result' | 'action' | 'decisionMaker', 
        value: string
    ) => {
        const updatedField = {
            ...formData[fieldName],
            [subField]: value,
        };

        if (subField === 'result') {
            if (fieldName === 'reliabilityTestResult' && value === '양호') {
                updatedField.action = '';
                updatedField.decisionMaker = '';
            }
            if (fieldName === 'colorCheckResult' && value === '견본과 색상동일') {
                updatedField.action = '';
                updatedField.decisionMaker = '';
            }
        }

        setFormData(prev => ({
            ...prev,
            [fieldName]: updatedField,
        }));
    };
    
    const handleRelatedOrderNumberChange = (index: number, value: string) => {
        const newRelatedOrderNumbers = [...(formData.relatedOrderNumbers || [])];
        newRelatedOrderNumbers[index] = value;
        setFormData({ ...formData, relatedOrderNumbers: newRelatedOrderNumbers });
    };

    const addRelatedOrderNumber = () => {
        setFormData(prev => ({ ...prev, relatedOrderNumbers: [...(prev.relatedOrderNumbers || []), 'T']}));
    };

    const removeRelatedOrderNumber = (index: number) => {
        setFormData(prev => ({ ...prev, relatedOrderNumbers: prev.relatedOrderNumbers.filter((_, i) => i !== index) }));
    };

    const handleKeywordPairChange = (index: number, field: 'process' | 'defect', value: string) => {
        setFormData(prev => {
            const newKeywordPairs = [...prev.keywordPairs];
            newKeywordPairs[index] = { ...newKeywordPairs[index], [field]: value };
            return { ...prev, keywordPairs: newKeywordPairs };
        });
    };

    const addKeywordPair = () => {
        setFormData(prev => ({ ...prev, keywordPairs: [...prev.keywordPairs, { process: '', defect: '' }] }));
    };

    const removeKeywordPair = (index: number) => {
        setFormData(prev => ({ ...prev, keywordPairs: prev.keywordPairs.filter((_, i) => i !== index) }));
    };

    const handleProcessLineChange = (lineIndex: number, field: 'workLine' | 'lineSpeed', value: string) => {
        const newProcessLines = [...formData.processLines];
        if (field === 'lineSpeed') {
            newProcessLines[lineIndex][field] = value.replace(/[^0-9]/g, '');
        } else {
            newProcessLines[lineIndex][field] = value;
        }
        setFormData(prev => ({...prev, processLines: newProcessLines}));
    };

    const handleLineConditionChange = (lineIndex: number, condIndex: number, value: string) => {
        const newProcessLines = [...formData.processLines];
        const newLineConditions = [...(newProcessLines[lineIndex].lineConditions || [])];
        newLineConditions[condIndex].value = value;
        newProcessLines[lineIndex].lineConditions = newLineConditions;
        setFormData(prev => ({ ...prev, processLines: newProcessLines }));
    };
    
    const addLineCondition = (lineIndex: number, type: '하도' | '상도') => {
        const newProcessLines = [...formData.processLines];
        const lineConditions = [...(newProcessLines[lineIndex].lineConditions || [])];
        if(lineConditions.length < 4){
             lineConditions.push({ type, value: '' });
             newProcessLines[lineIndex].lineConditions = lineConditions;
             setFormData(prev => ({ ...prev, processLines: newProcessLines }));
        }
    };
    
    const removeLineCondition = (lineIndex: number, condIndex: number) => {
         const newProcessLines = [...formData.processLines];
         const lineConditions = (newProcessLines[lineIndex].lineConditions || []).filter((_, i) => i !== condIndex);
         newProcessLines[lineIndex].lineConditions = lineConditions;
         setFormData(prev => ({ ...prev, processLines: newProcessLines }));
    };
    
    const handleLampUsageChange = (lineIndex: number, lampNumber: number) => {
        setFormData(prev => {
            const newProcessLines = [...prev.processLines];
            const currentUsage = newProcessLines[lineIndex].lampUsage || [];
            const newUsage = currentUsage.includes(lampNumber)
                ? currentUsage.filter(n => n !== lampNumber)
                : [...currentUsage, lampNumber];
            newProcessLines[lineIndex].lampUsage = newUsage.sort((a, b) => a - b);
            return { ...prev, processLines: newProcessLines };
        });
    };
    
    const addProcessLine = () => {
        setFormData(prev => ({
            ...prev,
            processLines: [
                ...prev.processLines,
                { workLine: '', lineSpeed: '', lineConditions: [{ type: '하도', value: '' }, { type: '상도', value: '' }], lampUsage: [] }
            ]
        }));
    };
    
    const removeProcessLine = (lineIndex: number) => {
        setFormData(prev => ({
            ...prev,
            processLines: prev.processLines.filter((_, i) => i !== lineIndex)
        }));
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submissionData = {
            ...formData,
            keywordPairs: formData.keywordPairs.filter(p => p.process.trim() !== '' || p.defect.trim() !== ''),
            processLines: formData.processLines.map(line => ({
                ...line,
                lineConditions: line.lineConditions?.filter(c => c.value.trim() !== '')
            })),
        };
        onSubmit(submissionData, imageFiles, deletedImages);
        
        // Clear image states after form submission
        setTimeout(() => {
            setImagePreviews([]);
            setImageFiles([]);
            setExistingImages([]);
            setDeletedImages([]);
        }, 100);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    };
    
    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-slate-300";

    return (
        <div className="h-full flex flex-col">
            <div className="lg:hidden sticky top-0 bg-slate-50 dark:bg-slate-900/50 backdrop-blur-sm z-10 p-2 -mx-2 mb-4 border-b dark:border-slate-700">
                <div className="flex justify-center items-center p-1 bg-gray-200 dark:bg-slate-700 rounded-lg">
                    <button type="button" onClick={() => setMobileView('form')} className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mobileView === 'form' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>입력</button>
                    <button type="button" onClick={() => setMobileView('preview')} className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mobileView === 'preview' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>미리보기</button>
                </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
                <div className={`flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm ${mobileView === 'preview' ? 'hidden lg:block' : 'block'} flex flex-col overflow-hidden`}>
                    <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
                        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">{existingInspection ? '공정검사 수정' : '공정검사'}</h2>
                        <form id="in-process-inspection-form" onSubmit={handleFormSubmit} onKeyDown={handleKeyDown} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <InputGroup label="검사일자" className="md:col-span-1"><DateInput name="inspectionDate" value={formData.inspectionDate} onChange={handleChange} /></InputGroup>
                                <InputGroup label="발주번호" className="md:col-span-1"><DatalistInput name="orderNumber" value={formData.orderNumber} options={[]} onChange={handleChange} /></InputGroup>
                                <InputGroup label="발주처" className="md:col-span-1"><DatalistInput name="supplier" value={formData.supplier} options={autocompleteData.suppliers} onChange={handleChange} /></InputGroup>
                                <InputGroup label="제품명" className="md:col-span-1"><DatalistInput name="productName" value={formData.productName} options={autocompleteData.productNames} onChange={handleChange} /></InputGroup>

                                <InputGroup label="부속명" className="md:col-span-1"><DatalistInput name="partName" value={formData.partName} options={autocompleteData.partNames} onChange={handleChange} /></InputGroup>
                                <InputGroup label="사출원료" className="md:col-span-1"><SelectInput name="injectionMaterial" value={formData.injectionMaterial} options={injectionMaterialOptions} onChange={handleChange} /></InputGroup>
                                <InputGroup label="사출색상" className="md:col-span-1"><DatalistInput name="injectionColor" value={formData.injectionColor} options={autocompleteData.injectionColors.length > 0 ? autocompleteData.injectionColors : injectionColorOptions} onChange={handleChange} /></InputGroup>
                                <InputGroup label="발주수량" className="md:col-span-1"><QuantityInput name="orderQuantity" value={formData.orderQuantity} onChange={handleChange} /></InputGroup>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                                <InputGroup label="사양"><DatalistInput name="specification" value={formData.specification} options={autocompleteData.specifications} onChange={handleChange} /></InputGroup>
                                <InputGroup label="후공정"><SelectInput name="postProcess" value={formData.postProcess} options={postProcessOptions} onChange={handleChange} /></InputGroup>
                                <InputGroup label="사출처"><DatalistInput name="injectionCompany" value={formData.injectionCompany} options={autocompleteData.injectionCompanies} onChange={handleChange} /></InputGroup>
                                <InputGroup label="사용지그-1">
                                <div className="relative">
                                    <TextInput name="jigUsed" value={formData.jigUsed} onChange={handleChange} />
                                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">번지그</span>
                                </div>
                                </InputGroup>
                                <InputGroup label="사용지그-2">
                                    <SelectInput name="jigUsed2" value={formData.jigUsed2 || ''} options={jigUsed2Options} onChange={handleChange} />
                                </InputGroup>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <InputGroup label="내부코팅 사용지그 (하측지그)">
                                    <div className="relative">
                                        <TextInput name="internalJigLower" value={formData.internalJigLower || ''} onChange={handleChange} />
                                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">번지그</span>
                                    </div>
                                </InputGroup>
                                <InputGroup label="내부코팅 사용지그 (상측지그)">
                                    <div className="relative">
                                        <TextInput name="internalJigUpper" value={formData.internalJigUpper || ''} onChange={handleChange} />
                                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">번지그</span>
                                    </div>
                                </InputGroup>
                                <InputGroup label="드라이기사용">
                                    <div className="flex items-center space-x-4 h-10 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input type="radio" name="dryerUsed" value="사용" checked={formData.dryerUsed === '사용'} onChange={handleChange} className="form-radio text-primary-600 focus:ring-primary-500 bg-transparent" />
                                            <span>사용</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input type="radio" name="dryerUsed" value="미사용" checked={formData.dryerUsed === '미사용'} onChange={handleChange} className="form-radio text-primary-600 focus:ring-primary-500 bg-transparent" />
                                            <span>미사용</span>
                                        </label>
                                    </div>
                                </InputGroup>
                                <InputGroup label="화염처리진행">
                                    <div className="flex items-center space-x-4 h-10 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input type="radio" name="flameTreatment" value="사용" checked={formData.flameTreatment === '사용'} onChange={handleChange} className="form-radio text-primary-600 focus:ring-primary-500 bg-transparent" />
                                            <span>사용</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input type="radio" name="flameTreatment" value="미사용" checked={formData.flameTreatment === '미사용'} onChange={handleChange} className="form-radio text-primary-600 focus:ring-primary-500 bg-transparent" />
                                            <span>미사용</span>
                                        </label>
                                    </div>
                                </InputGroup>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <InputGroup label="관련 발주번호">
                                    <div className="space-y-2">
                                        {(formData.relatedOrderNumbers || []).map((ro, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <TextInput name={`relatedOrderNumber-${index}`} value={ro} onChange={(e) => handleRelatedOrderNumberChange(index, e.target.value)} />
                                                {(formData.relatedOrderNumbers.length > 1) && (
                                                    <button type="button" onClick={() => removeRelatedOrderNumber(index)} className="p-2 h-10 w-10 flex-shrink-0 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center">-</button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={addRelatedOrderNumber} className="w-full py-2 border border-dashed border-gray-400 dark:border-slate-500 rounded-md text-sm hover:bg-slate-100 dark:hover:bg-slate-700">관련 발주번호 추가</button>
                                    </div>
                                </InputGroup>
                                <InputGroup label="공정/불량 키워드">
                                    <div className="space-y-3">
                                        {formData.keywordPairs.map((pair, index) => (
                                            <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                                                <DatalistInput name={`process-${index}`} value={pair.process} options={processKeywordOptions} onChange={e => handleKeywordPairChange(index, 'process', e.target.value)} />
                                                <DatalistInput name={`defect-${index}`} value={pair.defect} options={defectKeywordOptions} onChange={e => handleKeywordPairChange(index, 'defect', e.target.value)} />
                                                {formData.keywordPairs.length > 1 ? (
                                                    <button type="button" onClick={() => removeKeywordPair(index)} className="p-2 h-10 w-10 flex-shrink-0 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center">-</button>
                                                ) : <div className="w-10"></div>}
                                            </div>
                                        ))}
                                        <button type="button" onClick={addKeywordPair} className="w-full py-2 border border-dashed border-gray-400 dark:border-slate-500 rounded-md text-sm hover:bg-slate-100 dark:hover:bg-slate-700">키워드 쌍 추가</button>
                                    </div>
                                </InputGroup>
                            </div>

                            <div className="space-y-4">
                                {formData.processLines.map((line, lineIndex) => (
                                    <div key={lineIndex} className="p-4 border dark:border-slate-700 rounded-lg space-y-4 bg-slate-50 dark:bg-slate-900/50 relative">
                                        {formData.processLines.length > 1 && (
                                            <button type="button" onClick={() => removeProcessLine(lineIndex)} className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full text-xs">&times;</button>
                                        )}
                                        <div className="grid grid-cols-1 lg:grid-cols-6 gap-5 items-start">
                                            <InputGroup label="작업라인" className="lg:col-span-1">
                                                <SelectInput name="workLine" value={line.workLine || ''} options={workLineOptions} onChange={(e) => handleProcessLineChange(lineIndex, 'workLine', e.target.value)} />
                                            </InputGroup>
                                            <InputGroup label="라인속도" className="lg:col-span-1">
                                                <div className="relative">
                                                    <TextInput name="lineSpeed" value={line.lineSpeed || ''} onChange={(e) => handleProcessLineChange(lineIndex, 'lineSpeed', e.target.value)} />
                                                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">rpm</span>
                                                </div>
                                            </InputGroup>
                                            <InputGroup label="라인조건(I.R)" className="lg:col-span-2">
                                                <div className="space-y-2">
                                                    {(line.lineConditions || []).map((condition, condIndex) => (
                                                        <div key={condIndex} className="flex items-center gap-2">
                                                            <span className="font-semibold w-12 text-center flex-shrink-0">{condition.type}</span>
                                                            <div className="relative flex-grow">
                                                                <input type="text" value={condition.value} onChange={(e) => handleLineConditionChange(lineIndex, condIndex, e.target.value)} className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" lang="ko"/>
                                                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 dark:text-slate-400">℃</span>
                                                            </div>
                                                            {(line.lineConditions?.length || 0) > 2 && <button type="button" onClick={() => removeLineCondition(lineIndex, condIndex)} className="p-2 h-10 w-10 flex-shrink-0 bg-red-600 text-white rounded-md hover:bg-red-700">-</button>}
                                                        </div>
                                                    ))}
                                                    <div className="flex gap-2 pt-1">
                                                        <button type="button" onClick={() => addLineCondition(lineIndex, '하도')} className="flex-1 py-1 border border-dashed rounded text-xs">하도 추가</button>
                                                        <button type="button" onClick={() => addLineCondition(lineIndex, '상도')} className="flex-1 py-1 border border-dashed rounded text-xs">상도 추가</button>
                                                    </div>
                                                </div>
                                            </InputGroup>
                                            <InputGroup label="램프사용" className="lg:col-span-2">
                                                <div className="grid grid-cols-4 gap-2 p-2 bg-white dark:bg-slate-700/50 rounded-md justify-items-center">
                                                    {Array.from({length: 8}, (_, i) => i + 1).map(num => (
                                                        <label key={num} className="flex items-center justify-center w-10 h-10 rounded-full has-[:checked]:bg-primary-600 has-[:checked]:text-white cursor-pointer transition-colors border border-slate-300 dark:border-slate-600 has-[:checked]:border-primary-600">
                                                            <input type="checkbox" checked={line.lampUsage?.includes(num) || false} onChange={() => handleLampUsageChange(lineIndex, num)} className="sr-only"/>
                                                            <span>{num}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </InputGroup>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={addProcessLine} className="w-full py-2 border border-dashed border-gray-400 dark:border-slate-500 rounded-md text-sm hover:bg-slate-100 dark:hover:bg-slate-700">라인 정보 세트 추가</button>
                            </div>
                            
                            {(
                                // 신규 + 수정 모두에서 이미지 추가 허용
                                true
                              ) && (
                                <InputGroup label="이미지 첨부" className="md:col-span-2">
                                    <div className="mt-1 flex items-center gap-2">
                                        <input type="file" ref={fileInputRef} onChange={handleImageChange} multiple accept="image/*,image/heic,image/heif" className="hidden" />
                                        <input type="file" ref={cameraInputRef} onChange={handleImageChange} accept="image/*,image/heic,image/heif" className="hidden" />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-sm font-semibold border rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">파일 선택</button>
                                        <button type="button" onClick={() => cameraInputRef.current?.click()} className="px-4 py-2 text-sm font-semibold border rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">사진 촬영</button>
                                    </div>
                                    {imagePreviews.length > 0 && (
                                        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
                                            {imagePreviews.map((preview, index) => (
                                                <div key={index} className="relative">
                                                    <img src={preview} alt={`preview ${index}`} className="w-full h-24 object-cover rounded" />
                                                    <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </InputGroup>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <InputGroup label="신뢰성테스트결과"><SelectInput name="reliabilityTestResult" value={formData.reliabilityTestResult.result} options={reliabilityResultOptions} onChange={(e) => handleComplexChange('reliabilityTestResult', 'result', e.target.value)} /></InputGroup>
                                <InputGroup label="색상체크결과"><SelectInput name="colorCheckResult" value={formData.colorCheckResult.result} options={colorCheckResultOptions} onChange={(e) => handleComplexChange('colorCheckResult', 'result', e.target.value)} /></InputGroup>
                                <InputGroup label="사출포장"><TextAreaInput name="injectionPackaging" value={formData.injectionPackaging} onChange={handleChange} rows={1} /></InputGroup>
                                <InputGroup label="후가공포장"><TextAreaInput name="postProcessPackaging" value={formData.postProcessPackaging} onChange={handleChange} rows={1} /></InputGroup>
                            </div>
                            {(formData.reliabilityTestResult.result === '부분박리' || formData.reliabilityTestResult.result === '박리') && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                                    <InputGroup label="처리 결과 (신뢰성)"><TextInput name="reliabilityResultAction" value={formData.reliabilityTestResult.action || ''} onChange={(e) => handleComplexChange('reliabilityTestResult', 'action', e.target.value)}/></InputGroup>
                                    <InputGroup label="결정자 (신뢰성)"><DatalistInput name="reliabilityResultDecisionMaker" value={formData.reliabilityTestResult.decisionMaker || ''} options={consultationNameOptions} onChange={(e) => handleComplexChange('reliabilityTestResult', 'decisionMaker', e.target.value)}/></InputGroup>
                                </div>
                            )}
                            {formData.colorCheckResult.result === '색상편차발생' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                                    <InputGroup label="처리 결과 (색상)"><TextInput name="colorCheckResultAction" value={formData.colorCheckResult.action || ''} onChange={(e) => handleComplexChange('colorCheckResult', 'action', e.target.value)}/></InputGroup>
                                    <InputGroup label="결정자 (색상)"><DatalistInput name="colorCheckResultDecisionMaker" value={formData.colorCheckResult.decisionMaker || ''} options={consultationNameOptions} onChange={(e) => handleComplexChange('colorCheckResult', 'decisionMaker', e.target.value)}/></InputGroup>
                                </div>
                            )}

                            <InputGroup label="사전검사이력"><TextAreaInput name="preInspectionHistory" value={formData.preInspectionHistory} onChange={handleChange} /></InputGroup>
                            <InputGroup label="공정검사이력"><TextAreaInput name="inProcessInspectionHistory" value={formData.inProcessInspectionHistory} onChange={handleChange} /></InputGroup>
                        </form>
                    </div>
                    <div className="flex-shrink-0 p-4 border-t dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex justify-end gap-2">
                        {onCancel && <button type="button" onClick={() => { setImagePreviews([]); setImageFiles([]); setExistingImages([]); setDeletedImages([]); onCancel(); }} disabled={isSaving} className="bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white font-bold py-2.5 px-6 rounded-lg disabled:opacity-50">취소</button>}
                        <button type="submit" form="in-process-inspection-form" disabled={isSaving || !canManage} className="bg-primary-900 hover:bg-primary-800 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-colors disabled:bg-primary-700 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]">
                        {isSaving ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                저장 중...
                            </>
                        ) : '저장하기'}
                        </button>
                    </div>
                </div>
                {!existingInspection && (
                    <div className={`w-full lg:w-[24rem] flex-shrink-0 ${mobileView === 'form' ? 'hidden lg:block' : 'block'}`}>
                         <div className="lg:sticky top-4 h-full"><InspectionPreviewCard inspectionType="공정" formData={formData} inspectorName={currentUserProfile?.displayName || '이름 없음'} /></div>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- Outgoing Inspection Form ---
const OutgoingInspectionForm: React.FC<InspectionFormProps> = ({ currentUserProfile, onSubmit, onCancel, existingInspection, isSaving, canManage, autocompleteData, addToast, prefilledData }) => {
    const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');
    
    const getInitialState = () => ({
        inspectionDate: getLocalDate(),
        orderNumber: 'T',
        relatedOrderNumbers: ['T'],
        supplier: '',
        productName: '',
        partName: '',
        injectionMaterial: '',
        injectionColor: '',
        orderQuantity: '',
        specification: '',
        postProcess: '',
        injectionCompany: '',
        workLine: '',
        workerCount: '1',
        workers: [{ name: '', totalInspected: 0, defectQuantity: 0, result: '합격' as WorkerResult, defectReasons: [], directInputResult: '', action: '', decisionMaker: '' }] as WorkerInspectionData[],
        reliabilityReview: { method: '' as ReliabilityReview['method'], result: '양호' as ReliabilityReview['result'], action: '', decisionMaker: '' } as ReliabilityReview,
        reinspectionKeyword: '',
        reinspectionContent: '',
    });
    
    const [formData, setFormData] = useState(getInitialState());
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [deletedImages, setDeletedImages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

     useEffect(() => {
        // Load existing images when in edit mode
        if (existingInspection && existingInspection.imageUrls && existingInspection.imageUrls.length > 0) {
            setExistingImages(existingInspection.imageUrls);
            setImagePreviews(existingInspection.imageUrls);
        }
    }, [existingInspection]);

     useEffect(() => {
        // Cleanup object URLs to avoid memory leaks
        return () => {
            imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
        };
    }, [imagePreviews]);

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newPreviews = files.map(file => URL.createObjectURL(file as Blob | MediaSource));
            setImageFiles(prev => [...prev, ...files] as File[]);
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number) => {
        const imageUrl = imagePreviews[index];
        
        // 기존 이미지인지 새 이미지인지 확인
        if (existingImages.includes(imageUrl)) {
            // 기존 이미지 삭제 - deletedImages에 추가
            setDeletedImages(prev => [...prev, imageUrl]);
        } else {
            // 새 이미지 삭제 - imageFiles에서 제거
            const fileIndex = imagePreviews.findIndex((_, i) => i === index) - existingImages.length;
            if (fileIndex >= 0) {
                setImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
            }
        }
        
        // 미리보기에서 제거
        setImagePreviews(prev => {
            const newPreviews = prev.filter((_, i) => i !== index);
            // 새 이미지가 아닌 경우 URL 정리
            if (!existingImages.includes(imageUrl)) {
                URL.revokeObjectURL(imageUrl);
            }
            return newPreviews;
        });
    };
    
    useEffect(() => {
        const dataToLoad = existingInspection || prefilledData;
        if (dataToLoad) {
            const inspectionDate = dataToLoad.inspectionDate || (dataToLoad.createdAt ? getLocalDate(new Date(dataToLoad.createdAt)) : getLocalDate());
            const relatedOrderNumbers = (dataToLoad.relatedOrderNumbers && dataToLoad.relatedOrderNumbers.length > 0) ? dataToLoad.relatedOrderNumbers : ['T'];
            
            const loadedWorkers = (dataToLoad.workers as any[] | undefined)?.map(w => ({
                name: w.name || '',
                totalInspected: w.totalInspected || 0,
                defectQuantity: w.defectQuantity || 0,
                result: ['합격', '불합격'].includes(w.result) ? w.result : '합격',
                defectReasons: w.defectReasons || [],
                directInputResult: w.directInputResult ?? (w.result && !['합격', '불합격'].includes(w.result) ? w.result : ''),
                action: w.action || '',
                decisionMaker: w.decisionMaker || ''
            })) || [];

            const workers = loadedWorkers.length > 0 ? loadedWorkers : [{ name: '', totalInspected: 0, defectQuantity: 0, result: '합격' as WorkerResult, defectReasons: [], directInputResult: '', action: '', decisionMaker: '' }];
             // @ts-ignore
             const workLine = dataToLoad.workLine || dataToLoad.processLines?.[0]?.workLine || '';
             const reliabilityReview = dataToLoad.reliabilityReview || { method: '', result: '양호', action: '', decisionMaker: '' };

            setFormData({
                ...getInitialState(),
                ...dataToLoad,
                inspectionDate,
                relatedOrderNumbers,
                workers,
                workLine,
                workerCount: String(workers.length),
                reliabilityReview
            });
        } else {
            setFormData(getInitialState());
        }
    }, [existingInspection, prefilledData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'orderNumber') {
            const digits = value.replace(/[^0-9]/g, '');
            let formatted = 'T';
            if (digits.length > 0) {
                if (digits.length <= 5) {
                    formatted += digits;
                } else {
                    formatted += `${digits.substring(0, 5)}-${digits.substring(5)}`;
                }
            }
            setFormData(prev => ({ ...prev, orderNumber: formatted }));
        } else if (name === 'orderQuantity') {
            const numericValue = value.replace(/[^0-9]/g, '');
            setFormData(prev => ({...prev, orderQuantity: numericValue}));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleRelatedOrderNumberChange = (index: number, value: string) => {
        const newRelatedOrderNumbers = [...(formData.relatedOrderNumbers || [])];
        newRelatedOrderNumbers[index] = value;
        setFormData({ ...formData, relatedOrderNumbers: newRelatedOrderNumbers });
    };

    const addRelatedOrderNumber = () => {
        setFormData(prev => ({ ...prev, relatedOrderNumbers: [...(prev.relatedOrderNumbers || []), 'T']}));
    };

    const removeRelatedOrderNumber = (index: number) => {
        setFormData(prev => ({ ...prev, relatedOrderNumbers: prev.relatedOrderNumbers.filter((_, i) => i !== index) }));
    };
    
    const handleWorkerCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/[^0-9]/g, '');
        let count = parseInt(rawValue, 10) || 0;
        count = Math.max(0, Math.min(count, 20)); // Cap at 20 for performance
        
        setFormData(prev => {
            const newWorkers: WorkerInspectionData[] = Array.from({ length: count }, (_, i) => 
                prev.workers[i] || { name: '', totalInspected: 0, defectQuantity: 0, result: '합격', defectReasons: [], directInputResult: '', action: '', decisionMaker: '' }
            );
            return { ...prev, workerCount: rawValue, workers: newWorkers };
        });
    };

    const handleWorkerChange = (index: number, field: keyof WorkerInspectionData, value: string) => {
        setFormData(prev => {
            const newWorkers = [...prev.workers];
            const worker = { ...newWorkers[index] };

            if (field === 'totalInspected' || field === 'defectQuantity') {
                worker[field] = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
            } else {
                (worker as any)[field] = value;
            }
            
            if (field === 'result' && value === '합격') {
                worker.defectReasons = [];
                worker.action = '';
                worker.decisionMaker = '';
            }

            newWorkers[index] = worker;
            return { ...prev, workers: newWorkers };
        });
    };
    
    const handleWorkerDefectReasonChange = (index: number, reason: DefectReason) => {
        setFormData(prev => {
            const newWorkers = [...prev.workers];
            const worker = { ...newWorkers[index] };
            
            const currentReasons = worker.defectReasons || [];
            const reasonIndex = currentReasons.indexOf(reason);

            if (reasonIndex > -1) {
                worker.defectReasons = currentReasons.filter(r => r !== reason);
            } else {
                worker.defectReasons = [...currentReasons, reason];
            }
            
            newWorkers[index] = worker;
            return { ...prev, workers: newWorkers };
        });
    };

    const handleReliabilityReviewChange = (field: keyof ReliabilityReview, value: string) => {
        setFormData(prev => {
            const newReview = { ...(prev.reliabilityReview || {}), [field]: value } as ReliabilityReview;
            if (field === 'result' && value === '양호') {
                newReview.action = '';
                newReview.decisionMaker = '';
            }
            return { ...prev, reliabilityReview: newReview };
        });
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData, imageFiles, deletedImages);
        
        // Clear image states after form submission
        setTimeout(() => {
            setImagePreviews([]);
            setImageFiles([]);
            setExistingImages([]);
            setDeletedImages([]);
        }, 100);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    };
    
    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-slate-300";

    return (
        <div className="h-full flex flex-col">
            <div className="lg:hidden sticky top-0 bg-slate-50 dark:bg-slate-900/50 backdrop-blur-sm z-10 p-2 -mx-2 mb-4 border-b dark:border-slate-700">
                <div className="flex justify-center items-center p-1 bg-gray-200 dark:bg-slate-700 rounded-lg">
                    <button type="button" onClick={() => setMobileView('form')} className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mobileView === 'form' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>입력</button>
                    <button type="button" onClick={() => setMobileView('preview')} className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mobileView === 'preview' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>미리보기</button>
                </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
                <div className={`flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm ${mobileView === 'preview' ? 'hidden lg:block' : 'block'} flex flex-col overflow-hidden`}>
                    <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
                        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">{existingInspection ? '출하검사 수정' : '출하검사'}</h2>
                        <form id="outgoing-inspection-form" onSubmit={handleFormSubmit} onKeyDown={handleKeyDown} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <InputGroup label="검사일자"><DateInput name="inspectionDate" value={formData.inspectionDate} onChange={handleChange} /></InputGroup>
                                <InputGroup label="발주번호"><DatalistInput name="orderNumber" value={formData.orderNumber} options={[]} onChange={handleChange} /></InputGroup>
                                <InputGroup label="발주처"><DatalistInput name="supplier" value={formData.supplier} options={autocompleteData.suppliers} onChange={handleChange} /></InputGroup>
                                <InputGroup label="제품명"><DatalistInput name="productName" value={formData.productName} options={autocompleteData.productNames} onChange={handleChange} /></InputGroup>
                                <InputGroup label="부속명"><DatalistInput name="partName" value={formData.partName} options={autocompleteData.partNames} onChange={handleChange} /></InputGroup>
                                <InputGroup label="사출원료"><SelectInput name="injectionMaterial" value={formData.injectionMaterial} options={injectionMaterialOptions} onChange={handleChange} /></InputGroup>
                                <InputGroup label="사출색상"><DatalistInput name="injectionColor" value={formData.injectionColor} options={autocompleteData.injectionColors.length > 0 ? autocompleteData.injectionColors : injectionColorOptions} onChange={handleChange} /></InputGroup>
                                <InputGroup label="발주수량"><QuantityInput name="orderQuantity" value={formData.orderQuantity} onChange={handleChange} /></InputGroup>
                                <InputGroup label="사양"><DatalistInput name="specification" value={formData.specification} options={autocompleteData.specifications} onChange={handleChange} /></InputGroup>
                                <InputGroup label="후공정"><SelectInput name="postProcess" value={formData.postProcess} options={postProcessOptions} onChange={handleChange} /></InputGroup>
                                <InputGroup label="사출처"><DatalistInput name="injectionCompany" value={formData.injectionCompany} options={autocompleteData.injectionCompanies} onChange={handleChange} /></InputGroup>
                                <InputGroup label="작업라인"><DatalistInput name="workLine" value={formData.workLine || ''} options={workLineOptions} onChange={handleChange} /></InputGroup>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <InputGroup label="재검사요청 키워드"><DatalistInput name="reinspectionKeyword" value={formData.reinspectionKeyword || ''} options={reinspectionKeywordOptions} onChange={handleChange} /></InputGroup>
                                <InputGroup label="재검사요청 내용"><TextAreaInput name="reinspectionContent" value={formData.reinspectionContent || ''} onChange={handleChange} rows={1} /></InputGroup>
                            </div>
                            
                            {(
                                // 신규 + 수정 모두에서 이미지 추가 허용
                                true
                              ) && (
                                <InputGroup label="이미지 첨부" className="md:col-span-2">
                                    <div className="mt-1 flex items-center gap-2">
                                        <input type="file" ref={fileInputRef} onChange={handleImageChange} multiple accept="image/*,image/heic,image/heif" className="hidden" />
                                        <input type="file" ref={cameraInputRef} onChange={handleImageChange} accept="image/*,image/heic,image/heif" className="hidden" />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-sm font-semibold border rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">파일 선택</button>
                                        <button type="button" onClick={() => cameraInputRef.current?.click()} className="px-4 py-2 text-sm font-semibold border rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">사진 촬영</button>
                                    </div>
                                    {imagePreviews.length > 0 && (
                                        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
                                            {imagePreviews.map((preview, index) => (
                                                <div key={index} className="relative">
                                                    <img src={preview} alt={`preview ${index}`} className="w-full h-24 object-cover rounded" />
                                                    <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </InputGroup>
                            )}

                            <div className="pt-4 border-t dark:border-slate-700">
                                <InputGroup label="작업자 인원수"><TextInput name="workerCount" value={formData.workerCount} onChange={handleWorkerCountChange} /></InputGroup>
                            </div>
                            {formData.workers.map((worker, index) => (
                                <div key={index} className="p-4 border dark:border-slate-700 rounded-lg space-y-4 bg-slate-50 dark:bg-slate-900/50">
                                    <h4 className="font-semibold">작업자 {index + 1}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <InputGroup label="이름"><DatalistInput name={`worker-name-${index}`} value={worker.name} options={consultationNameOptions} onChange={e => handleWorkerChange(index, 'name', e.target.value)} /></InputGroup>
                                        <InputGroup label="총 검사 수량"><TextInput name={`worker-total-${index}`} value={worker.totalInspected?.toLocaleString() ?? '0'} onChange={e => handleWorkerChange(index, 'totalInspected', e.target.value.replace(/[^0-9]/g, ''))} /></InputGroup>
                                        <InputGroup label="불량 수량"><TextInput name={`worker-defect-${index}`} value={worker.defectQuantity?.toLocaleString() ?? '0'} onChange={e => handleWorkerChange(index, 'defectQuantity', e.target.value.replace(/[^0-9]/g, ''))} /></InputGroup>
                                        <InputGroup label="결과"><SelectInput name={`worker-result-${index}`} value={worker.result} options={workerResultOptions} onChange={e => handleWorkerChange(index, 'result', e.target.value)} /></InputGroup>
                                    </div>
                                    {worker.result === '불합격' && (
                                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md space-y-4">
                                            <InputGroup label="불합격 사유 (복수 선택 가능)">
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                                                    {defectReasonOptions.map(reason => (
                                                        <label key={reason} className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={worker.defectReasons?.includes(reason)} onChange={() => handleWorkerDefectReasonChange(index, reason)} /><span>{reason}</span></label>
                                                    ))}
                                                </div>
                                            </InputGroup>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <InputGroup label="처리"><TextInput name={`worker-action-${index}`} value={worker.action || ''} onChange={e => handleWorkerChange(index, 'action', e.target.value)} /></InputGroup>
                                                <InputGroup label="결정자"><DatalistInput name={`worker-decision-${index}`} value={worker.decisionMaker || ''} options={consultationNameOptions} onChange={e => handleWorkerChange(index, 'decisionMaker', e.target.value)} /></InputGroup>
                                            </div>
                                        </div>
                                    )}
                                    <InputGroup label="직접 입력 결과"><TextAreaInput name={`worker-direct-${index}`} value={worker.directInputResult} onChange={e => handleWorkerChange(index, 'directInputResult', e.target.value)} rows={2} /></InputGroup>
                                </div>
                            ))}
                            
                            <div className="pt-4 border-t dark:border-slate-700">
                                <h4 className="font-semibold mb-2">신뢰성 검토</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                    <InputGroup label="방식"><SelectInput name="reliabilityMethod" value={formData.reliabilityReview.method} options={reliabilityMethodOptions} onChange={e => handleReliabilityReviewChange('method', e.target.value)} /></InputGroup>
                                    <InputGroup label="결과"><SelectInput name="reliabilityResult" value={formData.reliabilityReview.result} options={reliabilityResultOptionsOutgoing} onChange={e => handleReliabilityReviewChange('result', e.target.value)} /></InputGroup>
                                    {(formData.reliabilityReview.result === '부분박리' || formData.reliabilityReview.result === '박리') && (
                                        <>
                                        <InputGroup label="처리"><TextInput name="reliabilityAction" value={formData.reliabilityReview.action || ''} onChange={e => handleReliabilityReviewChange('action', e.target.value)} /></InputGroup>
                                        <InputGroup label="결정자"><DatalistInput name="reliabilityDecisionMaker" value={formData.reliabilityReview.decisionMaker || ''} options={consultationNameOptions} onChange={e => handleReliabilityReviewChange('decisionMaker', e.target.value)} /></InputGroup>
                                        </>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                    <div className="flex-shrink-0 p-4 border-t dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex justify-end gap-2">
                        {onCancel && <button type="button" onClick={() => { setImagePreviews([]); setImageFiles([]); setExistingImages([]); setDeletedImages([]); onCancel(); }} disabled={isSaving} className="bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white font-bold py-2.5 px-6 rounded-lg disabled:opacity-50">취소</button>}
                        <button type="submit" form="outgoing-inspection-form" disabled={isSaving || !canManage} className="bg-primary-900 hover:bg-primary-800 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-colors disabled:bg-primary-700 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]">
                            {isSaving ? '저장 중...' : '저장하기'}
                        </button>
                    </div>
                </div>
                {!existingInspection && (
                    <div className={`w-full lg:w-[24rem] flex-shrink-0 ${mobileView === 'form' ? 'hidden lg:block' : 'block'}`}>
                         <div className="lg:sticky top-4 h-full"><InspectionPreviewCard inspectionType="출하" formData={formData} inspectorName={currentUserProfile?.displayName || '이름 없음'} /></div>
                    </div>
                )}
            </div>
        </div>
    );
};


const CircleCenter: React.FC<{
    currentUserProfile: UserProfile | null;
    addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
    onUpdateInspection: (id: string, updates: Partial<QualityInspection>, reason?: string) => Promise<void>;
    prefilledData: Partial<QualityInspection> | null;
    onPrefillHandled: () => void;
    existingInspection: QualityInspection | null;
    onEditHandled: () => void;
    initialTab?: ActiveCircleCenterTab | null;
    onInitialTabHandled?: () => void;
    // FIX: Add 'inspections' to the props interface to resolve TypeScript error.
    inspections: QualityInspection[];
}> = ({ currentUserProfile, addToast, onUpdateInspection, prefilledData, onPrefillHandled, existingInspection, onEditHandled, initialTab, onInitialTabHandled, inspections }) => {
    const [activeTab, setActiveTab] = useState<ActiveCircleCenterTab>('incoming');
    const [isSaving, setIsSaving] = useState(false);
    const [autocompleteData, setAutocompleteData] = useState<AutocompleteData>({ suppliers: [], productNames: [], partNames: [], injectionColors: [], specifications: [], injectionCompanies: [] });

    useEffect(() => {
        if (existingInspection) {
            setActiveTab(existingInspection.inspectionType);
        } else if (initialTab && onInitialTabHandled) {
            setActiveTab(initialTab);
            onInitialTabHandled();
        }
    }, [existingInspection, initialTab, onInitialTabHandled]);

    useEffect(() => {
        const unsubscribe = db.collection('quality-inspections').limit(500).onSnapshot(snapshot => {
            const data: AutocompleteData = { suppliers: [], productNames: [], partNames: [], injectionColors: [], specifications: [], injectionCompanies: [] };
            snapshot.docs.forEach(doc => {
                const inspection = doc.data() as QualityInspection;
                if (inspection.supplier) data.suppliers.push(inspection.supplier);
                if (inspection.productName) data.productNames.push(inspection.productName);
                if (inspection.partName) data.partNames.push(inspection.partName);
                if (inspection.injectionColor) data.injectionColors.push(inspection.injectionColor);
                if (inspection.specification) data.specifications.push(inspection.specification);
                if (inspection.injectionCompany) data.injectionCompanies.push(inspection.injectionCompany);
            });
            Object.keys(data).forEach(key => {
                // @ts-ignore
                data[key] = [...new Set(data[key])].sort(sortKorean);
            });
            setAutocompleteData(data);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if(prefilledData) {
            addToast({ message: '선택한 항목의 기본 정보가 자동으로 입력되었습니다.', type: 'info' });
        }
    }, [prefilledData, addToast]);
    
    const handleFormSubmit = async (formData: any, imageFiles: File[], deletedImages: string[] = []) => {
        if (!currentUserProfile) {
            addToast({ message: '로그인이 필요합니다.', type: 'error' });
            return;
        }
    
        setIsSaving(true);
        try {
            if (existingInspection || formData.id) {
                const docId = existingInspection?.id || formData.id;
                if (!docId) {
                  throw new Error("Cannot update inspection without an ID.");
                }
                const { id, createdAt, history, inspector, ...dataToSave } = formData;
                await onUpdateInspection(docId, dataToSave, '사용자에 의해 수정됨');

                // 이미지 삭제 처리 (Storage에서 삭제)
                if (deletedImages.length > 0) {
                    await Promise.all(
                        deletedImages.map(async (url) => {
                            try {
                                const ref = storage.refFromURL(url);
                                await ref.delete();
                            } catch (error) {
                                console.error('Failed to delete image:', error);
                            }
                        })
                    );
                }

                // 이미지 추가/교체 업로드 처리
                if (imageFiles && imageFiles.length > 0) {
                    const progressToastId = Date.now() + Math.random();
                    addToast({ 
                        message: `이미지 업로드 중...`, 
                        type: 'progress',
                        progress: { current: 0, total: imageFiles.length }
                    });
                    
                    const addedUrls = await Promise.all(
                        imageFiles.map(async (file, index) => {
                            const uniqueFileName = `${Date.now()}-${file.name}`;
                            const imageRef = storage.ref(`quality-inspection-images/${docId}/${uniqueFileName}`);
                            const snapshot = await imageRef.put(file);
                            const downloadURL = await snapshot.ref.getDownloadURL();
                            
                            // 진행도 업데이트
                            addToast({ 
                                message: `이미지 업로드 중...`, 
                                type: 'progress',
                                progress: { current: index + 1, total: imageFiles.length }
                            });
                            
                            return downloadURL;
                        })
                    );
                    
                    // 기존 목록에서 삭제된 것 제외하고 새 이미지 추가
                    const docSnap = await db.collection('quality-inspections').doc(docId).get();
                    const prev = (docSnap.data()?.imageUrls as string[]) || [];
                    const remainingImages = prev.filter(img => !deletedImages.includes(img));
                    await db.collection('quality-inspections').doc(docId).update({
                        imageUrls: [...remainingImages, ...addedUrls]
                    });
                    addToast({ message: `이미지 ${addedUrls.length}개 업로드 완료`, type: 'success' });
                } else if (deletedImages.length > 0) {
                    // 새 이미지가 없고 삭제만 있는 경우
                    const docSnap = await db.collection('quality-inspections').doc(docId).get();
                    const prev = (docSnap.data()?.imageUrls as string[]) || [];
                    const remainingImages = prev.filter(img => !deletedImages.includes(img));
                    await db.collection('quality-inspections').doc(docId).update({
                        imageUrls: remainingImages
                    });
                }

                addToast({ message: '검사 정보가 성공적으로 수정되었습니다.', type: 'success' });
                onEditHandled();
            } else {
                const { id, createdAt, history, inspector, ...dataToSave } = formData;
                const payload: QualityInspection = {
                    ...dataToSave,
                    inspector: currentUserProfile.displayName,
                    inspectionType: activeTab,
                    createdAt: new Date().toISOString(),
                    history: [{ status: '생성됨', date: new Date().toISOString(), user: currentUserProfile.displayName, reason: '신규 검사 등록' }],
                    comments: [],
                    imageUrls: [],
                };
    
                const existingGroup = inspections.filter(insp => insp.orderNumber === payload.orderNumber && insp.orderNumber !== 'T');
                const existingSeqId = existingGroup.find(insp => insp.sequentialId !== undefined)?.sequentialId;
    
                if (existingGroup.length > 0) {
                    if (existingSeqId !== undefined) {
                        payload.sequentialId = existingSeqId;
                    } else {
                        delete payload.sequentialId;
                    }
                } else if (payload.orderNumber && payload.orderNumber !== 'T') {
                    const counterRef = db.collection('counters').doc('quality-inspections-counter');
                    try {
                        await db.runTransaction(async (transaction) => {
                            const counterDoc = await transaction.get(counterRef);
                            const currentCount = counterDoc.data()?.count || 0;
                            const newCount = currentCount + 1;
                            payload.sequentialId = newCount;
                            transaction.set(counterRef, { count: newCount });
                        });
                    } catch (e) {
                        console.error("Transaction failed: ", e);
                        throw e;
                    }
                }
    
                const newDocRef = await db.collection('quality-inspections').add(payload);
    
                 if (imageFiles.length > 0) {
                    addToast({ 
                        message: `이미지 업로드 중...`, 
                        type: 'progress',
                        progress: { current: 0, total: imageFiles.length }
                    });
                    
                    const imageUrls = await Promise.all(
                        imageFiles.map(async (file, index) => {
                            const uniqueFileName = `${Date.now()}-${file.name}`;
                            const imageRef = storage.ref(`quality-inspection-images/${newDocRef.id}/${uniqueFileName}`);
                            const snapshot = await imageRef.put(file);
                            const downloadURL = await snapshot.ref.getDownloadURL();
                            
                            // 진행도 업데이트
                            addToast({ 
                                message: `이미지 업로드 중...`, 
                                type: 'progress',
                                progress: { current: index + 1, total: imageFiles.length }
                            });
                            
                            return downloadURL;
                        })
                    );
                    await newDocRef.update({ imageUrls });
                    addToast({ message: `이미지 ${imageUrls.length}개 업로드 완료`, type: 'success' });
                }

                await db.collection('notifications').add({
                    message: `신규 ${activeTab} 품질검사 '${payload.productName}'이(가) 등록되었습니다.`,
                    date: new Date().toISOString(),
                    requestId: payload.orderNumber,
                    readBy: [],
                    type: 'quality',
                });
    
                addToast({ message: '검사 정보가 성공적으로 등록되었습니다.', type: 'success' });
                onPrefillHandled();
            }
        } catch (error) {
            console.error(error);
            addToast({ message: '저장 중 오류가 발생했습니다.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCancel = () => {
        onPrefillHandled();
        onEditHandled();
    };

    const tabButtonStyle = (tabName: ActiveCircleCenterTab) => 
    `px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      activeTab === tabName 
        ? 'bg-primary-600 text-white' 
        : 'text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
    }`;
    
    const canManage = currentUserProfile?.role !== 'Member';
    
    // FIX: Added a return statement with JSX to render the UI.
    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 p-4 border-b dark:border-slate-700">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">분임조센터: 검사 보고서 작성</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => setActiveTab('incoming')} className={tabButtonStyle('incoming')}>수입검사</button>
                    <button onClick={() => setActiveTab('inProcess')} className={tabButtonStyle('inProcess')}>공정검사</button>
                    <button onClick={() => setActiveTab('outgoing')} className={tabButtonStyle('outgoing')}>출하검사</button>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                {activeTab === 'incoming' && (
                    <IncomingInspectionForm 
                        currentUserProfile={currentUserProfile}
                        onSubmit={handleFormSubmit}
                        onCancel={handleCancel}
                        existingInspection={existingInspection}
                        isSaving={isSaving}
                        canManage={canManage}
                        autocompleteData={autocompleteData}
                        addToast={addToast}
                        prefilledData={prefilledData}
                    />
                )}
                {activeTab === 'inProcess' && (
                    <InProcessInspectionForm 
                        currentUserProfile={currentUserProfile}
                        onSubmit={handleFormSubmit}
                        onCancel={handleCancel}
                        existingInspection={existingInspection}
                        isSaving={isSaving}
                        canManage={canManage}
                        autocompleteData={autocompleteData}
                        addToast={addToast}
                        prefilledData={prefilledData}
                    />
                )}
                {activeTab === 'outgoing' && (
                    <OutgoingInspectionForm 
                        currentUserProfile={currentUserProfile}
                        onSubmit={handleFormSubmit}
                        onCancel={handleCancel}
                        existingInspection={existingInspection}
                        isSaving={isSaving}
                        canManage={canManage}
                        autocompleteData={autocompleteData}
                        addToast={addToast}
                        prefilledData={prefilledData}
                    />
                )}
            </div>
        </div>
    );
};

// FIX: Changed to a named export to resolve module import error in App.tsx.
export const QualityControlCenter: React.FC<QualityControlCenterProps> = ({ theme, setTheme, currentUserProfile, addToast, deepLinkOrderNumber, onDeepLinkHandled, onUpdateInspection, onDeleteInspectionGroup, onAddComment }) => {
  const [activeMenu, setActiveMenu] = useState<ActiveQualityMenu>('dashboard');
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDetails, setSelectedDetails] = useState<GroupedInspectionData | null>(null);
  const [editingInspection, setEditingInspection] = useState<QualityInspection | null>(null);
  const [prefilledData, setPrefilledData] = useState<Partial<QualityInspection> | null>(null);
  const [dashboardFilters, setDashboardFilters] = useState<{ type: string, value: any } | null>(null);
  const [initialCircleCenterTab, setInitialCircleCenterTab] = useState<ActiveCircleCenterTab | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = db.collection('quality-inspections').orderBy('createdAt', 'desc').limit(1000)
      .onSnapshot(snapshot => {
        const inspectionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }) as QualityInspection);
        setInspections(inspectionsData);
        setIsLoading(false);
      }, error => {
        console.error("Error fetching quality inspections:", error);
        addToast({ message: '품질 검사 데이터 로딩 실패', type: 'error' });
        setIsLoading(false);
      });
    return () => unsubscribe();
  }, [addToast]);
  
  const groupedInspections = useMemo<GroupedInspectionData[]>(() => {
    const groups = new Map<string, GroupedInspectionData>();
    
    inspections.forEach(inspection => {
        const key = inspection.orderNumber;
        if (key === 'T' || !key) return; // Skip temporary or empty order numbers

        if (!groups.has(key)) {
            groups.set(key, {
                orderNumber: key,
                productName: '',
                latestDate: '1970-01-01T00:00:00.000Z',
                incoming: [],
                inProcess: [],
                outgoing: [],
                history: [],
                comments: [],
                common: {},
            });
        }
        
        const group = groups.get(key)!;
        
        if (new Date(inspection.createdAt) > new Date(group.latestDate)) {
            group.latestDate = inspection.createdAt;
            group.productName = inspection.productName;
            group.common = {
                sequentialId: inspection.sequentialId,
                orderNumber: inspection.orderNumber,
                supplier: inspection.supplier,
                productName: inspection.productName,
                partName: inspection.partName,
                injectionMaterial: inspection.injectionMaterial,
                injectionColor: inspection.injectionColor,
                orderQuantity: inspection.orderQuantity,
                specification: inspection.specification,
                postProcess: inspection.postProcess,
                // @ts-ignore
                workLine: inspection.workLine || inspection.processLines?.[0]?.workLine,
                imageUrl: inspection.imageUrls?.[0],
            };
        }

        group[inspection.inspectionType as 'incoming' | 'inProcess' | 'outgoing'].push(inspection);
        group.history = [...group.history, ...(inspection.history || [])];
        group.comments = [...group.comments, ...(inspection.comments || [])];
    });

    const sortedGroups = Array.from(groups.values())
        .map(group => {
            group.history.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            group.comments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return group;
        })
        .sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());

    return sortedGroups;
  }, [inspections]);
  
  useEffect(() => {
    if (deepLinkOrderNumber && groupedInspections.length > 0 && !isMounted.current) {
        const targetGroup = groupedInspections.find(g => g.orderNumber === deepLinkOrderNumber);
        if (targetGroup) {
            setSelectedDetails(targetGroup);
            setActiveMenu('controlCenter');
            onDeepLinkHandled();
            isMounted.current = true;
        }
    }
  }, [deepLinkOrderNumber, groupedInspections, onDeepLinkHandled]);

  const handleEditInspection = (inspection: QualityInspection) => {
    setEditingInspection(inspection);
    setSelectedDetails(null);
    setActiveMenu('circleCenter');
  };
  
  const handleAddNewInspection = (type: InspectionType, commonData: GroupedInspectionData['common']) => {
    const { orderNumber, supplier, productName, partName, injectionMaterial, injectionColor, orderQuantity, specification, postProcess } = commonData;
    setPrefilledData({ orderNumber, supplier, productName, partName, injectionMaterial, injectionColor, orderQuantity, specification, postProcess });
    setInitialCircleCenterTab(type);
    setSelectedDetails(null);
    setActiveMenu('circleCenter');
  };
  
  const handleDashboardFilter = (filter: {type: string, value: any}) => {
      setDashboardFilters(filter);
      setActiveMenu('controlCenter');
  };

  const renderContent = () => {
    switch (activeMenu) {
        case 'dashboard':
            return <QualityDashboard inspections={inspections} onSelectGroup={(orderNumber) => { const group = groupedInspections.find(g => g.orderNumber === orderNumber); if (group) { setSelectedDetails(group); } }} onFilterChange={handleDashboardFilter} />;
        case 'issueCenter':
            return <QualityIssueCenter currentUserProfile={currentUserProfile} addToast={addToast} />;
        case 'controlCenter':
            return <ControlCenter groupedData={groupedInspections} isLoading={isLoading} onSelectDetails={setSelectedDetails} filters={dashboardFilters} onClearFilters={() => setDashboardFilters(null)} />;
        case 'circleCenter':
            return <CircleCenter currentUserProfile={currentUserProfile} addToast={addToast} onUpdateInspection={onUpdateInspection} inspections={inspections} prefilledData={prefilledData} onPrefillHandled={() => setPrefilledData(null)} existingInspection={editingInspection} onEditHandled={() => setEditingInspection(null)} initialTab={initialCircleCenterTab} onInitialTabHandled={() => setInitialCircleCenterTab(null)} />;
        case 'team':
            return <TeamManagement />;
        default:
            return <div className="p-8 text-center">선택된 메뉴가 없습니다.</div>;
    }
  };

  return (
    <main className="flex-1 overflow-auto p-2 sm:p-4 flex flex-col">
        <QualityNavigation activeMenu={activeMenu} onSelect={setActiveMenu} currentUserProfile={currentUserProfile} theme={theme} setTheme={setTheme} />
        <div className="flex-1 overflow-hidden mt-4">
            {renderContent()}
        </div>
        {selectedDetails && (
            <InspectionDetailModal 
                details={selectedDetails}
                onClose={() => setSelectedDetails(null)}
                currentUserProfile={currentUserProfile}
                onEdit={handleEditInspection}
                onDelete={onDeleteInspectionGroup}
                onAddComment={onAddComment}
                onAddNew={handleAddNewInspection}
                addToast={addToast}
            />
        )}
    </main>
  );
};
