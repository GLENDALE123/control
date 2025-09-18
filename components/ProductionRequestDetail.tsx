import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ProductionRequest, ProductionRequestStatus, UserProfile, HistoryEntry, ProductionRequestType } from '../types';
import { PRODUCTION_REQUEST_STATUS_COLORS } from '../constants';
import CommentsSection from './CommentsSection';
import ConfirmationModal from './ConfirmationModal';
import ActionModal from './ActionModal';

declare const html2canvas: any;

interface ProductionRequestDetailProps {
    request: ProductionRequest;
    currentUserProfile: UserProfile | null;
    onStatusUpdate: (id: string, status: ProductionRequestStatus, reason?: string) => void;
    onDelete: (id: string) => void;
    onAddComment: (id: string, text: string) => void;
    onEdit: (request: ProductionRequest) => void;
    onMarkCommentsAsRead: (id: string) => void;
    addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

const DetailItem: React.FC<{ label: string; value: string | number | React.ReactNode }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">{label}</dt>
        <dd className="mt-1 text-base text-gray-800 dark:text-slate-200">{value}</dd>
    </div>
);

const parseLogisticsContent = (content: string) => {
    if (!content || !content.startsWith('통합 벌크 이동 요청')) return [];

    const items = content.split('---------------------').slice(1);
    return items.map(itemStr => {
        const lines = itemStr.trim().split('\n');
        const data: { [key: string]: string } = {};
        lines.forEach(line => {
            const parts = line.split(':');
            if (parts.length > 1) {
                const key = parts[0].trim().replace(/^- /, '');
                const value = parts.slice(1).join(':').trim();
                data[key] = value;
            }
        });
        return {
            product: data['제품'] || '',
            orderNumber: data['발주번호'] || '',
            supplier: data['발주처'] || '',
            specification: data['사양'] || '',
            quantity: data['양품수량'] || data['수량'] || '',
            packagingUnit: data['포장단위'] || '',
            boxCount: data['박스수량'] || '',
            remainder: data['잔량'] || '',
            destination: data['도착처'] || '',
            details: data['추가 요청'] || '없음',
        };
    });
};


const ProductionRequestDetail: React.FC<ProductionRequestDetailProps> = ({ request, currentUserProfile, onStatusUpdate, onDelete, onAddComment, onEdit, onMarkCommentsAsRead, addToast }) => {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [actionModalState, setActionModalState] = useState<{ open: boolean; status: ProductionRequestStatus.Hold | ProductionRequestStatus.Rejected | null }>({ open: false, status: null });
    const detailRef = useRef<HTMLDivElement>(null);

    const canManage = currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Manager';

    useEffect(() => {
        if (request.id) {
            onMarkCommentsAsRead(request.id);
        }
    }, [request.id, onMarkCommentsAsRead]);

    const handleConfirmDelete = () => {
        onDelete(request.id);
        setIsDeleteModalOpen(false);
    };

    const handleActionSubmit = (reason: string) => {
        if (actionModalState.status) {
            onStatusUpdate(request.id, actionModalState.status, reason);
        }
        setActionModalState({ open: false, status: null });
    };

    const getActionModalTitle = () => {
        if (!actionModalState.status) return '';
        const titles: { [key in ProductionRequestStatus]?: string } = {
            [ProductionRequestStatus.Hold]: '보류 사유',
            [ProductionRequestStatus.Rejected]: '반려 사유',
        };
        return titles[actionModalState.status] || '';
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

            const fileName = `production-request-${request.id}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            const isDesktop = !/Mobi|Android/i.test(navigator.userAgent);

            if (isDesktop && navigator.clipboard?.write) {
                await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
                addToast({ message: '상세 정보 이미지가 클립보드에 복사되었습니다.', type: 'success' });
            } else if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `생산 요청: ${request.productName}`,
                    text: `T.M.S. 생산 요청 상세 정보 공유`
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

    if (request.requestType === ProductionRequestType.LogisticsTransfer) {
        const parsedContent = useMemo(() => parseLogisticsContent(request.content), [request.content]);

        return (
            <div className="h-full flex flex-col">
                <div ref={detailRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-white dark:bg-slate-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">화성공장 -&gt; 군포공장 물류이동 List</h2>
                            <p className="text-sm text-gray-500 dark:text-slate-400">{request.requestType}</p>
                        </div>
                        <span className={`px-4 py-2 text-lg font-bold rounded-full ${PRODUCTION_REQUEST_STATUS_COLORS[request.status]}`}>
                            {request.status === ProductionRequestStatus.InProgress ? '물류이동중' : request.status}
                        </span>
                    </div>

                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
                        <DetailItem label="요청 ID" value={<span className="font-mono">{request.id}</span>} />
                        <DetailItem label="총 수량" value={request.quantity.toLocaleString() + " EA"} />
                        <DetailItem label="요청일" value={new Date(request.createdAt).toLocaleString('ko-KR')} />
                        <DetailItem label="요청자" value={request.requester} />
                    </dl>

                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">요청 항목 상세</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-slate-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-slate-400">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">발주번호</th>
                                        <th scope="col" className="px-4 py-3">발주처</th>
                                        <th scope="col" className="px-4 py-3">제품/부속명</th>
                                        <th scope="col" className="px-4 py-3">사양</th>
                                        <th scope="col" className="px-4 py-3 text-right">양품수량</th>
                                        <th scope="col" className="px-4 py-3 text-right">포장단위</th>
                                        <th scope="col" className="px-4 py-3 text-right">박스수량</th>
                                        <th scope="col" className="px-4 py-3 text-right">잔량</th>
                                        <th scope="col" className="px-4 py-3">도착처</th>
                                        <th scope="col" className="px-4 py-3">추가 요청 내용</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedContent?.map((item, index) => (
                                        <tr key={index} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                                            <td className="px-4 py-2 font-mono text-xs">{item.orderNumber}</td>
                                            <td className="px-4 py-2">{item.supplier}</td>
                                            <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{item.product}</td>
                                            <td className="px-4 py-2">{item.specification}</td>
                                            <td className="px-4 py-2 text-right">{item.quantity}</td>
                                            <td className="px-4 py-2 text-right">{item.packagingUnit}</td>
                                            <td className="px-4 py-2 text-right">{item.boxCount}</td>
                                            <td className="px-4 py-2 text-right">{item.remainder}</td>
                                            <td className="px-4 py-2">{item.destination}</td>
                                            <td className="px-4 py-2 whitespace-pre-wrap">{item.details}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                
                    <div className="mt-6 border-t dark:border-slate-700 pt-4">
                        <h4 className="font-semibold text-gray-700 dark:text-slate-200 mb-2">처리 이력</h4>
                        <ul className="space-y-2 text-xs">
                            {request.history.map((h: HistoryEntry, i: number) => (
                                <li key={i} className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-md">
                                    <span className="font-semibold">{new Date(h.date).toLocaleString('ko-KR')}</span>
                                    <span className={`px-2 py-0.5 rounded-full ${PRODUCTION_REQUEST_STATUS_COLORS[h.status as ProductionRequestStatus]}`}>{h.status}</span>
                                    <span>by {h.user}</span>
                                    {h.reason && <span>- {h.reason}</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    <CommentsSection 
                        comments={request.comments || []} 
                        onAddComment={(text) => onAddComment(request.id, text)} 
                        canComment={canManage} 
                        currentUserProfile={currentUserProfile}
                    />
                </div>
                <div className="flex-shrink-0 flex flex-wrap gap-2 p-4 border-t dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    {canManage && request.status === ProductionRequestStatus.Requested && (
                        <>
                            <button onClick={() => onStatusUpdate(request.id, ProductionRequestStatus.InProgress, '접수됨')} className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600">접수</button>
                            <button onClick={() => setActionModalState({ open: true, status: ProductionRequestStatus.Hold })} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600">보류</button>
                        </>
                    )}
                    {canManage && request.status === ProductionRequestStatus.InProgress && (
                        <button onClick={() => onStatusUpdate(request.id, ProductionRequestStatus.Completed, '완료 처리됨')} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600">완료 처리</button>
                    )}
                    <button onClick={handleShare} className="bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-600">이미지로 공유</button>
                    {currentUserProfile?.role === 'Admin' && (
                        <button onClick={() => setIsDeleteModalOpen(true)} className="ml-auto bg-transparent text-red-500 px-4 py-2 rounded-lg">삭제</button>
                    )}
                </div>
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title="요청 삭제"
                    message={`'${request.productName}' 요청을 정말 삭제하시겠습니까?`}
                />
                 {actionModalState.open && (
                    <ActionModal
                        title={getActionModalTitle()}
                        onClose={() => setActionModalState({ open: false, status: null })}
                        onSubmit={handleActionSubmit}
                    />
                )}
            </div>
        );
    }


    return (
        <div className="h-full flex flex-col">
            <div ref={detailRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-white dark:bg-slate-800">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{request.productName} ({request.partName})</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400">{request.requestType}</p>
                    </div>
                    <span className={`px-4 py-2 text-lg font-bold rounded-full ${PRODUCTION_REQUEST_STATUS_COLORS[request.status]}`}>
                        {request.status}
                    </span>
                </div>

                <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
                    <DetailItem label="요청 ID" value={<span className="font-mono">{request.id}</span>} />
                    <DetailItem label="발주번호" value={request.orderNumber} />
                    <DetailItem label="요청일" value={new Date(request.createdAt).toLocaleString('ko-KR')} />
                    <DetailItem label="요청자" value={request.requester} />
                    <DetailItem label="시스템 등록자" value={request.author.displayName} />
                    <DetailItem label="발주처" value={request.supplier} />
                    <DetailItem label="요청 수량" value={request.quantity.toLocaleString()} />
                </dl>

                <DetailItem label="요청 내용" value={<p className="whitespace-pre-wrap p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">{request.content}</p>} />
                
                <div className="mt-6 border-t dark:border-slate-700 pt-4">
                    <h4 className="font-semibold text-gray-700 dark:text-slate-200 mb-2">처리 이력</h4>
                    <ul className="space-y-2 text-xs">
                        {request.history.map((h: HistoryEntry, i: number) => (
                            <li key={i} className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-md">
                                <span className="font-semibold">{new Date(h.date).toLocaleString('ko-KR')}</span>
                                <span className={`px-2 py-0.5 rounded-full ${PRODUCTION_REQUEST_STATUS_COLORS[h.status as ProductionRequestStatus]}`}>{h.status}</span>
                                <span>by {h.user}</span>
                                {h.reason && <span>- {h.reason}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
                
                <CommentsSection 
                    comments={request.comments || []} 
                    onAddComment={(text) => onAddComment(request.id, text)} 
                    canComment={canManage} 
                    currentUserProfile={currentUserProfile}
                />

            </div>
            
            <div className="flex-shrink-0 flex flex-wrap gap-2 p-4 border-t dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                 {canManage && request.status === ProductionRequestStatus.Requested && (
                    <>
                        <button onClick={() => onStatusUpdate(request.id, ProductionRequestStatus.InProgress, '접수됨')} className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600">접수</button>
                        <button onClick={() => setActionModalState({ open: true, status: ProductionRequestStatus.Hold })} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600">보류</button>
                        <button onClick={() => setActionModalState({ open: true, status: ProductionRequestStatus.Rejected })} className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600">반려</button>
                    </>
                )}
                {canManage && request.status === ProductionRequestStatus.InProgress && (
                    <button onClick={() => onStatusUpdate(request.id, ProductionRequestStatus.Completed, '완료 처리됨')} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600">완료 처리</button>
                )}
                 {canManage && ![ProductionRequestStatus.Completed, ProductionRequestStatus.Rejected].includes(request.status) && (
                     <button onClick={() => onEdit(request)} className="bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-600">수정</button>
                )}
                <button onClick={handleShare} className="bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-600">이미지로 공유</button>
                {currentUserProfile?.role === 'Admin' && (
                    <button onClick={() => setIsDeleteModalOpen(true)} className="ml-auto bg-transparent text-red-500 px-4 py-2 rounded-lg">삭제</button>
                )}
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="요청 삭제"
                message={`'${request.productName}' 요청을 정말 삭제하시겠습니까?`}
            />

            {actionModalState.open && (
                <ActionModal
                    title={getActionModalTitle()}
                    onClose={() => setActionModalState({ open: false, status: null })}
                    onSubmit={handleActionSubmit}
                />
            )}
        </div>
    );
};
export default ProductionRequestDetail;