import React from 'react';

export const ProductionManagementCenter: React.FC = () => {
    return (
        <div className="flex items-center justify-center h-full text-center p-4">
            <div>
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white">준비 중인 기능입니다.</h2>
                <p className="mt-2 text-gray-500 dark:text-slate-400">생산 관리 기능은 현재 개발 중입니다. 곧 더 좋은 모습으로 찾아뵙겠습니다.</p>
            </div>
        </div>
    );
};
