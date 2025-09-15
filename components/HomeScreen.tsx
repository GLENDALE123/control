import React, { useState, useMemo } from 'react';
import { ActiveCenter, Notification } from '../types';
import AppIcon from './AppIcon';

interface HomeScreenProps {
    onSelectCenter: (center: ActiveCenter) => void;
    onSearchSubmit: (query: string) => void;
    notifications: Notification[];
    onNotificationClick: (notification: Notification) => void;
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

const QuickAccessButton: React.FC<{ title: string; onClick: () => void; icon: React.ReactNode; }> = ({ title, onClick, icon }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center space-y-2 p-4 group">
        <div className="w-16 h-16 bg-slate-200/10 dark:bg-slate-800/50 rounded-full flex items-center justify-center transition-all duration-300 group-hover:bg-slate-200/20 dark:group-hover:bg-slate-700/60 group-hover:scale-110">
            {icon}
        </div>
        <span className="text-sm text-slate-400 dark:text-slate-300 group-hover:text-white whitespace-nowrap">{title}</span>
    </button>
);

const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectCenter, onSearchSubmit, notifications, onNotificationClick }) => {
    const [query, setQuery] = useState('');
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

    const unreadNotifications = useMemo(() => notifications.filter(n => !n.read), [notifications]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearchSubmit(query.trim());
        }
    };
    
    const centerData: { id: ActiveCenter, title: string, icon: React.ReactNode }[] = [
        { id: 'notification', title: "종합관리", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-2.236 9.168-5.584C18.354 1.832 18 3.057 18 4.508v8.584a6 6 0 01-7.72 5.732" /></svg> },
        { id: 'work', title: "생산센터", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
        { id: 'sample', title: "샘플 센터", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
        { id: 'quality', title: "품질 관리", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { id: 'jig', title: "지그 관리", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
        { id: 'calculator', title: "배합 계산기", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 00.517 3.86l2.387.477a2 2 0 001.806-.547a2 2 0 00.547-1.806l-.477-2.387a6 6 0 00-.517-3.86l-.158-.318a6 6 0 01-.517-3.86l.477-2.387a2 2 0 011.806-.547l2.387.477a6 6 0 013.86.517l.318.158a6 6 0 003.86.517l2.387.477a2 2 0 001.806-.547a2 2 0 00.547-1.806l-.477-2.387a6 6 0 00-.517-3.86l-.158-.318a6 6 0 00-.517-3.86l-.477-2.387a2 2 0 00-1.806-.547 2 2 0 00-1.022.547l-2.387-.477a6 6 0 00-3.86.517l-.318-.158a6 6 0 01-3.86-.517L6.05 3.21a2 2 0 00-1.806-.547 2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 00.517 3.86l.477 2.387a2 2 0 001.806.547 2 2 0 001.022-.547l2.387-.477a6 6 0 003.86-.517l.318-.158a6 6 0 013.86-.517l2.387-.477a2 2 0 011.806.547z" /></svg> },
        { id: 'settings', title: "통합 설정", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
        { id: 'guide', title: "앱 가이드", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
    ];

    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-4 animate-fade-in-up relative overflow-y-auto">
            <button
                onClick={() => setIsNotificationPanelOpen(true)}
                className="absolute top-6 right-6 p-3 bg-white/80 dark:bg-slate-800/80 rounded-full shadow-lg backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
                aria-label={`알림 ${unreadNotifications.length}개`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs items-center justify-center">{unreadNotifications.length}</span>
                    </span>
                )}
            </button>
            <main className="flex flex-col items-center justify-center w-full max-w-3xl">
                <AppIcon className="w-24 h-24 mb-8" />
                
                <form onSubmit={handleSubmit} className="w-full max-w-[700px]">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="업무, 샘플, 문서 등 전체 검색..."
                            lang="ko"
                            className="w-full h-14 pl-12 pr-4 text-lg bg-white dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                        />
                    </div>
                </form>

                <div className="mt-16 grid grid-cols-3 gap-4 sm:gap-6">
                    {centerData.map(center => (
                        <QuickAccessButton 
                            key={center.id}
                            title={center.title}
                            icon={center.icon}
                            onClick={() => onSelectCenter(center.id)}
                        />
                    ))}
                </div>
            </main>
            {isNotificationPanelOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsNotificationPanelOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg mb-2 p-4 border-b dark:border-slate-700 text-gray-800 dark:text-white">읽지 않은 알림</h3>
                        <div className="max-h-96 overflow-y-auto p-2">
                            {unreadNotifications.length > 0 ? (
                                unreadNotifications.map(notification => (
                                    <div key={notification.id} onClick={() => { onNotificationClick(notification); setIsNotificationPanelOpen(false); }} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md cursor-pointer">
                                        <p className="text-sm text-gray-700 dark:text-slate-200">{notification.message}</p>
                                        <p className="text-xs text-slate-500 mt-1">{timeAgo(notification.date)}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-500 text-center py-8">읽지 않은 알림이 없습니다.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeScreen;