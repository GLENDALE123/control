import React from 'react';
import { UserProfile } from '../types';

type ActiveMenu = 'dashboard' | 'ledger' | 'jigList' | 'master';

interface NavigationProps {
  activeMenu: ActiveMenu;
  onSelect: (menu: ActiveMenu) => void;
  currentUserProfile: UserProfile | null;
}

const Navigation: React.FC<NavigationProps> = ({ activeMenu, onSelect, currentUserProfile }) => {
  const allMenuItems = [
    { key: 'dashboard', label: '대시보드' },
    { key: 'ledger', label: '지그 관리대장' },
    { key: 'jigList', label: '지그목록표' },
    { key: 'master', label: '마스터 데이터 관리' },
  ];

  const menuItems = allMenuItems;

  const linkClasses = (key: ActiveMenu) => 
    `px-4 py-2 font-semibold rounded-md transition-colors text-sm ${
      activeMenu === key 
        ? 'bg-primary-200/50 dark:bg-primary-700/50 text-primary-700 dark:text-primary-200' 
        : 'text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
    }`;

  return (
    <nav className="bg-white dark:bg-slate-800 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
              {menuItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => onSelect(item.key as ActiveMenu)}
                  className={`${linkClasses(item.key as ActiveMenu)} flex-shrink-0`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;