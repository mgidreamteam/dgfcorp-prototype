import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemePanelProps {
    children: React.ReactNode;
    className?: string;
    interactive?: boolean;
    colorTheme?: 'blue' | 'yellow' | 'purple';
    style?: React.CSSProperties;
    onClick?: () => void;
    translucent?: boolean;
}

const ThemePanel: React.FC<ThemePanelProps> = ({ children, className = '', interactive = false, colorTheme = 'blue', style, onClick, translucent = false }) => {
    const { dashboardTheme } = useTheme();

    if (dashboardTheme === 'dream-giga') {
        const accentMap = {
            blue: 'hover:border-blue-500',
            yellow: 'hover:border-yellow-500',
            purple: 'hover:border-purple-500'
        };
        
        // Define standard clip path for DREAM Giga brutalist border cuts
        const mergedStyle = {
            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)',
            ...style
        };

        const baseClass = translucent ? "bg-black/20 backdrop-blur-md border border-zinc-800 transition-colors" : "bg-[#000000] border-2 border-zinc-800 transition-colors";
        const interactiveClass = interactive ? `${accentMap[colorTheme]} cursor-pointer group` : "";
        
        return (
            <div 
                className={`${baseClass} ${interactiveClass} ${className}`} 
                style={mergedStyle}
                onClick={interactive ? onClick : undefined}
            >
                {children}
            </div>
        );
    } else {
        // Blueprint Matrix
        const baseClass = translucent ? "border border-zinc-700 relative overflow-hidden bg-black/20 backdrop-blur-md" : "border border-zinc-700 relative overflow-hidden bg-[#001a33]/80 backdrop-blur-md";
        const interactiveClass = interactive 
            ? 'hover:border-[#00ffcc] hover:bg-[#00ffcc]/5 cursor-pointer group transition-all duration-500 shadow-[0_0_15px_rgba(0,0,0,0)] hover:shadow-[0_0_20px_rgba(0,255,204,0.15)]' 
            : '';

        return (
            <div 
                className={`${baseClass} ${interactiveClass} ${className}`}
                style={style}
                onClick={interactive ? onClick : undefined}
            >
                {interactive && (
                    <>
                        {/* Glowing Scanline Tracker */}
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#00ffcc] opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_8px_#00ffcc] pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-[#00ffcc] opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_8px_#00ffcc] pointer-events-none"></div>
                    </>
                )}
                <div className="relative z-10 w-full h-full flex flex-col">
                    {children}
                </div>
            </div>
        );
    }
}

export default ThemePanel;
