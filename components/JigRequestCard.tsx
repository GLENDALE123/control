
import React from 'react';
import { JigRequest, Status } from '../types';
import { STATUS_COLORS } from '../constants';

interface JigRequestCardProps {
  request: JigRequest;
  onSelect: (request: JigRequest) => void;
}

const JigRequestCard: React.FC<JigRequestCardProps> = React.memo(({ request, onSelect }) => {
  const statusColor = STATUS_COLORS[request.status];
  const pulseAnimation = request.status === Status.InProgress || request.status === Status.Receiving ? 'animate-pulse' : '';
  const imageUrl = request.imageUrls && request.imageUrls[0];

  return (
    <div 
      className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden group"
      onClick={() => onSelect(request)}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={request.itemName} className="w-full h-40 object-cover group-hover:opacity-90 transition-opacity" loading="lazy" />
      ) : (
        <div className="w-full h-40 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <svg className="w-12 h-12 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        </div>
      )}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white truncate pr-2">{request.itemName} ({request.partName})</h3>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColor} ${pulseAnimation}`}>
            {request.status}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">
          <strong>지그번호:</strong> {request.itemNumber || 'N/A'}
        </p>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          <strong>요청자:</strong> {request.requester}
        </p>
        <div className="text-sm text-gray-500 dark:text-slate-500 mt-2 grid grid-cols-2">
            <span><strong>완료 요청일:</strong> {request.deliveryDate}</span>
            {(request.status === Status.InProgress || request.status === Status.Receiving || request.status === Status.Completed) && (
                <span className="text-right"><strong>입고:</strong> {request.receivedQuantity.toLocaleString()}/{request.quantity.toLocaleString()}</span>
            )}
        </div>
      </div>
    </div>
  );
});

export default JigRequestCard;
