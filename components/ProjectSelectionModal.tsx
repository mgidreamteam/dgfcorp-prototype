import React from 'react';
import { Database, Cloud, Loader2, Cuboid, Factory, Cpu, Layers, Hammer, Radar } from 'lucide-react';
import GlobalModal from './GlobalModal';
import { DesignProject, CloudProject } from '../types';

export interface ProjectSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    projects: DesignProject[];
    cloudProjects: CloudProject[];
    onSelectLocal: (project: DesignProject) => void;
    onSelectCloud: (project: CloudProject) => void;
    loadingAction: string | null;
    appTheme?: 'prostudio' | 'fabflow' | 'studiosim' | 'tacticalsim';
}

const ProjectSelectionModal: React.FC<ProjectSelectionModalProps> = ({ 
    isOpen, onClose, projects, cloudProjects, onSelectLocal, onSelectCloud, loadingAction, appTheme = 'prostudio'
}) => {
    
    // Filter to only show relevant hardware projects
    const localProjects = projects.filter(p => !p.appExtension || p.appExtension === '.dreampro' || p.appExtension === '.dream');
    const remoteProjects = cloudProjects.filter(p => !p.appExtension || p.appExtension === '.dreampro' || p.appExtension === '.dream').sort((a,b) => b.uploadedAt - a.uploadedAt);

    const themeParams = {
        prostudio: { color: 'text-blue-400', border: 'border-blue-500/20', bgContainer: 'bg-blue-900/10', icon: <Cuboid className="w-4 h-4 text-blue-500" /> },
        fabflow: { color: 'text-yellow-400', border: 'border-yellow-500/20', bgContainer: 'bg-yellow-900/10', icon: <Factory className="w-4 h-4 text-yellow-500" /> },
        studiosim: { color: 'text-emerald-400', border: 'border-emerald-500/20', bgContainer: 'bg-emerald-900/10', icon: <Hammer className="w-4 h-4 text-emerald-500" /> },
        tacticalsim: { color: 'text-red-400', border: 'border-red-500/20', bgContainer: 'bg-red-900/10', icon: <Radar className="w-4 h-4 text-red-500" /> }
    };
    
    const theme = themeParams[appTheme];

    return (
        <GlobalModal
            isOpen={isOpen}
            onClose={onClose}
            title={<div className="text-sm font-bold uppercase text-white flex items-center gap-2">{theme.icon} Load Extracted Asset Topology</div>}
            icon={<Layers className={`w-5 h-5 ${theme.color}`} />}
            maxWidth="42rem"
        >
            <div className="space-y-6">
                
                {/* Local Storage Section */}
                <div className={`space-y-3 border ${theme.border} ${theme.bgContainer} p-4 rounded-xl`}>
                    <h3 className={`text-xs font-bold ${theme.color} uppercase tracking-widest flex items-center gap-2`}>
                        <Cpu className="w-4 h-4" /> Browser Workspace Memory
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {localProjects.length === 0 ? (
                            <div className="col-span-full text-center text-[#71717a] py-6 italic text-sm">No local projects initialized. Use ProStudio first.</div>
                        ) : (
                            localProjects.map(p => {
                                const ext = p.appExtension || '.dream';
                                const color = ext === '.dreampro' ? 'text-blue-400 border-blue-500/30 bg-blue-900/20' : 'text-emerald-400 border-emerald-500/30 bg-emerald-900/20';
                                return (
                                <button key={`loc-${p.id}`} onClick={() => onSelectLocal(p)} className={`flex items-start gap-3 bg-black/40 border border-zinc-800 p-3 rounded-lg hover:${theme.border} transition-all text-left group`}>
                                    <div className={`mt-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded border ${color} uppercase tracking-wider shrink-0`}>{ext}</div>
                                    <div className="flex-1 truncate">
                                        <div className="text-zinc-200 font-bold text-[11px] truncate group-hover:text-white transition-colors">{p.name}</div>
                                        <div className="text-[9px] text-zinc-500 mt-1">{new Date(p.createdAt).toLocaleString()}</div>
                                    </div>
                                </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Cloud Storage Section */}
                <div className={`space-y-3 border ${theme.border} ${theme.bgContainer} p-4 rounded-xl`}>
                    <h3 className={`text-xs font-bold ${theme.color} uppercase tracking-widest flex items-center gap-2`}>
                        <Cloud className="w-4 h-4" /> Global Cloud Registry
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {remoteProjects.length === 0 ? (
                            <div className="col-span-full text-center text-[#71717a] py-6 italic text-sm">No synchronized cloud assets deployed.</div>
                        ) : (
                            remoteProjects.map(p => {
                                const ext = p.appExtension || '.dream';
                                const color = ext === '.dreampro' ? 'text-blue-400 border-blue-500/30 bg-blue-900/20' : 'text-emerald-400 border-emerald-500/30 bg-emerald-900/20';
                                return (
                                <button key={`cld-${p.id}`} onClick={() => onSelectCloud(p)} disabled={loadingAction === p.id} className={`flex items-start gap-3 bg-black/40 border border-zinc-800 p-3 rounded-lg hover:${theme.border} transition-all disabled:opacity-50 text-left group`}>
                                    <div className={`mt-0.5 flex flex-col items-center gap-1`}>
                                        <div className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${color} uppercase tracking-wider shrink-0`}>{ext}</div>
                                        {loadingAction === p.id && <Loader2 className={`w-3.5 h-3.5 ${theme.color} animate-spin`} />}
                                    </div>
                                    <div className="flex-1 truncate">
                                        <div className="text-zinc-200 font-bold text-[11px] truncate group-hover:text-white transition-colors">{p.name}</div>
                                        <div className="text-[9px] text-zinc-500 flex justify-between mt-1">
                                            <span>{(p.sizeBytes/1000000).toFixed(2)} MB</span>
                                            <span>{new Date(p.uploadedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </button>
                                );
                            })
                        )}
                    </div>
                </div>

            </div>
        </GlobalModal>
    );
};

export default ProjectSelectionModal;
