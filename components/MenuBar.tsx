import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface FileMenuBarProps {
  projectName?: string;
}

const FileMenuBar: React.FC<FileMenuBarProps> = ({ projectName }) => {
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

    return (
        <div className="w-full px-4 py-2 flex justify-between items-center bg-black/80 shrink-0 relative z-10 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-white uppercase tracking-widest drop-shadow-sm">{projectName || 'D.R.E.A.M. Workspace'}</span>
            </div>
            
            <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono select-none pointer-events-none">
                <span className="text-zinc-300">{formattedUser}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                <span>{formattedGroup}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                <span className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{accountCode}</span>
            </div>
        </div>
    );
};

export default FileMenuBar;