
import React from 'react';
import { JigRequest, Status } from '../types';
import { STATUS_FILTERS, STATUS_COLORS } from '../constants';

interface JigRequestKanbanProps {
  requests: JigRequest[];
  onSelectRequest: (request: JigRequest) => void;
}

interface KanbanCardProps {
  request: JigRequest;
  onSelect: (request: JigRequest) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = React.memo(({ request, onSelect }) => {
  const statusColor = STATUS_COLORS[request.status];

  return (
    <div 
      onClick={() => onSelect(request)}
      className="bg-white dark:bg-slate-700 rounded-md p-3 shadow-sm hover:shadow-lg cursor-pointer border-l-4"
      style={{ borderLeftColor: getStatusColorHex(request.status) }}
    >
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-bold text-sm text-gray-800 dark:text-white truncate pr-2">{request.itemName}</h4>
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColor}`}>{request.status}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{request.partName}</p>
      <div className="mt-2 pt-2 border-t dark:border-slate-600 flex justify-between items-center text-xs text-gray-500 dark:text-slate-400">
        <span>{request.requester}</span>
        <span>{request.deliveryDate}</span>
      </div>
    </div>
  );
});

const getStatusColorHex = (status: Status) => {
    switch(status) {
        case Status.Request: return '#3b82f6';
        case Status.InProgress: return '#f59e0b';
        case Status.Receiving: return '#06b6d4';
        case Status.Hold: return '#f97316';
        case Status.Completed: return '#22c55e';
        case Status.Rejected: return '#ef4444';
        default: return '#64748b';
    }
}


const JigRequestKanban: React.FC<JigRequestKanbanProps> = ({ requests, onSelectRequest }) => {
  const columns = STATUS_FILTERS.map(status => ({
    title: status,
    requests: requests.filter(req => req.status === status),
  }));

  return (
    <div className="flex space-x-4 overflow-x-auto p-2 -mx-2 h-full">
      {columns.map(column => (
        <div key={column.title} className="flex-shrink-0 w-72 bg-gray-100 dark:bg-slate-800 rounded-lg shadow-inner flex flex-col">
          <div className="p-3 border-b-2 flex-shrink-0" style={{ borderBottomColor: getStatusColorHex(column.title) }}>
            <h3 className="font-semibold text-gray-700 dark:text-slate-200">{column.title} ({column.requests.length})</h3>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto flex-1">
            {column.requests.map(request => (
              <KanbanCard key={request.id} request={request} onSelect={onSelectRequest} />
            ))}
            {column.requests.length === 0 && (
                <div className="text-center text-sm text-gray-400 dark:text-slate-500 pt-4">
                    요청 없음
                </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default JigRequestKanban;
