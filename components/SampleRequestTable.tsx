import React from 'react';
import { SampleRequest } from '../types';
import { SAMPLE_STATUS_COLORS } from '../constants';

interface SampleRequestTableProps {
  requests: SampleRequest[];
  onSelectRequest: (request: SampleRequest) => void;
}

const MemoizedTableRow = React.memo(({ request, onSelectRequest }: { request: SampleRequest; onSelectRequest: (request: SampleRequest) => void; }) => {
  const items = request.items || [];
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const partNames = items.map(item => item.partName).join(', ');
  const colorSpecs = items.map(item => item.colorSpec).join(', ');
  const allPostProcessing = Array.from(new Set(items.flatMap(item => item.postProcessing || []))).join(', ');
  const allCoatingMethods = Array.from(new Set(items.map(item => item.coatingMethod))).join(', ');


  return (
    <tr
      className="border-b dark:border-slate-700 transition-colors bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
      onClick={() => onSelectRequest(request)}
    >
      <td className="px-2 py-4 font-mono text-xs whitespace-nowrap">{request.id}</td>
      <td className="px-2 py-4 text-xs whitespace-nowrap">{request.requestDate}</td>
      <td className="px-2 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${SAMPLE_STATUS_COLORS[request.status]}`}>
          {request.status}
        </span>
      </td>
      <td className="px-2 py-4 whitespace-nowrap">{request.requesterName}</td>
      <td className="px-2 py-4 whitespace-nowrap">{request.contact}</td>
      <td className="px-2 py-4 whitespace-nowrap">{request.clientName}</td>
      <td className="px-2 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{request.productName}</td>
      <td className="px-2 py-4 whitespace-nowrap">{partNames}</td>
      <td className="px-2 py-4 whitespace-nowrap">{allCoatingMethods}</td>
      <td className="px-2 py-4 whitespace-nowrap">{colorSpecs}</td>
      <td className="px-2 py-4 text-right whitespace-nowrap">{totalQuantity.toLocaleString()}</td>
      <td className="px-2 py-4 whitespace-nowrap">{allPostProcessing}</td>
      <td className="px-2 py-4 whitespace-nowrap">{request.dueDate}</td>
      <td className="px-2 py-4 whitespace-nowrap">{request.requesterInfo.displayName}</td>
      <td className="px-2 py-4 text-xs whitespace-nowrap">{new Date(request.createdAt).toLocaleString('ko-KR')}</td>
      <td className="px-2 py-4 text-xs whitespace-nowrap" title={request.remarks}>{request.remarks}</td>
    </tr>
  );
});

const SampleRequestTable: React.FC<SampleRequestTableProps> = ({ requests, onSelectRequest }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden h-full flex flex-col">
      <div className="overflow-auto flex-1">
        <table className="w-full min-w-max text-sm text-left text-gray-500 dark:text-slate-400">
          <thead className="text-xs text-white dark:text-slate-300 uppercase bg-gradient-to-r from-pink-700 to-purple-800 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">요청 ID</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">요청일</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">상태</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">요청담당자</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">연락처</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">고객사명</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">제품명</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">부속명</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">코팅/증착방식</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">색상(사양)</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">요청수량</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">후가공</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">납기요청일</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">시스템등록자</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">시스템등록일</th>
              <th scope="col" className="px-2 py-3 whitespace-nowrap">비고</th>
            </tr>
          </thead>
          <tbody>
            {(requests || []).map(request => (
              <MemoizedTableRow key={request.id} request={request} onSelectRequest={onSelectRequest} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SampleRequestTable;