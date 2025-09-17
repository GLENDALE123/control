// FIX: Removed circular dependency by deleting self-import of enums.
// The enums are defined in this file and should be the single source of truth.

// FIX: Removed unused import of POST_PROCESSING_DEPARTMENTS.
export enum Status {
  Request = '요청',
  Hold = '보류',
  InProgress = '진행중',
  Receiving = '입고중',
  Rejected = '반려',
  Completed = '완료',
}

export enum SampleStatus {
  Received = '접수',
  InProgress = '진행중',
  Completed = '완료',
  OnHold = '보류',
  Rejected = '반려',
}

export enum ProductionRequestType {
  Urgent = '긴급건',
  Shortage = '부족분',
  SalesUrgent = '영업부 긴급요청',
  LogisticsTransfer = '물류이동',
  UrgentSample = '긴급샘플',
}

export enum ProductionRequestStatus {
  Requested = '요청',
  InProgress = '진행중',
  Hold = '보류',
  Completed = '완료',
  Rejected = '반려',
}

export interface HistoryEntry {
  status: Status | SampleStatus | string;
  date: string;
  user: string; // The person who made the change
  reason?: string;
}

export interface Comment {
  id: string;
  user: string;
  date: string;
  text: string;
  readBy?: string[];
}

export interface WorkCoat {
    conditions: string;
    remarks: string;
}

export interface SampleRequestItem {
  partName: string;
  colorSpec: string;
  quantity: number;
  postProcessing: string[];
  coatingMethod: string;
}

export interface SampleRequest {
  id: string; // S-YYYYMMDD-NNN
  createdAt: string;
  requesterInfo: {
    uid: string;
    displayName: string;
  };
  clientName: string;
  productName: string;
  items: SampleRequestItem[];
  dueDate: string;
  remarks: string;
  imageUrls: string[];
  status: SampleStatus;
  history: HistoryEntry[];
  comments: Comment[];
  requestDate: string;
  requesterName: string;
  contact: string;
  workData?: {
    undercoat?: WorkCoat;
    midcoat?: WorkCoat;
    topcoat?: WorkCoat;
    unitPrice?: number;
  };
}


export interface JigRequest {
  id: string; // Changed to string for format like '250724-001'
  requestDate: string;
  requestType: string;
  requester: string;
  destination: string;
  deliveryDate: string;
  itemName: string; // 제품명
  partName: string; // 부속명
  itemNumber: string; // 지그번호
  jigHandleLength?: number; // 지그손잡이길이
  specification: string; // 규격
  quantity: number; // 발주수량
  receivedQuantity: number; // 완료수량
  coreCost?: number; // 코어제작비
  unitPrice?: number; // 단가
  remarks: string;
  imageUrls?: string[];
  status: Status;
  history: HistoryEntry[];
  comments?: Comment[];
}

export interface ProductionRequest {
  id: string; // P-YYMMDD-NNN
  createdAt: string;
  author: {
    uid: string;
    displayName:string;
  };
  requester: string;
  requestType: ProductionRequestType;
  status: ProductionRequestStatus;
  orderNumber: string;
  productName: string;
  partName: string;
  supplier: string; // 발주처
  quantity: number;
  content: string; // 요청 내용
  history: HistoryEntry[];
  comments?: Comment[];
  imageUrls?: string[];
  sourceReportIds?: string[];
}

export interface ProductionSchedule {
    id: string;
    planDate: string; // 계획일자
    progress?: string; // 진행
    shipping?: string; // 출하
    line?: string; // 라인
    injection?: string; // 사출
    orderNumber?: string; // 발주번호
    client: string; // 발주처
    productName: string;
    partName: string;
    orderQuantity: number; // 발주
    specification?: string; // 사양
    postProcess?: string; // 후공정
    remarks: string; // 참고
    manager?: string; // 담당자
    domesticOrExport?: string; // 내/수
    jigUsed?: string; // 사용지그
    newOrRe?: string; // 신/재
    shortageQuantity: number; // 부족수량
    createdAt: string;
    updatedAt: string;
    orderIndex?: number;
}

export interface Order {
    id: string;
    orderDate: string;
    category?: string; // 분류
    orderNumber?: string;
    client: string;
    productName: string;
    partName?: string;
    orderQuantity: number;
    specification?: string;
    postProcess?: string;
    productionQuantity?: number;
    remainingQuantity?: number;
    progress?: string;
    sampleStatus?: string;
    shippingDate?: string;
    manager?: string;
    shippingType?: string;
    jigUsed?: string;
    registrationStatus?: string;
    lineType?: string;
    unitPrice?: number;
    orderAmount?: number;
    remarks?: string;
    createdAt: string;
    updatedAt: string;
    orderIndex?: number;
}

export type ViewMode = 'ledger' | 'form' | 'detail' | 'kanban' | 'app' | 'excel';

export interface Requester {
  name: string;
  department: string;
  contact: string;
  email: string;
}

export interface Destination {
  name: string;
  contactPerson: string;
  contact: string;
}

export interface Approver {
  name: string;
  department: string;
  contact: string;
  authority: string;
}

export interface MasterData {
  requesters: Requester[];
  destinations: Destination[];
  approvers: Approver[];
  requestTypes: string[];
}

export interface Notification {
  id: string;
  message: string;
  date: string;
  read: boolean;
  requestId: string;
  type: 'jig' | 'quality' | 'work' | 'sample';
}

export interface JigMasterItem {
  id: string;
  createdAt: string;
  requestType: string;
  itemName: string;
  partName: string;
  itemNumber: string;
  remarks: string;
  imageUrls?: string[];
  createdBy?: {
    uid: string;
    displayName: string;
  };
}

export type UserRole = 'Admin' | 'Manager' | 'Member';

// FIX: Export the ActiveCenter type to be used across components for center navigation.
export type ActiveCenter = 'home' | 'management' | 'notification' | 'work' | 'sample' | 'quality' | 'jig' | 'calculator' | 'settings' | 'guide';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface UserPreferences {
  theme?: 'light' | 'dark';
  notificationPrefs?: {
    announcements?: boolean;
    jig?: boolean;
    work?: boolean;
    quality?: boolean;
    sample?: boolean;
  };
}

export type InspectionType = 'incoming' | 'inProcess' | 'outgoing';
export type InspectionResult = '합격' | '불합격' | '한도대기' | '한도승인' | '반출';


export type WorkerResult = '합격' | '불합격';
export type DefectReason = '선별미흡' | '지문자국' | '취급불량' | '조건불량';

export interface WorkerInspectionData {
    name: string;
    totalInspected: number;
    defectQuantity: number;
    result: WorkerResult | '';
    defectReasons?: DefectReason[];
    directInputResult: string;
    action?: string;
    decisionMaker?: string;
}

export interface KeywordPair {
    process: string;
    defect: string;
}

export interface TestResultDetail {
    result: string;
    action?: string;
    decisionMaker?: string;
}

export interface ReliabilityReview {
    method: '투명테이프' | '616테이프' | 'AP방식테스트' | '';
    result: '양호' | '부분박리' | '박리' | '';
    action?: string;
    decisionMaker?: string;
}

export interface ProcessLineData {
  workLine?: string;
  lineSpeed?: string;
  lineConditions?: { type: '하도' | '상도'; value: string }[];
  lampUsage?: number[];
}

// 품질 검사 데이터 타입
export interface QualityInspection {
  id?: string;
  createdAt: string;
  inspector: string;
  inspectionType: InspectionType;
  sequentialId?: number;

  // 공통 필드
  inspectionDate?: string;
  orderNumber: string;
  supplier: string;
  productName: string;
  partName: string;
  orderQuantity: string;
  specification: string;
  postProcess: string;
  
  injectionCompany?: string;
  injectionMaterial?: string;
  injectionColor?: string;
  imageUrls?: string[];
  relatedOrderNumbers?: string[];

  // 수입검사 필드
  packagingInfo?: string;
  appearanceHistory?: string;
  functionHistory?: string;
  result?: InspectionResult;
  resultReason?: string;
  finalConsultationDept?: string;
  finalConsultationName?: string;
  finalConsultationRank?: string;

  // 공정검사 필드
  jigUsed?: string;
  jigUsed2?: string;
  internalJigLower?: string;
  internalJigUpper?: string;
  dryerUsed?: '사용' | '미사용' | '';
  flameTreatment?: '사용' | '미사용' | '';
  processLines?: ProcessLineData[];
  reliabilityTestResult?: TestResultDetail;
  colorCheckResult?: TestResultDetail;
  injectionPackaging?: string;
  postProcessPackaging?: string;
  preInspectionHistory?: string;
  inProcessInspectionHistory?: string;
  keywordPairs?: KeywordPair[];
  
  // 출하검사 필드
  workerCount?: string;
  reinspectionKeyword?: string;
  reinspectionContent?: string;
  workers?: WorkerInspectionData[];
  reliabilityReview?: ReliabilityReview;

  // 이력 및 댓글
  history?: HistoryEntry[];
  comments?: Comment[];
}

export interface GroupedInspectionData {
    orderNumber: string;
    productName: string;
    latestDate: string;
    incoming: QualityInspection[];
    inProcess: QualityInspection[];
    outgoing: QualityInspection[];
    history: HistoryEntry[];
    comments: Comment[];
    id?: string;
    common: {
        sequentialId?: number;
        orderNumber?: string;
        supplier?: string;
        productName?: string;
        partName?: string;
        injectionMaterial?: string;
        injectionColor?: string;
        orderQuantity?: string;
        specification?: string;
        postProcess?: string;
        workLine?: string;
        imageUrl?: string;
    };
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  imageUrl?: string;
  planStartDate?: string;
  planEndDate?: string;
  cooperationRequest?: string;
}

export interface WorkSchedule {
    id: string; // YYYY-MM-DD
    date: string; // YYYY-MM-DD
    type: string; 
    description: string;
}
export interface QualityIssue {
  id: string;
  orderNumber: string;
  supplier: string;
  productName: string;
  partName:string;
  issues: string[];
  createdAt: string;
  author: string;
  keywordPairs?: KeywordPair[];
  imageUrls?: string[];
}

export interface PackagedBox {
    boxNumber: string;
    type: '정상' | 'B급' | '구분출하' | '';
    quantity: number;
    reason?: string;
}

export interface ProcessCoat {
    conditions: string;
    remarks: string;
}

export interface PackagingReport {
    id: string;
    createdAt: string;
    workDate: string;
    author: {
        uid: string;
        displayName: string;
    };
    productionLine: string;
    orderNumbers: string[];
    supplier: string;
    productName: string;
    partName: string;
    orderQuantity?: number;
    specification: string;
    lineRatio: string;
    productionPerMinute?: number;
    uph?: number;
    inputQuantity?: number;
    goodQuantity?: number;
    defectQuantity?: number;
    personnelCount?: number;
    startTime: string;
    endTime: string;
    packagingUnit?: number;
    boxCount?: number;
    remainder?: number;
    packagedBoxes: PackagedBox[];
    processConditions?: {
        undercoat?: ProcessCoat;
        midcoat?: ProcessCoat;
        topcoat?: ProcessCoat;
    };
    memo?: string;
    imageUrls?: string[];
}

export interface ShortageRequest {
    id: string;
    createdAt: string;
    author: {
        uid: string;
        displayName: string;
    };
    sourceReportId: string; // Link back to the PackagingReport
    // Pre-filled data
    productionLine: string;
    orderNumbers: string[];
    supplier: string;
    productName: string;
    partName: string;
// FIX: Add specification to ShortageRequest type to match usage in WorkPerformanceCenter.tsx
    specification: string;
    orderQuantity?: number;
    inputQuantity?: number;
    goodQuantity?: number;
    defectQuantity?: number;
    // New data
    shortageReason: string;
    requestedShortageQuantity: number;
    status: 'requested' | 'completed';
    history?: HistoryEntry[];
    comments?: Comment[];
}