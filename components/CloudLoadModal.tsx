import React from 'react';
import { Cloud, X, CloudDownload, Loader2, Trash2 } from 'lucide-react';
import ThemePanel from './ThemePanel';
import { CloudProject } from '../types';

export interface CloudLoadModalProps {
    isOpen: boolean; 
    onClose: () => void;
    projects: CloudProject[];
    onLoad: (p: CloudProject) => void;
    onDelete: (p: CloudProject) => void;
    loadingAction: string | null;
}

const CloudLoadModal: React.FC<CloudLoadModalProps> = ({ isOpen, onClose, projects, onLoad, onDelete, loadingAction }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <ThemePanel translucent interactive={false} className="rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center" onClick={e => e.stopPropagation()}>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Cloud className="w-5 h-5 text-blue-500" /> Cloud Storage Directory</h2>
                     <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-3" onClick={e => e.stopPropagation()}>
                    {projects.length === 0 ? (
                        <div className="text-center text-zinc-500 py-12">No global models located in your Cloud boundary.</div>
                    ) : (
                        projects.sort((a,b) => b.uploadedAt - a.uploadedAt).map(p => (
                            <div key={p.id} className="bg-zinc-800/40 border border-zinc-700/50 p-4 rounded-xl flex items-center justify-between hover:border-zinc-500 transition-colors">
                                <div>
                                    <div className="font-bold text-white mb-1">{p.name}</div>
                                    <div className="text-xs text-zinc-400 flex gap-4">
                                        <span>{(p.sizeBytes / 1000000).toFixed(2)} MB</span>
                                        <span>{new Date(p.uploadedAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => onLoad(p)}
                                        disabled={loadingAction === p.id}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loadingAction === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />} Stream
                                    </button>
                                    <button 
                                        onClick={() => onDelete(p)}
                                        disabled={loadingAction === p.id}
                                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ThemePanel>
        </div>
    );
};

export default CloudLoadModal;
