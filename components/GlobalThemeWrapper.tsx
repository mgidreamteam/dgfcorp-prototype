import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const GlobalThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { dashboardTheme } = useTheme();

    return (
        <div className={`min-h-screen w-full transition-colors duration-500 text-white ${dashboardTheme === 'blueprint' ? 'bg-theme-blueprint theme-blueprint' : 'bg-theme-dream-giga theme-dream-giga'}`}>
            {children}
        </div>
    );
};

export default GlobalThemeWrapper;
