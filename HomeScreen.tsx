import React, { useState } from 'react';
import AppIcon from './components/AppIcon';
import AppGuide from './components/AppGuide';
import { Notification, ActiveCenter } from './types';

interface HomeScreenProps {
    onSelectCenter: (center: ActiveCenter) => void;
    userName?: string;
    notifications: Notification[];
    onNotificationClick: (notification: Notification) => void;
}

const NotificationIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
    // FIX: Removed 'production' key as it's not a valid Notification type.
    const iconMap: Record<Notification['type'], React.ReactNode> = {
        jig: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
        quality: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        work: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
        sample: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    };
    return <>{iconMap[type] || null}</>;
};

const CenterCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onClick: () => void; }> = ({ title, description, icon, onClick }) => (
    <div onClick={onClick} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 flex flex-col items-start gap-4 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer">
        <div className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-full">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 flex-1">{description}</p>
        <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">바로가기 &rarr;</span>
    </div>
);

const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectCenter, userName, notifications, onNotificationClick }) => {
    const [showGuide, setShowGuide] = useState(false);

    const centerData: {id: ActiveCenter, title: string, description: string, icon: React.ReactNode}[] = [
        { id: 'notification', title: "알림 센터", description: "전사 공지사항을 확인하고 근무 계획을 수립 및 조회합니다.", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-2.236 9.168-5.584C18.354 1.832 18 3.057 18 4.508v8.584a6 6 0 01-7.72 5.732" /></svg> },
        { id: 'work', title: "개인(그룹)업무", description: "개인 및 그룹의 업무를 등록하고 진행 상황을 추적, 관리합니다.", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
        { id: 'sample', title: "샘플 센터", description: "샘플 요청 및 발송 이력을 체계적으로 관리하고 데이터를 추적합니다.", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
        { id: 'quality', title: "품질 관리", description: "제품 품질 검사, 불량 관리 등 품질 관련 업무를 통합 관리합니다.", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { id: 'jig', title: "지그 관리", description: "지그 제작, 수리, 구매 요청부터 발주 및 입고까지 전 과정을 관리합니다.", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
        { id: 'settings', title: "통합 설정", description: "앱의 테마, 사용자 권한 등 전반적인 설정을 관리합니다.", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
    ];

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

    return (
        <>
        <div className="w-full">
            {/* Hero Section */}
            <section className="relative flex items-center justify-center text-center h-[50vh] bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 text-white overflow-hidden animate-fade-in-up">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
                <div className="relative z-10 p-4">
                    <AppIcon className="w-24 h-24 mx-auto mb-4" />
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">T.M.S: 업무의 모든 과정을 한눈에</h1>
                    <p className="mt-4 text-lg md:text-xl text-slate-300 max-w-3xl mx-auto">환영합니다, {userName || '사용자'}님. T.M.S는 모든 업무 프로세스를 투명하고 효율적으로 관리할 수 있도록 돕는 통합 솔루션입니다.</p>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
                {/* Features Section */}
                <section>
                    <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">주요 기능 센터</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                       {centerData.map(center => (
                           <CenterCard key={center.id} {...center} onClick={() => onSelectCenter(center.id)} />
                       ))}
                    </div>
                </section>

                {/* Notifications Section */}
                <section>
                     <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">통합 알림 현황</h2>
                     <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-white/30 dark:border-slate-700/50 rounded-xl shadow-lg p-4 md:p-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
                         <div className="space-y-4">
                            {notifications.slice(0, 30).map(notification => (
                                <div
                                    key={notification.id}
                                    onClick={() => onNotificationClick(notification)}
                                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                                >
                                    {!notification.read && <div className="flex-shrink-0 mt-2 w-2.5 h-2.5 rounded-full bg-blue-500" title="읽지 않음" />}
                                    <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-full ${notification.read ? 'ml-6' : ''}`}>
                                        <NotificationIcon type={notification.type} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-700 dark:text-slate-200 leading-snug">{notification.message}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{timeAgo(notification.date)}</p>
                                    </div>
                                </div>
                            ))}
                            {notifications.length === 0 && (
                                <div className="text-center text-sm text-gray-500 dark:text-slate-400 py-8">
                                    새로운 알림이 없습니다.
                                </div>
                            )}
                         </div>
                     </div>
                </section>

                <footer className="mt-12 flex justify-center">
                    <button onClick={() => setShowGuide(true)} className="bg-slate-700/80 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-600/80 transition-all duration-300 shadow-md backdrop-blur-sm">
                        앱 사용 가이드 보기
                    </button>
                </footer>
            </div>
        </div>
        {showGuide && <AppGuide onClose={() => setShowGuide(false)} />}
        </>
    );
};

export default HomeScreen;