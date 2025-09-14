


import React, { useState, useMemo, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
import { MasterData, Requester, Destination, Approver, UserProfile } from '../types';
import ConfirmationModal from './ConfirmationModal';

type MasterDataTab = 'requesters' | 'destinations' | 'approvers';
type Theme = 'light' | 'dark';

interface MasterDataManagementProps {
  theme: Theme;
  masterData: MasterData;
  onAddMasterData: (type: MasterDataTab, newItem: Requester | Destination | Approver) => void;
  onEditMasterDataItem: (type: MasterDataTab, updatedItem: Requester | Destination | Approver, index: number) => void;
  onDeleteMasterDataItem: (type: MasterDataTab, index: number) => void;
  currentUserProfile: UserProfile | null;
}

const modalConfig = {
    requesters: {
        title: '신규 요청자 등록',
        fields: [
            { name: 'name', label: '요청자명', type: 'text', required: true, placeholder: '요청자 이름' },
            { name: 'department', label: '부서', type: 'text', required: true, placeholder: '예: 증착팀' },
            { name: 'contact', label: '연락처', type: 'text', required: true, placeholder: '예: 010-1234-5678' },
            { name: 'email', label: '이메일', type: 'email', required: true, placeholder: 'login@example.com' },
        ],
        initialState: { name: '', department: '', contact: '', email: '' }
    },
    destinations: {
        title: '신규 수신처 등록',
        fields: [
            { name: 'name', label: '업체명', type: 'text', required: true, placeholder: '예: 영진아이앤디' },
            { name: 'contactPerson', label: '담당자', type: 'text', required: true, placeholder: '예: 임종엽대표' },
            { name: 'contact', label: '연락처', type: 'text', required: true, placeholder: '예: 010-1234-5678' },
        ],
        initialState: { name: '', contactPerson: '', contact: '' }
    },
    approvers: {
        title: '신규 승인권자 등록',
        fields: [
            { name: 'name', label: '이름', type: 'text', required: true, placeholder: '승인권자 이름' },
            { name: 'department', label: '부서', type: 'text', required: true, placeholder: '예: 증착팀' },
            { name: 'contact', label: '연락처', type: 'text', required: true, placeholder: '예: 010-1234-5678' },
            { name: 'authority', label: '권한', type: 'text', required: true, placeholder: '예: 승인' },
        ],
        initialState: { name: '', department: '', contact: '', authority: '' }
    }
};

interface AddMasterDataModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (newItem: Requester | Destination | Approver) => void;
    type: MasterDataTab;
    initialData?: Requester | Destination | Approver | null;
}

const AddMasterDataModal: React.FC<AddMasterDataModalProps> = ({ isOpen, onClose, onSubmit, type, initialData }) => {
    const config = modalConfig[type];
    const [formData, setFormData] = useState(initialData || config.initialState);

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData || modalConfig[type].initialState);
        }
    }, [isOpen, type, initialData]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    if (!isOpen) return null;
    
    const title = initialData ? config.title.replace('신규', '수정') : config.title;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{title}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {config.fields.map(field => (
                        <div key={field.name}>
                            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 dark:text-slate-300">{field.label}</label>
                            <input
                                type={field.type}
                                id={field.name}
                                name={field.name}
                                value={formData[field.name as keyof typeof formData]}
                                onChange={handleChange}
                                required={field.required}
                                placeholder={field.placeholder}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-slate-700"
                                lang="ko"
                            />
                        </div>
                    ))}
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-slate-500">취소</button>
                        <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700">저장</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const MemoizedMasterDataRow = React.memo(({ item, dataKeys, onEdit, onDelete, canManage }: { item: any, dataKeys: string[], onEdit: () => void, onDelete: () => void, canManage: boolean }) => (
    <tr className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
        {dataKeys.map((key, cellIndex) => (
            <td key={cellIndex} className="px-6 py-4">{item[key]}</td>
        ))}
        {canManage && (
            <td className="px-6 py-4 flex items-center gap-4">
                <button onClick={onEdit} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">수정</button>
                <button onClick={onDelete} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium">삭제</button>
            </td>
        )}
    </tr>
));

// Generic table component for displaying master data
const MasterDataTable = ({ title, headers, data, dataKeys, onEdit, onDelete, canManage }: { 
    title: string; 
    headers: string[]; 
    data: any[]; 
    dataKeys: string[];
    onEdit: (item: any, index: number) => void;
    onDelete: (item: any, index: number) => void;
    canManage: boolean;
}) => {
    if (!data || data.length === 0) {
        return <p className="text-gray-500 dark:text-slate-400 mt-4">데이터가 없습니다.</p>;
    }

    return (
        <div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-slate-200 mb-4 flex-shrink-0">{title}</h3>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
                <table className="w-full min-w-max text-sm text-left text-gray-600 dark:text-slate-300">
                    <thead className="text-xs text-white dark:text-slate-300 uppercase bg-gradient-to-r from-blue-900 to-green-800 sticky top-0 z-10">
                        <tr>
                            {headers.map((header, index) => (
                                <th key={index} scope="col" className="px-6 py-3">{header}</th>
                            ))}
                            {canManage && <th scope="col" className="px-6 py-3">작업</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, rowIndex) => (
                           <MemoizedMasterDataRow
                                key={rowIndex}
                                item={item}
                                dataKeys={dataKeys}
                                onEdit={() => onEdit(item, rowIndex)}
                                onDelete={() => onDelete(item, rowIndex)}
                                canManage={canManage}
                           />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const MasterDataManagement: React.FC<MasterDataManagementProps> = ({ theme, masterData, onAddMasterData, onEditMasterDataItem, onDeleteMasterDataItem, currentUserProfile }) => {
  const [activeTab, setActiveTab] = useState<MasterDataTab>('requesters');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ item: Requester | Destination | Approver; index: number } | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ item: Requester | Destination | Approver; index: number } | null>(null);

  const { requesters, destinations, approvers } = masterData;
  const canManage = currentUserProfile?.role === 'Admin';
  
  const handleAddNewClick = useCallback(() => {
    setEditingItem(null);
    setIsModalOpen(true);
  }, []);

  const handleEditClick = (item: any, index: number) => {
    setEditingItem({ item, index });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (item: any, index: number) => {
    setDeletingItem({ item, index });
  };
  
  const handleConfirmDelete = useCallback(() => {
    if (deletingItem) {
      onDeleteMasterDataItem(activeTab, deletingItem.index);
      setDeletingItem(null);
    }
  }, [deletingItem, activeTab, onDeleteMasterDataItem]);

  const handleModalSubmit = useCallback((newItem: Requester | Destination | Approver) => {
      if (editingItem) {
        onEditMasterDataItem(activeTab, newItem, editingItem.index);
      } else {
        onAddMasterData(activeTab, newItem);
      }
      setIsModalOpen(false);
      setEditingItem(null);
  }, [editingItem, activeTab, onEditMasterDataItem, onAddMasterData]);
  
  const handleModalClose = useCallback(() => {
      setIsModalOpen(false);
      setEditingItem(null);
  }, []);

  const tabButtonStyle = (tabName: MasterDataTab) => 
    `px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      activeTab === tabName 
        ? 'bg-primary-600 text-white' 
        : 'text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
    }`;

  const footerContent = useMemo(() => {
    switch(activeTab) {
      case 'requesters':
        return `총 ${requesters.length}명의 요청자 정보가 있습니다.`;
      case 'destinations':
        return `총 ${destinations.length}개의 수신처 정보가 있습니다.`;
      case 'approvers':
        return `총 ${approvers.length}명의 승인권자 정보가 있습니다.`;
      default:
        return '';
    }
  }, [activeTab, requesters, destinations, approvers]);
    
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg h-full overflow-auto">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">마스터 데이터 관리</h2>
          {canManage && (
            <button 
              onClick={handleAddNewClick}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 shadow"
            >
              신규 등록
            </button>
          )}
        </div>
        
        <div className="border-b border-gray-200 dark:border-slate-700 mt-4">
          <nav className="flex flex-wrap gap-2" aria-label="Tabs">
            <button onClick={() => setActiveTab('requesters')} className={tabButtonStyle('requesters')}>
              요청자 목록
            </button>
            <button onClick={() => setActiveTab('destinations')} className={tabButtonStyle('destinations')}>
              수신처 목록
            </button>
            <button onClick={() => setActiveTab('approvers')} className={tabButtonStyle('approvers')}>
              승인권자 목록
            </button>
          </nav>
        </div>

        <div className="mt-4">
          {activeTab === 'requesters' && (
            <MasterDataTable 
              title="요청자 목록"
              headers={['요청자명', '부서', '연락처', '이메일']}
              data={requesters}
              dataKeys={['name', 'department', 'contact', 'email']}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              canManage={canManage}
            />
          )}
          {activeTab === 'destinations' && (
            <MasterDataTable 
              title="수신처 목록"
              headers={['업체명', '담당자', '연락처']}
              data={destinations}
              dataKeys={['name', 'contactPerson', 'contact']}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              canManage={canManage}
            />
          )}
          {activeTab === 'approvers' && (
            <MasterDataTable 
              title="승인권자 목록"
              headers={['이름', '부서', '연락처', '권한']}
              data={approvers}
              dataKeys={['name', 'department', 'contact', 'authority']}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              canManage={canManage}
            />
          )}
        </div>
      </div>
      
      <div className={`flex-shrink-0 p-3 rounded-b-lg text-sm text-center ${
          theme === 'dark' 
          ? 'bg-slate-100 text-slate-700' 
          : 'bg-slate-900 text-slate-300'
      }`}>
        <p>{footerContent}</p>
      </div>

      <AddMasterDataModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        type={activeTab}
        initialData={editingItem?.item}
      />
      <ConfirmationModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        title="삭제 확인"
        message={`정말로 '${(deletingItem?.item as any)?.name}' 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
      />
    </div>
  );
};

export default MasterDataManagement;