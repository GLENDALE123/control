

import React from 'react';
import { SampleRequest } from '../types';
import { SAMPLE_STATUS_COLORS } from '../constants';

interface SampleRequestCardProps {
  request: SampleRequest;
  onSelect: () => void;
}

const SampleRequestCard: React.FC<SampleRequestCardProps> = ({ request, onSelect }) => {
    const statusColor = SAMPLE_STATUS_COLORS[request.status];
    const imageUrl = request.imageUrls && request.imageUrls[0];
    const items = request.items || [];
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const firstPartName = items[0]?.partName || '';
    const coatingMethods = Array.from(new Set(items.map(item => item.coatingMethod).filter(Boolean))).join(', ');

    return (
        <div 
            onClick={onSelect}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group"
        >
            {imageUrl ? (
                <img src={imageUrl} alt={request.productName} className="w-full h-40 object-cover" loading="lazy" />
            ) : (
                <div className="w-full h-40 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <svg className="w-12 h-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
            )}
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white truncate pr-2">{request.productName} / {firstPartName} {items.length > 1 ? `외 ${items.length - 1}건` : ''}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>{request.status}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                    <strong>고객사:</strong> {request.clientName}
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-1 truncate">
                    <strong>코팅방식:</strong> {coatingMethods || 'N/A'}
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-500">
                    <strong>총 수량:</strong> {totalQuantity.toLocaleString()}
                </p>
                <div className="text-xs text-gray-500 dark:text-slate-500 mt-3 pt-3 border-t dark:border-slate-700 flex justify-between">
                    <span><strong>요청일:</strong> {request.requestDate}</span>
                    <span><strong>납기요청:</strong> {request.dueDate}</span>
                </div>
            </div>
        </div>
    );
};

export default SampleRequestCard;