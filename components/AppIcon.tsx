import React from 'react';

const AppIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 100 100" 
        className={className}
        aria-label="T.M.S App Icon"
    >
        <defs>
            <linearGradient id="icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
        </defs>
        
        {/* Background */}
        <rect width="100" height="100" rx="22" fill="url(#icon-grad)" />
        
        {/* "J" Shape resembling a clamp/jig part, as a subtle background element */}
        <path 
            d="M 70,20 L 30,20 L 30,65 C 30,80 45,80 50,80 C 55,80 70,80 70,65 Z"
            fill="#0f172a"
            fillOpacity="0.15"
        />
        
        {/* T.M.S Text */}
        <text 
            x="50" 
            y="55" 
            fontFamily="Inter, Noto Sans KR, sans-serif" 
            fontSize="32" 
            fontWeight="800"
            fill="white" 
            textAnchor="middle"
            dominantBaseline="middle"
            letterSpacing="-2.5"
            paintOrder="stroke"
            stroke="#000000"
            strokeWidth="1.5"
            strokeOpacity="0.2"
        >
            T.M.S
        </text>
    </svg>
  );
};

export default AppIcon;