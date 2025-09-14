
import React, { forwardRef } from 'react';
import { Notification } from '../types';

interface NotificationPanelProps {
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAllAsRead: () => void;
  onViewAll: () => void;
  onClose: () => void; // Added for completeness, though not explicitly used inside
}

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

const NotificationPanel = forwardRef<HTMLDivElement, NotificationPanelProps>(({ notifications, onNotificationClick, onMarkAllAsRead, onViewAll }, ref) => {
    const unreadNotifications = notifications.filter(n => !n.read);
    const unreadCount = unreadNotifications.length;
    const recentNotifications = unreadNotifications.slice(0, 15);

    return (
        <div ref={ref} className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border dark:border-slate-700 z-50 overflow-hidden animate-fade-in-down">
            <div className="p-3 flex justify-between items-center border-b dark:border-slate-700">
                <h3 className="font-semibold text-gray-800 dark:text-white">알림</h3>
                {unreadCount > 0 && (
                    <button onClick={onMarkAllAsRead} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                        모두 읽음으로 표시
                    </button>
                )}
            </div>
            <div className="max-h-96 overflow-y-auto">
                {recentNotifications.length > 0 ? (
                    recentNotifications.map(notification => (
                        <div
                            key={notification.id}
                            onClick={() => onNotificationClick(notification)}
                            className="p-3 flex items-start gap-3 cursor-pointer transition-colors bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                        >
                            <div className="flex-shrink-0 mt-1 w-2.5 h-2.5 rounded-full bg-blue-500" />
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-full">
                                <NotificationIcon type={notification.type} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-700 dark:text-slate-200">{notification.message}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{timeAgo(notification.date)}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
                        새로운 알림이 없습니다.
                    </div>
                )}
            </div>
             <div className="p-2 text-center border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <button onClick={onViewAll} className="w-full text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline p-2 rounded-md">
                    모든 알림 보기
                </button>
            </div>
            <style>{`
                @keyframes fade-in-down {
                  from { opacity: 0; transform: translateY(-10px) scale(0.95); }
                  to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in-down {
                  animation: fade-in-down 0.2s ease-out forwards;
                  transform-origin: top right;
                }
            `}</style>
        </div>
    );
});

export default NotificationPanel;