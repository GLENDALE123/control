import React, { useState, useMemo, useCallback } from 'react';
import { JigMasterItem, JigRequest, UserProfile } from '../types';
import ImageLightbox from './ImageLightbox';

interface JigMasterListProps {
  theme: 'light' | 'dark';
  addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
  autocompleteRequests: JigRequest[];
  jigs: JigMasterItem[];
  onSelectJig: (jig: JigMasterItem) => void;
  onAddNewJig: () => void;
  currentUserProfile: UserProfile | null;
}

const MemoizedJigRow = React.memo(({ jig, onImageClick, onSelectJig }: { jig: JigMasterItem, onImageClick: (url: string) => void, onSelectJig: (jig: JigMasterItem) => void }) => {
  return (
    <tr 
        className="border-b dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
        onClick={() => onSelectJig(jig)}
    >
        <td className="px-2 py-4 whitespace-nowrap">{jig.requestType}</td>
        <td className="px-2 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{jig.itemName}</td>
        <td className="px-2 py-4 whitespace-nowrap">{jig.partName}</td>
        <td className="px-2 py-4 whitespace-nowrap">{jig.itemNumber}</td>
        <td className="px-2 py-4 whitespace-nowrap">
          {jig.imageUrls && jig.imageUrls[0] ? (
            <img 
              src={jig.imageUrls[0]} 
              alt={`${jig.itemName} image`}
              className="w-16 h-16 object-cover rounded-md transition-transform hover:scale-110"
              onClick={(e) => { e.stopPropagation(); onImageClick(jig.imageUrls![0]); }}
              loading="lazy"
            />
          ) : (
            <span className="text-xs text-gray-400">없음</span>
          )}
        </td>
        <td className="px-2 py-4 text-xs truncate max-w-sm whitespace-nowrap" title={jig.remarks}>{jig.remarks}</td>
        <td className="px-2 py-4 text-xs whitespace-nowrap">{new Date(jig.createdAt).toLocaleDateString('ko-KR')}</td>
        <td className="px-2 py-4 text-xs whitespace-nowrap">{jig.createdBy?.displayName || 'N/A'}</td>
    </tr>
  );
});

const JigMasterList: React.FC<JigMasterListProps> = ({ theme, addToast, jigs, onSelectJig, onAddNewJig, currentUserProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const filteredJigs = useMemo(() => {
      if (!searchTerm) return jigs;
      const search = searchTerm.toLowerCase();
      return jigs.filter(jig => 
        jig.itemName.toLowerCase().includes(search) ||
        jig.partName.toLowerCase().includes(search) ||
        jig.itemNumber.toLowerCase().includes(search) ||
        jig.requestType.toLowerCase().includes(search) ||
        jig.remarks.toLowerCase().includes(search) ||
        (jig.createdBy?.displayName || '').toLowerCase().includes(search)
      );
  }, [jigs, searchTerm]);

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg h-full overflow-auto">
        <div className="p-6 pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex-shrink-0">지그 목록표</h2>
              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="지그 검색..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-700"
                    lang="ko"
                  />
                  {(currentUserProfile?.role !== 'Member') && (
                    <button
                      onClick={onAddNewJig}
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 shadow flex-shrink-0"
                    >
                      신규 등록
                    </button>
                  )}
              </div>
            </div>
        </div>
        <div>
            <>
              <table className="w-full min-w-max text-sm text-left text-gray-500 dark:text-slate-400">
                  <thead className="text-xs text-white dark:text-slate-300 uppercase bg-gradient-to-r from-blue-900 to-green-800 sticky top-0 z-10">
                      <tr>
                          <th scope="col" className="px-2 py-3 whitespace-nowrap">생산구분</th>
                          <th scope="col" className="px-2 py-3 whitespace-nowrap">제품명</th>
                          <th scope="col" className="px-2 py-3 whitespace-nowrap">부속명</th>
                          <th scope="col" className="px-2 py-3 whitespace-nowrap">지그번호</th>
                          <th scope="col" className="px-2 py-3 whitespace-nowrap">이미지</th>
                          <th scope="col" className="px-2 py-3 whitespace-nowrap">특이사항</th>
                          <th scope="col" className="px-2 py-3 whitespace-nowrap">입력일자</th>
                          <th scope="col" className="px-2 py-3 whitespace-nowrap">입력자</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filteredJigs.map(jig => (
                          <MemoizedJigRow key={jig.id} jig={jig} onImageClick={setLightboxImage} onSelectJig={onSelectJig} />
                      ))}
                  </tbody>
              </table>
              {filteredJigs.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-gray-500 dark:text-slate-400">검색된 지그가 없습니다.</p>
                </div>
              )}
            </>
        </div>
        <div className={`p-3 rounded-b-lg text-sm text-center ${
            theme === 'dark' 
            ? 'bg-slate-100 text-slate-700' 
            : 'bg-slate-900 text-slate-300'
        }`}>
          <p>총 {filteredJigs.length.toLocaleString()}개의 고유 지그가 있습니다.</p>
        </div>
        {lightboxImage && <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />}
      </div>
    </>
  );
};

export default JigMasterList;