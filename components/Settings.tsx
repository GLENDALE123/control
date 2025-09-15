import React, { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import AppIcon from './AppIcon';
import { UserProfile, UserRole } from '../types';
import { db } from '../firebaseConfig';

type Theme = 'light' | 'dark';

interface SettingsProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  currentUserProfile: UserProfile | null;
}

const SettingRow: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border dark:border-slate-700 rounded-lg">
    <div>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-slate-400">{description}</p>
    </div>
    <div className="flex-shrink-0">
      {children}
    </div>
  </div>
);

const UserManagement: React.FC<{ currentUserProfile: UserProfile | null }> = ({ currentUserProfile }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (currentUserProfile?.role !== 'Admin' || !isVisible) return;
        
        setIsLoading(true);
        const unsubscribe = db.collection('users').onSnapshot(snapshot => {
            const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
            setUsers(usersData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentUserProfile, isVisible]);

    const handleRoleChange = (uid: string, newRole: UserRole) => {
        db.collection('users').doc(uid).update({ role: newRole })
            .catch(error => console.error("Error updating role:", error));
    };

    if (currentUserProfile?.role !== 'Admin') return null;

    return (
        <div className="p-4 border dark:border-slate-700 rounded-lg">
            <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setIsVisible(!isVisible)}
                role="button"
                aria-expanded={isVisible}
                aria-controls="user-management-list"
            >
                <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200">사용자 권한 관리</h3>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 dark:text-slate-400 transition-transform duration-300 ${isVisible ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </div>
            
            <div 
                id="user-management-list"
                className={`transition-all duration-300 ease-in-out ${isVisible ? 'max-h-[60vh] overflow-y-auto mt-4' : 'max-h-0 overflow-hidden'}`}
            >
                {isLoading && isVisible ? <p className="pt-2">사용자 목록 로딩 중...</p> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {users.map(user => (
                            <div key={user.uid} className="flex flex-col justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md h-full">
                                <div className="text-sm mb-2">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-gray-800 dark:text-slate-200">{user.displayName}</p>
                                        <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/50 px-1.5 py-0.5 rounded-md">{user.role}</span>
                                    </div>
                                    <p className="text-gray-500 dark:text-slate-400 mt-1 break-all">{user.email}</p>
                                </div>
                                <select
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                                    disabled={user.uid === currentUserProfile.uid}
                                    className="mt-2 w-full p-1.5 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-600 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                    lang="ko"
                                >
                                    <option value="Admin">Admin</option>
                                    <option value="Manager">Manager</option>
                                    <option value="Member">Member</option>
                                </select>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


const Settings: React.FC<SettingsProps> = ({ theme, setTheme, currentUserProfile }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg h-full overflow-auto">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">통합 설정</h2>
        
        <div className="space-y-6">
          <SettingRow
            title="앱 전체 테마"
            description={theme === 'dark' ? '다크 모드 활성화됨. 눈의 피로를 줄여줍니다.' : '라이트 모드 활성화됨.'}
          >
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </SettingRow>

          {currentUserProfile?.role === 'Admin' && <UserManagement currentUserProfile={currentUserProfile} />}

          <div className="p-4 border dark:border-slate-700 rounded-lg">
             <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 mb-4">앱 정보</h3>
             <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-shrink-0 w-32 h-32 rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
                    <AppIcon className="w-full h-full" />
                </div>
                <div>
                  <p className="text-gray-600 dark:text-slate-300">
                    <strong>Total Management System</strong> v1.3.0
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    지그 및 품질 관리 업무의 전 과정을 체계적으로 관리하고 추적하는 통합 웹 애플리케이션입니다. 센터별 설정 분리 및 통합 앱 가이드 기능이 추가되었습니다.
                  </p>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;