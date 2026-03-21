import React, { useState, useMemo, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { DesignProject, BillOfMaterialItem } from '../types';
import { Plus, Cpu, ChevronRight, ArrowLeft, Wrench, CircuitBoard, Cog, Package, Cloud, Box, Factory, Trash2 } from 'lucide-react';
import ThemePanel from './ThemePanel';

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
  cloudLoadingAction?: string | null;
  baseRoute?: string;
  onPrepareForSim?: (project: DesignProject, target: 'studiosim' | 'fabflow') => void;
}

const classifyComponent = (item: BillOfMaterialItem): 'Structure' | 'Circuits' | 'Motion' | 'Other' => {
    const name = item.component.toLowerCase();
    const type = item.type.toLowerCase();

    if (type.includes('electronic') || ['pcb', 'sensor', 'battery', 'led', 'chip', 'resistor', 'capacitor'].some(term => name.includes(term))) {
        return 'Circuits';
    }
    if (type.includes('mechanical') && ['motor', 'servo', 'actuator', 'gear', 'bearing', 'rotor'].some(term => name.includes(term))) {
        return 'Motion';
    }
    if (type.includes('casing') || type.includes('enclosure') || ['frame', 'body', 'chassis', 'screw', 'bracket', 'housing'].some(term => name.includes(term))) {
        return 'Structure';
    }
    if (type.includes('mechanical')) {
        return 'Structure';
    }
    return 'Other';
};

const HierarchyView: React.FC<{ project: DesignProject, onBack: () => void, onPrepareForSim?: (project: DesignProject, target: 'studiosim' | 'fabflow') => void }> = ({ project, onBack, onPrepareForSim }) => {
    const hierarchy = useMemo(() => {
        if (!project.specs?.bom) return null;
        
        const categorized = project.specs.bom.reduce((acc, item) => {
            const category = classifyComponent(item);
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {} as Record<ReturnType<typeof classifyComponent>, BillOfMaterialItem[]>);

        return categorized;
    }, [project.specs?.bom]);

    const categoryIcons = {
        'Structure': <Wrench className="w-4 h-4 text-blue-400" />,
        'Circuits': <CircuitBoard className="w-4 h-4 text-emerald-400" />,
        'Motion': <Cog className="w-4 h-4 text-orange-400" />,
        'Other': <Package className="w-4 h-4 text-zinc-400" />
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            <div className="px-4 py-2 border-b border-zinc-800 shrink-0 bg-transparent flex items-center justify-between">
                <h2 className="text-subheading font-normal text-white uppercase tracking-tighter">WORKSPACE</h2>
                <button onClick={onBack} className="flex items-center text-zinc-400 hover:text-white transition-colors" title="Back to Projects">
                    <ArrowLeft className="w-4 h-4" />
                </button>
            </div>
            <div className="px-4 py-4 shrink-0 border-b border-zinc-800/30">
                <h3 className="text-panel-title font-normal text-white uppercase tracking-tighter truncate" title={project.name}>{project.name}</h3>
                <p className="text-micro text-zinc-500 mt-1 text-zinc-400">Component Hierarchy</p>
            </div>
            <div className="overflow-y-auto space-y-4 pt-4 px-2 pb-4 flex-1">
                {hierarchy && Object.entries(hierarchy).map(([category, items]) => (
                    <div key={category}>
                        <h4 className="flex items-center gap-2 text-detail font-semibold text-zinc-300 px-2 mb-2">
                            {categoryIcons[category as keyof typeof categoryIcons]}
                            {category}
                        </h4>
                        <ul className="space-y-1">
                            {(items as BillOfMaterialItem[]).map(item => (
                                <li key={item.component} className="text-zinc-400 text-detail px-3 py-1.5 rounded-md hover:bg-zinc-800/50 flex justify-between items-center">
                                    <span className="truncate">{item.component}</span>
                                    <span className="text-micro bg-zinc-700/80 text-zinc-300 px-1.5 py-0.5 rounded-full">{item.quantity}x</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            <div className="p-4 border-t border-zinc-800 shrink-0 space-y-2">
                <button
                    onClick={() => onPrepareForSim?.(project, 'studiosim')}
                    className="w-full py-2 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/30 rounded transition-colors text-sm font-medium border border-emerald-500/20 flex items-center justify-center gap-2"
                >
                    <Box className="w-4 h-4" /> Load in StudioSim
                </button>
                <button
                    onClick={() => onPrepareForSim?.(project, 'fabflow')}
                    className="w-full py-2 bg-yellow-600/10 text-yellow-400 hover:bg-yellow-600/30 rounded transition-colors text-sm font-medium border border-yellow-500/20 flex items-center justify-center gap-2"
                >
                    <Factory className="w-4 h-4" /> Load in FabFlow
                </button>
            </div>
        </div>
    );
};


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
  onPrepareForSim
}) => {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isHierarchyVisible, setHierarchyVisible] = useState(false);

  const activeProject = projects.find(p => p.id === activeProjectId);

  useEffect(() => {
    if (triggerHierarchyView && triggerHierarchyView === activeProjectId) {
      setHierarchyVisible(true);
    }
  }, [triggerHierarchyView, activeProjectId]);

  useEffect(() => {
    if (!activeProject || !activeProject.specs) {
        setHierarchyVisible(false);
    }
  }, [activeProjectId, activeProject]);

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

  const handleHierarchyBack = () => {
    setHierarchyVisible(false);
    onHierarchyViewClosed();
  }

  return (
    <ThemePanel translucent className="h-full flex flex-col shrink-0 overflow-hidden w-full relative z-10">
      <div className="flex-1 slide-container">
        <div className="slide-panel flex flex-col" style={{ transform: isHierarchyVisible ? 'translateX(-100%)' : 'translateX(0)' }}>
            <div className="px-4 py-2 border-b border-zinc-800 shrink-0 bg-transparent flex items-center justify-between">
                <h2 className="text-subheading font-normal text-white uppercase tracking-tighter">WORKSPACE</h2>
                <button onClick={onNewProject} className="w-5 h-5 flex items-center justify-center -mr-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors" title="New Project">
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="shrink-0 pt-3 pb-1 px-4">
                    <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Local Projects</h3>
                </div>
                <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4">
                    {projects.length === 0 && <div className="text-zinc-500 text-detail text-center py-4 italic px-4 bg-zinc-900/50 rounded border border-zinc-800/50 mx-2">No local projects.</div>}
                    
                    {projects.map((project) => (
                    <NavLink
                        key={project.id}
                        to={`${baseRoute}/${project.id}`}
                        onDoubleClick={() => handleRename(project)}
                        className={({ isActive }) => `w-full group px-3 py-3 rounded-md flex items-center gap-3 transition-all cursor-pointer ${
                            isActive
                            ? 'bg-zinc-800 text-white border-l-2 border-white'
                            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                        }`}
                    >
                    <Cpu className="w-4 h-4 opacity-70 shrink-0" />
                    <div className="flex-1 truncate">
                        {editingProjectId === project.id ? (
                            <form onSubmit={handleRenameSubmit}>
                                <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} onBlur={() => setEditingProjectId(null)} autoFocus className="w-full bg-zinc-700 text-white text-detail p-0 m-0 border-none outline-none focus:ring-0" />
                            </form>
                        ) : (
                            <div className="font-medium text-detail truncate" title="Double-click to rename">{project.name}</div>
                        )}
                        <div className="text-micro text-zinc-500 truncate">{new Date(project.createdAt).toLocaleDateString()}</div>
                    </div>
                    {activeProjectId === project.id && project.specs && (
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setHierarchyVisible(true); }} className="p-1 -mr-1 rounded-md text-zinc-500 group-hover:text-white group-hover:bg-zinc-700 transition-colors">
                             <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </NavLink>
                ))}
                </div>
                
                {cloudProjects && cloudProjects.length > 0 && (
                    <>
                        <div className="shrink-0 pt-2 pb-1 px-4 border-t border-zinc-800/50 mt-2">
                            <h3 className="text-[10px] text-blue-500 font-bold uppercase tracking-wider flex items-center gap-2">
                                <Cloud className="w-3 h-3" /> Global Cloud Storage
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4 min-h-[150px]">
                            {cloudProjects.sort((a,b) => b.uploadedAt - a.uploadedAt).map((p) => (
                                <div key={`cloud-${p.id}`} className="relative group w-full flex items-center">
                                    <button
                                        onClick={() => onLoadCloudProject && onLoadCloudProject(p)}
                                        disabled={cloudLoadingAction === p.id}
                                        className="w-full text-left px-3 py-3 rounded-md flex items-center gap-3 transition-all cursor-pointer text-blue-400 hover:bg-blue-900/20 hover:text-blue-300 disabled:opacity-50"
                                        title="Click to stream from cloud"
                                    >
                                        <Cloud className={`w-4 h-4 opacity-70 shrink-0 ${cloudLoadingAction === p.id ? 'animate-pulse text-blue-300' : ''}`} />
                                        <div className="flex-1 truncate pr-8">
                                            <div className="font-medium text-detail truncate">{p.name}</div>
                                            <div className="text-micro text-blue-500/70 truncate flex gap-2">
                                                <span>{(p.sizeBytes / 1000000).toFixed(2)} MB</span>
                                                <span>{new Date(p.uploadedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </button>
                                    {onDeleteCloudProject && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteCloudProject(p); }}
                                            className="absolute right-2 p-1.5 opacity-0 group-hover:opacity-100 text-red-500 hover:text-white hover:bg-red-500 border border-red-500/50 hover:border-red-500 rounded transition-all z-10 disabled:opacity-0 bg-[#09090b]/80 backdrop-blur-sm"
                                            disabled={cloudLoadingAction === p.id}
                                            title="Delete from Cloud"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>

        <div className="slide-panel" style={{ transform: isHierarchyVisible ? 'translateX(0)' : 'translateX(100%)' }}>
            {activeProject && activeProject.specs && <HierarchyView project={activeProject} onBack={handleHierarchyBack} onPrepareForSim={onPrepareForSim} />}
        </div>
      </div>
      
      <div className="p-4 border-t border-zinc-800 text-micro relative z-10">
        <p className="text-zinc-500">A DREAM Gigafactories Corp. Product</p>
        <p className="text-yellow-600 tracking-wide mt-1">Limited trial alpha</p>
      </div>
    </ThemePanel>
  );
};

export default React.memo(ProjectSidebar);