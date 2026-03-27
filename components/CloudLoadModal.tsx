import React from 'react';
import { Cloud, CloudDownload, Loader2, Trash2, Cuboid, Factory, Hammer, Radar } from 'lucide-react';
import GlobalModal from './GlobalModal';
import { CloudProject } from '../types';

export interface CloudLoadModalProps {
    isOpen: boolean;
    onClose: () => void;
    projects: CloudProject[];
    onLoad: (p: CloudProject) => void;
    onDelete: (p: CloudProject) => void;
    loadingAction: string | null;
    appTheme?: 'prostudio' | 'fabflow' | 'studiosim' | 'tacticalsim';
}

const CloudLoadModal: React.FC<CloudLoadModalProps> = ({ isOpen, onClose, projects, onLoad, onDelete, loadingAction, appTheme = 'prostudio' }) => {
    const themeParams = {
        prostudio: { color: 'text-blue-500', bg: 'bg-blue-600', hoverBg: 'hover:bg-blue-500', icon: <Cuboid className="w-5 h-5 text-blue-500" /> },
        fabflow: { color: 'text-yellow-500', bg: 'bg-yellow-600', hoverBg: 'hover:bg-yellow-500', icon: <Factory className="w-5 h-5 text-yellow-500" /> },
        studiosim: { color: 'text-emerald-500', bg: 'bg-emerald-600', hoverBg: 'hover:bg-emerald-500', icon: <Hammer className="w-5 h-5 text-emerald-500" /> },
        tacticalsim: { color: 'text-red-500', bg: 'bg-red-600', hoverBg: 'hover:bg-red-500', icon: <Radar className="w-5 h-5 text-red-500" /> }
    };
    
    const theme = themeParams[appTheme];

    return (
        <GlobalModal
            isOpen={isOpen}
            onClose={onClose}
            title={<div className="text-sm font-bold uppercase text-white flex items-center gap-2">{theme.icon} Cloud Storage Directory</div>}
            icon={<Cloud className={`w-5 h-5 ${theme.color}`} />}
            maxWidth="42rem"
        >
            <div className="space-y-3">
                {projects.length === 0 ? (
                    <div className="text-center text-[#71717a] py-12">No global models located in your Cloud boundary.</div>
                ) : (
                    projects.sort((a, b) => b.uploadedAt - a.uploadedAt).map(p => (
                        <div key={p.id} className="bg-[#27272a]/40 border border-[#3f3f46]/50 p-4 rounded-xl flex items-center justify-between hover:border-[#71717a] transition-colors">
                            <div>
                                <div className="text-white font-semibold mb-1">{p.name}</div>
                                <div className="text-sm font-normal flex gap-4 mt-1 text-zinc-400">
                                    <span>{(p.sizeBytes / 1000000).toFixed(2)} MB</span>
                                    <span>{new Date(p.uploadedAt).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onLoad(p)}
                                    disabled={loadingAction === p.id}
                                    className={`${theme.bg} ${theme.hoverBg} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2`}
                                >
                                    {loadingAction === p.id ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <CloudDownload className="w-4 h-4" />} Stream
                                </button>
                                <button
                                    onClick={() => onDelete(p)}
                                    disabled={loadingAction === p.id}
                                    className="bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#f87171] border border-[#ef4444]/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </GlobalModal>
    );
};

export default CloudLoadModal;
