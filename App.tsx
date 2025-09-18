import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
// FIX: Add Order to the import list from types.
import { JigRequest, Status, Comment, MasterData, Requester, Destination, Approver, Notification, JigMasterItem, UserProfile, UserRole, QualityInspection, HistoryEntry, SampleRequest, SampleStatus, ActiveCenter, PackagingReport, ProductionRequest, ProductionRequestStatus, ProductionRequestType, ProductionSchedule, Order } from './types';
import ManagementLedger from './components/ManagementLedger';
import RequestDetail from './components/RequestDetail';
import RequestForm from './components/RequestForm';
import Navigation from './components/Navigation';
import MasterDataManagement from './components/MasterDataManagement';
import Settings from './components/Settings';
import JigMasterList from './components/JigMasterList';
import NotificationPanel from './components/NotificationPanel';
import LoadingSpinner from './components/LoadingSpinner';
import FullScreenModal from './components/FullScreenModal';
import JigMasterDetail from './components/JigMasterDetail';
import JigRegistrationForm from './components/JigRegistrationForm';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import HomeScreen from './components/HomeScreen';
// FIX: Changed to a named import to resolve module export error.
import { QualityControlCenter } from './components/QualityControlCenter';
// FIX: Import AppGuide component to be used for the quality center guide.
import AppGuide from './components/AppGuide';
import NotificationCenter from './components/NotificationCenter';
// FIX: Changed to a named import to resolve module export error.
import { WorkPerformanceCenter } from './components/WorkPerformanceCenter';
import SampleCenter from './components/SampleCenter';
import AppIcon from './components/AppIcon';
// FIX: Import SampleRequestDetail to display sample request details in a modal.
import SampleRequestDetail from './components/SampleRequestDetail';
import SampleRequestForm from './components/SampleRequestForm';
import ProductionRequestForm from './components/ProductionRequestForm';
import ProductionRequestDetail from './components/ProductionRequestDetail';
import IntegratedSearchResults from './components/IntegratedSearchResults';
import FormulationCalculator from './components/FormulationCalculator';
import ManagementCenter from './components/ManagementCenter';
import MainHeader from './components/MainHeader';


import { db, storage, auth } from './firebaseConfig';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';


type ActiveMenu = 'dashboard' | 'ledger' | 'jigList' | 'master';
type Theme = 'light' | 'dark';
type ToastType = 'success' | 'error' | 'info' | 'progress';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  progress?: {
    current: number;
    total: number;
  };
}

// FIX: Add 'detail' to the view property to allow for sample request detail modals.
interface ModalState {
  view: 'requestForm' | 'requestDetail' | 'jigDetail' | 'jigForm' | 'detail' | 'form' | 'productionRequestForm' | 'productionRequestDetail' | null;
  data?: any;
}

const statusSortOrder: Status[] = [Status.Request, Status.InProgress, Status.Receiving, Status.Hold, Status.Rejected, Status.Completed];

const sortRequests = (requestList: JigRequest[]): JigRequest[] => {
  return [...requestList].sort((a, b) => {
    const aIndex = statusSortOrder.indexOf(a.status);
    const bIndex = statusSortOrder.indexOf(b.status);
    if (aIndex !== bIndex) return aIndex - bIndex;
    return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
  });
};

const ToastComponent: React.FC<{ message: string; type: ToastType; progress?: { current: number; total: number }; onRemove: () => void }> = ({ message, type, progress, onRemove }) => {
    const bgColor = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        progress: 'bg-blue-500',
    }[type];

    const icon = {
        success: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        error: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        info: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        progress: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
    };

    const progressPercentage = progress ? (progress.current / progress.total) * 100 : 0;

    return (
        <div className={`flex flex-col ${bgColor} text-white py-3 px-4 rounded-lg shadow-lg animate-toast-in`}>
            <div className="flex items-center">
                <div className="mr-3">{icon[type]}</div>
                <div className="flex-1">{message}</div>
                <button onClick={onRemove} className="ml-4 text-xl font-semibold">&times;</button>
            </div>
            {progress && (
                <div className="mt-2">
                    <div className="flex justify-between text-sm mb-1">
                        <span>{progress.current}/{progress.total}</span>
                        <span>{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                            className="bg-white h-2 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: number) => void }> = ({ toasts, onRemove }) => {
    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] space-y-2 w-full max-w-sm">
            {toasts.map(toast => (
                <ToastComponent key={toast.id} message={toast.message} type={toast.type} progress={toast.progress} onRemove={() => onRemove(toast.id)} />
            ))}
        </div>
    );
};

// FIX: Changed App to a named export to resolve module resolution error in index.tsx.
export const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [requests, setRequests] = useState<JigRequest[]>([]);
  const [sampleRequests, setSampleRequests] = useState<SampleRequest[]>([]);
  const [productionRequests, setProductionRequests] = useState<ProductionRequest[]>([]);
  const [productionSchedules, setProductionSchedules] = useState<ProductionSchedule[]>([]);
  // FIX: Add state for orders to be passed to WorkPerformanceCenter.
  const [orders, setOrders] = useState<Order[]>([]);
  const [jigs, setJigs] = useState<JigMasterItem[]>([]);
  const [masterData, setMasterData] = useState<MasterData>({ requesters: [], destinations: [], approvers: [], requestTypes: [] });
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('dashboard');
  const [modal, setModal] = useState<ModalState>({ view: null });
  const [theme, setTheme] = useState<Theme>('dark');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCenter, setActiveCenter] = useState<ActiveCenter>('home');
  const [qualityDeepLink, setQualityDeepLink] = useState<string | null>(null);
  const [workDeepLink, setWorkDeepLink] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [qualityInspections, setQualityInspections] = useState<QualityInspection[]>([]);
  const [packagingReports, setPackagingReports] = useState<PackagingReport[]>([]);
  // FIX: Changed NodeJS.Timeout to ReturnType<typeof setTimeout> for better browser compatibility.
  const backPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  // FIX: Moved removeToast and addToast definitions before the useEffect hook that uses them.
  const removeToast = useCallback((id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const removeAllProgressToasts = useCallback(() => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.type !== 'progress'));
  }, []);

  const addToast = useCallback((toast: { message: string; type: ToastType; progress?: { current: number; total: number } }) => {
    const id = Date.now() + Math.random();
    setToasts(prevToasts => [...prevToasts, { ...toast, id }]);
    
    // Progress 토스트는 자동으로 제거하지 않음 (수동으로 제거해야 함)
    if (toast.type !== 'progress') {
      setTimeout(() => {
        removeToast(id);
      }, 3000);
    }
  }, [removeToast]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationPanelRef.current &&
        !notificationPanelRef.current.contains(event.target as Node) &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(event.target as Node)
      ) {
        setIsNotificationPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // This effect handles the Android back button behavior
    if (!isMounted.current) {
        window.history.pushState({ screen: 'home' }, '');
        isMounted.current = true;
    }

    const onPopState = () => {
        if (modal.view !== null) {
            setModal({ view: null });
            return;
        }
        if (searchQuery !== null) {
            setSearchQuery(null);
            return;
        }
        if (activeCenter !== 'home') {
            setActiveCenter('home');
            return;
        }

        // At home screen, handle double press to exit
        if (backPressTimer.current) {
            clearTimeout(backPressTimer.current);
            backPressTimer.current = null;
            // A no-op, but the browser may exit if this is the last history entry
        } else {
            addToast({ message: "한 번 더 누르면 종료됩니다.", type: "info" });
            backPressTimer.current = setTimeout(() => {
                backPressTimer.current = null;
            }, 2000);
            window.history.pushState(null, ''); // Push a state to catch the next back press
        }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [modal.view, activeCenter, searchQuery, addToast]);
  
  const openModalWithHistory = useCallback((view: ModalState['view'], data?: any) => {
    window.history.pushState({ modal: view }, '');
    setModal({ view, data });
  }, []);

  const selectCenterWithHistory = useCallback((center: ActiveCenter) => {
    if (center !== activeCenter) {
      window.history.pushState({ center }, '');
      setActiveCenter(center);
    }
  }, [activeCenter]);
  
  const handleCloseModal = useCallback(() => {
    if (modal.view !== null) {
        window.history.back();
    }
  }, [modal.view]);

  const currentUser = useMemo(() => {
    return user ? { name: currentUserProfile?.displayName || user.email?.split('@')[0] || '사용자' } : { name: '게스트' };
  }, [user, currentUserProfile]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
        setIsAuthLoading(true);
        setCurrentUserProfile(null);
        setUser(user);

        if (user) {
            try {
                const targetCenter = sessionStorage.getItem('targetCenter');
                if (targetCenter) {
                    setActiveCenter(targetCenter as ActiveCenter);
                    sessionStorage.removeItem('targetCenter');
                }
                
                const userRef = db.collection('users').doc(user.uid);
                const userDoc = await userRef.get();
                if (userDoc.exists) {
                    setCurrentUserProfile(userDoc.data() as UserProfile);
                } else {
                    console.error(`User profile for ${user.uid} not found. Forcing logout.`);
                    addToast({ message: '사용자 프로필을 찾을 수 없습니다. 다시 로그인해주세요.', type: 'error' });
                    await auth.signOut();
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
                addToast({ message: '프로필 로딩 중 오류가 발생했습니다.', type: 'error' });
                await auth.signOut();
            } finally {
                setIsAuthLoading(false);
            }
        } else {
            setActiveCenter('home');
            setIsAuthLoading(false);
        }
    });
    return () => unsubscribe();
  }, [addToast]);
  
  // Data seeding effect
  useEffect(() => {
    const seedData = async () => {
        const seedRef = db.collection('settings').doc('dataSeeded_20240726');
        const seedDoc = await seedRef.get();
        if (seedDoc.exists) return;

        console.log("Seeding initial data...");
        addToast({ message: "초기 데이터 로딩 중...", type: 'info' });
        
        const counterRef = db.collection('counters').doc('jig-requests-counter');
        const sampleCounterRef = db.collection('counters').doc('sample-requests-counter');
        const productionCounterRef = db.collection('counters').doc('production-requests-counter');
        const counterDoc = await counterRef.get();
        const currentCount = counterDoc.data()?.count || 0;

        if (currentCount >= 19) {
            console.log("Counter is already past seed data count. Skipping seed.");
            await seedRef.set({ seeded: true }); // Mark as seeded anyway
            return;
        }
        
        const requestsToSeed: Omit<JigRequest, 'id'>[] = [
            { requestDate: new Date('2025-07-24').toISOString(), requestType: '새지그교체', status: Status.InProgress, requester: '정원익', destination: '나래산업', deliveryDate: '2025-08-05', itemName: '테이프지그', partName: '소지그', itemNumber: '', specification: '', quantity: 50000, receivedQuantity: 0, coreCost: 0, unitPrice: 30, remarks: '다리길이 60mm 로 필히 진행할것.', history: [{ status: Status.Request, date: new Date('2025-07-24').toISOString(), user: '정원익', reason: '생성됨' }, { status: Status.InProgress, date: new Date('2025-07-24').toISOString(), user: '이현석', reason: '승인됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-07-25').toISOString(), requestType: '새지그교체', status: Status.Completed, requester: '권용찬', destination: '나래산업', deliveryDate: '2025-08-06', itemName: '6ml사각립글로즈', partName: '용기', itemNumber: '385', specification: '', quantity: 10000, receivedQuantity: 10000, coreCost: 50000, unitPrice: 120, remarks: '기존감합 유지 바랍니다.', history: [{ status: Status.Request, date: new Date('2025-07-25').toISOString(), user: '권용찬', reason: '생성됨' }, { status: Status.Completed, date: new Date('2025-08-06').toISOString(), user: '이현석', reason: '완료됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-07-25').toISOString(), requestType: '새지그교체', status: Status.Completed, requester: '권용찬', destination: '나래산업', deliveryDate: '2025-08-11', itemName: '35ml한방고가 / 줄기세포', partName: '외용기', itemNumber: '375', specification: '', quantity: 5000, receivedQuantity: 5000, coreCost: 50000, unitPrice: 150, remarks: '지그감합 및 대길이 기존지그와 동일하게 요청드립니다.', history: [{ status: Status.Request, date: new Date('2025-07-25').toISOString(), user: '권용찬', reason: '생성됨' }, { status: Status.Completed, date: new Date('2025-08-11').toISOString(), user: '이현석', reason: '완료됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-07-25').toISOString(), requestType: '새지그교체', status: Status.InProgress, requester: '권용찬', destination: '나래산업', deliveryDate: '2025-08-12', itemName: '스틱화운데이션', partName: '캡', itemNumber: '179', specification: '', quantity: 10000, receivedQuantity: 0, coreCost: 0, unitPrice: 130, remarks: '감합및대길이 기존지그와 동일하게요청드립니다', history: [{ status: Status.Request, date: new Date('2025-07-25').toISOString(), user: '권용찬', reason: '생성됨' }, { status: Status.InProgress, date: new Date('2025-07-25').toISOString(), user: '이현석', reason: '승인됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-07-25').toISOString(), requestType: '새지그교체', status: Status.Completed, requester: '권용찬', destination: '나래산업', deliveryDate: '2025-08-14', itemName: '스틱화운데이션', partName: '브러쉬 캡', itemNumber: '297', specification: '', quantity: 10000, receivedQuantity: 10200, coreCost: 30000, unitPrice: 130, remarks: '감합 및 대길이 기존지그와 동일하게 요청 드립니다', history: [{ status: Status.Request, date: new Date('2025-07-25').toISOString(), user: '권용찬', reason: '생성됨' }, { status: Status.Completed, date: new Date('2025-08-14').toISOString(), user: '이현석', reason: '완료됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-07-25').toISOString(), requestType: '새지그교체', status: Status.Completed, requester: '권용찬', destination: '나래산업', deliveryDate: '2025-08-18', itemName: '80g 토마토 / 10g파우더', partName: '외용기 / 용기', itemNumber: '88', specification: '', quantity: 3000, receivedQuantity: 3200, coreCost: 0, unitPrice: 180, remarks: '감합 및 대길이 기존지그 동알,핀구멍 막아 주세요.', history: [{ status: Status.Request, date: new Date('2025-07-25').toISOString(), user: '권용찬', reason: '생성됨' }, { status: Status.Completed, date: new Date('2025-08-18').toISOString(), user: '이현석', reason: '완료됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-07-25').toISOString(), requestType: '새지그교체', status: Status.InProgress, requester: '권용찬', destination: '나래산업', deliveryDate: '2025-08-15', itemName: '35ml 한방고가', partName: '어깨장식', itemNumber: '207', specification: '', quantity: 5000, receivedQuantity: 0, coreCost: 0, unitPrice: 80, remarks: '감합 및 대길이기존지그 와 동일하게요청드립니다', history: [{ status: Status.Request, date: new Date('2025-07-25').toISOString(), user: '권용찬', reason: '생성됨' }, { status: Status.InProgress, date: new Date('2025-07-25').toISOString(), user: '이현석', reason: '승인됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-07-26').toISOString(), requestType: '신규제작', status: Status.Completed, requester: '권용찬', destination: '영진아이앤디', deliveryDate: '2025-08-08', itemName: '50ml달팽이', partName: '외용기', itemNumber: '', specification: '', quantity: 3000, receivedQuantity: 3000, coreCost: 150000, unitPrice: 250, remarks: '외용기 특징상 전용지그제작이 필요합니다.', history: [{ status: Status.Request, date: new Date('2025-07-25').toISOString(), user: '권용찬', reason: '생성됨' }, { status: Status.Completed, date: new Date('2025-08-08').toISOString(), user: '이현석', reason: '완료됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-07-26').toISOString(), requestType: '새지그교체', status: Status.InProgress, requester: '정원익', destination: '나래산업', deliveryDate: '2025-07-28', itemName: '50ml달팽이', partName: '내용기', itemNumber: '352', specification: '', quantity: 6000, receivedQuantity: 0, coreCost: 0, unitPrice: 110, remarks: '감합확인 필요합니다다리길이 28', history: [{ status: Status.Request, date: new Date('2025-07-26').toISOString(), user: '정원익', reason: '생성됨' }, { status: Status.InProgress, date: new Date('2025-07-26').toISOString(), user: '정원익', reason: '승인됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-07-26').toISOString(), requestType: '새지그교체', status: Status.Completed, requester: '정원익', destination: '나래산업', deliveryDate: '2025-08-08', itemName: '테이프지그', partName: '증자', itemNumber: '', specification: '', quantity: 50000, receivedQuantity: 50500, coreCost: 0, unitPrice: 30, remarks: '다리길이 동일하게 요청드립니다.', history: [{ status: Status.Request, date: new Date('2025-07-26').toISOString(), user: '정원익', reason: '생성됨' }, { status: Status.Completed, date: new Date('2025-08-08').toISOString(), user: '이현석', reason: '완료됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-07-30').toISOString(), requestType: '새지그교체', status: Status.Completed, requester: '정원익', destination: '나래산업', deliveryDate: '2025-08-08', itemName: '브러쉬파우더(소)', partName: '캡상', itemNumber: '308', specification: '', quantity: 6000, receivedQuantity: 6000, coreCost: 0, unitPrice: 90, remarks: '', history: [{ status: Status.Request, date: new Date('2025-07-30').toISOString(), user: '정원익', reason: '생성됨' }, { status: Status.Completed, date: new Date('2025-08-08').toISOString(), user: '이현석', reason: '완료됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-07-30').toISOString(), requestType: '새지그교체', status: Status.Completed, requester: '정원익', destination: '나래산업', deliveryDate: '2025-08-05', itemName: '브러쉬파우더(소)', partName: '캡하', itemNumber: '306', specification: '', quantity: 6000, receivedQuantity: 6000, coreCost: 0, unitPrice: 90, remarks: '', history: [{ status: Status.Request, date: new Date('2025-07-30').toISOString(), user: '정원익', reason: '생성됨' }, { status: Status.Completed, date: new Date('2025-08-05').toISOString(), user: '이현석', reason: '완료됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-08-07').toISOString(), requestType: '신규제작', status: Status.Completed, requester: '정원익', destination: '영진아이앤디', deliveryDate: '2025-08-07', itemName: '40G신크림진공3', partName: '외용기', itemNumber: '', specification: '', quantity: 7000, receivedQuantity: 7000, coreCost: 200000, unitPrice: 300, remarks: '', history: [{ status: Status.Request, date: new Date('2025-08-07').toISOString(), user: '정원익', reason: '생성됨' }, { status: Status.Completed, date: new Date('2025-08-07').toISOString(), user: '이현석', reason: '완료됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-08-07').toISOString(), requestType: '신규제작', status: Status.Completed, requester: '정원익', destination: '영진아이앤디', deliveryDate: '2025-08-07', itemName: '50ml사각이중푸쉬진공', partName: '펌프숄더 하', itemNumber: '', specification: '', quantity: 8000, receivedQuantity: 8000, coreCost: 180000, unitPrice: 150, remarks: '', history: [{ status: Status.Request, date: new Date('2025-08-07').toISOString(), user: '정원익', reason: '생성됨' }, { status: Status.Completed, date: new Date('2025-08-07').toISOString(), user: '이현석', reason: '완료됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-08-07').toISOString(), requestType: '신규제작', status: Status.Completed, requester: '정원익', destination: '영진아이앤디', deliveryDate: '2025-08-07', itemName: '15ml볼진공', partName: '캡', itemNumber: '', specification: '', quantity: 12000, receivedQuantity: 12000, coreCost: 120000, unitPrice: 100, remarks: '', history: [{ status: Status.Request, date: new Date('2025-08-07').toISOString(), user: '정원익', reason: '생성됨' }, { status: Status.Completed, date: new Date('2025-08-07').toISOString(), user: '이현석', reason: '완료됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-08-10').toISOString(), requestType: '새지그교체', status: Status.Completed, requester: '권용찬', destination: '영진아이앤디', deliveryDate: '2025-08-15', itemName: '50구직각', partName: '외용기', itemNumber: '2', specification: '', quantity: 15000, receivedQuantity: 15000, coreCost: 0, unitPrice: 200, remarks: '', history: [{ status: Status.Request, date: new Date('2025-08-10').toISOString(), user: '권용찬', reason: '생성됨' }, { status: Status.Completed, date: new Date('2025-08-15').toISOString(), user: '이현석', reason: '완료됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-08-10').toISOString(), requestType: '새지그교체', status: Status.Completed, requester: '권용찬', destination: '나래산업', deliveryDate: '2025-08-13', itemName: '50g컨실러진공/줄기세포', partName: '외용기', itemNumber: '294', specification: '', quantity: 5000, receivedQuantity: 5200, coreCost: 0, unitPrice: 160, remarks: '', history: [{ status: Status.Request, date: new Date('2025-08-10').toISOString(), user: '권용찬', reason: '생성됨' }, { status: Status.Completed, date: new Date('2025-08-13').toISOString(), user: '이현석', reason: '완료됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-08-12').toISOString(), requestType: '새지그교체', status: Status.InProgress, requester: '정원익', destination: '나래산업', deliveryDate: '2025-08-18', itemName: '35ml달팽이', partName: '펌프숄더', itemNumber: '105', specification: '', quantity: 8000, receivedQuantity: 0, coreCost: 0, unitPrice: 70, remarks: '대진 내용기 생산용으로 발주다리길이 40', history: [{ status: Status.Request, date: new Date('2025-08-12').toISOString(), user: '정원익', reason: '생성됨' }, { status: Status.InProgress, date: new Date('2025-08-12').toISOString(), user: '이현석', reason: '승인됨' }], comments: [], imageUrls: [] },
            { requestDate: new Date('2025-08-21').toISOString(), requestType: '새지그교체', status: Status.Request, requester: '정원익', destination: '나래산업', deliveryDate: '2025-08-25', itemName: '130ml줄기세포', partName: '내캡', itemNumber: '232', specification: '', quantity: 10000, receivedQuantity: 0, coreCost: 0, unitPrice: 50, remarks: '', history: [{ status: Status.Request, date: new Date('2025-08-21').toISOString(), user: '정원익', reason: '생성됨' }], comments: [], imageUrls: [] },
        ];


        const batch = db.batch();
        requestsToSeed.forEach((reqData, index) => {
            const id = `T${index + 1}`;
            const docRef = db.collection('jig-requests').doc(id);
            batch.set(docRef, reqData);
        });
        batch.set(counterRef, { count: 19 });
        batch.set(sampleCounterRef, { count: 0 });
        batch.set(productionCounterRef, { count: 0 });
        batch.set(seedRef, { seeded: true });

        await batch.commit();
        addToast({ message: "초기 데이터가 성공적으로 추가되었습니다.", type: 'success' });
        console.log("Data seeding complete.");
    };

    if (user && !currentUserProfile) { // Seed data only when user is logged in but profile is not yet loaded
        seedData().catch(error => {
            console.error("Data seeding failed:", error);
            addToast({ message: "초기 데이터 추가에 실패했습니다.", type: 'error' });
        });
    }
  }, [user, currentUserProfile, addToast]);
  
  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        setRequests([]);
        setJigs([]);
        setNotifications([]);
        setSampleRequests([]);
        setQualityInspections([]);
        setPackagingReports([]);
        setProductionRequests([]);
        setProductionSchedules([]);
        // FIX: Reset orders state on logout.
        setOrders([]);
        return;
    }
    setIsLoading(true);
    let loadedCount = 0;
    // FIX: Increment totalToLoad to account for orders.
    const totalToLoad = 10; // requests, masterData, jigs, notifications, sampleRequests, quality, packaging, productionRequests, productionSchedules, orders
    const checkAllLoaded = () => {
        loadedCount++;
        if (loadedCount >= totalToLoad) {
            setIsLoading(false);
        }
    }

    const unsubscribeRequests = db.collection('jig-requests').orderBy('requestDate', 'desc').limit(300)
      .onSnapshot((querySnapshot) => {
        const requestsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                history: data.history || [],
                comments: data.comments || [],
                imageUrls: data.imageUrls || [],
            } as JigRequest;
        });
        setRequests(sortRequests(requestsData));
        checkAllLoaded();
    }, (error) => {
        console.error("Error fetching requests:", error);
        addToast({ message: '요청 데이터를 불러오는 데 실패했습니다.', type: 'error' });
        checkAllLoaded();
    });

    const unsubscribeSampleRequests = db.collection('sample-requests').orderBy('createdAt', 'desc').limit(300)
      .onSnapshot((querySnapshot) => {
          const sampleData = querySnapshot.docs.map(doc => {
              const data = doc.data();
              return { ...data, id: doc.id } as SampleRequest;
          });
          setSampleRequests(sampleData);
          checkAllLoaded();
      }, (error) => {
          console.error("Error fetching sample requests:", error);
          addToast({ message: '샘플 요청 데이터를 불러오는 데 실패했습니다.', type: 'error' });
          checkAllLoaded();
      });

    const unsubscribeProductionRequests = db.collection('production-requests').orderBy('createdAt', 'desc').limit(300)
      .onSnapshot((querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProductionRequest));
        setProductionRequests(data);
        checkAllLoaded();
      }, (error) => {
        console.error("Error fetching production requests:", error);
        addToast({ message: '생산 요청 데이터를 불러오는 데 실패했습니다.', type: 'error' });
        checkAllLoaded();
      });
    
    const unsubscribeProductionSchedules = db.collection('production-schedules').orderBy('planDate', 'desc').limit(300)
      .onSnapshot((querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProductionSchedule));
        setProductionSchedules(data);
        checkAllLoaded();
      }, (error) => {
        console.error("Error fetching production schedules:", error);
        addToast({ message: '생산일정 데이터를 불러오는 데 실패했습니다.', type: 'error' });
        checkAllLoaded();
      });

    // FIX: Fetch orders and sort on the client-side to avoid Firestore composite index requirements.
    const unsubscribeOrders = db.collection('orders').limit(500)
      .onSnapshot((querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
        // Sort by orderNumber in ascending order.
        const sortedData = data.sort((a, b) => {
            return (a.orderNumber || '').localeCompare(b.orderNumber || '');
        });
        setOrders(sortedData);
        checkAllLoaded();
      }, (error) => {
        console.error("Error fetching orders:", error);
        addToast({ message: '수주 데이터를 불러오는 데 실패했습니다.', type: 'error' });
        checkAllLoaded();
      });

    const unsubscribeMasterData = db.collection('master-data').doc('singleton').onSnapshot((docSnap) => {
        if (docSnap.exists) {
            const data = docSnap.data() || {};
            setMasterData({
                requesters: data.requesters || [],
                destinations: data.destinations || [],
                approvers: data.approvers || [],
                requestTypes: data.requestTypes || [],
            });
        }
        checkAllLoaded();
    }, (error) => {
        console.error("Error fetching master data:", error);
        addToast({ message: '마스터 데이터를 불러오는 데 실패했습니다.', type: 'error' });
        checkAllLoaded();
    });
    
    const unsubscribeJigs = db.collection('jig-masters').orderBy('createdAt', 'desc').limit(500)
      .onSnapshot(querySnapshot => {
        const mastersData = querySnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            imageUrls: doc.data().imageUrls || [],
        }) as JigMasterItem);
        setJigs(mastersData);
        checkAllLoaded();
      }, (error) => {
        console.error("Error fetching jig masters:", error);
        addToast({ message: '지그 마스터 목록을 불러오는 데 실패했습니다.', type: 'error' });
        checkAllLoaded();
      });

    const unsubscribeNotifications = db.collection('notifications').orderBy('date', 'desc').limit(100)
      .onSnapshot((querySnapshot) => {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const notificationsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const readBy = data.readBy || [];
            return {
                id: doc.id,
                message: data.message,
                date: data.date,
                requestId: data.requestId,
                read: user ? readBy.includes(user.uid) : true,
                type: data.type || 'jig', // Default to 'jig' for older notifications
            } as Notification;
        }).filter(notification => new Date(notification.date) > twentyFourHoursAgo);
        setNotifications(notificationsData);
        checkAllLoaded();
      }, (error) => {
        console.error("Error fetching notifications:", error);
        addToast({ message: '알림을 불러오는 데 실패했습니다.', type: 'error' });
        checkAllLoaded();
      });

    const unsubscribeQuality = db.collection('quality-inspections').orderBy('createdAt', 'desc').limit(300)
      .onSnapshot(querySnapshot => {
        const inspectionsData = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        }) as QualityInspection);
        setQualityInspections(inspectionsData);
        checkAllLoaded();
      }, (error) => {
        console.error("Error fetching quality inspections:", error);
        addToast({ message: '품질 검사 데이터를 불러오는 데 실패했습니다.', type: 'error' });
        checkAllLoaded();
      });

    const unsubscribePackaging = db.collection('packaging-reports').orderBy('workDate', 'desc').limit(300)
      .onSnapshot(querySnapshot => {
        const reportsData = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        }) as PackagingReport);
        setPackagingReports(reportsData);
        checkAllLoaded();
      }, (error) => {
        console.error("Error fetching packaging reports:", error);
        addToast({ message: '생산일보 데이터를 불러오는 데 실패했습니다.', type: 'error' });
        checkAllLoaded();
      });
    
    // 개인별 테마 설정 불러오기
    const unsubscribeUserTheme = user ? db.collection('users').doc(user.uid).collection('preferences').doc('singleton').onSnapshot((docSnap) => {
        if (docSnap.exists) {
            const userPrefs = docSnap.data();
            if (userPrefs?.theme) {
                setTheme(userPrefs.theme);
            }
        }
    }, (error) => {
        console.error("Error fetching user theme:", error);
    }) : () => {};

    return () => {
        unsubscribeRequests();
        unsubscribeMasterData();
        unsubscribeUserTheme();
        unsubscribeJigs();
        unsubscribeNotifications();
        unsubscribeSampleRequests();
        unsubscribeQuality();
        unsubscribePackaging();
        unsubscribeProductionRequests();
        unsubscribeProductionSchedules();
        // FIX: Unsubscribe from orders listener on cleanup.
        unsubscribeOrders();
    };
}, [user, addToast]);

  const handleSetTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    if (user) {
      db.collection('users').doc(user.uid).collection('preferences').doc('singleton').set({ theme: newTheme }, { merge: true })
        .catch(error => {
            console.error("Error saving user theme setting:", error);
            addToast({ message: '테마 설정 저장에 실패했습니다.', type: 'error' });
        });
    }
  }, [addToast, user]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);
  
  const unreadCountsByCenter = useMemo(() => {
    const counts: Record<string, number> = {
        management: 0,
        work: 0,
        sample: 0,
        quality: 0,
        jig: 0,
        calculator: 0,
        notification: 0,
    };
    let totalUnread = 0;
    notifications.forEach(n => {
        if (!n.read) {
            totalUnread++;
            if (counts[n.type] !== undefined) {
                counts[n.type]++;
            }
        }
    });
    counts.notification = totalUnread;
    return counts;
  }, [notifications]);
  
  useEffect(() => {
    document.title = unreadCount > 0
      ? `(${unreadCount}) T.M.S (통합관리센터)`
      : '화성공장 통합관리시스템';
  }, [unreadCount]);
  
  const handleSelectRequest = useCallback((request: JigRequest) => {
    openModalWithHistory('requestDetail', request);
    setActiveMenu('ledger');
    selectCenterWithHistory('jig');
  }, [openModalWithHistory, selectCenterWithHistory]);

  const handleShowNewRequestForm = useCallback(() => {
    if (currentUserProfile?.role === 'Member') {
        addToast({ message: '신규 요청을 생성할 권한이 없습니다.', type: 'error' });
        return;
    }
    openModalWithHistory('requestForm', null);
  }, [currentUserProfile, addToast, openModalWithHistory]);

  const handleShowEditRequestForm = useCallback((request: JigRequest) => {
    openModalWithHistory('requestForm', request);
  }, [openModalWithHistory]);

  const handleSaveRequest = useCallback(async (
    requestData: Omit<JigRequest, 'id' | 'status' | 'history' | 'receivedQuantity' | 'requestDate' | 'comments' | 'imageUrls'>,
    imageFiles: File[]
  ) => {
    if (currentUserProfile?.role === 'Member') {
        addToast({ message: '요청을 저장할 권한이 없습니다.', type: 'error' });
        return;
    }
    const editingRequest = modal.view === 'requestForm' ? modal.data : null;
    addToast({ message: "요청 저장 중...", type: 'info' });

    try {
        if (editingRequest) {
            const updatedRequestData: Partial<JigRequest> = {
                ...requestData,
                history: [
                    ...(editingRequest.history || []),
                    { 
                        status: editingRequest.status, 
                        date: new Date().toISOString(), 
                        user: currentUser.name, 
                        reason: '사용자에 의해 수정됨' 
                    }
                ],
            };
            const requestRef = db.collection('jig-requests').doc(editingRequest.id);
            await requestRef.update(updatedRequestData);
            
            addToast({ message: "요청이 성공적으로 수정되었습니다.", type: "success" });
            handleCloseModal();
        } else {
            const counterRef = db.collection('counters').doc('jig-requests-counter');
            
            const newId = await db.runTransaction(async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                const currentCount = counterDoc.data()?.count || 0;
                const newCount = currentCount + 1;
                const generatedId = `T${newCount}`;
                
                const newRequestRef = db.collection('jig-requests').doc(generatedId);
                
                const newRequestPayload: Omit<JigRequest, 'id'> = {
                    ...requestData,
                    status: Status.Request,
                    receivedQuantity: 0,
                    requestDate: new Date().toISOString(),
                    history: [{ status: Status.Request, date: new Date().toISOString(), user: currentUser.name, reason: '생성됨' }],
                    comments: [],
                    imageUrls: [],
                };

                transaction.set(newRequestRef, newRequestPayload);
                transaction.set(counterRef, { count: newCount });
                
                return generatedId;
            });

            if (imageFiles.length > 0) {
                addToast({ message: `이미지 업로드 중... (0/${imageFiles.length})`, type: 'info' });
                const imageUrls = await Promise.all(
                    imageFiles.map(async (file, index) => {
                        const uniqueFileName = `${Date.now()}-${file.name}`;
                        const imageRef = storage.ref(`jig-request-images/${newId}/${uniqueFileName}`);
                        const snapshot = await imageRef.put(file);
                        const downloadURL = await snapshot.ref.getDownloadURL();
                        addToast({ message: `이미지 업로드 중... (${index + 1}/${imageFiles.length})`, type: 'info' });
                        return downloadURL;
                    })
                );
                await db.collection('jig-requests').doc(newId).update({ imageUrls });
            }

            addToast({ message: "신규 요청이 성공적으로 등록되었습니다.", type: "success" });
            handleCloseModal();
            
            const newNotification = {
                message: `신규 요청 '${requestData.itemName}'이(가) 등록되었습니다.`,
                date: new Date().toISOString(),
                requestId: newId,
                readBy: [],
                type: 'jig',
            };
            await db.collection('notifications').add(newNotification);
        }
    } catch (error) {
        console.error("Error saving request:", error);
        addToast({ message: "요청 저장에 실패했습니다.", type: "error" });
        throw error;
    }
  }, [modal, handleCloseModal, addToast, currentUser, currentUserProfile]);
  
  const handleDeleteRequest = useCallback(async (id: string) => {
    addToast({ message: "요청 삭제 중...", type: 'info' });
    try {
        const requestToDelete = requests.find(r => r.id === id);
        if (requestToDelete?.imageUrls) {
            for (const url of requestToDelete.imageUrls) {
                try {
                   const imageRef = storage.refFromURL(url);
                   await imageRef.delete();
                } catch (storageError: any) {
                   if (storageError.code !== 'storage/object-not-found') {
                       console.error("Error deleting image from storage:", storageError);
                   }
                }
            }
        }
        await db.collection('jig-requests').doc(id).delete();
        addToast({ message: "요청이 삭제되었습니다.", type: "success" });
        handleCloseModal();
    } catch (error) {
        console.error("Error deleting request:", error);
        addToast({ message: "요청 삭제에 실패했습니다.", type: "error" });
    }
}, [requests, handleCloseModal, addToast]);

  const handleStatusUpdate = useCallback(async (id: string, status: Status, reason?: string) => {
    const originalRequest = requests.find(r => r.id === id);
    if (!originalRequest) return;
    
    const historyEntry = { status, date: new Date().toISOString(), user: currentUser.name, reason: reason || '상태 업데이트됨' };
    const updatedHistory = [...(originalRequest.history || []), historyEntry];
    const optimisticallyUpdatedRequest = { ...originalRequest, status, history: updatedHistory };
    
    setRequests(prev => sortRequests(prev.map(r => r.id === id ? optimisticallyUpdatedRequest : r)));
    if (modal.view === 'requestDetail' && modal.data?.id === id) {
        setModal(prev => ({...prev, data: optimisticallyUpdatedRequest}));
    }

    try {
        await db.collection('jig-requests').doc(id).update({ status: status, history: firebase.firestore.FieldValue.arrayUnion(historyEntry) });
        addToast({ message: `상태가 '${status}'(으)로 업데이트되었습니다.`, type: "success" });

        const newNotification = {
            message: `요청 '${originalRequest.itemName}'의 상태가 '${status}'(으)로 변경되었습니다.`,
            date: new Date().toISOString(),
            requestId: id,
            readBy: [],
            type: 'jig',
        };
        await db.collection('notifications').add(newNotification);
    } catch (error) {
        console.error("Error updating status:", error);
        addToast({ message: "상태 업데이트에 실패했습니다. 변경사항이 되돌려집니다.", type: "error" });
        setRequests(prev => prev.map(r => r.id === id ? originalRequest : r));
        if (modal.view === 'requestDetail' && modal.data?.id === id) {
            setModal(prev => ({...prev, data: originalRequest}));
        }
    }
  }, [requests, modal, addToast, currentUser]);
  
  const handleReceiveItems = useCallback(async (id: string, quantityChange: number) => {
    const originalRequest = requests.find(r => r.id === id);
    if (!originalRequest) return;
    
    const newReceivedQuantity = originalRequest.receivedQuantity + quantityChange;
    let newStatus = originalRequest.status;
    if ([Status.InProgress, Status.Receiving, Status.Completed].includes(originalRequest.status)) {
        if (newReceivedQuantity >= originalRequest.quantity) newStatus = Status.Completed;
        else if (newReceivedQuantity > 0) newStatus = Status.Receiving;
        else newStatus = Status.InProgress;
    }

    const absQuantityChange = Math.abs(quantityChange);
    let reason = '';
    if (quantityChange > 0) {
        reason = `수량 ${absQuantityChange}개 입고됨. (총 ${newReceivedQuantity}/${originalRequest.quantity})`;
        if (newStatus === Status.Completed && originalRequest.status !== Status.Completed) reason = `모든 품목 입고 완료. (총 ${newReceivedQuantity}/${originalRequest.quantity})`
    } else {
        reason = `수량 ${absQuantityChange}개 반출됨. (총 ${newReceivedQuantity}/${originalRequest.quantity})`;
    }
    
    const historyEntry = { status: newStatus, date: new Date().toISOString(), user: currentUser.name, reason };
    
    const optimisticallyUpdatedRequest = {
        ...originalRequest,
        receivedQuantity: newReceivedQuantity,
        status: newStatus,
        history: [...(originalRequest.history || []), historyEntry]
    };
    
    setRequests(prev => sortRequests(prev.map(r => r.id === id ? optimisticallyUpdatedRequest : r)));
    if (modal.view === 'requestDetail' && modal.data?.id === id) {
        setModal(prev => ({...prev, data: optimisticallyUpdatedRequest}));
    }
    
    try {
        await db.collection('jig-requests').doc(id).update({
            receivedQuantity: newReceivedQuantity,
            status: newStatus,
            history: firebase.firestore.FieldValue.arrayUnion(historyEntry)
        });
        addToast({ message: reason, type: 'success' });
    } catch (error) {
        console.error("Error receiving items:", error);
        addToast({ message: "입고 처리에 실패했습니다. 변경사항이 되돌려집니다.", type: "error" });
        setRequests(prev => prev.map(r => r.id === id ? originalRequest : r));
        if (modal.view === 'requestDetail' && modal.data?.id === id) {
            setModal(prev => ({...prev, data: optimisticallyUpdatedRequest}));
        }
    }
  }, [requests, modal, addToast, currentUser]);
  
    const handleAddComment = useCallback(async (requestId: string, commentText: string) => {
        if (currentUserProfile?.role === 'Member') {
            addToast({ message: "댓글을 추가할 권한이 없습니다.", type: "error" });
            return;
        }
        const originalRequest = requests.find(r => r.id === requestId);
        if (!originalRequest) return;
        
        const newComment: Comment = {
            id: `C-${Date.now()}`,
            user: currentUser.name,
            date: new Date().toISOString(),
            text: commentText,
        };
        
        const optimisticallyUpdatedRequest = { ...originalRequest, comments: [...(originalRequest.comments || []), newComment] };

        setRequests(prev => sortRequests(prev.map(r => r.id === requestId ? optimisticallyUpdatedRequest : r)));
        if (modal.view === 'requestDetail' && modal.data?.id === requestId) {
            setModal(prev => ({...prev, data: optimisticallyUpdatedRequest}));
        }
        
        try {
            await db.collection('jig-requests').doc(requestId).update({ comments: firebase.firestore.FieldValue.arrayUnion(newComment) });

            const newNotification = {
                message: `요청 '${originalRequest.itemName}'에 ${currentUser.name}님이 새 댓글을 남겼습니다.`,
                date: new Date().toISOString(),
                requestId: requestId,
                readBy: [],
                type: 'jig',
            };
            await db.collection('notifications').add(newNotification);
            addToast({ message: "댓글이 추가되었습니다.", type: 'success' });
        } catch (error) {
            console.error("Error adding comment:", error);
            addToast({ message: "댓글 추가에 실패했습니다. 변경사항이 되돌려집니다.", type: "error" });
            setRequests(prev => prev.map(r => r.id === requestId ? originalRequest : r));
            if (modal.view === 'requestDetail' && modal.data?.id === requestId) {
                setModal(prev => ({...prev, data: optimisticallyUpdatedRequest}));
            }
        }
    }, [requests, modal, addToast, currentUser, currentUserProfile]);

  const updateMasterData = async (newData: Partial<MasterData>) => {
    try {
      const masterDataRef = db.collection('master-data').doc('singleton');
      await masterDataRef.set(newData, { merge: true });
      addToast({ message: "마스터 데이터가 업데이트되었습니다.", type: 'success' });
    } catch (error) {
      console.error("Error updating master data:", error);
      addToast({ message: "마스터 데이터 업데이트에 실패했습니다.", type: 'error' });
    }
  };

  const handleAddMasterData = (type: 'requesters' | 'destinations' | 'approvers', newItem: Requester | Destination | Approver) => {
    const newItems = [...(masterData[type] || []), newItem];
    updateMasterData({ [type]: newItems });
  };
  
  const handleEditMasterDataItem = (type: 'requesters' | 'destinations' | 'approvers', updatedItem: Requester | Destination | Approver, index: number) => {
    const newItems = [...(masterData[type] || [])];
    newItems[index] = updatedItem as any;
    updateMasterData({ [type]: newItems });
  };
  
  const onDeleteMasterDataItem = (type: 'requesters' | 'destinations' | 'approvers', index: number) => {
    const newItems = (masterData[type] || []).filter((_, i) => i !== index);
    updateMasterData({ [type]: newItems });
    addToast({ message: "항목이 성공적으로 삭제되었습니다.", type: 'success' });
  };
  
  const handleNotificationClick = useCallback((notification: Notification) => {
      if (notification.type === 'jig') {
        const request = requests.find(r => r.id === notification.requestId);
        if (request) handleSelectRequest(request);
      } else if (notification.type === 'quality') {
        selectCenterWithHistory('quality');
        setQualityDeepLink(notification.requestId);
      } else if (notification.type === 'work') {
        selectCenterWithHistory('work');
        setWorkDeepLink(notification.requestId);
      } else if (notification.type === 'sample') {
         const request = sampleRequests.find(r => r.id === notification.requestId);
         if (request) {
            selectCenterWithHistory('sample');
            openModalWithHistory('detail', request as any);
         }
      }
      
      if (user && !notification.read) {
        const notificationRef = db.collection('notifications').doc(notification.id);
        notificationRef.update({
            readBy: firebase.firestore.FieldValue.arrayUnion(user.uid)
        }).catch(err => {
            console.error("Error marking notification as read:", err);
        });
      }
  }, [requests, sampleRequests, selectCenterWithHistory, openModalWithHistory, user, handleSelectRequest]);

  const handleNotificationClickFromPanel = useCallback((notification: Notification) => {
      handleNotificationClick(notification);
      setIsNotificationPanelOpen(false);
  }, [handleNotificationClick]);
  
    const markAllNotificationsAsRead = useCallback(() => {
        if (!user) return;
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;

        const batch = db.batch();
        unread.forEach(notification => {
            const ref = db.collection('notifications').doc(notification.id);
            batch.update(ref, { readBy: firebase.firestore.FieldValue.arrayUnion(user.uid) });
        });
        batch.commit().catch(err => {
            console.error("Failed to mark all as read:", err);
            addToast({ message: '알림 읽음 처리에 실패했습니다.', type: 'error' });
        });
        setIsNotificationPanelOpen(false);
    }, [user, notifications, addToast]);


    const markNotificationsAsReadForCenter = useCallback((center: ActiveCenter) => {
        if (!user) return;
        const unread = (center === 'notification')
            ? notifications.filter(n => !n.read)
            : notifications.filter(n => n.type === center && !n.read);
            
        if (unread.length === 0) return;

        const batch = db.batch();
        unread.forEach(notification => {
            const ref = db.collection('notifications').doc(notification.id);
            batch.update(ref, { readBy: firebase.firestore.FieldValue.arrayUnion(user.uid) });
        });
        batch.commit().catch(err => {
            console.error("Failed to mark notifications as read for center:", err);
            addToast({ message: '알림 읽음 처리에 실패했습니다.', type: 'error' });
        });
    }, [user, notifications, addToast]);

    const handleSelectCenter = (center: ActiveCenter) => {
        selectCenterWithHistory(center);
        if (center !== 'home' && center !== 'settings') {
            markNotificationsAsReadForCenter(center);
        }
        if (center === 'jig') setActiveMenu('dashboard');
    };

  const handleSelectJigMasterItem = useCallback((jig: JigMasterItem) => {
    openModalWithHistory('jigDetail', jig);
  }, [openModalWithHistory]);

  const handleOpenJigRegistrationForm = useCallback(() => {
    if (currentUserProfile?.role === 'Member') {
        addToast({ message: '신규 지그를 등록할 권한이 없습니다.', type: 'error' });
        return;
    }
    openModalWithHistory('jigForm');
  }, [currentUserProfile, addToast, openModalWithHistory]);

  const handleUpdateJigMasterItem = async (id: string, updates: Partial<JigMasterItem>) => {
    addToast({ message: "지그 정보 업데이트 중...", type: 'info' });
    try {
        await db.collection('jig-masters').doc(id).update(updates);
        addToast({ message: "지그 정보가 성공적으로 업데이트되었습니다.", type: "success" });
        if (modal.view === 'jigDetail' && modal.data?.id === id) {
           setModal(prev => ({ ...prev, data: { ...prev.data, ...updates }}));
        }
    } catch (error) {
        console.error("Error updating jig master:", error);
        addToast({ message: "지그 정보 업데이트에 실패했습니다.", type: "error" });
        throw error;
    }
  };

  const handleDeleteJigMasterItem = async (id: string) => {
    addToast({ message: "지그 삭제 중...", type: 'info' });
    try {
        const jigToDelete = jigs.find(j => j.id === id);
        if (jigToDelete?.imageUrls) {
           for (const url of jigToDelete.imageUrls) {
               try {
                  const imageRef = storage.refFromURL(url);
                  await imageRef.delete();
               } catch (storageError: any) {
                  if (storageError.code !== 'storage/object-not-found') {
                      console.error("Error deleting image from storage:", storageError);
                  }
               }
           }
        }
        await db.collection('jig-masters').doc(id).delete();
        addToast({ message: "지그가 삭제되었습니다.", type: "success" });
        handleCloseModal();
    } catch (error) {
        console.error("Error deleting jig master:", error);
        addToast({ message: "지그 삭제에 실패했습니다.", type: "error" });
    }
  };

  const handleSaveJigMasterItem = useCallback(async (
    formData: { requestType: string; itemName: string; partName: string; itemNumber: string; remarks: string; },
    imageFiles: File[]
  ) => {
    if (!currentUserProfile || currentUserProfile.role === 'Member') {
        addToast({ message: '신규 지그를 등록할 권한이 없습니다.', type: 'error' });
        return;
    }
    addToast({ message: "신규 지그 등록 중...", type: 'info' });
    try {
        const payloadWithoutImages = {
            ...formData,
            createdAt: new Date().toISOString(),
            createdBy: {
                uid: currentUserProfile.uid,
                displayName: currentUserProfile.displayName,
            },
            imageUrls: [],
        };
        const newDocRef = await db.collection('jig-masters').add(payloadWithoutImages);
        const newId = newDocRef.id;

        let imageUrls: string[] = [];
        for (const file of imageFiles) {
            const uniqueFileName = `${Date.now()}-${file.name}`;
            const imageRef = storage.ref(`jig-master-images/${newId}/${uniqueFileName}`);
            const snapshot = await imageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            imageUrls.push(downloadURL);
        }
        
        if (imageUrls.length > 0) {
            await newDocRef.update({ imageUrls });
        }

        handleCloseModal();
        addToast({ message: "신규 지그가 목록에 등록되었습니다.", type: 'success' });
    } catch (error) {
        console.error("Error saving jig master:", error);
        addToast({ message: "신규 지그 등록에 실패했습니다.", type: "error" });
    }
  }, [addToast, handleCloseModal, currentUserProfile]);

    const handleUpdateQualityInspection = useCallback(async (id: string, updates: Partial<QualityInspection>, reason?: string) => {
        if (currentUserProfile?.role === 'Member') {
            addToast({ message: '검사 정보를 업데이트할 권한이 없습니다.', type: 'error' });
            return;
        }
        addToast({ message: '검사 정보 업데이트 중...', type: 'info' });
        try {
            const inspectionRef = db.collection('quality-inspections').doc(id);
            const doc = await inspectionRef.get();
            if (!doc.exists) {
                addToast({ message: '검사 정보를 찾을 수 없습니다.', type: 'error' });
                return;
            }
            const originalData = doc.data() as QualityInspection;

            let detailedReason = reason || '사용자에 의해 수정됨';
            if (updates.result && originalData.result !== updates.result) {
                detailedReason = `결과: '${originalData.result}'에서 '${updates.result}'(으)로 변경`;
            }

            const historyEntry: HistoryEntry = {
                status: '수정됨',
                date: new Date().toISOString(),
                user: currentUser.name,
                reason: detailedReason,
            };

            await inspectionRef.update({
                ...updates,
                history: firebase.firestore.FieldValue.arrayUnion(historyEntry)
            });
            addToast({ message: '검사 정보가 성공적으로 업데이트되었습니다.', type: 'success' });
        } catch (error) {
            console.error('Error updating quality inspection:', error);
            addToast({ message: '검사 정보 업데이트에 실패했습니다.', type: 'error' });
            throw error;
        }
    }, [addToast, currentUser.name, currentUserProfile]);

    const handleDeleteInspectionGroup = useCallback(async (orderNumber: string) => {
        if (currentUserProfile?.role !== 'Admin') {
            addToast({ message: '검사 기록을 삭제할 권한이 없습니다.', type: 'error' });
            return;
        }
        addToast({ message: '검사 기록 삭제 중...', type: 'info' });
        try {
            const querySnapshot = await db.collection('quality-inspections').where('orderNumber', '==', orderNumber).get();
            if (querySnapshot.empty) {
                addToast({ message: '삭제할 검사 기록이 없습니다.', type: 'info' });
                return;
            }
            const batch = db.batch();
            querySnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            addToast({ message: `'${orderNumber}' 검사 기록이 삭제되었습니다.`, type: 'success' });
        } catch (error) {
            console.error('Error deleting inspection group:', error);
            addToast({ message: '검사 기록 삭제에 실패했습니다.', type: 'error' });
        }
    }, [addToast, currentUserProfile]);

    const handleAddQualityComment = useCallback(async (orderNumber: string, commentText: string) => {
        if (currentUserProfile?.role === 'Member') {
            addToast({ message: "댓글을 추가할 권한이 없습니다.", type: "error" });
            return;
        }
        try {
            const querySnapshot = await db.collection('quality-inspections').where('orderNumber', '==', orderNumber).get();
            if (querySnapshot.empty) {
                throw new Error('No inspection found for this order number.');
            }
            const latestInspectionDoc = querySnapshot.docs.sort((a, b) => new Date(b.data().createdAt).getTime() - new Date(a.data().createdAt).getTime())[0];
            const inspectionData = latestInspectionDoc.data() as QualityInspection;

            const newComment: Comment = {
                id: `QC-${Date.now()}`,
                user: currentUser.name,
                date: new Date().toISOString(),
                text: commentText,
            };
            
            await latestInspectionDoc.ref.update({
                comments: firebase.firestore.FieldValue.arrayUnion(newComment)
            });

            await db.collection('notifications').add({
                message: `품질검사 '${inspectionData.productName}'에 새 댓글이 달렸습니다.`,
                date: new Date().toISOString(),
                requestId: orderNumber,
                readBy: [],
                type: 'quality',
            });
            addToast({ message: '댓글이 추가되었습니다.', type: 'success' });
        } catch (error) {
            console.error('Error adding quality comment:', error);
            addToast({ message: '댓글 추가에 실패했습니다.', type: 'error' });
        }
    }, [currentUser.name, addToast, currentUserProfile]);

  const handleSaveSampleRequest = useCallback(async (
    data: Omit<SampleRequest, 'id' | 'createdAt' | 'requesterInfo' | 'status' | 'history' | 'comments' | 'imageUrls' | 'workData'>,
    images: File[]
  ) => {
    if (!currentUserProfile) {
        addToast({ message: "로그인이 필요합니다.", type: "error" });
        throw new Error("User not logged in");
    }
    
    const editingRequest = (modal.view === 'form' && modal.data) ? modal.data as SampleRequest : null;

    if (editingRequest) {
        addToast({ message: "샘플 요청 수정 중...", type: 'info' });
        try {
            const requestRef = db.collection('sample-requests').doc(editingRequest.id);
            const historyEntry: HistoryEntry = {
                status: editingRequest.status,
                date: new Date().toISOString(),
                user: currentUserProfile.displayName,
                reason: '요청 내용 수정됨'
            };
            await requestRef.update({
                ...data,
                history: firebase.firestore.FieldValue.arrayUnion(historyEntry)
            });
            addToast({ message: "샘플 요청이 수정되었습니다.", type: 'success' });
            handleCloseModal();
        } catch (error) {
            console.error("Error updating sample request:", error);
            addToast({ message: "샘플 요청 수정에 실패했습니다.", type: "error" });
            throw error;
        }
    } else {
        addToast({ message: "샘플 요청 저장 중...", type: 'info' });
        try {
            const counterRef = db.collection('counters').doc('sample-requests-counter');
            const today = new Date();
            const dateString = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

            const newId = await db.runTransaction(async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                const currentCount = counterDoc.data()?.count || 0;
                const newCount = currentCount + 1;
                const generatedId = `S-${dateString}-${newCount.toString().padStart(3, '0')}`;
                
                const newRequestRef = db.collection('sample-requests').doc(generatedId);
                
                const newRequestPayload: Omit<SampleRequest, 'id'> = {
                    ...data,
                    createdAt: new Date().toISOString(),
                    requesterInfo: { uid: currentUserProfile.uid, displayName: currentUserProfile.displayName },
                    status: SampleStatus.Received,
                    history: [{ status: SampleStatus.Received, date: new Date().toISOString(), user: currentUserProfile.displayName, reason: '생성됨' }],
                    comments: [],
                    imageUrls: [],
                };

                transaction.set(newRequestRef, newRequestPayload);
                transaction.set(counterRef, { count: newCount });
                
                return generatedId;
            });
            
            if (images.length > 0) {
                const imageUrls = await Promise.all(
                    images.map(file => {
                        const ref = storage.ref(`sample-request-images/${newId}/${Date.now()}-${file.name}`);
                        return ref.put(file).then(snapshot => snapshot.ref.getDownloadURL());
                    })
                );
                await db.collection('sample-requests').doc(newId).update({ imageUrls });
            }
            
            await db.collection('notifications').add({
                message: `신규 샘플 요청 '${data.productName}'이(가) 등록되었습니다.`,
                date: new Date().toISOString(),
                requestId: newId,
                readBy: [],
                type: 'sample',
            });

            addToast({ message: "신규 샘플 요청이 등록되었습니다.", type: 'success' });
            handleCloseModal();
        } catch (error) {
            console.error("Error saving sample request:", error);
            addToast({ message: "샘플 요청 저장에 실패했습니다.", type: "error" });
            throw error;
        }
    }
  }, [addToast, currentUserProfile, modal.data, modal.view, handleCloseModal]);


    const handleUpdateSampleRequestStatus = useCallback(async (id: string, status: SampleStatus, reason?: string, workData?: SampleRequest['workData']) => {
        if (!currentUserProfile) return;
        const originalRequest = sampleRequests.find(r => r.id === id);
        if (!originalRequest) return;

        const historyEntry: HistoryEntry = { status, date: new Date().toISOString(), user: currentUserProfile.displayName, reason: reason || '상태 업데이트됨' };
        
        const optimisticallyUpdatedRequest = { 
            ...originalRequest, 
            status, 
            history: [...(originalRequest.history || []), historyEntry],
            ...(workData && { workData }),
        };

        setSampleRequests(prev => prev.map(r => r.id === id ? optimisticallyUpdatedRequest : r));
        if (modal.view === 'detail' && modal.data?.id === id) {
            setModal(prev => ({...prev, data: optimisticallyUpdatedRequest}));
        }

        try {
            const ref = db.collection('sample-requests').doc(id);
            const updates: { [key: string]: any } = { 
                status, 
                history: firebase.firestore.FieldValue.arrayUnion(historyEntry)
            };

            if (workData) {
                updates.workData = workData;
            }

            await ref.update(updates);
            
            addToast({ message: '상태가 업데이트되었습니다.', type: 'success' });
            
            if (originalRequest) {
                await db.collection('notifications').add({
                    message: `샘플 요청 '${originalRequest.productName}'의 상태가 '${status}'로 변경되었습니다.`,
                    date: new Date().toISOString(),
                    requestId: id,
                    readBy: [],
                    type: 'sample',
                });
            }
        } catch (error) {
            console.error("Error updating sample status:", error);
            addToast({ message: "상태 업데이트에 실패했습니다. 변경사항이 되돌려집니다.", type: "error" });
            setSampleRequests(prev => prev.map(r => r.id === id ? originalRequest : r));
            if (modal.view === 'detail' && modal.data?.id === id) {
                setModal(prev => ({...prev, data: originalRequest}));
            }
        }
    }, [addToast, currentUserProfile, sampleRequests, modal]);

    const handleDeleteSampleRequest = useCallback(async (id: string) => {
        addToast({ message: "삭제 중...", type: 'info' });
        try {
            await db.collection('sample-requests').doc(id).delete();
            // Note: Images in storage are not deleted to preserve record, can be changed.
            addToast({ message: '요청이 삭제되었습니다.', type: 'success' });
            handleCloseModal();
        } catch (error) {
            addToast({ message: '삭제에 실패했습니다.', type: 'error' });
        }
    }, [addToast, handleCloseModal]);
    
    const handleAddSampleComment = useCallback(async (id: string, text: string) => {
        if (!currentUserProfile) return;
        const originalRequest = sampleRequests.find(r => r.id === id);
        if (!originalRequest) return;

        const newComment: Comment = { id: `S-C-${Date.now()}`, user: currentUserProfile.displayName, date: new Date().toISOString(), text };
        
        const optimisticallyUpdatedRequest = { ...originalRequest, comments: [...(originalRequest.comments || []), newComment] };

        setSampleRequests(prev => prev.map(r => r.id === id ? optimisticallyUpdatedRequest : r));
        if (modal.view === 'detail' && modal.data?.id === id) {
            setModal(prev => ({...prev, data: optimisticallyUpdatedRequest}));
        }

        try {
            const ref = db.collection('sample-requests').doc(id);
            await ref.update({ comments: firebase.firestore.FieldValue.arrayUnion(newComment) });
            addToast({ message: '댓글이 추가되었습니다.', type: 'success' });
        } catch (error) {
            console.error("Error adding sample comment:", error);
            addToast({ message: "댓글 추가에 실패했습니다. 변경사항이 되돌려집니다.", type: "error" });
            setSampleRequests(prev => prev.map(r => r.id === id ? originalRequest : r));
            if (modal.view === 'detail' && modal.data?.id === id) {
                setModal(prev => ({...prev, data: optimisticallyUpdatedRequest}));
            }
        }
    }, [addToast, currentUserProfile, sampleRequests, modal]);

    const handleUploadSampleImage = useCallback(async (id: string, file: File) => {
        try {
            const ref = storage.ref(`sample-request-images/${id}/${Date.now()}-${file.name}`);
            const snapshot = await ref.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            await db.collection('sample-requests').doc(id).update({
                imageUrls: firebase.firestore.FieldValue.arrayUnion(downloadURL)
            });
        } catch (error) {
            console.error("Error uploading image:", error);
            throw error;
        }
    }, []);

    const handleUpdateSampleWorkData = useCallback(async (id: string, workData: SampleRequest['workData']) => {
        if (!currentUserProfile) return;
        const originalRequest = sampleRequests.find(r => r.id === id);
        if (!originalRequest) return;
        
        const historyEntry: HistoryEntry = { status: '작업 데이터', date: new Date().toISOString(), user: currentUserProfile.displayName, reason: '작업 데이터가 수정/추가되었습니다.' };
        const optimisticallyUpdatedRequest = { ...originalRequest, workData, history: [...(originalRequest.history || []), historyEntry] };

        setSampleRequests(prev => prev.map(r => r.id === id ? optimisticallyUpdatedRequest : r));
        if (modal.view === 'detail' && modal.data?.id === id) {
            setModal(prev => ({...prev, data: optimisticallyUpdatedRequest}));
        }

        try {
            const ref = db.collection('sample-requests').doc(id);
            await ref.update({ 
                workData,
                history: firebase.firestore.FieldValue.arrayUnion(historyEntry)
            });
            addToast({ message: '작업 데이터가 저장되었습니다.', type: 'success' });
            
            if (originalRequest) {
                await db.collection('notifications').add({
                    message: `샘플 요청 '${originalRequest.productName}'의 작업 데이터가 업데이트되었습니다.`,
                    date: new Date().toISOString(),
                    requestId: id,
                    readBy: [],
                    type: 'sample',
                });
            }
        } catch (error) {
            console.error("Error updating work data:", error);
            addToast({ message: "작업 데이터 저장에 실패했습니다. 변경사항이 되돌려집니다.", type: "error" });
            setSampleRequests(prev => prev.map(r => r.id === id ? originalRequest : r));
            if (modal.view === 'detail' && modal.data?.id === id) {
                setModal(prev => ({...prev, data: optimisticallyUpdatedRequest}));
            }
        }
    }, [addToast, currentUserProfile, sampleRequests, modal]);

  const handleLogout = () => {
    auth.signOut().then(() => {
        addToast({ message: "로그아웃되었습니다.", type: 'info'});
    }).catch(error => {
        console.error("Logout Error:", error);
        addToast({ message: "로그아웃 실패.", type: 'error'});
    });
  };

  const handleSearchSubmit = (query: string) => {
    if (query.trim()) {
      setSearchQuery(query.trim());
      setActiveCenter('home'); // or any other default view when search is active
    }
  };
  
    const handleOpenNewProductionRequest = useCallback(() => {
        openModalWithHistory('productionRequestForm');
    }, [openModalWithHistory]);
    
    const handleSaveProductionRequest = useCallback(async (
        data: Omit<ProductionRequest, 'id' | 'createdAt' | 'author' | 'status' | 'history' | 'comments' | 'quantity' | 'imageUrls'> & { quantity: string },
        imageFiles: File[]
    ) => {
        if (!currentUserProfile) {
            addToast({ message: "로그인이 필요합니다.", type: "error" });
            throw new Error("User not logged in");
        }
        
        const editingRequest = (modal.view === 'productionRequestForm' && modal.data) ? modal.data as ProductionRequest : null;
        
        const saveData = { ...data, quantity: parseInt(data.quantity, 10) || 0 };

        if (editingRequest) {
            addToast({ message: "생산 요청 수정 중...", type: 'info' });
            try {
                const requestRef = db.collection('production-requests').doc(editingRequest.id);
                const historyEntry: HistoryEntry = {
                    status: editingRequest.status,
                    date: new Date().toISOString(),
                    user: currentUserProfile.displayName,
                    reason: '요청 내용 수정됨'
                };
                await requestRef.update({
                    ...saveData,
                    history: firebase.firestore.FieldValue.arrayUnion(historyEntry)
                });
                
                addToast({ message: "생산 요청이 수정되었습니다.", type: 'success' });
                handleCloseModal();
                
            } catch (error) {
                console.error("Error updating production request:", error);
                addToast({ message: "생산 요청 수정에 실패했습니다.", type: "error" });
                throw error;
            }
        } else {
            addToast({ message: "생산 요청 저장 중...", type: 'info' });
            try {
                const counterRef = db.collection('counters').doc('production-requests-counter');
                const today = new Date();
                const dateString = `${today.getFullYear().toString().slice(-2)}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
                
                const newId = await db.runTransaction(async (transaction) => {
                    const counterDoc = await transaction.get(counterRef);
                    const currentCount = counterDoc.data()?.count || 0;
                    const newCount = currentCount + 1;
                    const generatedId = `P-${dateString}-${newCount.toString().padStart(3, '0')}`;
                    
                    const newRequestRef = db.collection('production-requests').doc(generatedId);
                    
                    const newRequestPayload: Omit<ProductionRequest, 'id'> = {
                        ...saveData,
                        createdAt: new Date().toISOString(),
                        author: { uid: currentUserProfile.uid, displayName: currentUserProfile.displayName },
                        status: ProductionRequestStatus.Requested,
                        history: [{ status: ProductionRequestStatus.Requested, date: new Date().toISOString(), user: currentUserProfile.displayName, reason: '생성됨' }],
                        comments: [],
                        imageUrls: [],
                    };
                    
                    transaction.set(newRequestRef, newRequestPayload);
                    transaction.set(counterRef, { count: newCount });
                    
                    return generatedId;
                });

                if (imageFiles.length > 0) {
                    addToast({ message: `이미지 업로드 중...`, type: 'info' });
                    const imageUrls = await Promise.all(
                        imageFiles.map(async (file) => {
                            const uniqueFileName = `${Date.now()}-${file.name}`;
                            const imageRef = storage.ref(`production-request-images/${newId}/${uniqueFileName}`);
                            const snapshot = await imageRef.put(file);
                            return await snapshot.ref.getDownloadURL();
                        })
                    );
                    await db.collection('production-requests').doc(newId).update({ imageUrls });
                }
                
                await db.collection('notifications').add({
                    message: `신규 생산 요청 '${data.productName}'이(가) 등록되었습니다.`,
                    date: new Date().toISOString(),
                    requestId: newId,
                    readBy: [],
                    type: 'work',
                });
                
                addToast({ message: "신규 생산 요청이 등록되었습니다.", type: 'success' });
                handleCloseModal();
            } catch (error) {
                console.error("Error saving production request:", error);
                addToast({ message: "생산 요청 저장에 실패했습니다.", type: "error" });
                throw error;
            }
        }
    }, [addToast, currentUserProfile, handleCloseModal, modal.view, modal.data]);
    
    const handleSelectProductionRequest = useCallback((request: ProductionRequest) => {
        openModalWithHistory('productionRequestDetail', request);
    }, [openModalWithHistory]);

    const handleShowEditProductionRequestForm = useCallback((request: ProductionRequest) => {
        openModalWithHistory('productionRequestForm', request);
    }, [openModalWithHistory]);
    
    const handleUpdateProductionRequestStatus = useCallback(async (id: string, status: ProductionRequestStatus, reason?: string) => {
        if (!currentUserProfile) return;
        const originalRequest = productionRequests.find(r => r.id === id);
        if (!originalRequest) return;
    
        const historyEntry: HistoryEntry = { status, date: new Date().toISOString(), user: currentUserProfile.displayName, reason: reason || '상태 업데이트됨' };
    
        try {
            await db.collection('production-requests').doc(id).update({
                status,
                history: firebase.firestore.FieldValue.arrayUnion(historyEntry)
            });
            
            addToast({ message: '상태가 업데이트되었습니다.', type: 'success' });
            
            await db.collection('notifications').add({
                message: `생산 요청 '${originalRequest.productName}'의 상태가 '${status}'로 변경되었습니다.`,
                date: new Date().toISOString(),
                requestId: id,
                readBy: [],
                type: 'work',
            });
            
            if (modal.view === 'productionRequestDetail' && modal.data?.id === id) {
                // Optimistically update modal data or simply close it
                const updatedRequest = { ...originalRequest, status, history: [...originalRequest.history, historyEntry] };
                setModal(prev => ({...prev, data: updatedRequest}));
            }
    
        } catch (error) {
            console.error("Error updating production request status:", error);
            addToast({ message: "상태 업데이트에 실패했습니다.", type: "error" });
        }
    }, [addToast, currentUserProfile, productionRequests, modal]);
    
    const handleAddProductionRequestComment = useCallback(async (id: string, text: string) => {
        if (!currentUserProfile) return;
        const originalRequest = productionRequests.find(r => r.id === id);
        if (!originalRequest) return;
    
        const newComment: Comment = { 
            id: `P-C-${Date.now()}`, 
            user: currentUserProfile.displayName, 
            date: new Date().toISOString(), 
            text,
            readBy: [currentUserProfile.uid]
        };
        
        const optimisticallyUpdatedRequest = { ...originalRequest, comments: [...(originalRequest.comments || []), newComment] };

        setProductionRequests(prev => prev.map(r => r.id === id ? optimisticallyUpdatedRequest : r));
        if (modal.view === 'productionRequestDetail' && modal.data?.id === id) {
            setModal(prev => ({...prev, data: optimisticallyUpdatedRequest}));
        }

        try {
            await db.collection('production-requests').doc(id).update({
                comments: firebase.firestore.FieldValue.arrayUnion(newComment)
            });
            addToast({ message: '댓글이 추가되었습니다.', type: 'success' });
        } catch (error) {
            console.error("Error adding production request comment:", error);
            addToast({ message: "댓글 추가에 실패했습니다. 변경사항이 되돌려집니다.", type: "error" });
            setProductionRequests(prev => prev.map(r => r.id === id ? originalRequest : r));
            if (modal.view === 'productionRequestDetail' && modal.data?.id === id) {
                setModal(prev => ({...prev, data: originalRequest}));
            }
        }
    }, [addToast, currentUserProfile, productionRequests, modal]);
    
    const handleDeleteProductionRequest = useCallback(async (id: string) => {
        if (currentUserProfile?.role !== 'Admin') {
            addToast({ message: '삭제 권한이 없습니다.', type: 'error' });
            return;
        }
        addToast({ message: "삭제 중...", type: 'info' });
        try {
            await db.collection('production-requests').doc(id).delete();
            addToast({ message: '요청이 삭제되었습니다.', type: 'success' });
            handleCloseModal();
        } catch (error) {
            addToast({ message: '삭제에 실패했습니다.', type: 'error' });
        }
    }, [addToast, handleCloseModal, currentUserProfile]);

    const handleMarkProductionRequestCommentsAsRead = useCallback(async (requestId: string) => {
        if (!currentUserProfile) return;

        const requestIndex = productionRequests.findIndex(r => r.id === requestId);
        if (requestIndex === -1) return;

        const originalRequest = productionRequests[requestIndex];
        if (!originalRequest.comments || originalRequest.comments.length === 0) return;

        let needsUpdate = false;
        
        const updatedComments = originalRequest.comments.map(comment => {
            if (!comment.readBy?.includes(currentUserProfile.uid)) {
                needsUpdate = true;
                return { ...comment, readBy: [...(comment.readBy || []), currentUserProfile.uid] };
            }
            return comment;
        });

        if (needsUpdate) {
            const updatedRequest = { ...originalRequest, comments: updatedComments };
            const newProductionRequests = [...productionRequests];
            newProductionRequests[requestIndex] = updatedRequest;
            setProductionRequests(newProductionRequests);

            if (modal.view === 'productionRequestDetail' && modal.data?.id === requestId) {
                setModal(prev => ({...prev, data: updatedRequest}));
            }

            try {
                await db.collection('production-requests').doc(requestId).update({ comments: updatedComments });
            } catch (error) {
                console.error("Error marking comments as read:", error);
                setProductionRequests(productionRequests);
                 if (modal.view === 'productionRequestDetail' && modal.data?.id === requestId) {
                    setModal(prev => ({...prev, data: originalRequest}));
                }
                addToast({ message: "댓글 읽음 처리에 실패했습니다.", type: 'error' });
            }
        }
    }, [currentUserProfile, productionRequests, addToast, modal.view, modal.data]);
    
    const handleSaveProductionSchedules = useCallback(async (newSchedulesData: Omit<ProductionSchedule, 'id' | 'createdAt' | 'updatedAt'>[]) => {
        if (!currentUserProfile || currentUserProfile.role === 'Member') {
            addToast({ message: '일정을 저장할 권한이 없습니다.', type: 'error' });
            return;
        }
        addToast({ message: '생산 일정을 업데이트하는 중...', type: 'info' });
    
        const uniqueDates = [...new Set(newSchedulesData.map(s => s.planDate))];
        if (uniqueDates.length === 0) {
            addToast({ message: '저장할 데이터가 없습니다.', type: 'info' });
            return;
        }
    
        try {
            const schedulesToDeleteRefs: any[] = [];
            // Firestore 'in' queries are limited to 30 values.
            const dateChunks: string[][] = [];
            for (let i = 0; i < uniqueDates.length; i += 30) {
                dateChunks.push(uniqueDates.slice(i, i + 30));
            }

            for (const chunk of dateChunks) {
                const querySnapshot = await db.collection('production-schedules').where('planDate', 'in', chunk).get();
                querySnapshot.forEach(doc => schedulesToDeleteRefs.push(doc.ref));
            }
            
            const batch = db.batch();

            schedulesToDeleteRefs.forEach(ref => batch.delete(ref));

            newSchedulesData.forEach((schedule, index) => {
                const newSchedulePayload: Omit<ProductionSchedule, 'id'> = {
                    ...schedule,
                    orderIndex: index,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                const newDocRef = db.collection('production-schedules').doc();
                batch.set(newDocRef, newSchedulePayload);
            });
            
            await batch.commit();
            addToast({ message: '생산 일정이 성공적으로 업데이트되었습니다.', type: 'success' });
        } catch (error) {
            console.error("Error saving production schedules:", error);
            addToast({ message: '생산 일정 업데이트에 실패했습니다.', type: 'error' });
        }
    }, [addToast, currentUserProfile]);

    const handleDeleteProductionSchedule = useCallback(async (scheduleId: string) => {
        if (!currentUserProfile || currentUserProfile.role === 'Member') {
            addToast({ message: '삭제 권한이 없습니다.', type: 'error' });
            return;
        }
        try {
            await db.collection('production-schedules').doc(scheduleId).delete();
            addToast({ message: '일정이 삭제되었습니다.', type: 'success' });
        } catch (error) {
            console.error('Error deleting schedule:', error);
            addToast({ message: '일정 삭제에 실패했습니다.', type: 'error' });
        }
    }, [addToast, currentUserProfile]);

    const handleDeleteProductionSchedulesByDate = useCallback(async (date: string) => {
        if (!currentUserProfile || currentUserProfile.role === 'Member') {
            addToast({ message: '삭제 권한이 없습니다.', type: 'error' });
            return;
        }
        addToast({ message: `${date}의 일정을 삭제하는 중...`, type: 'info' });
        try {
            const querySnapshot = await db.collection('production-schedules').where('planDate', '==', date).get();
            if (querySnapshot.empty) {
                addToast({ message: '삭제할 일정이 없습니다.', type: 'info' });
                return;
            }
            const batch = db.batch();
            querySnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            addToast({ message: `${date}의 일정이 삭제되었습니다.`, type: 'success' });
        } catch (error) {
            console.error('Error deleting schedules by date:', error);
            addToast({ message: '일정 삭제에 실패했습니다.', type: 'error' });
        }
    }, [addToast, currentUserProfile]);

    const handleSaveOrders = useCallback(async (newOrdersData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>[]) => {
        if (!currentUserProfile || currentUserProfile.role === 'Member') {
            addToast({ message: '수주를 저장할 권한이 없습니다.', type: 'error' });
            return;
        }
        addToast({ message: '수주 목록을 업데이트하는 중...', type: 'info' });

        const uniqueDates = [...new Set(newOrdersData.map(o => o.orderDate))];
        if (uniqueDates.length === 0) {
            addToast({ message: '저장할 데이터가 없습니다.', type: 'info' });
            return;
        }

        try {
            const ordersToDeleteRefs: any[] = [];
            // Firestore 'in' queries are limited to 30 values.
            const dateChunks: string[][] = [];
            for (let i = 0; i < uniqueDates.length; i += 30) {
                dateChunks.push(uniqueDates.slice(i, i + 30));
            }

            for (const chunk of dateChunks) {
                const querySnapshot = await db.collection('orders').where('orderDate', 'in', chunk).get();
                querySnapshot.forEach(doc => ordersToDeleteRefs.push(doc.ref));
            }
            
            const batch = db.batch();

            ordersToDeleteRefs.forEach(ref => batch.delete(ref));
            
            newOrdersData.forEach((order, index) => {
                const newOrderPayload: Omit<Order, 'id'> = {
                    ...order,
                    orderIndex: index,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                const newDocRef = db.collection('orders').doc();
                batch.set(newDocRef, newOrderPayload);
            });

            await batch.commit();
            addToast({ message: '수주 목록이 성공적으로 업데이트되었습니다.', type: 'success' });
        } catch (error) {
            console.error('Error saving orders:', error);
            addToast({ message: '수주 목록 업데이트에 실패했습니다.', type: 'error' });
        }
    }, [addToast, currentUserProfile]);


  if (isAuthLoading || (user && !currentUserProfile && !isLoading)) {
      return (
          <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
              <LoadingSpinner />
          </div>
      );
  }

  if (!user) {
      return <LoginPage addToast={addToast} />;
  }

  const renderJigContent = () => {
    switch(activeMenu) {
        case 'dashboard':
            return <Dashboard requests={requests} notifications={notifications} onNotificationClick={handleNotificationClick} onSelectRequest={handleSelectRequest} />;
        case 'ledger':
            return <ManagementLedger requests={requests} onSelectRequest={handleSelectRequest} theme={theme} masterData={masterData} onShowNewRequestForm={handleShowNewRequestForm} />;
        case 'jigList':
            return <JigMasterList theme={theme} addToast={addToast} jigs={jigs} autocompleteRequests={requests} onSelectJig={handleSelectJigMasterItem} onAddNewJig={handleOpenJigRegistrationForm} currentUserProfile={currentUserProfile} />;
        case 'master':
            return <MasterDataManagement theme={theme} masterData={masterData} onAddMasterData={handleAddMasterData} onEditMasterDataItem={handleEditMasterDataItem} onDeleteMasterDataItem={onDeleteMasterDataItem} currentUserProfile={currentUserProfile} />;
        default:
            return <Dashboard requests={requests} notifications={notifications} onNotificationClick={handleNotificationClick} onSelectRequest={handleSelectRequest} />;
    }
  }

  const renderActiveCenter = () => {
      if (searchQuery) {
          return <IntegratedSearchResults 
              query={searchQuery}
              onClearSearch={() => setSearchQuery(null)}
              jigRequests={requests}
              sampleRequests={sampleRequests}
              inspections={qualityInspections}
              jigs={jigs}
              onSelectJigRequest={handleSelectRequest}
              onSelectSampleRequest={(req) => { selectCenterWithHistory('sample'); openModalWithHistory('detail', req); }}
              onSelectJigMaster={handleSelectJigMasterItem}
          />
      }
      switch(activeCenter) {
          case 'home':
              return <HomeScreen onSelectCenter={handleSelectCenter} onSearchSubmit={handleSearchSubmit} notifications={notifications} onNotificationClick={handleNotificationClick} />;
          case 'jig':
              return <div className="p-2 sm:p-4 flex flex-col"><Navigation activeMenu={activeMenu} onSelect={setActiveMenu} currentUserProfile={currentUserProfile} /><div className="mt-4 flex-1 overflow-hidden">{renderJigContent()}</div></div>;
          case 'quality':
              return <QualityControlCenter theme={theme} setTheme={handleSetTheme} currentUserProfile={currentUserProfile} addToast={addToast} removeToast={removeToast} removeAllProgressToasts={removeAllProgressToasts} deepLinkOrderNumber={qualityDeepLink} onDeepLinkHandled={() => setQualityDeepLink(null)} onUpdateInspection={handleUpdateQualityInspection} onDeleteInspectionGroup={handleDeleteInspectionGroup} onAddComment={handleAddQualityComment}/>;
          case 'work':
              return <div className="p-2 sm:p-4"><WorkPerformanceCenter addToast={addToast} currentUserProfile={currentUserProfile} productionRequests={productionRequests} onOpenNewProductionRequest={handleOpenNewProductionRequest} onSelectProductionRequest={handleSelectProductionRequest} productionSchedules={productionSchedules} onSaveProductionSchedules={handleSaveProductionSchedules} onDeleteProductionSchedule={handleDeleteProductionSchedule} onDeleteProductionSchedulesByDate={handleDeleteProductionSchedulesByDate} orders={orders} onSaveOrders={handleSaveOrders} /></div>;
          case 'sample':
              return <div className="p-2 sm:p-4"><SampleCenter addToast={addToast} currentUserProfile={currentUserProfile} sampleRequests={sampleRequests} onOpenNewRequest={() => openModalWithHistory('form')} onSelectRequest={(req) => openModalWithHistory('detail', req)} /></div>;
          case 'notification':
              return <div className="p-2 sm:p-4"><NotificationCenter notifications={notifications} onNotificationClick={handleNotificationClick} addToast={addToast} currentUserProfile={currentUserProfile} /></div>;
          case 'calculator':
              return <div className="p-2 sm:p-4"><FormulationCalculator /></div>;
          case 'management':
              return <div className="p-2 sm:p-4"><ManagementCenter qualityInspections={qualityInspections} sampleRequests={sampleRequests} packagingReports={packagingReports} addToast={addToast}/></div>;
          case 'settings':
              return <div className="p-2 sm:p-4"><Settings theme={theme} setTheme={handleSetTheme} currentUserProfile={currentUserProfile} /></div>;
          case 'guide':
              return <div className="p-2 sm:p-4"><AppGuide onClose={() => selectCenterWithHistory('home')} /></div>;
          default:
              return <HomeScreen onSelectCenter={handleSelectCenter} onSearchSubmit={handleSearchSubmit} notifications={notifications} onNotificationClick={handleNotificationClick} />;
      }
  };

  const getModalTitle = () => {
      switch(modal.view) {
          case 'requestDetail': return `지그 요청 상세 (ID: ${modal.data?.id})`;
          case 'requestForm': return modal.data ? '지그 요청 수정' : '신규 지그 요청';
          case 'jigDetail': return '지그 마스터 상세';
          case 'jigForm': return '신규 지그 등록';
          case 'detail': return `샘플 요청 상세 (ID: ${modal.data?.id})`;
          case 'form': return modal.data ? '샘플 요청 수정' : '신규 샘플 요청';
          case 'productionRequestForm': return modal.data ? '생산 요청 수정' : '신규 생산 요청';
          case 'productionRequestDetail': return `생산 요청 상세 (ID: ${modal.data?.id})`;
          default: return '정보';
      }
  }

  const renderModalContent = () => {
    switch (modal.view) {
      case 'requestDetail':
        return <RequestDetail request={modal.data} onStatusUpdate={handleStatusUpdate} onEdit={handleShowEditRequestForm} onDelete={handleDeleteRequest} onReceiveItems={handleReceiveItems} onAddComment={handleAddComment} addToast={addToast} currentUserProfile={currentUserProfile} />;
      case 'requestForm':
        return <RequestForm onSave={handleSaveRequest} onCancel={handleCloseModal} existingRequest={modal.data} masterData={masterData} />;
      case 'jigDetail':
        return <JigMasterDetail jig={modal.data} onSave={handleUpdateJigMasterItem} onDelete={handleDeleteJigMasterItem} currentUserProfile={currentUserProfile} addToast={addToast} />;
      case 'jigForm':
        return <JigRegistrationForm isOpen={true} onSave={handleSaveJigMasterItem} onClose={handleCloseModal} autocompleteData={{ itemNames: [...new Set(jigs.map(j => j.itemName))], partNames: [...new Set(jigs.map(j => j.partName))], itemNumbers: [...new Set(jigs.map(j => j.itemNumber))] }} />;
      case 'detail': // Sample Request Detail
        return <SampleRequestDetail request={modal.data} currentUserProfile={currentUserProfile} onUpdateStatus={handleUpdateSampleRequestStatus} onDelete={handleDeleteSampleRequest} onAddComment={handleAddSampleComment} onUploadImage={handleUploadSampleImage} addToast={addToast} onEdit={(req) => openModalWithHistory('form', req)} onUpdateWorkData={handleUpdateSampleWorkData} />;
      case 'form': // Sample Request Form
        return <SampleRequestForm onSave={handleSaveSampleRequest} onCancel={handleCloseModal} existingRequest={modal.data} addToast={addToast} />;
      case 'productionRequestForm':
        return <ProductionRequestForm onSave={handleSaveProductionRequest} onCancel={handleCloseModal} currentUserProfile={currentUserProfile} existingRequest={modal.data} />;
      case 'productionRequestDetail':
        return <ProductionRequestDetail request={modal.data} currentUserProfile={currentUserProfile} onStatusUpdate={handleUpdateProductionRequestStatus} onDelete={handleDeleteProductionRequest} onAddComment={handleAddProductionRequestComment} onEdit={handleShowEditProductionRequestForm} onMarkCommentsAsRead={handleMarkProductionRequestCommentsAsRead} addToast={addToast}/>;
      default:
        return null;
    }
  };

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[200] flex items-center justify-center">
            <LoadingSpinner />
        </div>
      )}
      <div className="h-full w-full flex flex-col">
        {activeCenter !== 'home' && !searchQuery && (
            <MainHeader
                activeCenter={activeCenter}
                onSelectCenter={handleSelectCenter}
                unreadCounts={unreadCountsByCenter}
                userProfile={currentUserProfile}
                onLogout={handleLogout}
                isNotificationPanelOpen={isNotificationPanelOpen}
                onToggleNotificationPanel={() => setIsNotificationPanelOpen(prev => !prev)}
                unreadCount={unreadCount}
                notificationButtonRef={notificationButtonRef}
                notifications={notifications}
                notificationPanelRef={notificationPanelRef}
                onNotificationClickFromPanel={handleNotificationClickFromPanel}
                onMarkAllAsRead={markAllNotificationsAsRead}
                onViewAll={() => { handleSelectCenter('notification'); setIsNotificationPanelOpen(false); }}
            />
        )}
        <div className="flex-1 overflow-y-auto">
            {renderActiveCenter()}
        </div>
      </div>

      <FullScreenModal
          isOpen={modal.view !== null}
          onClose={handleCloseModal}
          title={getModalTitle()}
      >
        {renderModalContent()}
      </FullScreenModal>
      
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
};