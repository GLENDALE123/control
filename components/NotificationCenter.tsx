
import React, { useState, useMemo, FC } from 'react';
import { UserProfile, Notification } from '../types';
import Announcements from './Announcements';
import WorkSchedule from './WorkSchedule';

interface NotificationCenterProps {
    notifications: Notification[];
    onNotificationClick: (notification: Notification) => void;
    addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
    currentUserProfile: UserProfile | null;
}

type ActiveTab = 'notifications' | 'announcements' | 'schedule';

const timeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "년 전";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "달 전";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "일 전";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "시간 전";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "분 전";
    return "방금 전";
};

const NotificationIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
    const iconMap: Record<Notification['type'], React.ReactNode> = {
        jig: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
        quality: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        work: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
        sample: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    };
    return <>{iconMap[type] || null}</>;
};

const groupNotificationsByDate = (notifications: Notification[]): [string, Notification[]][] => {
    const groups: { [key: string]: Notification[] } = {
        '오늘': [], '어제': [], '이번 주': [], '이전 알림': []
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    notifications.forEach(n => {
        const nDate = new Date(n.date);
        nDate.setHours(0, 0, 0, 0);

        if (nDate.getTime() === today.getTime()) {
            groups['오늘'].push(n);
        } else if (nDate.getTime() === yesterday.getTime()) {
            groups['어제'].push(n);
        } else if (nDate >= startOfWeek) {
            groups['이번 주'].push(n);
        } else {
            groups['이전 알림'].push(n);
        }
    });

    return Object.entries(groups).filter(([, items]) => items.length > 0);
};

const NotificationList: FC<{ notifications: Notification[], onNotificationClick: (n: Notification) => void }> = ({ notifications, onNotificationClick }) => {
    const [filter, setFilter] = useState<'all' | 'unread'>('unread');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    
    const notificationTypes = useMemo(() => {
        const types = new Set(notifications.map(n => n.type));
        return Array.from(types);
    }, [notifications]);

    const filteredNotifications = useMemo(() => {
        return notifications.filter(n => {
            const readMatch = filter === 'all' || !n.read;
            const typeMatch = typeFilter === 'all' || n.type === typeFilter;
            return readMatch && typeMatch;
        });
    }, [notifications, filter, typeFilter]);

    const groupedNotifications = useMemo(() => groupNotificationsByDate(filteredNotifications), [filteredNotifications]);

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <div className="p-4 border-b dark:border-slate-700 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold mr-2">상태:</span>
                    <button onClick={() => setFilter('all')} className={`px-3 py-1 text-xs rounded-full ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>전체</button>
                    <button onClick={() => setFilter('unread')} className={`px-3 py-1 text-xs rounded-full ${filter === 'unread' ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>읽지 않음</button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold mr-2">유형:</span>
                    <button onClick={() => setTypeFilter('all')} className={`px-3 py-1 text-xs rounded-full ${typeFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>전체</button>
                    {notificationTypes.map(type => (
                         <button key={type} onClick={() => setTypeFilter(type)} className={`px-3 py-1 text-xs rounded-full ${typeFilter === type ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>{type}</button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {groupedNotifications.length > 0 ? groupedNotifications.map(([groupTitle, groupItems]) => (
                    <div key={groupTitle}>
                        <h3 className="text-lg font-bold mb-3 text-gray-800 dark:text-white">{groupTitle}</h3>
                        <div className="space-y-2">
                            {groupItems.map(n => (
                                <div key={n.id} onClick={() => onNotificationClick(n)} className={`flex items-start gap-4 p-3 rounded-lg cursor-pointer transition-colors ${!n.read ? 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                    <div className={`flex-shrink-0 mt-1 w-2.5 h-2.5 rounded-full ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-full"><NotificationIcon type={n.type} /></div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-700 dark:text-slate-200">{n.message}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{timeAgo(n.date)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500 dark:text-slate-400">표시할 알림이 없습니다.</p>}
            </div>
        </div>
    );
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onNotificationClick, addToast, currentUserProfile }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('notifications');

    const TabButton: React.FC<{ tab: ActiveTab, label: string, children: React.ReactNode }> = ({ tab, label, children }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab 
                ? 'bg-primary-600 text-white' 
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
        >
            {children}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    return (
        <div className="h-full flex flex-col gap-4">
            <nav className="flex-shrink-0 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2">
                    <TabButton tab="notifications" label="알림 목록">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                    </TabButton>
                    <TabButton tab="announcements" label="공지사항">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L4 6.44V4a1 1 0 00-2 0v12a1 1 0 002 0v-2.44l12.553 3.346A1 1 0 0018 17v-2.553a1 1 0 00-1.11-.974L7 11.554V9.446l9.89-2.637A1 1 0 0018 6.553V4a1 1 0 000-1z" clipRule="evenodd" /></svg>
                    </TabButton>
                    <TabButton tab="schedule" label="근무계획">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                    </TabButton>
                </div>
            </nav>
            <div className="flex-1 overflow-hidden">
                {activeTab === 'notifications' && (
                    <NotificationList notifications={notifications} onNotificationClick={onNotificationClick} />
                )}
                {activeTab === 'announcements' && (
                    <Announcements addToast={addToast} currentUserProfile={currentUserProfile} />
                )}
                {activeTab === 'schedule' && (
                    <WorkSchedule addToast={addToast} currentUserProfile={currentUserProfile} />
                )}
            </div>
        </div>
    );
};

export default NotificationCenter;