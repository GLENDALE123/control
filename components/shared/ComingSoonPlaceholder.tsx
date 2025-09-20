import React, { FC } from 'react';

interface ComingSoonPlaceholderProps {
    title: string;
    message?: string;
}

const ComingSoonPlaceholder: FC<ComingSoonPlaceholderProps> = ({ 
    title, 
    message = "해당 기능은 현재 개발 중입니다. 곧 더 좋은 모습으로 찾아뵙겠습니다." 
}) => (
    <div className="flex items-center justify-center h-full text-center p-4 bg-white dark:bg-slate-800 rounded-lg">
        <div>
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="mx-auto h-16 w-16 text-yellow-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={1}
            >
                <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white">{title}</h2>
            <p className="mt-2 text-gray-500 dark:text-slate-400">{message}</p>
        </div>
    </div>
);

export default ComingSoonPlaceholder;
