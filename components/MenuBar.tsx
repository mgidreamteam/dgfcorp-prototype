import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface FileMenuBarProps {
  projectName?: string;
  appType?: 'studio' | 'prostudio' | 'fabflow' | 'studiosim' | 'wsim' | 'tsim';
  onToggleAgent?: () => void;
  isAgentOpen?: boolean;
}

const HeloIcon = ({ appType = 'studio', className = '' }: { appType: string; className?: string }) => {
    const bladeColors: Record<string, string> = {
        'studio': '#a855f7',
        'prostudio': '#3b82f6',
        'fabflow': '#eab308',
        'studiosim': '#10b981',
        'wsim': '#06b6d4',
        'tsim': '#f43f5e',
    };
    const color = bladeColors[appType] || '#a855f7';
    
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            {/* Top Rotor */}
            <g>
                <animateTransform attributeName="transform" type="rotate" from="0 12 5" to="360 12 5" dur="0.15s" repeatCount="indefinite" />
                <path d="M2 5C2 4.5 12 4 22 5C22 5.5 12 6 2 5Z" fill={color} fillOpacity="0.9" />
            </g>
            <path d="M11 5V8H13V5H11Z" fill="#71717a" />
            
            {/* Body */}
            <path d="M6 11C6 8.5 8 7 12 7H16C18.5 7 20 8.5 20 11C20 13.5 18.5 15 16 15H8C6 15 5 13.5 6 11Z" fill="#27272a" stroke="#d4d4d8" strokeWidth="1.5" />
            
            {/* Cockpit */}
            <path d="M14 7.5C16.5 7.5 18.5 9 18.5 11C18.5 13 16.5 14.5 14 14.5C12 14.5 11 13 11 11C11 9 12 7.5 14 7.5Z" fill="#38bdf8" />
            
            {/* Tail Boom */}
            <path d="M6 10L1 9V11L6 12V10Z" fill="#27272a" stroke="#d4d4d8" strokeWidth="1" />
            
            {/* Tail Rotor */}
            <g>
                <animateTransform attributeName="transform" type="rotate" from="0 2 10" to="360 2 10" dur="0.1s" repeatCount="indefinite" />
                <path d="M1 8.5C1 8 3 9.5 3 10C3 10.5 1 11.5 1 11.5L1 8.5Z" fill={color} fillOpacity="0.9" />
            </g>

            {/* Skids */}
            <path d="M8 15L7 18H17L16 15" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 18H19" stroke="#d4d4d8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
};

const FileMenuBar: React.FC<FileMenuBarProps> = ({ projectName, appType, onToggleAgent, isAgentOpen }) => {
    const { profile } = useAuth();
    
    // Parse Name
    const rawName = profile?.name || 'Authorized User';
    const nameParts = rawName.split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastInitial = nameParts.length > 1 ? `${nameParts[nameParts.length - 1].charAt(0)}.` : '';
    const formattedUser = `User: ${firstName} ${lastInitial}`.trim();

    // Group & Company
    const groupName = profile?.role === 'admin' ? 'AeroSpace Command' : 'Engineering Alpha';
    const formattedGroup = `Group: ${groupName}`;
    const accountCode = 'A/C: MGI';

    const bgColors = {
        'studio': 'bg-purple-900/40 border-purple-500/50',
        'prostudio': 'bg-blue-900/40 border-blue-500/50',
        'fabflow': 'bg-yellow-900/40 border-yellow-500/50',
        'studiosim': 'bg-emerald-900/40 border-emerald-500/50',
        'wsim': 'bg-cyan-900/40 border-cyan-500/50',
        'tsim': 'bg-rose-900/40 border-rose-500/50',
    };
    
    const bgColorClass = bgColors[appType || 'studio'];

    return (
        <div className={`w-full px-4 py-2 flex justify-between items-center ${bgColorClass} shrink-0 relative z-10 border-b`}>
            <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-white uppercase tracking-widest drop-shadow-sm">{projectName || 'D.R.E.A.M. Workspace'}</span>
            </div>
            
            <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono select-none">
                <span className="text-zinc-300 pointer-events-none">{formattedUser}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                <span className="pointer-events-none">{formattedGroup}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                <span className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] pointer-events-none">{accountCode}</span>
                
                {onToggleAgent && (
                    <>
                        <span className="w-px h-5 bg-zinc-700 mx-2"></span>
                        <button 
                            onClick={onToggleAgent} 
                            className={`px-3 py-1.5 rounded-lg border-2 transition-all flex items-center gap-2 cursor-pointer ${
                                isAgentOpen 
                                ? `bg-${appType}-900/60 border-${appType}-500/80 shadow-[0_0_15px_rgba(255,255,255,0.1)]` 
                                : 'bg-black/40 border-zinc-700/50 hover:border-zinc-500'
                            }`}
                            title={isAgentOpen ? "Minimize HELO Agent" : "Summon HELO Agent"}
                        >
                            <HeloIcon appType={appType || 'studio'} className={`w-5 h-5 ${isAgentOpen ? 'drop-shadow-[0_0_10px_theme(colors.white)]' : 'opacity-70'}`} />
                            <span className={`text-[12px] font-black tracking-widest ${isAgentOpen ? 'text-white' : 'text-zinc-400'}`}>HELO</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default FileMenuBar;