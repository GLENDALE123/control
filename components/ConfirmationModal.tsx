import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{title}</h3>
                <p className="text-gray-600 dark:text-slate-300 mb-6">{message}</p>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-slate-500">
                        취소
                    </button>
                    <button onClick={onConfirm} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700">
                        삭제
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
