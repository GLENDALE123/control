import React from 'react';
import { JigRequest, Status } from '../types';
import { STATUS_COLORS } from '../constants';

interface JigRequestTableProps {
  requests: JigRequest[];
  onSelectRequest: (request: JigRequest) => void;
}

const getApprovalInfo = (request: JigRequest) => {
  const approverAction = request.history.find(h => h.status !== Status.Request);
  const approver = approverAction ? approverAction.user : 'N/A';

  let approvalStatusText = '대기';
  switch (request.status) {
    case Status.InProgress:
    case Status.Receiving:
    case Status.Completed:
      approvalStatusText = '승인';
      break;
    case Status.Hold:
      approvalStatusText = '보류';
      break;
    case Status.Rejected:
      approvalStatusText = '반려';
      break;
  }
  return { approver, approvalStatusText };
};

const MemoizedTableRow = React.memo(({ request, onSelectRequest }: { request: JigRequest; onSelectRequest: (request: JigRequest) => void; }) => {
  const { approver, approvalStatusText } = getApprovalInfo(request);
  
  const coreCost = request.coreCost ?? 0;
  const unitPrice = request.unitPrice ?? 0;
  let totalAmount = 0;

  if (request.status === Status.InProgress || request.status === Status.Receiving) {
      totalAmount = request.receivedQuantity * unitPrice;
  } else if (request.status === Status.Completed) {
      totalAmount = (request.quantity * unitPrice) + coreCost;
  }

  return (
    <tr 
      className="border-b dark:border-slate-700 transition-colors bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
      onClick={() => onSelectRequest(request)}
    >
      <td className="px-2 py-4 font-mono text-xs whitespace-nowrap">{request.id}</td>
      <td className="px-2 py-4 text-xs whitespace-nowrap">{new Date(request.requestDate).toLocaleString('ko-KR')}</td>
      <td className="px-2 py-4 whitespace-nowrap">{request.requestType}</td>
      <td className="px-2 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[request.status]} ${request.status === Status.InProgress || request.status === Status.Receiving ? 'animate-pulse' : ''}`}>
          {request.status}
        </span>
      </td>
      <td className="px-2 py-4 whitespace-nowrap">{approvalStatusText}</td>
      <td className="px-2 py-4 whitespace-nowrap">{approver}</td>
      <td className="px-2 py-4 whitespace-nowrap">{request.requester}</td>
      <td className="px-2 py-4 whitespace-nowrap">{request.destination}</td>
      <td className="px-2 py-4 whitespace-nowrap">{request.deliveryDate}</td>
      <td className="px-2 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{request.itemName}</td>
      <td className="px-2 py-4 whitespace-nowrap">{request.partName}</td>
      <td className="px-2 py-4 whitespace-nowrap">{request.itemNumber}</td>
      <td className="px-2 py-4 text-right whitespace-nowrap">{request.jigHandleLength ?? ''}</td>
      <td className="px-2 py-4 text-right whitespace-nowrap">{request.quantity.toLocaleString()}</td>
      <td className="px-2 py-4 text-right whitespace-nowrap">{request.receivedQuantity.toLocaleString()}</td>
      <td className="px-2 py-4 text-right whitespace-nowrap">{request.coreCost ? request.coreCost.toLocaleString() : ''}</td>
      <td className="px-2 py-4 text-right whitespace-nowrap">{request.unitPrice ? request.unitPrice.toLocaleString() : ''}</td>
      <td className="px-2 py-4 text-right font-semibold whitespace-nowrap">{totalAmount > 0 ? totalAmount.toLocaleString() : ''}</td>
      <td className="px-2 py-4 text-xs whitespace-nowrap" title={request.remarks}>{request.remarks}</td>
    </tr>
  );
});

const JigRequestTable: React.FC<JigRequestTableProps> = ({ requests, onSelectRequest }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden h-full flex flex-col">
      <div className="overflow-auto flex-1">
        <table className="w-full min-w-max text-sm text-left text-gray-500 dark:text-slate-400">
          <thead className="text-xs text-white dark:text-slate-300 uppercase bg-gradient-to-r from-blue-900 to-green-800 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">ID</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">요청일시</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">요청유형</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">상태</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">승인여부</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">승인자</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">요청자</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">수신처</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">완료요청일</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">제품명</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">부속명</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">지그번호</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">지그손잡이길이(mm)</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">발주수량</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">완료수량</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">코어제작비</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">단가</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">총액</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">비고</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(request => (
              <MemoizedTableRow key={request.id} request={request} onSelectRequest={onSelectRequest} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default JigRequestTable;