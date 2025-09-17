
import React, { useState, useEffect, useRef, useMemo, ChangeEvent } from 'react';
import { db, storage } from '../firebaseConfig';
import { QualityIssue, UserProfile } from '../types';
import FullScreenModal from './FullScreenModal';
import ConfirmationModal from './ConfirmationModal';
import firebase from 'firebase/compat/app';

declare const html2canvas: any;

interface QualityIssueCenterProps {
    currentUserProfile: UserProfile | null;
    addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

const processKeywordOptions = ['DP', '내부코팅', '박', '사출', '인쇄', '조립', '증착', '코팅'].sort((a, b) => a.localeCompare(b, 'ko'));
const defectKeywordOptions = ['가스', '기름', '기포', '기능불량', '내부코팅', '미성형', '미증착', '변형', '색상차이', '수축', '스크레치', '웰드', '과열', '찍힘', '침식', '크랙', '흑점', 'wetting'].sort((a, b) => a.localeCompare(b, 'ko'));


const QualityIssueForm: React.FC<{
    onSave: (data: Omit<QualityIssue, 'id' | 'createdAt' | 'author' | 'imageUrls'>, imageFiles: File[]) => void,
    onCancel: () => void,
    isSaving: boolean,
}> = ({ onSave, onCancel, isSaving }) => {
    const [formData, setFormData] = useState({
        orderNumber: 'T',
        supplier: '',
        productName: '',
        partName: '',
    });
    const [issues, setIssues] = useState(['']);
    const [keywordPairs, setKeywordPairs] = useState([{ process: '', defect: '' }]);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
        };
    }, [imagePreviews]);

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setImageFiles(prev => [...prev, ...files]);
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => {
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'orderNumber') {
            const digits = value.replace(/[^T0-9-]/g, '');
            setFormData(prev => ({ ...prev, orderNumber: digits }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleIssueChange = (index: number, value: string) => {
        const newIssues = [...issues];
        newIssues[index] = value;
        setIssues(newIssues);
    };

    const addIssueField = () => setIssues([...issues, '']);
    const removeIssueField = (index: number) => setIssues(issues.filter((_, i) => i !== index));
    
    const handleKeywordPairChange = (index: number, field: 'process' | 'defect', value: string) => {
        const newKeywordPairs = [...keywordPairs];
        newKeywordPairs[index] = { ...newKeywordPairs[index], [field]: value };
        setKeywordPairs(newKeywordPairs);
    };

    const addKeywordPair = () => setKeywordPairs([...keywordPairs, { process: '', defect: '' }]);
    const removeKeywordPair = (index: number) => setKeywordPairs(keywordPairs.filter((_, i) => i !== index));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalIssues = issues.filter(issue => issue.trim() !== '');
        if(finalIssues.length === 0) {
            alert('최소 하나 이상의 이슈사항을 입력해야 합니다.');
            return;
        }
        onSave({ ...formData, issues: finalIssues, keywordPairs: keywordPairs.filter(p => p.process || p.defect) }, imageFiles);
    };

    const inputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200";
    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-slate-300";

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label htmlFor="orderNumber" className={labelClasses}>발주번호</label><input type="text" name="orderNumber" value={formData.orderNumber} onChange={handleChange} required className={inputClasses} /></div>
                <div><label htmlFor="supplier" className={labelClasses}>발주처</label><input type="text" name="supplier" value={formData.supplier} onChange={handleChange} required className={inputClasses} /></div>
                <div><label htmlFor="productName" className={labelClasses}>제품명</label><input type="text" name="productName" value={formData.productName} onChange={handleChange} required className={inputClasses} /></div>
                <div><label htmlFor="partName" className={labelClasses}>부속명</label><input type="text" name="partName" value={formData.partName} onChange={handleChange} required className={inputClasses} /></div>
            </div>
            
            <div className="mt-4">
                <label className={labelClasses}>공정/불량 키워드</label>
                <div className="space-y-3 mt-2">
                    {keywordPairs.map((pair, index) => (
                        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                            <input
                                type="text"
                                list="process-keywords"
                                value={pair.process}
                                onChange={e => handleKeywordPairChange(index, 'process', e.target.value)}
                                placeholder="공정"
                                className={`${inputClasses} mt-0`}
                            />
                            <input
                                type="text"
                                list="defect-keywords"
                                value={pair.defect}
                                onChange={e => handleKeywordPairChange(index, 'defect', e.target.value)}
                                placeholder="불량"
                                className={`${inputClasses} mt-0`}
                            />
                            {keywordPairs.length > 1 ? (
                                <button type="button" onClick={() => removeKeywordPair(index)} className="p-2 h-10 w-10 flex-shrink-0 bg-red-500 text-white rounded-md hover:bg-red-700 flex items-center justify-center">-</button>
                            ) : <div className="w-10 h-10"></div>}
                        </div>
                    ))}
                    <datalist id="process-keywords">
                        {processKeywordOptions.map(opt => <option key={opt} value={opt} />)}
                    </datalist>
                    <datalist id="defect-keywords">
                        {defectKeywordOptions.map(opt => <option key={opt} value={opt} />)}
                    </datalist>
                    <button type="button" onClick={addKeywordPair} className="w-full py-2 border border-dashed border-gray-400 dark:border-slate-500 rounded-md text-sm hover:bg-slate-100 dark:hover:bg-slate-700">키워드 쌍 추가</button>
                </div>
            </div>

            <div className="mt-4">
                <label className={labelClasses}>이슈사항</label>
                {issues.map((issue, index) => (
                    <div key={index} className="flex items-center gap-2 mt-2">
                        <textarea value={issue} onChange={(e) => handleIssueChange(index, e.target.value)} className={`flex-grow ${inputClasses}`} rows={2} />
                        {issues.length > 1 && <button type="button" onClick={() => removeIssueField(index)} className="p-2 bg-red-500 text-white rounded-md self-stretch flex items-center justify-center">-</button>}
                    </div>
                ))}
                <button type="button" onClick={addIssueField} className="mt-2 w-full py-2 border border-dashed border-gray-400 dark:border-slate-500 rounded-md text-sm hover:bg-slate-100 dark:hover:bg-slate-700">이슈사항 추가하기</button>
            </div>
             <div>
                <label className={labelClasses}>이미지 첨부</label>
                <div className="mt-1 flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} multiple accept="image/*" className="hidden" />
                    <input type="file" ref={cameraInputRef} onChange={handleImageChange} accept="image/*" capture="environment" className="hidden" />
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
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-slate-600 px-4 py-2 rounded-lg">취소</button>
                <button type="submit" disabled={isSaving} className="bg-primary-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">{isSaving ? '저장 중...' : '저장'}</button>
            </div>
        </form>
    );
};

const QualityIssueCard: React.FC<{ issue: QualityIssue, onSelect: () => void }> = ({ issue, onSelect }) => {
    return (
        <div 
            onClick={onSelect}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden p-4 flex flex-col gap-3"
        >
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-2">
                <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{issue.productName} ({issue.partName})</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{issue.supplier}</p>
                </div>
                <span className="font-mono text-2xl bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-md">{issue.orderNumber}</span>
            </div>
            <div>
                <h4 className="font-semibold text-sm text-gray-700 dark:text-slate-300 mb-1">이슈사항:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-slate-200">
                    {issue.issues.map((item, index) => <li key={index} className="truncate">{item}</li>)}
                </ul>
            </div>
            <div className="mt-auto pt-2 text-xs text-right text-gray-400 dark:text-slate-500">
                작성자: {issue.author} / {new Date(issue.createdAt).toLocaleString('ko-KR')}
            </div>
        </div>
    );
};

const QualityIssueTable: React.FC<{ issues: QualityIssue[], onSelect: (issue: QualityIssue) => void }> = ({ issues, onSelect }) => (
    <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm text-left text-gray-600 dark:text-slate-300">
            <thead className="text-xs text-gray-700 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-700 sticky top-0 z-10">
                <tr>
                    <th scope="col" className="px-4 py-3">발주번호</th>
                    <th scope="col" className="px-4 py-3">제품명</th>
                    <th scope="col" className="px-4 py-3">부속명</th>
                    <th scope="col" className="px-4 py-3">발주처</th>
                    <th scope="col" className="px-4 py-3">첫번째 이슈</th>
                    <th scope="col" className="px-4 py-3">작성자</th>
                    <th scope="col" className="px-4 py-3">작성일</th>
                </tr>
            </thead>
            <tbody>
                {issues.map(issue => (
                    <tr key={issue.id} onClick={() => onSelect(issue)} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                        <td className="px-4 py-2 font-mono">{issue.orderNumber}</td>
                        <td className="px-4 py-2 font-semibold text-gray-900 dark:text-white">{issue.productName}</td>
                        <td className="px-4 py-2">{issue.partName}</td>
                        <td className="px-4 py-2">{issue.supplier}</td>
                        <td className="px-4 py-2 truncate max-w-sm">{issue.issues[0]}</td>
                        <td className="px-4 py-2">{issue.author}</td>
                        <td className="px-4 py-2 text-xs">{new Date(issue.createdAt).toLocaleDateString('ko-KR')}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const QualityIssueDetail: React.FC<{
    issue: QualityIssue;
    onCopy: (element: HTMLDivElement | null) => void;
    onDelete: () => void;
    currentUserProfile: UserProfile | null;
    onAddIssueItem: (newItem: string) => void;
}> = ({ issue, onCopy, onDelete, currentUserProfile, onAddIssueItem }) => {
    const detailRef = useRef<HTMLDivElement>(null);
    const [isAddingIssue, setIsAddingIssue] = useState(false);
    const [newIssue, setNewIssue] = useState('');
    const canManage = currentUserProfile?.role !== 'Member';

    const handleAddNewIssue = () => {
        onAddIssueItem(newIssue);
        setNewIssue('');
        setIsAddingIssue(false);
    };
    
    return (
        <div className="p-4">
            <div ref={detailRef} className="p-4 bg-white dark:bg-slate-800 rounded-lg">
                <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
                    <div>
                        <h3 className="font-bold text-xl text-gray-900 dark:text-white">{issue.productName} ({issue.partName})</h3>
                        <p className="text-base text-gray-500 dark:text-slate-400">{issue.supplier}</p>
                    </div>
                    <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-md">{issue.orderNumber}</span>
                </div>
                {issue.keywordPairs && issue.keywordPairs.length > 0 && (
                    <div className="mb-4">
                        <h4 className="font-semibold text-md text-gray-800 dark:text-slate-200 mb-2">공정/불량 키워드:</h4>
                        <div className="flex flex-wrap gap-2">
                            {issue.keywordPairs.map((pair, index) => (
                                <div key={index} className="text-sm p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                                    <span className="font-semibold">{pair.process}:</span> {pair.defect}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div>
                    <h4 className="font-semibold text-md text-gray-800 dark:text-slate-200 mb-2">이슈사항:</h4>
                     <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md">
                        <ul className="list-disc list-inside space-y-2 text-base text-gray-700 dark:text-slate-200">
                            {issue.issues.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                        {canManage && (
                            !isAddingIssue ? (
                                <button
                                    onClick={() => setIsAddingIssue(true)}
                                    className="mt-3 w-full py-2 border border-dashed border-gray-400 dark:border-slate-500 rounded-md text-sm text-gray-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    이슈사항 추가하기
                                </button>
                            ) : (
                                <div className="mt-3 space-y-2">
                                    <textarea
                                        value={newIssue}
                                        onChange={(e) => setNewIssue(e.target.value)}
                                        className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                                        rows={3}
                                        placeholder="추가할 이슈 내용을 입력하세요..."
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setIsAddingIssue(false)} className="bg-gray-200 dark:bg-slate-600 px-3 py-1 rounded-md text-sm">취소</button>
                                        <button onClick={handleAddNewIssue} className="bg-primary-600 text-white px-3 py-1 rounded-md text-sm">저장</button>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
                <div className="mt-4 pt-2 text-sm text-right text-gray-400 dark:text-slate-500">
                    작성자: {issue.author} / {new Date(issue.createdAt).toLocaleString('ko-KR')}
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t dark:border-slate-700">
                <button onClick={() => onCopy(detailRef.current)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700">이미지로 복사하기</button>
                {currentUserProfile?.role === 'Admin' && <button onClick={onDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700">삭제</button>}
            </div>
        </div>
    );
};

const QualityIssueCenter: React.FC<QualityIssueCenterProps> = ({ currentUserProfile, addToast }) => {
    const [issues, setIssues] = useState<QualityIssue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);
    const [itemToDelete, setItemToDelete] = useState<QualityIssue | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const unsubscribe = db.collection('quality-issues').orderBy('createdAt', 'desc').limit(200).onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QualityIssue));
            setIssues(data);
            setIsLoading(false);
        }, error => {
            console.error("Error fetching quality issues:", error);
            addToast({ message: '이슈 알림 로딩 실패', type: 'error' });
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [addToast]);
    
    const filteredIssues = useMemo(() => {
        if (!searchTerm.trim()) {
            return issues;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return issues.filter(issue =>
            issue.orderNumber.toLowerCase().includes(lowercasedTerm) ||
            issue.productName.toLowerCase().includes(lowercasedTerm) ||
            issue.partName.toLowerCase().includes(lowercasedTerm) ||
            issue.supplier.toLowerCase().includes(lowercasedTerm) ||
            issue.author.toLowerCase().includes(lowercasedTerm) ||
            issue.issues.some(i => i.toLowerCase().includes(lowercasedTerm))
        );
    }, [issues, searchTerm]);

    const handleSave = async (data: Omit<QualityIssue, 'id' | 'createdAt' | 'author' | 'imageUrls'>, imageFiles: File[]) => {
        if (!currentUserProfile) {
            addToast({ message: '로그인이 필요합니다.', type: 'error' });
            return;
        }
        setIsSaving(true);
        try {
            const newIssuePayload: Omit<QualityIssue, 'id'> = {
                ...data,
                author: currentUserProfile.displayName,
                createdAt: new Date().toISOString(),
                imageUrls: [],
            };
            const newDocRef = await db.collection('quality-issues').add(newIssuePayload);
            
            if (imageFiles.length > 0) {
                const imageUrls = await Promise.all(
                    imageFiles.map(file => {
                        const ref = storage.ref(`quality-issue-images/${newDocRef.id}/${Date.now()}-${file.name}`);
                        return ref.put(file).then(snapshot => snapshot.ref.getDownloadURL());
                    })
                );
                await newDocRef.update({ imageUrls });
            }

            addToast({ message: '품질 이슈가 등록되었습니다.', type: 'success' });
            setIsFormModalOpen(false);
        } catch (error) {
            console.error("Error saving issue:", error);
            addToast({ message: '저장에 실패했습니다.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            await db.collection('quality-issues').doc(itemToDelete.id).delete();
            addToast({ message: '이슈가 삭제되었습니다.', type: 'success' });
            setItemToDelete(null);
            setSelectedIssue(null);
        } catch (error) {
            addToast({ message: '삭제 중 오류 발생', type: 'error' });
        }
    };
    
    const handleCopyCard = (element: HTMLDivElement | null) => {
        if (!element) return;
        addToast({ message: '이미지 생성 중...', type: 'info' });
        html2canvas(element, { 
            useCORS: true, 
            backgroundColor: window.getComputedStyle(document.documentElement).getPropertyValue('color-scheme') === 'dark' ? '#1e293b' : '#ffffff',
            scale: 2 
        }).then(canvas => {
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    addToast({ message: '이미지 파일 생성 실패.', type: 'error' });
                    return;
                }
                try {
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                    addToast({ message: '카드가 이미지로 복사되었습니다.', type: 'success' });
                } catch (err) {
                    console.error('클립보드 복사 실패:', err);
                    addToast({ message: '이미지 복사에 실패했습니다.', type: 'error' });
                }
            }, 'image/png');
        });
    };
    
    const handleAddIssueItem = async (issueId: string, newItem: string) => {
        if (!newItem.trim()) {
            addToast({ message: '이슈 내용을 입력해주세요.', type: 'error' });
            return;
        }
        try {
            const issueRef = db.collection('quality-issues').doc(issueId);
            await issueRef.update({
                issues: firebase.firestore.FieldValue.arrayUnion(newItem)
            });
            addToast({ message: '이슈 항목이 추가되었습니다.', type: 'success' });
        } catch (error) {
            console.error("Error adding issue item:", error);
            addToast({ message: '이슈 항목 추가에 실패했습니다.', type: 'error' });
        }
    };

    const canManage = currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Manager';

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <header className="flex-shrink-0 p-4 border-b dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">품질이슈 알림센터</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">실시간 품질 이슈를 확인하고 공유합니다.</p>
                </div>
                 <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                        type="text"
                        placeholder="이슈 검색..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full sm:w-64 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                        lang="ko"
                    />
                    <div className="flex items-center space-x-1 bg-gray-200 dark:bg-slate-700 p-1 rounded-lg">
                        <button onClick={() => setViewMode('card')} className={`px-2 py-1.5 text-sm rounded flex items-center gap-2 ${viewMode === 'card' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg><span className="hidden sm:inline">카드형</span></button>
                        <button onClick={() => setViewMode('list')} className={`px-2 py-1.5 text-sm rounded flex items-center gap-2 ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg><span className="hidden sm:inline">리스트형</span></button>
                    </div>
                    {canManage && (
                        <button onClick={() => setIsFormModalOpen(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700">
                            알림 등록
                        </button>
                    )}
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="text-center">로딩 중...</div>
                ) : filteredIssues.length > 0 ? (
                    viewMode === 'card' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredIssues.map(issue => <QualityIssueCard key={issue.id} issue={issue} onSelect={() => setSelectedIssue(issue)} />)}
                        </div>
                    ) : (
                        <QualityIssueTable issues={filteredIssues} onSelect={setSelectedIssue} />
                    )
                ) : (
                    <div className="text-center text-gray-500 dark:text-slate-400">
                        {searchTerm ? '검색된 이슈가 없습니다.' : '등록된 이슈가 없습니다.'}
                    </div>
                )}
            </main>
            <FullScreenModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                title="신규 품질이슈 등록"
            >
                <QualityIssueForm onSave={handleSave} onCancel={() => setIsFormModalOpen(false)} isSaving={isSaving} />
            </FullScreenModal>
            
             <FullScreenModal
                isOpen={!!selectedIssue}
                onClose={() => setSelectedIssue(null)}
                title="품질이슈 상세 정보"
            >
                {selectedIssue && (
                    <QualityIssueDetail
                        issue={selectedIssue}
                        onCopy={handleCopyCard}
                        onDelete={() => setItemToDelete(selectedIssue)}
                        currentUserProfile={currentUserProfile}
                        onAddIssueItem={(newItem) => handleAddIssueItem(selectedIssue.id, newItem)}
                    />
                )}
            </FullScreenModal>
            
            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleDelete}
                title="이슈 삭제 확인"
                message={`'${itemToDelete?.productName}' 이슈를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
            />
        </div>
    );
};

export default QualityIssueCenter;
