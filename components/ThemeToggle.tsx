
import React from 'react';

type Theme = 'light' | 'dark';

interface ThemeToggleProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  disabled?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, setTheme, disabled = false }) => {
  const toggleTheme = () => {
    if (disabled) return;
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      disabled={disabled}
      className={`w-14 h-7 rounded-full p-1 bg-gray-300 dark:bg-slate-600 relative transition-colors duration-500 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      aria-label="Toggle theme"
    >
      <div
        className="w-5 h-5 rounded-full bg-white dark:bg-slate-800 shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center"
        style={theme === 'dark' ? { transform: 'translateX(28px)' } : { transform: 'translateX(0px)' }}
      >
        {theme === 'light' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.95a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707zm-2.12-10.607a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-300" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
