import React from 'react';
import { ActiveCenter, UserProfile, Notification } from '../types';
import AppIcon from './AppIcon';
import NotificationPanel from './NotificationPanel';

interface MainHeaderProps {
    activeCenter: ActiveCenter;
    onSelectCenter: (center: ActiveCenter) => void;
    unreadCounts: Record<string, number>;
    userProfile: UserProfile | null;
    onLogout: () => void;
    isNotificationPanelOpen: boolean;
    onToggleNotificationPanel: () => void;
    unreadCount: number;
    notificationButtonRef: React.RefObject<HTMLButtonElement>;
    notifications: Notification[];
    notificationPanelRef: React.RefObject<HTMLDivElement>;
    onNotificationClickFromPanel: (notification: Notification) => void;
    onMarkAllAsRead: () => void;
    onViewAll: () => void;
}

const MainHeader: React.FC<MainHeaderProps> = ({ 
    activeCenter, 
    onSelectCenter, 
    unreadCounts, 
    userProfile, 
    onLogout,
    isNotificationPanelOpen,
    onToggleNotificationPanel,
    unreadCount,
    notificationButtonRef,
    notifications,
    notificationPanelRef,
    onNotificationClickFromPanel,
    onMarkAllAsRead,
    onViewAll
}) => {
    const menuItems: { id: ActiveCenter, label: string }[] = [
        { id: 'management', label: '종합관리센터' },
        { id: 'notification', label: '알림 센터' },
        { id: 'work', label: '생산센터' },
        { id: 'sample', label: '샘플 센터' },
        { id: 'quality', label: '품질 관리' },
        { id: 'jig', label: '지그 관리' },
        { id: 'calculator', label: '배합 계산기' },
        { id: 'settings', label: '통합 설정' },
        { id: 'guide', label: '앱 가이드' },
    ];

    const userInitial = userProfile?.displayName?.charAt(0) || '';

    return (
        <header className="bg-primary-800 text-white flex-shrink-0 shadow-lg z-30 relative">
            <div className="mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                    <div className="flex items-center gap-4">
                        <button onClick={() => onSelectCenter('home')} className="flex items-center gap-2 flex-shrink-0">
                            <AppIcon className="w-8 h-8" />
                            <span className="text-xl font-bold tracking-tighter">T.M.S</span>
                        </button>
                        <div className="hidden md:flex items-center space-x-1 overflow-x-auto scrollbar-hide">
                            {menuItems.map(item => (
                                <button 
                                    key={item.id}
                                    onClick={() => onSelectCenter(item.id)}
                                    className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                                        activeCenter === item.id 
                                            ? 'bg-primary-700/50 text-white' 
                                            : 'text-slate-300 hover:bg-primary-700 hover:text-white'
                                    }`}
                                >
                                    {item.label}
                                    {unreadCounts[item.id] > 0 && (
                                        <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-primary-800"></span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button 
                                ref={notificationButtonRef}
                                onClick={onToggleNotificationPanel}
                                className="relative p-2 rounded-full hover:bg-primary-700 transition-colors"
                                aria-label="알림"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-primary-800"></span>
                                )}
                            </button>
                            {isNotificationPanelOpen && (
                                <NotificationPanel
                                    ref={notificationPanelRef}
                                    notifications={notifications}
                                    onNotificationClick={onNotificationClickFromPanel}
                                    onMarkAllAsRead={onMarkAllAsRead}
                                    onViewAll={onViewAll}
                                    onClose={onToggleNotificationPanel}
                                />
                            )}
                        </div>
                        
                        {userProfile && (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold">
                                    {userInitial}
                                </div>
                                <span className="text-sm font-medium hidden sm:block">{userProfile.displayName}</span>
                            </div>
                        )}
                        <button onClick={onLogout} className="p-2 rounded-full hover:bg-primary-700 transition-colors" aria-label="로그아웃">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default MainHeader;
