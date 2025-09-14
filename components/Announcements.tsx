import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { Announcement, UserProfile } from '../types';
import FullScreenModal from './FullScreenModal';
import ConfirmationModal from './ConfirmationModal';

declare const html2canvas: any;

interface AnnouncementsProps {
    addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
    currentUserProfile: UserProfile | null;
}

const AnnouncementForm: React.FC<{
    onSave: (data: { title: string; content: string; cooperationRequest: string; planStartDate: string; planEndDate: string; }) => void;
    onCancel: () => void;
    existingAnnouncement?: Announcement | null;
    currentUserProfile: UserProfile | null;
}> = ({ onSave, onCancel, existingAnnouncement, currentUserProfile }) => {
    const [title, setTitle] = useState(existingAnnouncement?.title || '');
    const [content, setContent] = useState(existingAnnouncement?.content || '');
    const [cooperationRequest, setCooperationRequest] = useState(existingAnnouncement?.cooperationRequest || '');
    const [planStartDate, setPlanStartDate] = useState(existingAnnouncement?.planStartDate || '');
    const [planEndDate, setPlanEndDate] = useState(existingAnnouncement?.planEndDate || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            alert('제목과 내용은 필수입니다.');
            return;
        }
        onSave({ title, content, cooperationRequest, planStartDate, planEndDate });
    };

    const authorName = existingAnnouncement?.author || currentUserProfile?.displayName || '관리자';
    const creationDate = existingAnnouncement ? new Date(existingAnnouncement.createdAt).toLocaleDateString('ko-KR') : '자동 등록';
    const inputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200";
    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-slate-300";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="title" className={labelClasses}>제목</label>
                <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputClasses}
                    lang="ko"
                    required
                />
            </div>
            <div>
                <label className={labelClasses}>작성자 (작성일)</label>
                <input
                    type="text"
                    value={`${authorName} (${creationDate})`}
                    className={`${inputClasses} bg-slate-100 dark:bg-slate-800`}
                    disabled
                />
            </div>
            <div>
                <label htmlFor="cooperationRequest" className={labelClasses}>협조 요청</label>
                <input
                    type="text"
                    id="cooperationRequest"
                    value={cooperationRequest}
                    onChange={(e) => setCooperationRequest(e.target.value)}
                    className={inputClasses}
                    lang="ko"
                    placeholder="협조를 요청할 부서 또는 인원"
                />
            </div>
             <div>
                <label htmlFor="planStartDate" className={labelClasses}>공지 해당일자 (시작일 ~ 종료일)</label>
                 <div className="flex items-center gap-2">
                    <input
                        type="date"
                        id="planStartDate"
                        value={planStartDate}
                        onChange={(e) => setPlanStartDate(e.target.value)}
                        className={inputClasses}
                        lang="ko"
                    />
                    <span>~</span>
                     <input
                        type="date"
                        id="planEndDate"
                        value={planEndDate}
                        onChange={(e) => setPlanEndDate(e.target.value)}
                        className={inputClasses}
                        lang="ko"
                        min={planStartDate}
                    />
                </div>
                 <p className="text-xs text-slate-500 mt-1">종료일을 비워두면 시작일 하루만 적용됩니다.</p>
            </div>
            <div>
                <label htmlFor="content" className={labelClasses}>내용 (직접입력)</label>
                <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className={inputClasses}
                    lang="ko"
                    rows={10}
                    required
                />
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-slate-600 px-4 py-2 rounded-lg">취소</button>
                <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg">저장</button>
            </div>
        </form>
    );
};

const Announcements: React.FC<AnnouncementsProps> = ({ addToast, currentUserProfile }) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalState, setModalState] = useState<{ view: 'form' | null, data?: Announcement | null }>({ view: null });
    const [itemToDelete, setItemToDelete] = useState<Announcement | null>(null);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const detailRef = useRef<HTMLDivElement>(null);

    const canManage = currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Manager';

    useEffect(() => {
        const isMobile = window.innerWidth < 768; // md breakpoint
        setViewMode(isMobile ? 'card' : 'list');
    }, []);

    useEffect(() => {
        const unsubscribe = db.collection('announcements').orderBy('createdAt', 'desc').limit(100).onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
            data.sort((a, b) => {
                const aHasPlan = !!a.planStartDate;
                const bHasPlan = !!b.planStartDate;

                if (aHasPlan && !bHasPlan) return -1;
                if (!aHasPlan && bHasPlan) return 1;

                const aSortDate = a.planStartDate || a.createdAt;
                const bSortDate = b.planStartDate || b.createdAt;
                return new Date(bSortDate).getTime() - new Date(aSortDate).getTime();
            });
            setAnnouncements(data);
            setIsLoading(false);
        }, error => {
            console.error(error);
            addToast({ message: '공지사항 로딩 실패', type: 'error' });
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [addToast]);
    
    const formatPlanDate = (startDate?: string, endDate?: string) => {
        if (!startDate) return '해당 없음';
        if (!endDate || startDate === endDate) return startDate;
        return `${startDate} ~ ${endDate}`;
    };

    const handleSave = async (data: { title: string; content: string; cooperationRequest: string; planStartDate: string; planEndDate: string }) => {
        try {
            if (modalState.data) { // Editing
                await db.collection('announcements').doc(modalState.data.id).update(data);
                addToast({ message: '공지사항이 수정되었습니다.', type: 'success' });
            } else { // Creating
                const newAnnouncement: Omit<Announcement, 'id'> = {
                    ...data,
                    author: currentUserProfile?.displayName || '관리자',
                    createdAt: new Date().toISOString(),
                };
                await db.collection('announcements').add(newAnnouncement);
                addToast({ message: '공지사항이 등록되었습니다.', type: 'success' });
            }
            setModalState({ view: null });
        } catch (error) {
            addToast({ message: '저장 중 오류 발생', type: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            await db.collection('announcements').doc(itemToDelete.id).delete();
            addToast({ message: '공지사항이 삭제되었습니다.', type: 'success' });
            setItemToDelete(null);
        } catch (error) {
            addToast({ message: '삭제 중 오류 발생', type: 'error' });
        }
    };

    const handleCopyToImage = () => {
        if (!detailRef.current) {
            addToast({ message: '공유할 대상을 찾을 수 없습니다.', type: 'error' });
            return;
        }

        addToast({ message: '이미지 생성 중...', type: 'info' });

        html2canvas(detailRef.current, {
            useCORS: true,
            backgroundColor: window.getComputedStyle(document.documentElement).getPropertyValue('color-scheme') === 'dark' ? '#1e293b' : '#ffffff',
            scale: 2,
        }).then((canvas: HTMLCanvasElement) => {
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    addToast({ message: '이미지 파일 생성에 실패했습니다.', type: 'error' });
                    return;
                }
                const fileName = `announcement-${selectedAnnouncement?.id}.png`;
                const file = new File([blob], fileName, { type: 'image/png' });
                const isMobile = /Mobi/i.test(navigator.userAgent);

                try {
                    if (isMobile && navigator.share && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: selectedAnnouncement?.title || '공지사항',
                            text: 'T.M.S. 공지사항 공유'
                        });
                        addToast({ message: '공지사항이 공유되었습니다.', type: 'success' });
                    } else if (navigator.clipboard && navigator.clipboard.write) {
                        await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
                        addToast({ message: '공지사항 이미지가 클립보드에 복사되었습니다.', type: 'success' });
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
            }, 'image/png');
        }).catch(err => {
            console.error('html2canvas capture error:', err);
            addToast({ message: '화면 캡처 중 오류가 발생했습니다.', type: 'error' });
        });
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
            <header className="flex-shrink-0 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">공지사항</h2>
                 <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-1 bg-gray-200 dark:bg-slate-700 p-1 rounded-lg">
                        <button onClick={() => setViewMode('card')} className={`px-2 py-1 text-sm rounded flex items-center gap-1.5 ${viewMode === 'card' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> 카드</button>
                        <button onClick={() => setViewMode('list')} className={`px-2 py-1 text-sm rounded flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg> 리스트</button>
                    </div>
                    {canManage && (
                        <button onClick={() => setModalState({ view: 'form' })} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700">
                            새 공지
                        </button>
                    )}
                </div>
            </header>
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">로딩 중...</div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2">
                    {viewMode === 'card' ? (
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-4">
                            {announcements.map(item => (
                                <div key={item.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg flex flex-col overflow-hidden shadow-md transition-transform hover:scale-105 cursor-pointer" onClick={() => setSelectedAnnouncement(item)}>
                                    {item.imageUrl && (
                                        <img src={item.imageUrl} alt={item.title} className="w-full h-40 object-cover" />
                                    )}
                                    <div className="p-4 flex-1 flex flex-col">
                                        {item.planStartDate && <p className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 mb-2">공지 해당일자: {formatPlanDate(item.planStartDate, item.planEndDate)}</p>}
                                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">{item.title}</h3>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">
                                            {new Date(item.createdAt).toLocaleString('ko-KR')} by {item.author}
                                        </p>
                                        {item.cooperationRequest && <p className="mt-2 text-sm text-gray-500 dark:text-slate-400"><strong>협조요청:</strong> {item.cooperationRequest}</p>}
                                        <p className="mt-2 text-sm text-gray-600 dark:text-slate-300 whitespace-pre-wrap flex-1">
                                           {item.content.length > 100 ? `${item.content.substring(0, 100)}...` : item.content}
                                        </p>
                                        {canManage && (
                                            <div className="flex justify-end gap-2 mt-4" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setModalState({ view: 'form', data: item })} className="text-xs text-blue-600">수정</button>
                                                <button onClick={() => setItemToDelete(item)} className="text-xs text-red-600">삭제</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <table className="w-full text-sm text-left text-gray-500 dark:text-slate-400">
                            <thead className="text-xs text-gray-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">공지 해당일자</th>
                                    <th scope="col" className="px-6 py-3">제목</th>
                                    <th scope="col" className="px-6 py-3">협조요청</th>
                                    <th scope="col" className="px-6 py-3">작성자</th>
                                    <th scope="col" className="px-6 py-3">작성일</th>
                                    {canManage && <th scope="col" className="px-6 py-3">작업</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {announcements.map(item => (
                                    <tr key={item.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer" onClick={() => setSelectedAnnouncement(item)}>
                                        <td className="px-6 py-4 text-xs whitespace-nowrap">{formatPlanDate(item.planStartDate, item.planEndDate)}</td>
                                        <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{item.title}</th>
                                        <td className="px-6 py-4">{item.cooperationRequest || '-'}</td>
                                        <td className="px-6 py-4">{item.author}</td>
                                        <td className="px-6 py-4 text-xs whitespace-nowrap">{new Date(item.createdAt).toLocaleDateString('ko-KR')}</td>
                                        {canManage && <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => setModalState({ view: 'form', data: item })} className="font-medium text-blue-600 dark:text-blue-500 hover:underline mr-3">수정</button>
                                            <button onClick={() => setItemToDelete(item)} className="font-medium text-red-600 dark:text-red-500 hover:underline">삭제</button>
                                        </td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            <FullScreenModal
                isOpen={modalState.view === 'form'}
                onClose={() => setModalState({ view: null })}
                title={modalState.data ? '공지 수정' : '새 공지 작성'}
            >
                <AnnouncementForm onSave={handleSave} onCancel={() => setModalState({ view: null })} existingAnnouncement={modalState.data} currentUserProfile={currentUserProfile} />
            </FullScreenModal>
            
            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleDelete}
                title="삭제 확인"
                message={`'${itemToDelete?.title}' 공지를 정말 삭제하시겠습니까?`}
            />

            {selectedAnnouncement && (
                 <FullScreenModal
                    isOpen={!!selectedAnnouncement}
                    onClose={() => setSelectedAnnouncement(null)}
                    title={selectedAnnouncement.title}
                >
                    <div>
                        <div ref={detailRef} className="p-6 space-y-4 bg-white dark:bg-slate-800">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{selectedAnnouncement.title}</h2>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-slate-400 border-b dark:border-slate-700 pb-3">
                                <span><strong>작성자:</strong> {selectedAnnouncement.author}</span>
                                <span><strong>작성일:</strong> {new Date(selectedAnnouncement.createdAt).toLocaleString('ko-KR')}</span>
                                {selectedAnnouncement.planStartDate && <span><strong>공지 해당일자:</strong> {formatPlanDate(selectedAnnouncement.planStartDate, selectedAnnouncement.planEndDate)}</span>}
                            </div>
                            {selectedAnnouncement.cooperationRequest && <p className="text-gray-700 dark:text-slate-200"><strong>협조 요청:</strong> {selectedAnnouncement.cooperationRequest}</p>}
                            {selectedAnnouncement.imageUrl && (
                                <img src={selectedAnnouncement.imageUrl} alt={selectedAnnouncement.title} className="w-full rounded-lg shadow-md" />
                            )}
                            <p className="text-gray-700 dark:text-slate-200 whitespace-pre-wrap">{selectedAnnouncement.content}</p>
                        </div>
                         <div className="flex justify-end gap-2 p-4 border-t dark:border-slate-700 bg-white dark:bg-slate-900">
                             <button onClick={handleCopyToImage} className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700">이미지로 복사</button>
                        </div>
                    </div>
                </FullScreenModal>
            )}
        </div>
    );
};

export default Announcements;