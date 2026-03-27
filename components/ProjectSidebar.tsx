import React, { useState, useMemo, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { DesignProject, BillOfMaterialItem } from '../types';
import { Plus, Cpu, ChevronRight, ArrowLeft, Wrench, CircuitBoard, Cog, Package, Cloud, Box, Factory, Trash2 } from 'lucide-react';
import ThemePanel from './ThemePanel';
import LoadingModal from './LoadingModal';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import WarningModal from './WarningModal';

interface ProjectSidebarProps {
  projects: DesignProject[];
  activeProjectId: string | null;
  onNewProject: () => void;
  onRenameProject: (id: string, newName: string) => void;
  triggerHierarchyView: string | null;
  onHierarchyViewClosed: () => void;
  cloudProjects?: import('../types').CloudProject[];
  onLoadCloudProject?: (proj: import('../types').CloudProject) => void;
  onDeleteCloudProject?: (proj: import('../types').CloudProject) => void;
  onDeleteLocalProject?: (id: string) => void;
  cloudLoadingAction?: string | null;
  baseRoute?: string;
  onPrepareForSim?: (project: DesignProject, target: 'studiosim' | 'fabflow' | 'prostudio') => void;
  hideNewProjectButton?: boolean;
}




const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ 
  projects, 
  activeProjectId, 
  onNewProject,
  onRenameProject,
  triggerHierarchyView,
  onHierarchyViewClosed,
  cloudProjects = [],
  onLoadCloudProject,
  onDeleteCloudProject,
  cloudLoadingAction,
  baseRoute = "/studio",
  onPrepareForSim,
  hideNewProjectButton,
  onDeleteLocalProject
}) => {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<{ id: string, name: string, isCloud: boolean } | null>(null);

  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleRename = (project: DesignProject) => {
    setEditingProjectId(project.id);
    setEditingName(project.name);
  };

  const handleRenameSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingProjectId && editingName.trim()) {
      onRenameProject(editingProjectId, editingName.trim());
    }
    setEditingProjectId(null);
    setEditingName('');
  };



  return (
    <ThemePanel translucent className="h-full flex flex-col shrink-0 overflow-hidden w-full relative z-10">
        <div className="flex-1 flex flex-col pt-2">
            <div className="px-4 py-2 border-b border-zinc-800 shrink-0 bg-transparent flex items-center justify-between">
                <h2 className="text-subheading font-normal text-white uppercase tracking-tighter truncate pr-4" title={activeProject ? activeProject.name : 'D.R.E.A.M. WORKSPACE'}>{activeProject ? activeProject.name : 'D.R.E.A.M. WORKSPACE'}</h2>
                {!hideNewProjectButton && (
                    <button onClick={onNewProject} className="w-5 h-5 flex items-center justify-center -mr-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors" title="New Project">
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="shrink-0 pt-3 pb-2 px-4 flex flex-col gap-1">
                    <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> Local Storage</h3>
                    <div className="flex px-2 text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1 justify-between">
                        <span className="w-16">Filetype</span>
                        <span className="flex-1 text-left pl-3">Filename</span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4">
                    {projects.length === 0 && <div className="text-zinc-500 text-detail text-center py-4 italic px-4 bg-zinc-900/50 rounded border border-zinc-800/50 mx-2">No local projects.</div>}
                    
                    {projects.map((project) => {
                        const ext = project.appExtension || '.dream';
                        const isStudio = ext === '.dream';
                        const isPro = ext === '.dreampro';
                        const isFab = ext === '.fabflow';
                        const isSim = ext === '.studiosim';
                        const isWSim = ext === '.wsim';
                        const isTSim = ext === '.tsim';

                        const extColor = isPro ? 'text-blue-400 bg-blue-900/20 border-blue-500/20' : isFab ? 'text-yellow-400 bg-yellow-900/20 border-yellow-500/20' : isSim ? 'text-emerald-400 bg-emerald-900/20 border-emerald-500/20' : isWSim ? 'text-cyan-400 bg-cyan-900/20 border-cyan-500/20' : isTSim ? 'text-rose-400 bg-rose-900/20 border-rose-500/20' : 'text-purple-400 bg-purple-900/20 border-purple-500/20';
                        const bgHighlight = isPro ? 'bg-blue-900/10' : isFab ? 'bg-yellow-900/10' : isSim ? 'bg-emerald-900/10' : isWSim ? 'bg-cyan-900/10' : isTSim ? 'bg-rose-900/10' : 'bg-purple-900/10';
                        const routeStr = isPro ? '/prostudio' : isFab ? '/fabflow' : isSim ? '/studiosim' : isWSim ? '/worldsim' : isTSim ? '/tacticalsim' : '/studio';

                        return (
                            <NavLink
                                key={project.id}
                                to={`${routeStr}/${project.id}`}
                                onDoubleClick={() => handleRename(project)}
                                className={({ isActive }) => `w-full group px-2 py-2 rounded-md flex items-center gap-2 transition-all cursor-pointer ${
                                    isActive
                                    ? 'bg-zinc-800 text-white border-l-2 border-white'
                                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                                }`}
                            >
                            <div className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${extColor} w-16 text-center uppercase tracking-wider shrink-0`}>
                                {ext}
                            </div>
                            <div className={`flex-1 truncate flex flex-col justify-center rounded px-2 py-1 ${bgHighlight}`}>
                                {editingProjectId === project.id ? (
                                    <form onSubmit={handleRenameSubmit}>
                                        <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} onFocus={(e) => e.target.select()} onBlur={() => setEditingProjectId(null)} autoFocus className="w-full bg-zinc-700 text-white text-[11px] p-0.5 rounded outline-none" />
                                    </form>
                                ) : (
                                    <div className="font-semibold text-[11px] truncate text-white drop-shadow-md" title={project.name}>{project.name}</div>
                                )}
                                <div className="text-[9px] text-zinc-500 truncate mt-0.5">{new Date(project.createdAt).toLocaleDateString()}</div>
                            </div>
                            {onDeleteLocalProject && (
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setProjectToDelete({ id: project.id, name: project.name, isCloud: false }); }} className="p-1.5 rounded text-red-500/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0" title="Delete Local Project">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            </NavLink>
                        );
                    })}
                </div>
                
                {cloudProjects && cloudProjects.length > 0 && (
                    <>
                        <div className="shrink-0 pt-2 pb-2 px-4 border-t border-zinc-800/50 mt-2 flex flex-col gap-1">
                            <h3 className="text-[10px] text-blue-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <Cloud className="w-3.5 h-3.5" /> Cloud Storage
                            </h3>
                            <div className="flex px-2 text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1 justify-between">
                                <span className="w-16">Filetype</span>
                                <span className="flex-1 text-left pl-3">Filename</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4 min-h-[150px]">
                            {cloudProjects.sort((a,b) => b.uploadedAt - a.uploadedAt).map((p) => {
                                const ext = p.appExtension || '.dream';
                                const isPro = ext === '.dreampro';
                                const isFab = ext === '.fabflow';
                                const isSim = ext === '.studiosim';
                                const isWSim = ext === '.wsim';
                                const isTSim = ext === '.tsim';
        
                                const extColor = isPro ? 'text-blue-400 bg-blue-900/20 border-blue-500/20' : isFab ? 'text-yellow-400 bg-yellow-900/20 border-yellow-500/20' : isSim ? 'text-emerald-400 bg-emerald-900/20 border-emerald-500/20' : isWSim ? 'text-cyan-400 bg-cyan-900/20 border-cyan-500/20' : isTSim ? 'text-rose-400 bg-rose-900/20 border-rose-500/20' : 'text-purple-400 bg-purple-900/20 border-purple-500/20';
                                const bgHighlight = isPro ? 'bg-blue-900/10' : isFab ? 'bg-yellow-900/10' : isSim ? 'bg-emerald-900/10' : isWSim ? 'bg-cyan-900/10' : isTSim ? 'bg-rose-900/10' : 'bg-purple-900/10';

                                return (
                                <div key={`cloud-${p.id}`} className="relative group w-full flex items-center">
                                    <button
                                        onClick={() => onLoadCloudProject && onLoadCloudProject(p)}
                                        disabled={cloudLoadingAction === p.id}
                                        className="w-full text-left px-2 py-2 rounded-md flex items-center gap-2 transition-all cursor-pointer text-zinc-400 hover:bg-zinc-800/50 hover:text-white disabled:opacity-50"
                                        title="Click to stream from cloud"
                                    >
                                        <div className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${extColor} w-16 text-center uppercase tracking-wider shrink-0 ${cloudLoadingAction === p.id ? 'animate-pulse' : ''}`}>
                                            {ext}
                                        </div>
                                        <div className={`flex-1 truncate flex flex-col justify-center rounded px-2 py-1 ${bgHighlight}`}>
                                            <div className="font-semibold text-[11px] truncate text-zinc-200 drop-shadow-md" title={p.name}>{p.name}</div>
                                            <div className="text-[9px] text-zinc-500 truncate mt-0.5">{(p.sizeBytes / 1024 / 1024).toFixed(2)} MB</div>
                                        </div>
                                    </button>
                                    {onDeleteCloudProject && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setProjectToDelete({ id: p.id, name: p.name, isCloud: true }); }}
                                            className="absolute right-2 p-1.5 opacity-0 group-hover:opacity-100 text-red-500 hover:text-white hover:bg-red-500 border border-red-500/50 hover:border-red-500 rounded transition-all z-10 disabled:opacity-0 bg-[#09090b]/80 backdrop-blur-sm"
                                            disabled={cloudLoadingAction === p.id}
                                            title="Delete from Cloud"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
      
      <div className="pt-2 pb-3 shrink-0 flex flex-col items-center justify-center gap-4 bg-[#09090b]/90 border-t border-zinc-800/80 relative z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center w-full px-4 text-center pb-2">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.2em]">A DREAM Gigafactories Corp. Product</span>
            <span className="text-[8px] font-mono text-blue-500/70 uppercase tracking-widest mt-0.5">Limited trial alpha</span>
        </div>
      </div>

      {(() => {
          const targetProj = cloudProjects?.find(p => p.id === cloudLoadingAction);
          const ext = targetProj?.appExtension || '.dream';
          const targetTheme = ext === '.dreampro' ? 'prostudio' : ext === '.fabflow' ? 'fabflow' : ext === '.studiosim' ? 'studiosim' : ext === '.tsim' ? 'tacticalsim' : ext === '.wsim' ? 'worldsim' : 'studio';
          return <LoadingModal isOpen={!!cloudLoadingAction} message="Downloading Project from Cloud..." appTheme={targetTheme as any} />;
      })()}
      
      {projectToDelete && projectToDelete.id === activeProjectId && (
          <WarningModal 
              title="Cannot Delete Open Project"
              message={<>You must close the currently open workspace <strong className="text-white font-semibold">"{projectToDelete.name}"</strong> before it can be deleted. Please return to the dashboard or open a different project to proceed.</>}
              onClose={() => setProjectToDelete(null)}
          />
      )}
      {projectToDelete && projectToDelete.id !== activeProjectId && (
          <DeleteConfirmationDialog
              projectName={projectToDelete.name}
              onCancel={() => setProjectToDelete(null)}
              onConfirm={() => {
                  if (projectToDelete.isCloud && onDeleteCloudProject) {
                      const p = cloudProjects?.find(cp => cp.id === projectToDelete.id);
                      if (p) onDeleteCloudProject(p);
                  } else if (!projectToDelete.isCloud && onDeleteLocalProject) {
                      onDeleteLocalProject(projectToDelete.id);
                  }
                  setProjectToDelete(null);
              }}
          />
      )}
    </ThemePanel>
  );
};

export default React.memo(ProjectSidebar);