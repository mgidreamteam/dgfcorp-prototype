import React, { useState, useMemo, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { DesignProject, BillOfMaterialItem } from '../types';
import { Plus, Cpu, ChevronRight, ArrowLeft, Wrench, CircuitBoard, Cog, Package } from 'lucide-react';

interface ProjectSidebarProps {
  projects: DesignProject[];
  activeProjectId: string | null;
  onNewProject: () => void;
  onRenameProject: (id: string, newName: string) => void;
  triggerHierarchyView: string | null;
  onHierarchyViewClosed: () => void;
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

const HierarchyView: React.FC<{ project: DesignProject, onBack: () => void }> = ({ project, onBack }) => {
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
        <div className="flex flex-col h-full px-2 py-2">
            <div className="flex items-center justify-between px-2 mb-2">
                <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Project View
                </button>
            </div>
            <div className="px-2 mb-4">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Workspace</h2>
                <h3 className="text-lg font-bold text-white truncate" title={project.name}>{project.name}</h3>
                <p className="text-xs text-zinc-500">Component Hierarchy</p>
            </div>
            <div className="overflow-y-auto space-y-4 flex-1">
                {hierarchy && Object.entries(hierarchy).map(([category, items]) => (
                    <div key={category}>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 px-2 mb-2">
                            {categoryIcons[category as keyof typeof categoryIcons]}
                            {category}
                        </h4>
                        <ul className="space-y-1">
                            {(items as BillOfMaterialItem[]).map(item => (
                                <li key={item.component} className="text-zinc-400 text-sm px-3 py-1.5 rounded-md hover:bg-zinc-800/50 flex justify-between items-center">
                                    <span className="truncate">{item.component}</span>
                                    <span className="text-xs bg-zinc-700/80 text-zinc-300 px-1.5 py-0.5 rounded-full font-kido">{item.quantity}x</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
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
  onHierarchyViewClosed
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
    <div className="bg-zinc-900 border-r border-zinc-800 h-full flex flex-col shrink-0">
      <div className="flex-1 slide-container">
        <div className="slide-panel flex flex-col" style={{ transform: isHierarchyVisible ? 'translateX(-100%)' : 'translateX(0)' }}>
            <div className="flex items-center justify-between px-4 mb-2 mt-4">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Projects</h2>
                <button onClick={onNewProject} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors" title="New Project">
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                {projects.length === 0 && <div className="text-zinc-500 text-sm text-center py-4 italic px-4 bg-zinc-900/50 rounded border border-zinc-800/50 mx-2">No projects yet.</div>}
                
                {projects.map((project) => (
                <NavLink
                    key={project.id}
                    to={`/studio/${project.id}`}
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
                                <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} onBlur={() => setEditingProjectId(null)} autoFocus className="w-full bg-zinc-700 text-white text-sm p-0 m-0 border-none outline-none focus:ring-0" />
                            </form>
                        ) : (
                            <div className="font-medium text-sm truncate" title="Double-click to rename">{project.name}</div>
                        )}
                        <div className="text-xs text-zinc-500 truncate">{new Date(project.createdAt).toLocaleDateString()}</div>
                    </div>
                    {activeProjectId === project.id && project.specs && (
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setHierarchyVisible(true); }} className="p-1 -mr-1 rounded-md text-zinc-500 group-hover:text-white group-hover:bg-zinc-700 transition-colors">
                             <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </NavLink>
                ))}
            </div>
        </div>

        <div className="slide-panel" style={{ transform: isHierarchyVisible ? 'translateX(0)' : 'translateX(100%)' }}>
            {activeProject && activeProject.specs && <HierarchyView project={activeProject} onBack={handleHierarchyBack} />}
        </div>
      </div>
      
      <div className="p-4 border-t border-zinc-800 text-xs">
        <p className="text-zinc-500">A Materiel Group Inc., Product</p>
        <p className="text-yellow-600 font-kido tracking-wide mt-1">prototype product</p>
      </div>
    </div>
  );
};

export default React.memo(ProjectSidebar);