import React, { useState, useRef } from 'react';
import { SampleRequest, UserProfile, SampleStatus, WorkCoat, SampleRequestItem } from '../types';
import { SAMPLE_STATUS_COLORS } from '../constants';
import CommentsSection from './CommentsSection';
import ConfirmationModal from './ConfirmationModal';
import ImageLightbox from './ImageLightbox';
import ActionModal from './ActionModal';

declare const html2canvas: any;

interface SampleRequestDetailProps {
    request: SampleRequest;
    currentUserProfile: UserProfile | null;
    onUpdateStatus: (id: string, status: SampleStatus, reason?: string, workData?: SampleRequest['workData']) => void;
    onDelete: (id: string) => void;
    onAddComment: (id: string, text: string) => void;
    onUploadImage: (id: string, file: File) => Promise<void>;
    addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
    onEdit: (request: SampleRequest) => void;
    onUpdateWorkData: (id: string, workData: SampleRequest['workData']) => void;
}

const DetailItem: React.FC<{ label: string; value: string | number | React.ReactNode }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">{label}</dt>
        <dd className="mt-1 text-base text-gray-800 dark:text-slate-200">{value}</dd>
    </div>
);

const WorkDataSection: React.FC<{
    title: string;
    data: WorkCoat;
    onChange: (field: 'conditions' | 'remarks', value: string) => void;
    canManage: boolean;
}> = ({ title, data, onChange, canManage }) => (
    <div>
        <h5 className="font-semibold text-gray-700 dark:text-slate-300 mb-2">{title}</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label className="text-xs text-gray-500 dark:text-slate-400">작업조건</label>
                <textarea
                    value={data.conditions || ''}
                    onChange={(e) => onChange('conditions', e.target.value)}
                    disabled={!canManage}
                    rows={4}
                    className="mt-1 w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 disabled:bg-slate-200"
                />
            </div>
            <div>
                <label className="text-xs text-gray-500 dark:text-slate-400">특이사항</label>
                <textarea
                    value={data.remarks || ''}
                    onChange={(e) => onChange('remarks', e.target.value)}
                    disabled={!canManage}
                    rows={4}
                    className="mt-1 w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 disabled:bg-slate-200"
                />
            </div>
        </div>
    </div>
);

const SampleRequestDetail: React.FC<SampleRequestDetailProps> = ({ request, currentUserProfile, onUpdateStatus, onDelete, onAddComment, onUploadImage, addToast, onEdit, onUpdateWorkData }) => {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [workData, setWorkData] = useState<NonNullable<SampleRequest['workData']>>(request.workData || {});
    const [actionModalState, setActionModalState] = useState<{ open: boolean; status: SampleStatus.OnHold | SampleStatus.Rejected | null }>({ open: false, status: null });
    const [isWorkDataVisible, setIsWorkDataVisible] = useState(false);
    const detailRef = useRef<HTMLDivElement>(null);

    const canManage = currentUserProfile?.role !== 'Member';

    const handleWorkDataChange = (coat: 'undercoat' | 'midcoat' | 'topcoat', field: 'conditions' | 'remarks', value: string) => {
        setWorkData(prev => ({
            ...prev,
            [coat]: {
                ...(prev[coat] || {}),
                [field]: value,
            }
        }));
    };

    const handleConfirmDelete = () => {
        onDelete(request.id);
        setIsDeleteModalOpen(false);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsUploading(true);
        try {
            await onUploadImage(request.id, file);
            addToast({ message: '이미지가 업로드되었습니다.', type: 'success' });
        } catch (error) {
            addToast({ message: '이미지 업로드에 실패했습니다.', type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleShare = async () => {
        const elementToCapture = detailRef.current;
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
    
            const fileName = `sample-request-${request.id}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            const isDesktop = !/Mobi|Android/i.test(navigator.userAgent);
    
            if (isDesktop && navigator.clipboard?.write) {
                await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
                addToast({ message: '상세 정보 이미지가 클립보드에 복사되었습니다.', type: 'success' });
            } else if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `샘플 요청: ${request.productName}`,
                    text: `T.M.S. 샘플 요청 상세 정보 공유`
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

    const handleUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        setWorkData(prev => ({
            ...prev,
            unitPrice: value === '' ? undefined : parseInt(value, 10),
        }));
    };

    const handleActionSubmit = (reason: string) => {
        if (actionModalState.status) {
            onUpdateStatus(request.id, actionModalState.status, reason);
        }
        setActionModalState({ open: false, status: null });
    };

    const getActionModalTitle = () => {
        if (!actionModalState.status) return '';
        const titles: { [key in SampleStatus]?: string } = {
            [SampleStatus.OnHold]: '보류 사유',
            [SampleStatus.Rejected]: '반려 사유',
        };
        return titles[actionModalState.status] || '';
    };
    
    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                <div ref={detailRef} className="p-4 bg-white dark:bg-slate-800">
                    <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{request.productName} ({request.clientName})</h2>
                        <span className={`px-4 py-2 text-lg font-bold rounded-full ${SAMPLE_STATUS_COLORS[request.status]}`}>{request.status}</span>
                    </div>
    
                    <dl className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
                        <DetailItem label="요청 ID" value={<span className="font-mono">{request.id}</span>} />
                        <DetailItem label="요청일" value={request.requestDate} />
                        <DetailItem label="요청 담당자" value={request.requesterName} />
                        <DetailItem label="연락처" value={request.contact} />
    
                        <DetailItem label="납기 요청일" value={request.dueDate} />
                        <DetailItem label="시스템 등록자" value={request.requesterInfo.displayName} />
                    </dl>
    
                    <div className="mt-6 border-t dark:border-slate-700 pt-4">
                      <h4 className="font-semibold text-gray-700 dark:text-slate-200 mb-2">요청 품목</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                    <tr>
                                        <th scope="col" className="px-4 py-2">부속명</th>
                                        <th scope="col" className="px-4 py-2">색상(사양)</th>
                                        <th scope="col" className="px-4 py-2">코팅/증착 방식</th>
                                        <th scope="col" className="px-4 py-2">후가공</th>
                                        <th scope="col" className="px-4 py-2 text-right">수량</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(request.items || []).map((item, index) => (
                                        <tr key={index} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                                            <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{item.partName}</td>
                                            <td className="px-4 py-2">{item.colorSpec}</td>
                                            <td className="px-4 py-2">{item.coatingMethod}</td>
                                            <td className="px-4 py-2">{(item.postProcessing || []).join(', ') || '없음'}</td>
                                            <td className="px-4 py-2 text-right">{item.quantity.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
    
                    <DetailItem label="비고" value={<p className="whitespace-pre-wrap p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">{request.remarks || '없음'}</p>} />
                
                    <div>
                        <h4 className="font-semibold text-gray-700 dark:text-slate-200 mb-2">첨부 이미지</h4>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
                            {request.imageUrls.map((url, i) => <img key={i} src={url} alt={`sample-${i}`} className="w-full h-24 object-cover rounded-md cursor-pointer" onClick={() => setLightboxImage(url)} />)}
                            {canManage && (
                                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full h-24 border-2 border-dashed rounded-md flex flex-col items-center justify-center text-gray-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50">
                                    {isUploading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div> : <><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg><span className="text-xs mt-1">이미지 업로드</span></>}
                                </button>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                        </div>
                    </div>
                </div>

                {(request.status === SampleStatus.InProgress || request.status === SampleStatus.Completed) && (
                <div className="mt-6 border-t dark:border-slate-700 pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-gray-700 dark:text-slate-200">작업 데이터</h4>
                        <button onClick={() => setIsWorkDataVisible(!isWorkDataVisible)} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                            {isWorkDataVisible ? '숨기기' : '보기'}
                        </button>
                    </div>
                    {isWorkDataVisible && (
                        <div className="space-y-4 animate-fade-in-down">
                            <WorkDataSection title="하도" data={workData.undercoat || {conditions: '', remarks: ''}} onChange={(f, v) => handleWorkDataChange('undercoat', f, v)} canManage={canManage} />
                            <WorkDataSection title="중도" data={workData.midcoat || {conditions: '', remarks: ''}} onChange={(f, v) => handleWorkDataChange('midcoat', f, v)} canManage={canManage} />
                            <WorkDataSection title="상도" data={workData.topcoat || {conditions: '', remarks: ''}} onChange={(f, v) => handleWorkDataChange('topcoat', f, v)} canManage={canManage} />
                            <div>
                                <h5 className="font-semibold text-gray-700 dark:text-slate-300 mb-2">요청 단가</h5>
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-slate-400">단가 (원)</label>
                                    <input
                                        type="text"
                                        value={workData.unitPrice?.toLocaleString() ?? ''}
                                        onChange={handleUnitPriceChange}
                                        disabled={!canManage}
                                        placeholder="숫자만 입력"
                                        className="mt-1 w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 disabled:bg-slate-200"
                                    />
                                </div>
                            </div>
                            {canManage && (
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={() => onUpdateWorkData(request.id, workData)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
                                    >
                                        작업 데이터 저장
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                )}
    
                <div className="mt-6 border-t dark:border-slate-700 pt-4">
                    <h4 className="font-semibold text-gray-700 dark:text-slate-200 mb-2">처리 이력</h4>
                    <ul className="space-y-2 text-xs">{request.history.map((h, i) => <li key={i} className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-md"><span className="font-semibold">{new Date(h.date).toLocaleString('ko-KR')}</span><span className={`px-2 py-0.5 rounded-full ${SAMPLE_STATUS_COLORS[h.status as SampleStatus]}`}>{h.status}</span><span>by {h.user}</span><span>{h.reason && `- ${h.reason}`}</span></li>)}</ul>
                </div>
                
                <CommentsSection comments={request.comments} onAddComment={(text) => onAddComment(request.id, text)} canComment={canManage} />
            </div>
            
            <div className="flex-shrink-0 flex flex-wrap gap-2 p-4 border-t dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                {canManage && request.status === SampleStatus.Received && <button onClick={() => onUpdateStatus(request.id, SampleStatus.InProgress)} className="bg-yellow-500 text-white px-4 py-2 rounded-lg">진행중으로 변경</button>}
                {canManage && request.status === SampleStatus.InProgress && <button onClick={() => onUpdateStatus(request.id, SampleStatus.Completed, undefined, workData)} className="bg-green-500 text-white px-4 py-2 rounded-lg">완료 처리</button>}
                {canManage && request.status !== SampleStatus.Completed && request.status !== SampleStatus.Rejected && <button onClick={() => setActionModalState({ open: true, status: SampleStatus.OnHold })} className="bg-orange-500 text-white px-4 py-2 rounded-lg">보류</button>}
                {canManage && request.status !== SampleStatus.Completed && request.status !== SampleStatus.Rejected && <button onClick={() => setActionModalState({ open: true, status: SampleStatus.Rejected })} className="bg-red-500 text-white px-4 py-2 rounded-lg">반려</button>}
                <button onClick={handleShare} className="bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-600">이미지로 공유</button>
                {canManage && <button onClick={() => onEdit(request)} className="bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold">수정</button>}
                {currentUserProfile?.role === 'Admin' && <button onClick={() => setIsDeleteModalOpen(true)} className="ml-auto bg-transparent text-red-500 px-4 py-2 rounded-lg">삭제</button>}
            </div>

            <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDelete} title="요청 삭제" message={`'${request.productName}' 요청을 정말 삭제하시겠습니까?`} />
            {lightboxImage && <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />}
             {actionModalState.open && (
                <ActionModal
                    title={getActionModalTitle()}
                    onClose={() => setActionModalState({ open: false, status: null })}
                    onSubmit={handleActionSubmit}
                />
            )}
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

export default SampleRequestDetail;