import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db, storage } from '../firebaseConfig';
import { UserProfile, WorkSchedule as WorkScheduleType, Announcement } from '../types';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';


declare const html2canvas: any;

interface WorkScheduleProps {
    addToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
    currentUserProfile: UserProfile | null;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const WORK_TYPES = {
    '기본근무': { description: '08시-17시', color: '#3b82f6', icon: '🔵' },
    '기본+잔업근무': { description: '08시-20시', color: '#3b82f6', icon: '🔵' },
    '토요근무(전체)': { description: '08시-17시', color: '#f59e0b', icon: '🟠' },
    '휴일근무(전체)': { description: '08시-17시', color: '#f59e0b', icon: '🟠' },
    '토요 부분근무': { description: '08시-17시', color: '#f59e0b', icon: '🟠' },
    '휴일 부분근무': { description: '08시-17시', color: '#f59e0b', icon: '🟠' },
    '주말 부분근무': { description: '', color: '#f59e0b', icon: '🟠' },
    '라인정비': { description: '', color: '#10b981', icon: '🟢' },
    '활성탄 교체 공사': { description: '', color: '#ef4444', icon: '🔴' },
    '기타 공사': { description: '', color: '#6366f1', icon: '🟣' },
    '휴무': { description: '휴무', color: '#64748b', icon: '⚫' }
};

const HOLIDAYS: Record<number, Record<string, string>> = {
    2024: {
        '1-1': '신정', '2-9': '설날', '2-10': '설날', '2-11': '설날', '2-12': '대체공휴일',
        '3-1': '삼일절', '4-10': '국회의원선거', '5-1': '근로자의 날', '5-5': '어린이날',
        '5-6': '대체공휴일', '5-15': '부처님오신날', '6-6': '현충일', '8-15': '광복절',
        '9-16': '추석', '9-17': '추석', '9-18': '추석', '10-3': '개천절',
        '10-9': '한글날', '12-25': '크리스마스'
    },
    2025: {
        '1-1': '신정', '1-28': '설날', '1-29': '설날', '1-30': '설날',
        '3-1': '삼일절', '5-1': '근로자의 날', '5-5': '어린이날',
        '5-6': '부처님오신날', '6-6': '현충일', '8-15': '광복절',
        '10-3': '개천절', '10-6': '추석', '10-7': '추석', '10-8': '추석',
        '10-9': '한글날', '12-25': '크리스마스'
    },
    2026: {
        '1-1': '신정', '2-16': '설날', '2-17': '설날', '2-18': '설날',
        '3-1': '삼일절', '3-2': '대체공휴일', '5-1': '근로자의 날',
        '5-5': '어린이날', '5-25': '부처님오신날', '6-6': '현충일', '8-15': '광복절',
        '9-24': '추석', '9-25': '추석', '9-26': '추석', '10-3': '개천절',
        '10-9': '한글날', '12-25': '크리스마스'
    },
    2027: {
        '1-1': '신정', '2-6': '설날', '2-7': '설날', '2-8': '설날', '2-9': '대체공휴일',
        '3-1': '삼일절', '5-1': '근로자의 날', '5-5': '어린이날',
        '5-14': '부처님오신날', '6-6': '현충일', '8-15': '광복절',
        '9-14': '추석', '9-15': '추석', '9-16': '추석', '10-3': '개천절',
        '10-4': '대체공휴일', '10-9': '한글날', '12-25': '크리스마스'
    }
};

const WorkSchedule: React.FC<WorkScheduleProps> = ({ addToast, currentUserProfile }) => {
    const [view, setView] = useState<'year' | 'month'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [schedules, setSchedules] = useState<Map<string, WorkScheduleType>>(new Map());
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const monthlyCalendarRef = useRef<HTMLDivElement>(null);
    const canManage = currentUserProfile?.role === 'Admin';
    const [mobileSelectedDate, setMobileSelectedDate] = useState<string | null>(null);
    const [isMobileInputVisible, setIsMobileInputVisible] = useState(false);
    const [isPrintMode, setIsPrintMode] = useState(false);

    useEffect(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        let query = db.collection('work-schedules');

        if (view === 'month') {
            const endDate = new Date(year, month + 1, 0).getDate();
            const startStr = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
            const endStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${endDate.toString().padStart(2, '0')}`;
            query = query.where('date', '>=', startStr).where('date', '<=', endStr);
        } else { // 'year'
            const startStr = `${year}-01-01`;
            const endStr = `${year}-12-31`;
            query = query.where('date', '>=', startStr).where('date', '<=', endStr);
        }

        const unsubscribe = query.onSnapshot(snapshot => {
            const newSchedules = new Map<string, WorkScheduleType>();
            snapshot.forEach(doc => {
                newSchedules.set(doc.id, { id: doc.id, ...doc.data() } as WorkScheduleType);
            });
            setSchedules(newSchedules);
        });
        return () => unsubscribe();
    }, [currentDate, view]);

    const changeYear = (delta: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear() + delta, prev.getMonth(), 1));
        setMobileSelectedDate(null);
    };

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
        setMobileSelectedDate(null);
    };

    const handleDateClick = (dateStr: string) => {
        if (!canManage || view !== 'month') return;
        
        const isMobile = window.innerWidth < 1024; // Corresponds to lg breakpoint
        if (isMobile) {
            setMobileSelectedDate(dateStr);
            setIsMobileInputVisible(false); // Reset input panel on new date selection
        } else {
             setSelectedDates(prev => {
                const newSet = new Set(prev);
                if (newSet.has(dateStr)) newSet.delete(dateStr);
                else newSet.add(dateStr);
                return newSet;
            });
        }
    };
    
    const summary = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
        let totalDays = view === 'year' ? daysInYear : new Date(year, month + 1, 0).getDate();
        
        const sourceSchedules: WorkScheduleType[] = Array.from(schedules.values());
        
        let workDays = 0;
        const typeCounts = Object.keys(WORK_TYPES).reduce((acc, key) => ({ ...acc, [key]: 0 }), {} as Record<string, number>);

        sourceSchedules.forEach(schedule => {
            if (schedule.type !== '휴무') workDays++;
            if (typeCounts[schedule.type] !== undefined) {
                typeCounts[schedule.type]++;
            }
        });
        
        const restDays = totalDays - workDays;
        
        return {
            '총 근무일': workDays,
            '휴무/휴일': restDays,
            ...typeCounts
        };
    }, [schedules, view, currentDate]);

    const handleApplySchedule = async (type: string, dates: Set<string>) => {
        if (dates.size === 0) {
            addToast({ message: '날짜를 먼저 선택하세요.', type: 'error' });
            return;
        }
        const batch = db.batch();
        const scheduleData = WORK_TYPES[type as keyof typeof WORK_TYPES];
        dates.forEach(dateStr => {
            const docRef = db.collection('work-schedules').doc(dateStr);
            batch.set(docRef, { date: dateStr, type: type, description: scheduleData.description });
        });
        await batch.commit();
        addToast({ message: `${dates.size}개 날짜에 '${type}' 적용됨`, type: 'success' });
        setSelectedDates(new Set());
        setSelectedType(null);
        if (mobileSelectedDate) {
            setIsMobileInputVisible(false);
        }
    };

    const handleDeleteSchedule = async (dates: Set<string>) => {
        if (dates.size === 0) {
            addToast({ message: '날짜를 먼저 선택하세요.', type: 'error' });
            return;
        }
        const batch = db.batch();
        dates.forEach(dateStr => {
            batch.delete(db.collection('work-schedules').doc(dateStr));
        });
        await batch.commit();
        addToast({ message: `${dates.size}개 날짜의 계획 삭제됨`, type: 'success' });
        setSelectedDates(new Set());
         if (mobileSelectedDate) {
            setMobileSelectedDate(null);
        }
    };

    // 인쇄: 현재 달력 뷰를 이미지로 캡처하여 새 창에서 인쇄
    const handlePrint = useCallback(async () => {
        if (!monthlyCalendarRef.current) {
            addToast({ message: '달력 요소를 찾을 수 없습니다.', type: 'error' });
            return;
        }
        try {
            // 프린트 전용 레이아웃 적용 (텍스트 잘림 방지)
            setIsPrintMode(true);
            await new Promise(resolve => setTimeout(resolve, 50));
            const isDark = document.documentElement.classList.contains('dark');
            const bgColor = isDark ? '#0f172a' : '#ffffff';
            const canvas = await html2canvas(monthlyCalendarRef.current, {
                useCORS: true,
                backgroundColor: bgColor,
                scale: 3
            });
            const dataUrl = canvas.toDataURL('image/png');
            setIsPrintMode(false);
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;
            // 제목/헤더를 최대한 비우기 위해 빈 타이틀 사용
            printWindow.document.write(`
                <html>
                  <head>
                    <title>​</title>
                     <style>
                      @page { size: A4 landscape; margin: 0; }
                      html, body { margin: 0; padding: 0; height: 100%; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                      /* A4 고정 컨테이너로 화면 크기와 무관한 일관 레이아웃 유지 */
                      .page { width: 297mm; height: 210mm; display: flex; align-items: center; justify-content: center; }
                      .page img { display:block; width: 100%; height: 100%; object-fit: contain; page-break-inside: avoid; image-rendering: -webkit-optimize-contrast; }
                    </style>
                  </head>
                  <body>
                    <div class="page">
                      <img src="${dataUrl}" alt="schedule" />
                    </div>
                    <script>
                      window.onload = function() { window.focus(); window.print(); setTimeout(() => window.close(), 300); }
                    <\/script>
                  </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            console.error(error);
            addToast({ message: '인쇄 준비 중 오류가 발생했습니다.', type: 'error' });
            setIsPrintMode(false);
        }
    }, [currentDate, view, addToast]);

    const handlePostToAnnouncements = async () => {
        if (!monthlyCalendarRef.current) {
            addToast({ message: '달력 요소를 찾을 수 없습니다.', type: 'error' });
            return;
        }

        setIsPosting(true);
        addToast({ message: '공지사항용 이미지를 생성 중입니다...', type: 'info' });

        try {
            const canvas = await html2canvas(monthlyCalendarRef.current, {
                useCORS: true,
                backgroundColor: '#1e293b',
            });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));

            if (!blob) throw new Error('이미지 변환에 실패했습니다.');

            addToast({ message: '이미지 업로드 중...', type: 'info' });
            const imageName = `schedule-${currentDate.getFullYear()}-${currentDate.getMonth() + 1}.png`;
            const storageRef = storage.ref(`announcements/${imageName}`);
            const uploadTask = await storageRef.put(blob);
            const downloadURL = await uploadTask.ref.getDownloadURL();

            addToast({ message: '공지사항을 등록 중입니다...', type: 'info' });
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
            const newAnnouncement: Omit<Announcement, 'id'> = {
                title: `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 근무계획`,
                content: `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 근무계획표입니다.`,
                author: currentUserProfile?.displayName || '시스템',
                createdAt: new Date().toISOString(),
                imageUrl: downloadURL,
                planStartDate: `${year}-${(month + 1).toString().padStart(2, '0')}-01`,
                planEndDate: `${year}-${(month + 1).toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`
            };
            await db.collection('announcements').add(newAnnouncement);

            addToast({ message: '근무계획이 공지사항에 등록되었습니다.', type: 'success' });
        } catch (error) {
            console.error(error);
            addToast({ message: '공지사항 등록에 실패했습니다.', type: 'error' });
        } finally {
            setIsPosting(false);
        }
    };
    
    const NavButton: React.FC<{ onClick: () => void, children: React.ReactNode, ariaLabel: string }> = ({ onClick, children, ariaLabel }) => (
        <button onClick={onClick} aria-label={ariaLabel} className="p-2 rounded-full hover:bg-slate-700 transition-colors">
            {children}
        </button>
    );

    const renderMonthCalendar = (month: number, isYearView: boolean) => {
        const year = currentDate.getFullYear();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];

        const totalCells = isYearView ? (Math.ceil((firstDay + daysInMonth) / 7) * 7) : 42;

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className={!isYearView ? 'border-t border-r border-slate-700' : ''}></div>);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const schedule = schedules.get(dateStr);
            const dayOfWeek = date.getDay();
            const holiday = HOLIDAYS[year]?.[`${month + 1}-${day}`];
            const isSelected = selectedDates.has(dateStr);

            days.push(
                <div 
                    key={dateStr}
                    className={`
                        ${isYearView ? 'h-8' : `px-2 py-1 border-t border-r border-slate-700 flex flex-col ${isPrintMode ? 'min-h-32' : 'min-h-24'}`}
                        ${canManage && !isYearView ? 'cursor-pointer hover:bg-slate-700' : ''}
                        ${isSelected ? 'outline outline-2 outline-yellow-400' : ''}
                    `}
                    onClick={() => handleDateClick(dateStr)}
                >
                    <span className={`flex items-center justify-center ${isYearView ? 'text-xs' : ''} ${dayOfWeek === 0 || holiday ? 'text-red-400' : ''} ${schedule ? 'bg-yellow-400 text-slate-900 rounded-full w-6 h-6' : ''}`}>
                        {day}
                    </span>
                    {!isYearView && (
                         <div className={`text-xs mt-1 space-y-1 ${isPrintMode ? 'overflow-visible whitespace-pre-wrap break-words' : 'overflow-hidden'}`}>
                             {holiday && <p className={`${isPrintMode ? '' : 'truncate'} text-red-400 font-semibold`}>{holiday}</p>}
                            {schedule && (
                                <>
                                    <p className={`${isPrintMode ? '' : 'truncate'} font-semibold`} style={{ color: WORK_TYPES[schedule.type as keyof typeof WORK_TYPES]?.color }}>• {schedule.type}</p>
                                     <p className={`${isPrintMode ? '' : 'truncate'} text-slate-400`}>{schedule.description}</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        while (days.length < totalCells) {
            days.push(<div key={`empty-fill-${days.length}`} className={!isYearView ? 'border-t border-r border-gray-300 dark:border-slate-700' : ''}></div>);
        }

        return (
            <div className={`bg-gray-100 dark:bg-slate-800 ${isYearView ? 'p-1' : 'p-2'} rounded-lg ${!isYearView ? 'flex-1 flex flex-col' : ''}`}>
                <h3 className={`font-bold text-center mb-2 ${isYearView ? 'text-yellow-400 text-sm' : 'py-2 bg-gray-200 dark:bg-slate-900 text-gray-900 dark:text-slate-200 text-2xl'}`}>{month + 1}월</h3>
                <div className={`grid grid-cols-7 text-center ${isYearView ? 'text-xs' : 'flex-shrink-0'}`}>
                    {WEEKDAYS.map(day => <div key={day} className={`py-1 ${day === '토' ? 'text-blue-400' : ''} ${day === '일' ? 'text-red-400' : ''}`}>{day}</div>)}
                </div>
                <div className={`grid grid-cols-7 ${!isYearView ? 'flex-1 grid-rows-6' : ''}`}>
                    {days}
                </div>
            </div>
        );
    };

    const AdminPanel: React.FC<{ dates: Set<string>; onApply: (type: string, dates: Set<string>) => void; onDelete: (dates: Set<string>) => void; onCancel: () => void; isMobile?: boolean }> = ({ dates, onApply, onDelete, onCancel, isMobile }) => {
        const [localSelectedType, setLocalSelectedType] = useState<string | null>(null);
        return (
             <div className="w-full bg-gray-100 dark:bg-slate-800 p-4 rounded-lg flex flex-col gap-4 h-full">
               <h3 className="font-bold">{isMobile ? `${new Date(dates.values().next().value).getDate()}일 계획` : "근무 계획 입력"}</h3>
               <p className="text-xs text-gray-600 dark:text-slate-400">{isMobile ? "근무 유형을 선택하고 적용하세요." : "날짜와 근무 유형을 선택한 후 '적용' 버튼을 누르세요."}</p>
               <div className="flex-1 overflow-y-auto space-y-2 pr-2 -mr-4">
                   {Object.entries(WORK_TYPES).map(([type, data]) => (
                       <button key={type} onClick={() => setLocalSelectedType(type)} className={`w-full text-left p-2 rounded-md transition-colors ${localSelectedType === type ? 'bg-gray-300 dark:bg-slate-600' : 'hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
                           <p className="font-semibold text-sm" style={{color: data.color}}>{type}</p>
                           <p className="text-xs text-gray-600 dark:text-slate-400">{data.description}</p>
                       </button>
                   ))}
               </div>
               <div className="flex-shrink-0 space-y-2">
                   <button onClick={() => { if(localSelectedType) onApply(localSelectedType, dates) }} className="w-full py-2 bg-yellow-400 text-slate-900 font-bold rounded-md disabled:opacity-50" disabled={!localSelectedType || dates.size === 0}>적용</button>
                   <button onClick={() => onDelete(dates)} className="w-full py-2 bg-red-600 text-white font-bold rounded-md">계획 삭제</button>
                   <button onClick={onCancel} className="w-full py-2 bg-gray-500 dark:bg-slate-600 text-white font-bold rounded-md">선택 취소</button>
                   {!isMobile && <button onClick={handlePostToAnnouncements} disabled={isPosting} className="w-full py-2 bg-indigo-600 text-white font-bold rounded-md mt-2 disabled:opacity-50">{isPosting ? '등록 중...' : '월간 근무표 공지하기'}</button>}
               </div>
            </div>
        );
    }
    
    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200 font-sans">
            <div className="flex-shrink-0 p-3 flex items-center justify-between border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <NavButton onClick={() => changeYear(-1)} ariaLabel="Previous year"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg></NavButton>
                    {view === 'month' && <NavButton onClick={() => changeMonth(-1)} ariaLabel="Previous month"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></NavButton>}
                    <h2 className="text-2xl font-bold w-48 text-center">{currentDate.getFullYear()}년 {view === 'month' && `${currentDate.getMonth() + 1}월`}</h2>
                    {view === 'month' && <NavButton onClick={() => changeMonth(1)} ariaLabel="Next month"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></NavButton>}
                    <NavButton onClick={() => changeYear(1)} ariaLabel="Next year"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg></NavButton>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-md text-sm">Today</button>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setView('year')} className={`px-3 py-1 rounded-md text-sm ${view === 'year' ? 'bg-yellow-400 text-slate-900' : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200'}`}>연간 보기</button>
                    <button onClick={() => setView('month')} className={`px-3 py-1 rounded-md text-sm ${view === 'month' ? 'bg-yellow-400 text-slate-900' : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200'}`}>월간 보기</button>
                    <button onClick={handlePrint} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        인쇄
                    </button>
                </div>
            </div>
            
            <div className="flex-shrink-0 p-3 flex items-center gap-3 overflow-x-auto scrollbar-hide text-sm border-b border-gray-200 dark:border-slate-700">
                {Object.entries(summary).map(([key, value]) => {
                    if (value === 0) return null;
                    const color = WORK_TYPES[key as keyof typeof WORK_TYPES]?.color;
                    return ( <div key={key} className="flex items-center gap-1.5 flex-shrink-0">{color && <span className="w-2 h-2 rounded-full" style={{backgroundColor: color}}></span>}<span>{key}:</span><span className="font-bold">{value}</span></div>);
                })}
            </div>

            <div className="flex-1 p-3 flex overflow-hidden">
                {view === 'year' ? (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-2 w-full overflow-y-auto">
                        {Array.from({ length: 12 }, (_, i) => renderMonthCalendar(i, true))}
                    </div>
                ) : (
                    <div className="flex w-full gap-4 relative">
                        <div ref={monthlyCalendarRef} className={`flex-1 flex flex-col transition-opacity duration-300 ${mobileSelectedDate ? 'opacity-0 lg:opacity-100' : 'opacity-100'}`}>
                           {renderMonthCalendar(currentDate.getMonth(), false)}
                        </div>
                        {canManage && (
                           <div className="hidden lg:block w-64 flex-shrink-0">
                                <AdminPanel dates={selectedDates} onApply={handleApplySchedule} onDelete={handleDeleteSchedule} onCancel={() => setSelectedDates(new Set())} />
                           </div>
                        )}
                        {mobileSelectedDate && (
                            <div className="lg:hidden absolute inset-0 bg-white dark:bg-slate-900 z-10 p-4 flex flex-col animate-fade-in-up">
                                 <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold">{new Date(mobileSelectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</h3>
                                    <button onClick={() => setMobileSelectedDate(null)} className="p-2 text-2xl">&times;</button>
                                 </div>
                                 {!isMobileInputVisible ? (
                                     <div className="flex-1 space-y-4">
                                        <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-lg">
                                            <h4 className="font-semibold mb-2">계획된 근무</h4>
                                            {schedules.has(mobileSelectedDate) ? (
                                                <div className="text-lg">
                                                    <p style={{color: WORK_TYPES[schedules.get(mobileSelectedDate)!.type as keyof typeof WORK_TYPES]?.color }}>{schedules.get(mobileSelectedDate)!.type}</p>
                                                    <p className="text-sm text-gray-600 dark:text-slate-400">{schedules.get(mobileSelectedDate)!.description}</p>
                                                </div>
                                            ) : <p className="text-gray-600 dark:text-slate-400">계획 없음</p>}
                                        </div>
                                        {canManage && <button onClick={() => setIsMobileInputVisible(true)} className="w-full py-3 bg-yellow-400 text-slate-900 font-bold rounded-lg">계획 수정</button>}
                                     </div>
                                 ) : (
                                     <AdminPanel isMobile dates={new Set([mobileSelectedDate])} onApply={handleApplySchedule} onDelete={handleDeleteSchedule} onCancel={() => setIsMobileInputVisible(false)} />
                                 )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkSchedule;