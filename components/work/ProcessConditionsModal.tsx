import React, { useState, useEffect, FC } from 'react';
import { PackagingReport } from '../../types';
import FullScreenModal from '../FullScreenModal';

interface ProcessConditionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: PackagingReport | null;
    onSave: (reportId: string, conditions: PackagingReport['processConditions']) => void;
    canManage: boolean;
}

const ProcessConditionsModal: FC<ProcessConditionsModalProps> = ({ 
    isOpen, 
    onClose, 
    report, 
    onSave, 
    canManage 
}) => {
    const [conditionsData, setConditionsData] = useState<NonNullable<PackagingReport['processConditions']>>({});

    useEffect(() => {
        if (report) {
            setConditionsData(report.processConditions || {});
        }
    }, [report]);

    const handleChange = (coat: 'undercoat' | 'midcoat' | 'topcoat', field: 'conditions' | 'remarks', value: string) => {
        setConditionsData(prev => ({
            ...prev,
            [coat]: {
                ...(prev[coat] || { conditions: '', remarks: '' }),
                [field]: value,
            },
        }));
    };

    const handleSave = () => {
        if (report) {
            onSave(report.id, conditionsData);
        }
    };
    
    if (!report) return null;

    return (
        <FullScreenModal isOpen={isOpen} onClose={onClose} title={`${report.productName} 공정 조건`}>
            <div className="p-6 space-y-6">
                <div className="space-y-4">
                    <h4 className="text-lg font-semibold">하도</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">작업조건</label>
                            <textarea 
                                value={conditionsData.undercoat?.conditions || ''} 
                                onChange={e => handleChange('undercoat', 'conditions', e.target.value)} 
                                disabled={!canManage} 
                                rows={4} 
                                className="mt-1 w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">특이사항</label>
                            <textarea 
                                value={conditionsData.undercoat?.remarks || ''} 
                                onChange={e => handleChange('undercoat', 'remarks', e.target.value)} 
                                disabled={!canManage} 
                                rows={4} 
                                className="mt-1 w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                            />
                        </div>
                    </div>
                </div>
                 <div className="space-y-4">
                    <h4 className="text-lg font-semibold">중도</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">작업조건</label>
                            <textarea 
                                value={conditionsData.midcoat?.conditions || ''} 
                                onChange={e => handleChange('midcoat', 'conditions', e.target.value)} 
                                disabled={!canManage} 
                                rows={4} 
                                className="mt-1 w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">특이사항</label>
                            <textarea 
                                value={conditionsData.midcoat?.remarks || ''} 
                                onChange={e => handleChange('midcoat', 'remarks', e.target.value)} 
                                disabled={!canManage} 
                                rows={4} 
                                className="mt-1 w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                            />
                        </div>
                    </div>
                </div>
                 <div className="space-y-4">
                    <h4 className="text-lg font-semibold">상도</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">작업조건</label>
                            <textarea 
                                value={conditionsData.topcoat?.conditions || ''} 
                                onChange={e => handleChange('topcoat', 'conditions', e.target.value)} 
                                disabled={!canManage} 
                                rows={4} 
                                className="mt-1 w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">특이사항</label>
                            <textarea 
                                value={conditionsData.topcoat?.remarks || ''} 
                                onChange={e => handleChange('topcoat', 'remarks', e.target.value)} 
                                disabled={!canManage} 
                                rows={4} 
                                className="mt-1 w-full p-2 border rounded bg-slate-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-shrink-0 p-4 border-t dark:border-slate-700 flex justify-end gap-2">
                <button onClick={onClose} className="bg-slate-200 dark:bg-slate-600 px-4 py-2 rounded-md">취소</button>
                {canManage && <button onClick={handleSave} className="bg-primary-600 text-white px-4 py-2 rounded-md">저장하기</button>}
            </div>
        </FullScreenModal>
    );
};

export default ProcessConditionsModal;
