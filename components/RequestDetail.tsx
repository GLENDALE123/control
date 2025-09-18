import React, { useState, useRef } from 'react';
import { JigRequest, Status, UserProfile } from '../types';
import { STATUS_COLORS } from '../constants';
import ImageLightbox from './ImageLightbox';
import ActionModal from './ActionModal';
import CommentsSection from './CommentsSection';
import ConfirmationModal from './ConfirmationModal';

interface RequestDetailProps {
  request: JigRequest;
  onStatusUpdate: (id: string, status: Status, reason?: string) => void;
  onEdit: (request: JigRequest) => void;
  onDelete: (id: string) => void;
  onReceiveItems: (id: string, quantity: number) => void;
  onAddComment: (requestId: string, commentText: string) => void;
  addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
  currentUserProfile: UserProfile | null;
}

declare const html2canvas: any;

const RequestDetail: React.FC<RequestDetailProps> = ({ request, onStatusUpdate, onEdit, onDelete, onReceiveItems, onAddComment, addToast, currentUserProfile }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ open: boolean; status: Status.Hold | Status.Rejected | null }>({ open: false, status: null });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState<'receive' | 'return' | null>(null);
  const [processingQuantity, setProcessingQuantity] = useState('');
  
  const detailRef = useRef<HTMLDivElement>(null);
  
  const canManage = currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Manager';

  const openLightbox = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setSelectedImage(null);
  };
  
  const coreCost = request.coreCost ?? 0;
  const unitPrice = request.unitPrice ?? 0;
  let totalAmount = 0;

  if (request.status === Status.InProgress || request.status === Status.Receiving) {
      totalAmount = request.receivedQuantity * unitPrice;
  } else if (request.status === Status.Completed) {
      totalAmount = (request.quantity * unitPrice) + coreCost;
  }

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

        const fileName = `jig-request-${request.id}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        const isDesktop = !/Mobi|Android/i.test(navigator.userAgent);

        if (isDesktop && navigator.clipboard?.write) {
            await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
            addToast({ message: '상세 정보 이미지가 클립보드에 복사되었습니다.', type: 'success' });
        } else if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: `지그 요청: ${request.itemName}`,
                text: `T.M.S. 지그 요청 상세 정보 공유`
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
  
  const handleActionSubmit = (reason: string) => {
      if (actionModal.status) {
          onStatusUpdate(request.id, actionModal.status, reason);
      }
      setActionModal({open: false, status: null});
  };

  const handleConfirmDelete = () => {
    onDelete(request.id);
    setIsDeleteModalOpen(false);
  };

  const handleCancelProcessing = () => {
    setProcessingAction(null);
    setProcessingQuantity('');
  };

  const handleConfirmProcessing = () => {
    const quantity = parseInt(processingQuantity, 10);

    if (isNaN(quantity) || quantity <= 0) {
      addToast({ message: '0보다 큰 유효한 수량을 입력하세요.', type: 'error' });
      return;
    }

    if (processingAction === 'return' && quantity > request.receivedQuantity) {
      addToast({ message: `최대 반출 가능 수량(${request.receivedQuantity}개)을 초과할 수 없습니다.`, type: 'error' });
      return;
    }

    const quantityChange = processingAction === 'receive' ? quantity : -quantity;
    onReceiveItems(request.id, quantityChange);

    handleCancelProcessing();
  };

  const isProcessable = [Status.InProgress, Status.Receiving, Status.Completed].includes(request.status);

  return (
    <div className="h-full flex flex-col">
       <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div ref={detailRef} className="p-4 bg-white dark:bg-slate-800">
              <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">{request.itemName} ({request.partName})</h2>
                <span className={`px-4 sm:px-6 py-2 sm:py-3 text-lg sm:text-xl font-bold rounded-full ${STATUS_COLORS[request.status]} ${request.status === Status.InProgress || request.status === Status.Receiving ? 'animate-pulse' : ''} text-center flex-shrink-0`}>
                  {request.status}
                </span>
              </div>
    
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-slate-300">
                    <div><strong>요청 ID:</strong> <span className="font-mono">{request.id}</span></div>
                    <div><strong>요청 유형:</strong> {request.requestType}</div>
                    <div><strong>지그번호:</strong> {request.itemNumber || 'N/A'}</div>
                    {typeof request.jigHandleLength === 'number' && (
                      <div><strong>지그손잡이길이:</strong> {request.jigHandleLength} mm</div>
                    )}
                    <div><strong>수량:</strong> {request.quantity.toLocaleString()}</div>
                    <div><strong>단가:</strong> {request.unitPrice ? `${request.unitPrice.toLocaleString()} 원` : ''}</div>
                    <div><strong>코어제작비:</strong> {request.coreCost ? `${request.coreCost.toLocaleString()} 원` : ''}</div>
                    <div><strong>총액:</strong> <strong className="text-gray-800 dark:text-white">{totalAmount > 0 ? `${totalAmount.toLocaleString()} 원` : ''}</strong></div>
                    <div><strong>요청자:</strong> {request.requester}</div>
                    <div><strong>수신처:</strong> {request.destination}</div>
                    <div><strong>완료 요청일:</strong> {request.deliveryDate}</div>
                    <div><strong>요청 일시:</strong> {new Date(request.requestDate).toLocaleString('ko-KR')}</div>
                    <div className="col-span-1 sm:col-span-2">
                        <strong>입고 현황:</strong> {request.receivedQuantity.toLocaleString()} / {request.quantity.toLocaleString()}
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 mt-1">
                            <div className="bg-green-500 h-2.5 rounded-full" style={{width: `${(request.receivedQuantity/request.quantity)*100}%`}}></div>
                        </div>
                    </div>
                  </div>
                  
                  {request.remarks && (
                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-slate-200">비고:</h4>
                      <p className="text-gray-600 dark:text-slate-300 whitespace-pre-wrap p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">{request.remarks}</p>
                    </div>
                  )}
                </div>
    
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-700 dark:text-slate-200">첨부 이미지</h4>
                  {request.imageUrls && request.imageUrls.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {request.imageUrls.map((url, index) => (
                              <img 
                                  key={index} 
                                  src={url} 
                                  alt=""
                                  aria-label={`첨부 이미지 ${index + 1}`}
                                  width={160}
                                  height={96}
                                  loading="lazy"
                                  decoding="async"
                                  fetchpriority="low"
                                  className="w-full h-24 object-cover rounded-lg cursor-pointer transition-transform hover:scale-105"
                                  onClick={() => openLightbox(url)}
                              />
                          ))}
                      </div>
                  ) : <p className="text-sm text-gray-500 dark:text-slate-400">등록된 이미지가 없습니다.</p>}
                </div>
              </div>
              
               <div className="mt-6 border-t dark:border-slate-700 pt-4">
                  <h4 className="font-semibold text-gray-700 dark:text-slate-200 mb-2">처리 이력</h4>
                  <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-400">
                    {request.history.map((h) => (
                      <li key={h.date} className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-md">
                        <span className="font-semibold w-full sm:w-32">{new Date(h.date).toLocaleString('ko-KR')}</span>
                        <span className="font-semibold w-12 text-gray-800 dark:text-slate-200 text-center">{h.user}</span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[h.status as Status]}`}>{h.status}</span>
                        <span>{h.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
            </div>
          
            <CommentsSection comments={request.comments || []} onAddComment={(text) => onAddComment(request.id, text)} canComment={canManage} />
      </div>

      <div className="flex-shrink-0 p-4 flex flex-wrap gap-2 print:hidden border-t dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        {currentUserProfile?.role === 'Admin' && request.status === Status.Request && (
            <>
                <button onClick={() => onStatusUpdate(request.id, Status.InProgress, '승인됨')} className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition-transform hover:scale-105">승인</button>
                <button onClick={() => setActionModal({open: true, status: Status.Hold})} className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-600 transition-transform hover:scale-105">보류</button>
                <button onClick={() => setActionModal({open: true, status: Status.Rejected})} className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition-transform hover:scale-105">반려</button>
            </>
        )}
        
        {canManage && isProcessable && (
            <div className="w-full md:w-auto">
                {processingAction === null ? (
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setProcessingAction('receive')} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600">입고 처리</button>
                        {request.receivedQuantity > 0 && (
                            <button onClick={() => setProcessingAction('return')} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600">반출 처리</button>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-2 border dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 animate-fade-in-down">
                        <input 
                            type="number" 
                            value={processingQuantity}
                            onChange={e => setProcessingQuantity(e.target.value)}
                            placeholder={processingAction === 'receive' ? "입고 수량" : "반출 수량"}
                            min="1"
                            max={processingAction === 'return' ? request.receivedQuantity : undefined}
                            className="w-28 p-1 border border-gray-300 dark:border-slate-500 rounded-md bg-white dark:bg-slate-600"
                            autoFocus
                            lang="ko"
                        />
                        <button onClick={handleConfirmProcessing} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm">확인</button>
                        <button onClick={handleCancelProcessing} className="bg-gray-200 dark:bg-slate-500 text-gray-800 dark:text-white px-3 py-1 rounded-md text-sm">취소</button>
                    </div>
                )}
            </div>
        )}

        <button onClick={handleShare} className="bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-600">이미지로 공유</button>
        
        {canManage && (
          <button onClick={() => onEdit(request)} className="bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-600">수정</button>
        )}
        {currentUserProfile?.role === 'Admin' && (
          <button onClick={() => setIsDeleteModalOpen(true)} className="ml-auto bg-transparent text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50">삭제</button>
        )}
      </div>

      {lightboxOpen && selectedImage && <ImageLightbox imageUrl={selectedImage} onClose={closeLightbox} />}
      {actionModal.open && <ActionModal title={actionModal.status === Status.Hold ? '보류 사유' : '반려 사유'} onClose={() => setActionModal({open: false, status: null})} onSubmit={handleActionSubmit} />}
       <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="삭제 확인"
        message={`'${request.itemName} (${request.partName})' 요청을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
      />
      
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

export default RequestDetail;