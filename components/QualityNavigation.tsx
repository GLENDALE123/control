import React from 'react';
import { UserProfile } from '../types';
import ThemeToggle from './ThemeToggle';

type ActiveQualityMenu = 'dashboard' | 'issueCenter' | 'controlCenter' | 'circleCenter' | 'team' | 'settings' | 'guide';
type Theme = 'light' | 'dark';

interface QualityNavigationProps {
  activeMenu: ActiveQualityMenu;
  onSelect: (menu: ActiveQualityMenu) => void;
  currentUserProfile: UserProfile | null;
  // FIX: Add theme and setTheme props to fix type error and support theme toggling.
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const QualityNavigation: React.FC<QualityNavigationProps> = ({ activeMenu, onSelect, currentUserProfile, theme, setTheme }) => {
  const menuItems = [
    { key: 'dashboard', label: '대시보드' },
    { key: 'issueCenter', label: '품질이슈 알림센터' },
    { key: 'controlCenter', label: '관제센터' },
    { key: 'circleCenter', label: '분임조센터' },
    { key: 'team', label: '팀관리' },
  ];

  const linkClasses = (key: ActiveQualityMenu) => 
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
                  onClick={() => onSelect(item.key as ActiveQualityMenu)}
                  className={`${linkClasses(item.key as ActiveQualityMenu)} flex-shrink-0`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-4 flex items-center gap-x-2 flex-shrink-0">
            {/* FIX: Add ThemeToggle to allow changing theme from Quality Center navigation. */}
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default QualityNavigation;