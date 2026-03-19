import React, { createContext, useContext, useState, useEffect } from 'react';

export type DashboardTheme = 'dream-giga' | 'blueprint';

interface ThemeContextType {
    dashboardTheme: DashboardTheme;
    setDashboardTheme: (theme: DashboardTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dashboardTheme, setDashboardTheme] = useState<DashboardTheme>(() => {
        const saved = localStorage.getItem('dream_dashboardMode');
        return (saved as DashboardTheme) || 'dream-giga';
    });

    useEffect(() => {
        localStorage.setItem('dream_dashboardMode', dashboardTheme);
    }, [dashboardTheme]);

    return (
        <ThemeContext.Provider value={{ dashboardTheme, setDashboardTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
