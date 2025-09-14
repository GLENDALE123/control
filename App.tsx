
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { JigRequest, Status, Comment, MasterData, Requester, Destination, Approver, Notification, JigMasterItem, UserProfile, UserRole, QualityInspection, HistoryEntry, SampleRequest, SampleStatus, ActiveCenter, PackagingReport, ProductionRequest, ProductionRequestStatus, ProductionRequestType, ProductionSchedule } from './types';
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


import { db, storage, auth } from './firebaseConfig';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';


type ActiveMenu = 'dashboard' | 'ledger' | 'jigList' | 'master';
type Theme = 'light' | 'dark';
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
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

const ToastComponent: React.FC<{ message: string; type: ToastType; onRemove: () => void }> = ({ message, type, onRemove }) => {
    const bgColor = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
    }[type];

    const icon = {
        success: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        error: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        info: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    };

    return (
        <div className={`flex items-center ${bgColor} text-white py-3 px-4 rounded-lg shadow-lg animate-toast-in`}>
            <div className="mr-3">{icon[type]}</div>
            <div className="flex-1">{message}</div>
            <button onClick={onRemove} className="ml-4 text-xl font-semibold">&times;</button>
        </div>
    );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: number) => void }> = ({ toasts, onRemove }) => {
    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] space-y-2 w-full max-w-sm">
            {toasts.map(toast => (
                <ToastComponent key={toast.id} message={toast.message} type={toast.type} onRemove={() => onRemove(toast.id)} />
            ))}
        </div>
    );
};

const App: React.FC = () => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [requests, setRequests] = useState<JigRequest[]>([]);
  const [sampleRequests, setSampleRequests] = useState<SampleRequest[]>([]);
  const [productionRequests, setProductionRequests] = useState<ProductionRequest[]>([]);
  const [productionSchedules, setProductionSchedules] = useState<ProductionSchedule[]>([]);
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

  const addToast = useCallback((toast: { message: string; type: ToastType }) => {
    const id = Date.now() + Math.random();
    setToasts(prevToasts => [...prevToasts, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, [removeToast]);

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
        return;
    }
    setIsLoading(true);
    let loadedCount = 0;
    const totalToLoad = 9; // requests, masterData, jigs, notifications, sampleRequests, quality, packaging, productionRequests, productionSchedules
    const checkAllLoaded = () => {
        loadedCount++;
        if (loadedCount >= totalToLoad) {
            setIsLoading(false);
        }
    }

    const unsubscribeRequests = db.collection('jig-requests').orderBy('requestDate', 'desc').limit(500)
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

    const unsubscribeSampleRequests = db.collection('sample-requests').orderBy('createdAt', 'desc').limit(500)
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

    const unsubscribeProductionRequests = db.collection('production-requests').orderBy('createdAt', 'desc').limit(500)
      .onSnapshot((querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProductionRequest));
        setProductionRequests(data);
        checkAllLoaded();
      }, (error) => {
        console.error("Error fetching production requests:", error);
        addToast({ message: '생산 요청 데이터를 불러오는 데 실패했습니다.', type: 'error' });
        checkAllLoaded();
      });
    
    const unsubscribeProductionSchedules = db.collection('production-schedules').orderBy('planDate', 'desc').limit(500)
      .onSnapshot((querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProductionSchedule));
        setProductionSchedules(data);
        checkAllLoaded();
      }, (error) => {
        console.error("Error fetching production schedules:", error);
        addToast({ message: '생산일정 데이터를 불러오는 데 실패했습니다.', type: 'error' });
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

    const unsubscribeQuality = db.collection('quality-inspections').orderBy('createdAt', 'desc').limit(500)
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

    const unsubscribePackaging = db.collection('packaging-reports').orderBy('workDate', 'desc').limit(500)
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
    
    const unsubscribeSettings = db.collection('settings').doc('singleton').onSnapshot((docSnap) => {
        if (docSnap.exists) {
            const settingsData = docSnap.data();
            if (settingsData?.globalTheme) setTheme(settingsData.globalTheme);
        }
    }, (error) => {
        console.error("Error fetching settings:", error);
        addToast({ message: '설정 정보를 불러오는 데 실패했습니다.', type: 'error' });
    });

    return () => {
        unsubscribeRequests();
        unsubscribeMasterData();
        unsubscribeSettings();
        unsubscribeJigs();
        unsubscribeNotifications();
        unsubscribeSampleRequests();
        unsubscribeQuality();
        unsubscribePackaging();
        unsubscribeProductionRequests();
        unsubscribeProductionSchedules();
    };
}, [user, addToast]);

  const handleSetTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    db.collection('settings').doc('singleton').set({ globalTheme: newTheme }, { merge: true })
      .catch(error => {
          console.error("Error saving theme setting:", error);
          addToast({ message: '테마 설정 저장에 실패했습니다.', type: 'error' });
      });
  }, [addToast]);

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
                        const metadata = {
                            contentType: file.type || 'image/jpeg',
                            cacheControl: 'public,max-age=31536000',
                        };
                        const snapshot = await imageRef.put(file, metadata);
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
    images: File[],
    existingImages?: string[]
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
            // 기존 이미지와 새 이미지 처리
            let finalImageUrls = existingImages || editingRequest.imageUrls || [];
            
            // 새로 추가할 이미지 업로드
            if (images.length > 0) {
                try {
                    addToast({ message: "새 이미지 업로드 중...", type: 'info' });
                    const newImageUrls = await Promise.all(
                        images.map(file => {
                            const ref = storage.ref(`sample-request-images/${editingRequest.id}/${Date.now()}-${file.name}`);
                            const metadata = {
                                contentType: file.type || 'image/jpeg',
                                cacheControl: 'public,max-age=31536000',
                            };
                            return ref.put(file, metadata).then(snapshot => snapshot.ref.getDownloadURL());
                        })
                    );
                    finalImageUrls = [...finalImageUrls, ...newImageUrls];
                } catch (imageError) {
                    console.error("새 이미지 업로드 실패:", imageError);
                    addToast({ message: "새 이미지 업로드에 실패했습니다.", type: "error" });
                    throw imageError;
                }
            }
            
            await requestRef.update({
                ...data,
                imageUrls: finalImageUrls,
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
            
            // 이미지 업로드 처리
            let imageUrls: string[] = [];
            if (images.length > 0) {
                try {
                    addToast({ message: "이미지 업로드 중...", type: 'info' });
                    imageUrls = await Promise.all(
                        images.map(file => {
                            const ref = storage.ref(`sample-request-images/${newId}/${Date.now()}-${file.name}`);
                            const metadata = {
                                contentType: file.type || 'image/jpeg',
                                cacheControl: 'public,max-age=31536000',
                            };
                            return ref.put(file, metadata).then(snapshot => snapshot.ref.getDownloadURL());
                        })
                    );
                    
                    // 이미지 URL을 DB에 업데이트
                    await db.collection('sample-requests').doc(newId).update({ imageUrls });
                } catch (imageError) {
                    console.error("이미지 업로드 실패:", imageError);
                    // 이미지 업로드 실패 시 전체 트랜잭션 롤백
                    await db.collection('sample-requests').doc(newId).delete();
                    addToast({ message: "이미지 업로드에 실패했습니다. 요청이 취소되었습니다.", type: "error" });
                    throw new Error("이미지 업로드 실패");
                }
            }
            
            // 알림 생성
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
            // 먼저 요청 데이터를 가져와서 이미지 URL 확인
            const requestDoc = await db.collection('sample-requests').doc(id).get();
            const requestData = requestDoc.data();
            
            // DB에서 요청 삭제
            await db.collection('sample-requests').doc(id).delete();
            
            // Firebase Storage에서 이미지들 삭제
            if (requestData?.imageUrls && Array.isArray(requestData.imageUrls)) {
                const deletePromises = requestData.imageUrls.map((imageUrl: string) => {
                    try {
                        const imageRef = storage.refFromURL(imageUrl);
                        return imageRef.delete();
                    } catch (error) {
                        console.warn('이미지 삭제 실패:', imageUrl, error);
                        return Promise.resolve(); // 개별 이미지 삭제 실패는 무시
                    }
                });
                
                await Promise.all(deletePromises);
            }
            
            addToast({ message: '요청과 이미지가 삭제되었습니다.', type: 'success' });
            handleCloseModal();
        } catch (error) {
            console.error('삭제 중 오류:', error);
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
            const metadata = {
                contentType: file.type || 'image/jpeg',
                cacheControl: 'public,max-age=31536000',
            };
            const snapshot = await ref.put(file, metadata);
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
                setModal(prev => ({...prev, data: originalRequest}));
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
        data: Omit<ProductionRequest, 'id' | 'createdAt' | 'author' | 'status' | 'history' | 'comments' | 'quantity'> & { quantity: string }
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
                    };
                    
                    transaction.set(newRequestRef, newRequestPayload);
                    transaction.set(counterRef, { count: newCount });
                    
                    return generatedId;
                });
                
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
        
        try {
            await db.collection('production-requests').doc(id).update({
                comments: firebase.firestore.FieldValue.arrayUnion(newComment)
            });
            addToast({ message: '댓글이 추가되었습니다.', type: 'success' });
        } catch (error) {
            console.error("Error adding production request comment:", error);
            addToast({ message: "댓글 추가에 실패했습니다.", type: "error" });
        }
    }, [addToast, currentUserProfile, productionRequests]);
    
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
            // FIX: transaction.get() with a Query parameter is not supported in the Firestore SDK version being used.
            // The query to find documents for deletion is performed outside the transaction.
            // This resolves the TypeScript errors on lines 1601 and 1602.
            const schedulesToDeleteRefs: firebase.firestore.DocumentReference[] = [];
            const CHUNK_SIZE = 30; // Firestore 'in' query limit
    
            for (let i = 0; i < uniqueDates.length; i += CHUNK_SIZE) {
                const dateChunk = uniqueDates.slice(i, i + CHUNK_SIZE);
                const query = db.collection('production-schedules').where('planDate', 'in', dateChunk);
                const snapshot = await query.get();
                snapshot.docs.forEach(doc => {
                    schedulesToDeleteRefs.push(doc.ref);
                });
            }
    
            await db.runTransaction(async (transaction) => {
                schedulesToDeleteRefs.forEach(ref => {
                    transaction.delete(ref);
                });
    
                newSchedulesData.forEach(scheduleItem => {
                    const newDocRef = db.collection('production-schedules').doc();
                    const now = new Date().toISOString();
                    const newSchedule: Omit<ProductionSchedule, 'id'> = {
                        ...scheduleItem,
                        createdAt: now,
                        updatedAt: now,
                    };
                    transaction.set(newDocRef, newSchedule);
                });
            });
    
            addToast({ message: '생산 일정이 성공적으로 업데이트되었습니다.', type: 'success' });
        } catch (error) {
            console.error("Error saving production schedules:", error);
            addToast({ message: '일정 업데이트에 실패했습니다.', type: 'error' });
            throw error;
        }
    }, [addToast, currentUserProfile]);

    const handleDeleteProductionSchedule = useCallback(async (scheduleId: string) => {
        if (!currentUserProfile || currentUserProfile.role === 'Member') {
            addToast({ message: '일정을 삭제할 권한이 없습니다.', type: 'error' });
            return;
        }
        addToast({ message: '생산 일정을 삭제하는 중...', type: 'info' });
        try {
            await db.collection('production-schedules').doc(scheduleId).delete();
            addToast({ message: '생산 일정이 성공적으로 삭제되었습니다.', type: 'success' });
        } catch (error) {
            console.error("Error deleting production schedule:", error);
            addToast({ message: '일정 삭제에 실패했습니다.', type: 'error' });
            throw error;
        }
    }, [addToast, currentUserProfile]);

  const renderJigContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard 
                  requests={requests}
                  notifications={notifications.filter(n => n.type === 'jig')}
                  onNotificationClick={handleNotificationClick}
                  onSelectRequest={handleSelectRequest}
                />;
      case 'ledger':
        return <ManagementLedger 
                  requests={requests} 
                  onSelectRequest={handleSelectRequest} 
                  theme={theme} 
                  masterData={masterData}
                  onShowNewRequestForm={handleShowNewRequestForm}
                />;
      case 'jigList':
        return <JigMasterList theme={theme} addToast={addToast} autocompleteRequests={requests} jigs={jigs} onSelectJig={handleSelectJigMasterItem} onAddNewJig={handleOpenJigRegistrationForm} currentUserProfile={currentUserProfile} />;
      case 'master':
        return <MasterDataManagement theme={theme} masterData={masterData} onAddMasterData={handleAddMasterData} onEditMasterDataItem={handleEditMasterDataItem} onDeleteMasterDataItem={onDeleteMasterDataItem} currentUserProfile={currentUserProfile} />;
      default:
        return <div className="text-center p-8">선택된 메뉴가 없습니다.</div>;
    }
  };
  
  const getModalTitle = () => {
    switch (modal.view) {
        case 'requestForm': return modal.data ? '요청 수정' : '신규 요청 작성';
        case 'form': return modal.data ? '샘플 요청 수정' : '신규 샘플 요청';
        case 'productionRequestForm': return modal.data ? '요청서 수정' : '요청서 등록';
        case 'productionRequestDetail': return '생산 요청 상세 정보';
        case 'requestDetail': return '요청 상세 정보';
        case 'detail': return '샘플 요청 상세';
        case 'jigForm': return '신규 지그 등록';
        case 'jigDetail': return '지그 상세 정보';
        default: return '';
    }
  };

  const autocompleteJigData = useMemo(() => ({
      itemNames: [...new Set(requests.map(r => r.itemName).filter(Boolean))],
      partNames: [...new Set(requests.map(r => r.partName).filter(Boolean))],
      itemNumbers: [...new Set(requests.map(r => r.itemNumber).filter(Boolean))],
  }), [requests]);

  const handleShowNewSampleRequestForm = useCallback(() => {
    openModalWithHistory('form');
  }, [openModalWithHistory]);

  const handleSelectSampleRequest = useCallback((request: SampleRequest) => {
    openModalWithHistory('detail', request);
  }, [openModalWithHistory]);

  const handleShowEditSampleRequestForm = useCallback((request: SampleRequest) => {
    openModalWithHistory('form', request);
  }, [openModalWithHistory]);
  
  if (isAuthLoading || (user && !currentUserProfile)) {
    return (
        <div className="bg-slate-100 dark:bg-slate-900 h-screen">
            <LoadingSpinner />
        </div>
    )
  }
  
  if (!user) {
    return <LoginPage addToast={addToast} />;
  }

  if (isLoading) {
      return (
        <div className="bg-slate-100 dark:bg-slate-900 h-screen">
            <LoadingSpinner />
        </div>
    )
  }
  
  const navItems: { id: ActiveCenter, label: string }[] = [
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

  const renderActiveCenter = () => {
    switch(activeCenter) {
      case 'home':
        return <HomeScreen
            onSelectCenter={handleSelectCenter}
            onSearchSubmit={handleSearchSubmit}
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
        />;
      case 'management':
        return <main className="flex-1 overflow-auto p-2 sm:p-4"><ManagementCenter qualityInspections={qualityInspections} sampleRequests={sampleRequests} packagingReports={packagingReports} addToast={addToast} /></main>;
      case 'jig':
        return (
            <>
                <Navigation
                  activeMenu={activeMenu}
                  onSelect={setActiveMenu}
                  currentUserProfile={currentUserProfile}
                />
                <main className="flex-1 overflow-auto p-2 sm:p-4 flex flex-col">
                    <div className="flex-1 overflow-hidden">
                        {renderJigContent()}
                    </div>
                </main>
            </>
        );
      case 'quality':
        return <QualityControlCenter 
                theme={theme}
                setTheme={handleSetTheme}
                currentUserProfile={currentUserProfile}
                addToast={addToast}
                deepLinkOrderNumber={qualityDeepLink}
                onDeepLinkHandled={() => setQualityDeepLink(null)}
                onUpdateInspection={handleUpdateQualityInspection}
                onDeleteInspectionGroup={handleDeleteInspectionGroup}
                onAddComment={handleAddQualityComment}
            />;
      case 'calculator':
        return <main className="flex-1 overflow-auto p-2 sm:p-4"><FormulationCalculator /></main>;
      case 'notification':
        return <main className="flex-1 overflow-auto p-2 sm:p-4"><NotificationCenter notifications={notifications} onNotificationClick={handleNotificationClick} addToast={addToast} currentUserProfile={currentUserProfile} /></main>;
      case 'work':
        return <main className="flex-1 overflow-auto p-2 sm:p-4"><WorkPerformanceCenter addToast={addToast} currentUserProfile={currentUserProfile} productionRequests={productionRequests} onOpenNewProductionRequest={handleOpenNewProductionRequest} onSelectProductionRequest={handleSelectProductionRequest} productionSchedules={productionSchedules} onSaveProductionSchedules={handleSaveProductionSchedules} onDeleteProductionSchedule={handleDeleteProductionSchedule} /></main>;
      case 'sample':
        return <main className="flex-1 overflow-auto p-2 sm:p-4"><SampleCenter addToast={addToast} currentUserProfile={currentUserProfile} sampleRequests={sampleRequests} onOpenNewRequest={handleShowNewSampleRequestForm} onSelectRequest={handleSelectSampleRequest} /></main>;
      case 'settings':
        return <main className="flex-1 overflow-auto p-2 sm:p-4"><Settings theme={theme} setTheme={handleSetTheme} currentUserProfile={currentUserProfile} /></main>;
      case 'guide':
        return <main className="flex-1 overflow-auto p-2 sm:p-4"><AppGuide onClose={() => handleSelectCenter('home')} /></main>;
      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col h-full font-sans bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200`}>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        
        {activeCenter !== 'home' && searchQuery === null && (
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-30 shadow-sm flex-shrink-0 pt-2">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <button onClick={() => handleSelectCenter('home')} className="flex items-center space-x-2 group">
                                <AppIcon className="w-8 h-8 transition-transform group-hover:scale-110" />
                                <span className="text-lg font-bold text-gray-800 dark:text-white hidden sm:inline">T.M.S</span>
                            </button>
                            <div className="hidden md:flex items-center space-x-2 overflow-x-auto scrollbar-hide">
                                {navItems.map(item => (
                                    <button key={item.id} onClick={() => handleSelectCenter(item.id)} className={`relative px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeCenter === item.id ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'}`}>
                                        {item.label}
                                        {unreadCountsByCenter[item.id] > 0 && (
                                            <span className="absolute top-1 right-1 block w-2 h-2 bg-red-500 rounded-full"></span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-x-4">
                            <div className="relative">
                                <button
                                    ref={notificationButtonRef}
                                    onClick={() => setIsNotificationPanelOpen(prev => !prev)}
                                    className="relative p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                                    aria-label="알림"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 block w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900/80"></span>
                                    )}
                                </button>
                                {isNotificationPanelOpen && (
                                    <NotificationPanel
                                        ref={notificationPanelRef}
                                        notifications={notifications}
                                        onNotificationClick={handleNotificationClickFromPanel}
                                        onMarkAllAsRead={markAllNotificationsAsRead}
                                        onClose={() => setIsNotificationPanelOpen(false)}
                                        onViewAll={() => {
                                            handleSelectCenter('notification');
                                            setIsNotificationPanelOpen(false);
                                        }}
                                    />
                                )}
                             </div>
                             <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary-200 dark:bg-primary-700 flex items-center justify-center font-bold text-primary-700 dark:text-primary-200 text-sm">
                                    {currentUserProfile?.displayName.charAt(0)}
                                </div>
                                <span className="text-sm font-semibold hidden sm:inline">{currentUserProfile?.displayName}</span>
                            </div>
                            <button onClick={handleLogout} title="로그아웃" className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
             {searchQuery !== null ? (
                <IntegratedSearchResults
                    query={searchQuery}
                    onClearSearch={() => setSearchQuery(null)}
                    jigRequests={requests}
                    sampleRequests={sampleRequests}
                    inspections={qualityInspections}
                    jigs={jigs}
                    onSelectJigRequest={handleSelectRequest}
                    onSelectSampleRequest={handleSelectSampleRequest}
                    onSelectJigMaster={handleSelectJigMasterItem}
                />
            ) : (
                renderActiveCenter()
            )}
        </div>
                
        <FullScreenModal
            isOpen={modal.view !== null}
            onClose={handleCloseModal}
            title={getModalTitle()}
        >
            {modal.view === 'requestForm' && (
                <RequestForm onSave={handleSaveRequest} onCancel={handleCloseModal} existingRequest={modal.data} masterData={masterData} />
            )}
            {modal.view === 'form' && (
                <SampleRequestForm onSave={handleSaveSampleRequest} onCancel={handleCloseModal} existingRequest={modal.data} addToast={addToast} />
            )}
            {modal.view === 'productionRequestForm' && (
                <ProductionRequestForm onSave={handleSaveProductionRequest} onCancel={handleCloseModal} currentUserProfile={currentUserProfile} existingRequest={modal.data} />
            )}
            {modal.view === 'productionRequestDetail' && modal.data && (
                <ProductionRequestDetail
                    request={modal.data}
                    currentUserProfile={currentUserProfile}
                    onStatusUpdate={handleUpdateProductionRequestStatus}
                    onAddComment={handleAddProductionRequestComment}
                    onDelete={handleDeleteProductionRequest}
                    onEdit={handleShowEditProductionRequestForm}
                    onMarkCommentsAsRead={handleMarkProductionRequestCommentsAsRead}
                />
            )}
            {modal.view === 'requestDetail' && modal.data && ['jig'].includes(modal.data?.type || 'jig') && (
                <RequestDetail request={modal.data} onStatusUpdate={handleStatusUpdate} onEdit={handleShowEditRequestForm} onDelete={handleDeleteRequest} onReceiveItems={handleReceiveItems} onAddComment={handleAddComment} addToast={addToast} currentUserProfile={currentUserProfile} />
            )}
             {modal.view === 'detail' && modal.data && Object.values(SampleStatus).includes((modal.data as any).status) && (
                <SampleRequestDetail request={modal.data} currentUserProfile={currentUserProfile} onUpdateStatus={handleUpdateSampleRequestStatus} onDelete={handleDeleteSampleRequest} onAddComment={handleAddSampleComment} onUploadImage={handleUploadSampleImage} addToast={addToast} onEdit={handleShowEditSampleRequestForm} onUpdateWorkData={handleUpdateSampleWorkData} />
            )}
            {modal.view === 'jigForm' && (
                <JigRegistrationForm isOpen={true} onClose={handleCloseModal} onSave={handleSaveJigMasterItem} autocompleteData={autocompleteJigData} />
            )}
            {modal.view === 'jigDetail' && modal.data && (
                <JigMasterDetail jig={modal.data} onSave={handleUpdateJigMasterItem} onDelete={handleDeleteJigMasterItem} currentUserProfile={currentUserProfile} addToast={addToast} />
            )}
        </FullScreenModal>
       
        <style>{`
            @keyframes fade-in-down {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-down {
              animation: fade-in-down 0.3s ease-out forwards;
            }
            @keyframes fade-in-up {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-up {
              animation: fade-in-up 0.5s ease-out forwards;
            }
            @keyframes toast-in {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-toast-in {
              animation: toast-in 0.3s ease-out forwards;
            }
        `}</style>
    </div>
  );
};

export default App;
