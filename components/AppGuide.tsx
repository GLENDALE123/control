import React from 'react';

interface AppGuideProps {
  onClose: () => void;
}

const AppGuide: React.FC<AppGuideProps> = ({ onClose }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 h-full overflow-y-auto scrollbar-hide">
      <div className="flex justify-between items-center mb-4 border-b dark:border-slate-700 pb-3">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">T.M.S 통합 앱 사용 가이드 (v1.4)</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white text-2xl">&times;</button>
      </div>
      
      <div className="space-y-12 text-gray-700 dark:text-slate-300">
        
        <details open>
          <summary className="font-semibold text-xl mb-3 text-primary-700 dark:text-primary-400 cursor-pointer">1. 시작하기 및 공통 기능</summary>
          <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4">
              <p>T.M.S.(Total Management System)는 업무의 모든 과정을 투명하고 효율적으로 관리하기 위한 통합 솔루션입니다.</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-3 text-sm">
                <li><strong>로그인 및 회원가입:</strong> 부여받은 계정 정보(이메일/비밀번호)로 로그인합니다. 로그인 실패 시, 입력창 하단에 오류 원인이 잠시 표시되어 문제를 쉽게 파악할 수 있습니다. 최초 사용자는 간단한 정보 입력으로 회원가입 후 관리자 승인을 통해 모든 기능을 사용할 수 있습니다.</li>
                <li><strong>홈 화면 및 통합 검색:</strong> 로그인 후 가장 먼저 마주하는 화면으로, 각 업무 영역을 대표하는 '센터'로 빠르게 이동할 수 있습니다. 하단의 통합 검색창을 통해 앱 내의 모든 데이터(지그 요청, 샘플 요청, 지그 마스터 데이터 등)를 한번에 검색하고 결과를 확인할 수 있습니다.</li>
                <li><strong>헤더 바 (상단 메뉴):</strong> 다른 센터에 접속 시 화면 상단에 항상 표시됩니다. 홈 화면 이동, 실시간 알림 확인, 사용자 프로필 확인 및 로그아웃 기능을 제공합니다.</li>
                <li>
                  <strong>알림 기능:</strong> 헤더의 종 모양 아이콘을 클릭하면 신규 요청, 상태 변경, 댓글 등 주요 활동에 대한 실시간 알림을 확인할 수 있습니다. 알림을 클릭하면 해당 항목의 상세 화면으로 즉시 이동하여 업무를 빠르게 처리할 수 있습니다.
                </li>
                 <li>
                  <strong>사용자 권한:</strong>
                  <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                      <li><strong>Admin:</strong> 앱의 모든 기능을 제어하고 사용자 권한을 관리하는 최고 관리자입니다.</li>
                      <li><strong>Manager:</strong> 데이터의 생성, 수정, 삭제 등 대부분의 관리 기능을 수행할 수 있는 중간 관리자입니다.</li>
                      <li><strong>Member:</strong> 데이터 조회만 가능한 읽기 전용 사용자입니다.</li>
                  </ul>
                </li>
              </ul>
          </div>
        </details>

        <details>
          <summary className="font-semibold text-xl mb-3 text-primary-700 dark:text-primary-400 cursor-pointer">2. 지그 관리 센터</summary>
          <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4">
              <p>지그 제작, 수리, 구매 요청부터 입고까지 전 과정을 체계적으로 관리하여, 작업 누락을 방지하고 모든 구성원이 진행 상황을 투명하게 공유할 수 있도록 돕습니다.</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-3 text-sm">
                <li><strong>대시보드:</strong> 전체 요청, 신규, 진행중, 이달 완료 건수 등 핵심 지표와 상태별/업체별 현황을 차트로 한눈에 파악할 수 있는 종합 요약 페이지입니다.</li>
                <li>
                  <strong>지그 관리대장:</strong> 모든 요청을 관리하는 핵심 공간입니다.
                  <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                      <li><strong>강력한 필터 및 검색:</strong> 상단의 필터 영역에서 상태, 요청자, 수신처, 월별 등 여러 조건을 동시에 적용하여 데이터를 정밀하게 필터링할 수 있습니다.</li>
                      <li><strong>다양한 보기 모드:</strong> 데이터를 '상태별 보드(칸반)', '리스트(엑셀 형식)', '카드형' 세 가지 형태로 전환하며 볼 수 있어, 원하는 방식대로 현황을 파악하기 용이합니다.</li>
                  </ul>
                </li>
                <li>
                  <strong>요청 관리:</strong>
                   <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                      <li><strong>신규 요청:</strong> '신규 요청' 버튼을 통해 언제든지 새로운 지그 요청서를 작성할 수 있습니다.</li>
                      <li><strong>상세 정보 및 처리:</strong> 관리대장에서 특정 요청을 클릭하면 상세 정보 팝업이 나타납니다. 이곳에서 이력, 댓글을 확인하고, 관리자는 상태 변경(승인/보류/반려), 입고/반출 처리, 수정, 삭제 등의 작업을 수행할 수 있습니다.</li>
                      <li><strong>이미지로 공유:</strong> 상세 정보 화면의 '이미지로 공유' 버튼을 누르면 현재 보고 있는 요청서 화면이 이미지로 복사되어, 카카오톡 등 메신저로 간편하게 공유하고 업무 협의를 진행할 수 있습니다.</li>
                  </ul>
                </li>
                <li><strong>지그목록표:</strong> 개별 '요청'이 아닌, 실제 '지그'의 마스터 데이터를 관리하는 공간입니다. 과거 제작 이력이 있는 모든 지그 정보를 검색하고 사진과 특이사항을 확인할 수 있습니다.</li>
                <li><strong>마스터 데이터:</strong> 요청서 작성 시 사용되는 요청자, 수신처 등의 기초 정보를 관리합니다. (Admin 권한)</li>
              </ul>
          </div>
        </details>
        
        <details>
          <summary className="font-semibold text-xl mb-3 text-primary-700 dark:text-primary-400 cursor-pointer">3. 품질 관리 센터</summary>
          <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4">
              <p>제품의 수입, 공정, 출하 각 단계별 품질 검사 활동을 통합적으로 기록하고 관리하여 품질 이력을 추적하고 이슈에 신속하게 대응합니다.</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-3 text-sm">
                <li><strong>대시보드:</strong> 오늘 검사 건수, 불합격 건수, 전체 합격률 등 핵심 지표와 함께, 주요 불량 유형, 작업자별 불합격 순위 등 심층 분석 데이터를 제공하여 일일 품질 현황을 빠르게 파악할 수 있습니다.</li>
                <li><strong>품질이슈 알림센터:</strong> 정식 검사 보고서와는 별개로, 현장에서 발생한 긴급 품질 이슈를 신속하게 등록하고 공유하는 공간입니다. 카드 형태로 이슈를 등록하여 관련 부서에 즉시 전파할 수 있습니다.</li>
                <li><strong>관제센터:</strong> 발주번호를 기준으로 모든 검사(수입, 공정, 출하) 이력을 통합하여 보여주는 중앙 관제소입니다. 특정 제품의 전체 품질 히스토리틀 한눈에 추적하고 관리할 수 있습니다.</li>
                <li><strong>분임조센터:</strong> 수입/공정/출하 각 단계별로 새로운 검사 보고서를 작성하고 제출하는 곳입니다. 실시간 미리보기 기능을 통해 작성 중인 보고서 내용을 바로 확인하며 정확하게 입력할 수 있습니다. 또한, 관제센터에서 특정 항목의 데이터를 불러와 새 보고서의 기본 정보(제품명, 발주처 등)를 자동으로 채울 수 있어 중복 입력을 최소화합니다.</li>
                <li><strong>팀관리:</strong> 품질 관련 부서 및 인원의 조직도를 확인하고, 이름과 직급, 연락처 등 정보를 빠르게 검색하여 소통할 수 있습니다.</li>
              </ul>
          </div>
        </details>
        
        <details>
          <summary className="font-semibold text-xl mb-3 text-primary-700 dark:text-primary-400 cursor-pointer">4. 샘플 센터</summary>
           <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4">
              <p>고객사 샘플 요청의 접수부터 완료까지 전 과정을 체계적으로 추적하고 관리합니다. 각 요청에 대한 상세한 이력과 작업 데이터를 기록하여 투명한 업무 공유를 지원합니다.</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-3 text-sm">
                  <li><strong>대시보드:</strong> 샘플 요청 현황을 한눈에 파악할 수 있는 종합 요약 페이지입니다. 총 요청, 신규 접수, 진행중, 월별 완료 건수 등 핵심 지표를 제공합니다. 또한 고객사별/담당자별 요청 건수, 코팅 방식별 통계 등 다각적인 분석을 지원하며, '실시간 샘플 현황 보드'를 통해 코팅 방식과 진행 상태를 조합하여 현황을 즉시 파악하고 필터링할 수 있습니다.</li>
                  <li><strong>요청 목록:</strong> 모든 샘플 요청을 관리하는 핵심 공간입니다. 직관적인 '카드형' 보기와 상세 데이터를 확인하기 용이한 '리스트형' 보기 모드를 제공합니다.</li>
                  <li><strong>신규 샘플 요청:</strong> '신규 요청' 버튼을 통해 새로운 샘플 요청서를 작성합니다. 고객사, 제품 정보, 코팅 방식, 납기일 등 기본 정보와 함께, 여러 부속(품목)에 대한 정보를 개별적으로 입력할 수 있어 정확한 요청이 가능합니다.</li>
                  <li><strong>상세 정보 및 처리:</strong> 목록에서 특정 요청을 클릭하면 상세 정보 팝업이 나타납니다. 이곳에서 요청된 모든 품목 정보, 첨부 이미지, 처리 이력, 댓글을 확인할 수 있습니다. 관리자는 상태 변경을 처리하고, 샘플 제작에 사용된 작업 데이터(하도/중도/상도 조건, 단가 등)를 기록하여 노하우를 축적하고 공유할 수 있습니다. 요청 생성 이후에도 작업자는 상세 정보 화면에서 참고 이미지를 추가로 업로드할 수 있습니다.</li>
              </ul>
          </div>
        </details>
        
        <details>
          <summary className="font-semibold text-xl mb-3 text-primary-700 dark:text-primary-400 cursor-pointer">5. 생산 관리 센터 (군포)</summary>
           <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4">
              <p>군포 공장의 긴급 생산 요청을 관리하는 전용 공간입니다. '긴급건', '부족분', '영업부 긴급요청' 세 가지 유형으로 나누어 요청을 체계적으로 처리합니다.</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-3 text-sm">
                  <li><strong>대시보드:</strong> 세 가지 요청 유형별 현황을 한 눈에 파악할 수 있는 요약 정보를 제공합니다.</li>
                  <li><strong>관제센터:</strong> 발주번호를 기준으로 모든 생산 요청을 통합하여 보여주어, 특정 발주와 관련된 모든 긴급 요청을 한번에 추적할 수 있습니다.</li>
                  <li><strong>유형별 요청 목록:</strong> '긴급건', '부족분', '영업부' 탭을 통해 각 유형별 요청 목록을 따로 확인하고 관리할 수 있습니다.</li>
                   <li><strong>요청서 작성:</strong> 각 유형에 맞는 전용 양식을 통해 신규 요청을 작성할 수 있습니다. 작성하는 내용이 실시간으로 공유용 카드 형태로 미리보기에 표시됩니다. 이 카드는 주요 정보(발주번호, 제품명, 수신처 등)를 강조하여 보여주며, 이미지로 복사하여 메신저로 간편하게 공유하고 협업할 수 있습니다.</li>
              </ul>
          </div>
        </details>
        
        <details>
          <summary className="font-semibold text-xl mb-3 text-primary-700 dark:text-primary-400 cursor-pointer">6. 생산센터 (생산일보)</summary>
           <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4">
              <p>생산 현장에서 일일 생산 실적(생산일보)을 기록하고 관리하는 공간입니다.</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-3 text-sm">
                  <li><strong>생산일보 작성 ('포장담당' 탭):</strong> '새 일보 작성하기'를 통해 당일 생산 실적을 입력합니다. 투입량과 양품량만 입력하면 불량량, 불량률, 양품률이 자동으로 계산되어 편리합니다. 작성 내용은 '임시저장'하여 나중에 이어서 작성할 수 있습니다.</li>
                  <li><strong>실시간 미리보기:</strong> 생산일보 작성 시, 입력하는 내용이 실시간으로 오른쪽에 카드 형태로 표시됩니다. 이를 통해 최종 결과물을 확인하며 정확하게 작업할 수 있으며, '이미지로 복사'하여 간편하게 공유할 수 있습니다.</li>
                  <li><strong>생산일보 목록 ('생산일보' 탭):</strong> 작성된 모든 생산일보가 리스트 형태로 누적되어 과거 실적을 쉽게 조회하고 관리할 수 있습니다.</li>
              </ul>
          </div>
        </details>
        
        <details>
          <summary className="font-semibold text-xl mb-3 text-primary-700 dark:text-primary-400 cursor-pointer">7. 종합관리</summary>
           <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4">
              <p>전사 공지사항 확인 및 근무 계획 수립 등 소통과 협업을 지원합니다.</p>
               <ul className="list-disc list-inside ml-4 mt-2 space-y-3 text-sm">
                  <li><strong>공지사항:</strong> 전사적으로 공유되는 중요한 공지사항을 확인합니다. 관리자는 새로운 공지를 작성, 수정, 삭제할 수 있으며, 이미지 첨부도 가능합니다.</li>
                  <li>
                      <strong>근무계획:</strong>
                      <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                          <li><strong>달력 보기:</strong> '월간 보기'와 '연간 보기'를 통해 근무 일정을 한눈에 파악할 수 있습니다. 공휴일과 특이사항이 자동으로 표시됩니다.</li>
                          <li><strong>계획 입력(관리자):</strong> 월간 보기에서 날짜를 선택한 후, 오른쪽 입력 패널에서 원하는 근무 유형을 클릭하고 '적용' 버튼을 누르면 일괄 등록됩니다.</li>
                          <li><strong>공지 등록(관리자):</strong> '월간 근무표 공지하기' 버튼을 누르면 현재 보고 있는 월간 달력이 이미지로 캡처되어 '공지사항'에 자동으로 게시됩니다.</li>
                      </ul>
                  </li>
               </ul>
          </div>
        </details>
        
        <details>
          <summary className="font-semibold text-xl mb-3 text-primary-700 dark:text-primary-400 cursor-pointer">8. 배합 계산기</summary>
           <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4">
              <p>증착 및 코팅 공정에서 사용되는 안료 배합을 정밀하게 계산하는 도구입니다. 복잡한 계산을 빠르고 정확하게 처리하여 작업 효율을 높이고 원료 낭비를 줄입니다.</p>
               <ul className="list-disc list-inside ml-4 mt-2 space-y-3 text-sm">
                  <li><strong>비율 계산:</strong> 전체 안료 비율과 각 안료 간의 상대적 비율을 입력하면 필요한 각 안료의 정확한 중량을 계산합니다.</li>
                  <li><strong>퍼센트 계산:</strong> 기준 중량 대비 각 안료의 퍼센트를 입력하면 필요한 중량을 각각 계산합니다.</li>
                  <li><strong>증착 재배합:</strong> 사용하고 남은 배합물의 중량과 현재 배합비를 바탕으로, 목표하는 새로운 배합비로 변경하기 위해 각 원료를 얼마나 추가해야 하는지 계산해줍니다.</li>
                   <li><strong>코팅 재배합:</strong> 초기 배합 정보와 현재 남은 양을 바탕으로, 목표하는 새로운 퍼센트로 변경하기 위해 주제 또는 안료를 얼마나 추가해야 하는지 계산합니다.</li>
              </ul>
          </div>
        </details>

        <details>
          <summary className="font-semibold text-xl mb-3 text-primary-700 dark:text-primary-400 cursor-pointer">9. 통합 설정 센터</summary>
           <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4">
               <p>앱의 전반적인 환경을 설정하고 사용자 계정을 관리합니다.</p>
               <ul className="list-disc list-inside ml-4 mt-2 space-y-3 text-sm">
                  <li><strong>앱 전체 테마:</strong> 라이트 모드와 다크 모드 간에 앱의 전체적인 색상 테마를 전환하여 개인의 작업 환경에 맞게 최적화할 수 있습니다.</li>
                  <li><strong>사용자 권한 관리(Admin 전용):</strong> 앱에 등록된 모든 사용자의 목록을 확인하고, 각 사용자의 권한을 'Admin', 'Manager', 'Member'로 실시간으로 변경할 수 있습니다.</li>
               </ul>
          </div>
        </details>

      </div>
      
      <div className="text-right mt-8 border-t dark:border-slate-700 pt-4">
        <button onClick={onClose} className="bg-primary-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors">닫기</button>
      </div>
    </div>
  );
};

export default AppGuide;