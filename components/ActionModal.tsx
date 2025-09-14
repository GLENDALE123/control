import React, { useState } from 'react';

interface ActionModalProps {
    title: string;
    onClose: () => void;
    onSubmit: (reason: string) => void;
}

const ActionModal: React.FC<ActionModalProps> = ({ title, onClose, onSubmit }) => {
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        if (!reason.trim()) {
            alert('사유는 필수입니다.');
            return;
        }
        onSubmit(reason);
    };

    if (!title) return null;
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{title}</h3>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200"
                    rows={4}
                    placeholder="명확한 사유를 입력해주세요..."
                    lang="ko"
                    autoFocus
                ></textarea>
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-slate-500">취소</button>
                    <button onClick={handleSubmit} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700">제출</button>
                </div>
            </div>
        </div>
    );
};

export default ActionModal;
