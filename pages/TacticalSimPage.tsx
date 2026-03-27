import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { DesignProject, CloudProject, AgentLog, DesignStatus } from '../types';
import { auth, db, storage } from '../services/firebase';
import { collection, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, getDownloadURL, deleteObject, uploadString } from 'firebase/storage';
import AgentSidebar from '../components/AgentSidebar';
import ProjectSidebar from '../components/ProjectSidebar';
import FileMenuBar from '../components/MenuBar';

import { PlusCircle, Trash2, CloudDownload, XSquare, Save, ArrowDownToLine, UploadCloud, RefreshCw, Hammer, AlertCircle, Maximize, ZoomIn, ZoomOut, Maximize2, Activity, ShieldCheck, Cpu, Move, X, Minimize2, ZoomInIcon, Sun, Moon, Sparkles, BoxIcon, Droplet, Grid3X3, Eye, EyeOff, Aperture, Lightbulb, LightbulbOff, MousePointer2, Play, Radar } from 'lucide-react';
import ThemePanel from '../components/ThemePanel';
import { Canvas } from '@react-three/fiber';
import { Box as DreiBox, Cylinder as DreiCylinder, Grid, Environment, MapControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { CameraPresets, ViewMode } from '../components/CameraPresets';
import { RoomWalls } from '../components/RoomWalls';
import { SimHUD } from '../components/SimHUD';
import { StudioLighting } from '../components/StudioLighting';
import { useLocalStorageState } from '../hooks/useLocalStorageState';

const ViewCubeIcon = ({ face }: { face: string }) => {
    const f = face.toLowerCase();
    return (
        <svg viewBox="0 0 100 100" className="w-[30px] h-[30px] transform transition-transform group-hover:scale-[1.15]">
            <g strokeLinejoin="round" strokeLinecap="round" className="stroke-zinc-600 stroke-[4] fill-transparent transition-colors">
                <path d="M50 20 L80 35 L50 50 L20 35 Z" className={f === 'top' ? 'fill-orange-500/60 stroke-orange-400' : f === 'bottom' ? 'fill-blue-500/30 stroke-blue-400 stroke-dasharray-[4_4]' : ''} />
                <path d="M20 35 L50 50 L50 80 L20 65 Z" className={f === 'front' ? 'fill-orange-500/60 stroke-orange-400' : f === 'rear' ? 'fill-blue-500/30 stroke-blue-400 stroke-dasharray-[4_4]' : ''} />
                <path d="M50 50 L80 35 L80 65 L50 80 Z" className={f === 'right' ? 'fill-orange-500/60 stroke-orange-400' : f === 'left' ? 'fill-blue-500/30 stroke-blue-400 stroke-dasharray-[4_4]' : ''} />
                {f === '3d' && (
                    <>
                        <path d="M50 20 L80 35 L50 50 L20 35 Z" className="fill-orange-500/20 stroke-orange-400/50" />
                        <path d="M20 35 L50 50 L50 80 L20 65 Z" className="fill-orange-500/20 stroke-orange-400/50" />
                        <path d="M50 50 L80 35 L80 65 L50 80 Z" className="fill-orange-500/20 stroke-orange-400/50" />
                        <circle cx="50" cy="50" r="12" className="fill-orange-500 stroke-orange-400" />
                    </>
                )}
            </g>
        </svg>
    );
};

// Procedural Drone/Plane constructed from primitives
function DroneModel({ renderMode = 'solid' }: { renderMode?: 'solid' | 'wireframe' | 'edges' }) {
    const isWireframe = renderMode === 'wireframe';
    return (
        <group position={[0, 5, 0]}>
            <DreiCylinder args={[0.5, 0.5, 4, 16]} rotation={[Math.PI / 2, 0, 0]}>
                <meshStandardMaterial color="#3b82f6" metalness={0.8} roughness={0.2} wireframe={isWireframe} />
            </DreiCylinder>
            <DreiBox args={[6, 0.1, 1]} position={[0, 0.2, 0.5]}>
                <meshStandardMaterial color="#1e293b" wireframe={isWireframe} />
            </DreiBox>
            <DreiBox args={[2, 0.1, 0.8]} position={[0, 0.2, -1.8]}>
                <meshStandardMaterial color="#1e293b" wireframe={isWireframe} />
            </DreiBox>
            <DreiBox args={[0.1, 1, 0.5]} position={[0, 0.5, -1.8]}>
                <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} wireframe={isWireframe} />
            </DreiBox>
        </group>
    );
}

const generateId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

const TacticalSimPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [agentPanelWidth, setAgentPanelWidth] = useState(400); 

  const centerPanelRef = React.useRef<HTMLDivElement>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = React.useState(250);

  React.useEffect(() => {
    if (centerPanelRef.current) {
        setBottomPanelHeight(Math.max(150, centerPanelRef.current.clientHeight / 3));
    }
  }, []);

  const handleBottomPanelMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleBottomPanelMouseMove);
    document.addEventListener('mouseup', handleBottomPanelMouseUp);
  };

  const handleBottomPanelMouseMove = (e: MouseEvent) => {
    const newHeight = window.innerHeight - e.clientY;
    if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
      setBottomPanelHeight(newHeight);
    }
  };

  const handleBottomPanelMouseUp = () => {
    document.removeEventListener('mousemove', handleBottomPanelMouseMove);
    document.removeEventListener('mouseup', handleBottomPanelMouseUp);
  };

  const [isAgentOpen, setIsAgentOpen] = useState(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('dream_agent_open');
        if (saved !== null) {
            try { return JSON.parse(saved); } catch(e){}
        }
    }
    return false;
  });

  React.useEffect(() => {
      localStorage.setItem('dream_agent_open', JSON.stringify(isAgentOpen));
  }, [isAgentOpen]);
  
  const [viewMode, setViewMode] = useState<ViewMode>('3D');
  const [isOriginLocked, setIsOriginLocked] = useState(false);
  const gridTemplateColumns = isAgentOpen ? `256px minmax(500px, 1fr) 60px 6px ${agentPanelWidth}px` : `256px minmax(500px, 1fr) 60px`;

  // Standardized Environment States
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe' | 'edges'>('solid');
  const [roomTheme, setRoomTheme] = useLocalStorageState<'dark'|'light'>('tactical-roomTheme', 'dark');
  const [showGrid, setShowGrid] = useLocalStorageState('tactical-grid', true);
  const [showLightMeshes, setShowLightMeshes] = useLocalStorageState('tactical-lightmeshes', false);
  const [globalLightsOn, setGlobalLightsOn] = useLocalStorageState('tactical-lights', true);
  const [globalLightIntensitySlider, setGlobalLightIntensitySlider] = useLocalStorageState('tactical-lux', 0);
  const [isGeneratingModel, setIsGeneratingModel] = useState(false);

  const { projects, setProjects, activeProjectId, setActiveProjectId } = useProject();

  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [isCloudSaving, setIsCloudSaving] = useState(false);

  useEffect(() => {
    if (projectId && projectId !== activeProjectId) {
        setActiveProjectId(projectId);
    } else if (!projectId && activeProjectId) {
        navigate(`/tacticalsim/${activeProjectId}`, { replace: true });
    }
  }, [projectId, activeProjectId, navigate, setActiveProjectId]);

  const fetchCloudProjects = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
        const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/cloudProjects`));
        setCloudProjects(snap.docs.map(d => d.data() as CloudProject));
    } catch (err) { }
  }, []);

  useEffect(() => { fetchCloudProjects(); }, [fetchCloudProjects]);

  const handleSaveToCloud = async () => {
    const activeProject = projects.find(p => p.id === activeProjectId);
    if (!activeProject || !auth.currentUser) return;
    try {
        setIsCloudSaving(true);
        const dataStr = JSON.stringify(activeProject);
        const sizeBytes = new Blob([dataStr]).size;
        
        const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${activeProject.id}.dream`);
        await uploadString(fileRef, dataStr, 'raw');

        const cloudMeta = { id: activeProject.id, name: activeProject.name, sizeBytes, uploadedAt: Date.now() };
        await setDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, activeProject.id), cloudMeta);
        
        await fetchCloudProjects();
        window.dispatchEvent(new Event('update-cloud-quota'));
    } catch (err: any) {
        alert(err.message);
    } finally {
        setIsCloudSaving(false);
    }
  };

  const handleDownloadFromCloud = async (cloudProj: CloudProject) => {
      if (!auth.currentUser) return;
      try {
          const ext = cloudProj.appExtension || '.dream';
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}${ext}`);
          const url = await getDownloadURL(fileRef);
          const response = await fetch(url);
          const text = await response.text();
          const projectData = JSON.parse(text) as DesignProject;
          if (projectData.id) {
              setProjects(prev => {
                  const filtered = prev.filter(p => p.id !== projectData.id);
                  return [projectData, ...filtered];
              });
              const routeStr = ext === '.dreampro' ? '/prostudio' : ext === '.fabflow' ? '/fabflow' : ext === '.studiosim' ? '/studiosim' : ext === '.wsim' ? '/worldsim' : ext === '.tsim' ? '/tacticalsim' : '/studio';
              navigate(`${routeStr}/${projectData.id}`);
          }
      } catch (err: any) { alert(err.message); }
  };

  const handleDeleteFromCloud = async (cloudProj: CloudProject) => {
      if (!auth.currentUser || !window.confirm("Permanently delete this cloud asset?")) return;
      try {
          const ext = cloudProj.appExtension || '.dream';
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}${ext}`);
          await deleteObject(fileRef);
          await deleteDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, cloudProj.id));
          await fetchCloudProjects();
          window.dispatchEvent(new Event('update-cloud-quota'));
      } catch (err: any) { alert(err.message); }
  };

  const handleNewProject = () => {
    const id = generateId();
    setProjects(prev => [{ id, name: `Tactical_${prev.length + 1}`, prompt: "", createdAt: Date.now(), specs: null, assetUrls: null, simulationData: null, openScadCode: null, status: DesignStatus.IDLE, isConstrained: false, circuitComponents: null }, ...prev]);
    navigate(`/tacticalsim/${id}`);
  };

  const activeProject = projects.find(p => p.id === activeProjectId);
  const cloudStorageUsed = cloudProjects.reduce((acc, p) => acc + p.sizeBytes, 0);

  return (
    <div className="h-full flex flex-col gap-2 p-2 relative bg-black/90">
      
      {/* Two-Tier Top Multi-CAD Toolbar */}
      <ThemePanel className="w-full shrink-0">
          <FileMenuBar projectName={activeProject?.name || 'TacticalSim Workspace'} appType="tsim" onToggleAgent={() => setIsAgentOpen(!isAgentOpen)} isAgentOpen={isAgentOpen} />
          </ThemePanel>

      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        
        {/* Left Local/Cloud Explorer */}
        <ProjectSidebar 
            projects={projects} 
            activeProjectId={activeProjectId} 
            onNewProject={handleNewProject} 
            onRenameProject={(id, name) => setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p))} 
            triggerHierarchyView={null} 
            onHierarchyViewClosed={() => {}} 
            cloudProjects={cloudProjects}
            onLoadCloudProject={handleDownloadFromCloud}
            onDeleteCloudProject={handleDeleteFromCloud}
            onDeleteLocalProject={async (id) => {
                setProjects(prev => prev.filter(p => p.id !== id));
                if (activeProjectId === id) setActiveProjectId(null);
            }}
            cloudLoadingAction={null}
            baseRoute="/tacticalsim"
            hideNewProjectButton
        />
        
        {/* Central Map / Canvas Area with Split */}
        <div className="flex flex-col h-full gap-2 relative z-10 overflow-hidden min-w-0" ref={centerPanelRef}>
            <ThemePanel translucent className="flex-1 flex flex-col overflow-hidden relative z-10 p-0 border border-blue-500/10 shadow-[inset_0_0_50px_rgba(59,130,246,0.05)] rounded-lg"> 
            <div className="px-4 py-2 shrink-0 bg-transparent flex flex-col items-center bg-black/60 z-20 relative border-b border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">

              
              {/* FIRST ROW: File Menu & Main Views */}
              <div className="flex justify-start items-center w-full gap-1">
                  {/* File Main Actions */}
                  <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm overflow-x-auto no-scrollbar shrink-0">
                      <button onClick={handleNewProject} className="p-1.5 text-zinc-300 hover:text-emerald-400 hover:bg-emerald-900/40 rounded transition-colors" title="New Project">
                          <PlusCircle className="w-5 h-5 drop-shadow-md" />
                      </button>
                      <button onClick={() => alert("Local Save Stub")} className="p-1.5 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/40 rounded transition-colors flex items-center justify-center gap-1.5" title="Save File Locally">
                          <Save className="w-5 h-5 drop-shadow-md fill-blue-500/10" />
                          <ArrowDownToLine className="w-3.5 h-3.5 opacity-80" />
                      </button>
                      <div className="w-px h-5 bg-zinc-700/80 mx-0.5 rounded"></div>
                      <button onClick={() => { setIsGeneratingModel(true); setTimeout(() => setIsGeneratingModel(false), 2000); }} disabled={isGeneratingModel} className={`p-1 hover:bg-emerald-900/40 rounded transition-colors flex items-center ${isGeneratingModel ? 'opacity-50 cursor-not-allowed' : ''}`} title="Import from FabFlow">
                          <div className="relative p-1 flex items-center justify-center">
                              {isGeneratingModel ? <RefreshCw className="w-5 h-5 text-emerald-500 drop-shadow-md animate-spin" /> : <Hammer className="w-5 h-5 text-emerald-500 drop-shadow-md" />}
                          </div>
                      </button>
                      <button onClick={handleSaveToCloud} disabled={isCloudSaving} className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/40 rounded transition-colors flex items-center gap-1.5 disabled:opacity-50" title="Commit to Remote Cloud">
                          {isCloudSaving ? <RefreshCw className="w-5 h-5 animate-spin drop-shadow-md" /> : <UploadCloud className="w-5 h-5 drop-shadow-md fill-blue-500/20" />}
                      </button>
                      <div className="w-px h-5 bg-zinc-700/80 mx-0.5 rounded"></div>
                      <button onClick={() => { setActiveProjectId(null); navigate('/tacticalsim'); }} className="p-1.5 text-zinc-300 hover:text-orange-400 hover:bg-orange-900/40 rounded transition-colors" title="Close Project">
                          <XSquare className="w-5 h-5 drop-shadow-md" />
                      </button>
                  </div>
                  
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm shrink-0">
                      <button onClick={() => window.dispatchEvent(new CustomEvent('viewport-zoom', { detail: 'in' }))} className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-900/40 rounded transition-colors" title="Zoom In">
                          <ZoomIn className="w-5 h-5 drop-shadow-md" />
                      </button>
                      <button onClick={() => window.dispatchEvent(new CustomEvent('viewport-zoom', { detail: 'out' }))} className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-900/40 rounded transition-colors" title="Zoom Out">
                          <ZoomOut className="w-5 h-5 drop-shadow-md" />
                      </button>
                      <div className="w-px h-4 bg-zinc-700/80 mx-1 rounded"></div>
                      <button onClick={() => window.dispatchEvent(new CustomEvent('viewport-zoom', { detail: 'fit' }))} className="p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-900/40 rounded transition-colors" title="Zoom to Fit All">
                          <Maximize className="w-5 h-5 drop-shadow-md" />
                      </button>
                  </div>
              </div>

              {/* SECOND ROW: App-Specific Workspace Menubars */}
              <div className="flex justify-start items-center w-full gap-1 mt-1">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto">
                        
                        {/* Viewport Render Modes */}
                        <div className="flex items-center gap-1 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                            <button onClick={() => setRenderMode('wireframe')} className={`relative flex items-center justify-center p-1.5 w-8 h-8 rounded-md transition-all duration-200 border ${renderMode === 'wireframe' ? 'bg-[#ff3333]/20 text-[#ff3333] border-[#ff3333]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/70'}`} title="Wireframe View">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-full h-full">
                                   <circle cx="12" cy="12" r="9" />
                                   <ellipse cx="12" cy="12" rx="9" ry="3.5" />
                                   <ellipse cx="12" cy="12" rx="4" ry="9" />
                                </svg>
                            </button>
                            <button onClick={() => setRenderMode('edges')} className={`relative flex items-center justify-center p-1.5 w-8 h-8 rounded-md transition-all duration-200 border ${renderMode === 'edges' ? 'bg-[#ff3333]/20 text-[#ff3333] border-[#ff3333]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/70'}`} title="Solid + Edge View">
                                <svg viewBox="0 0 24 24" className="w-full h-full">
                                    <polygon points="12 3 4 7.5 12 12 20 7.5" fill="currentColor" fillOpacity="0.8" />
                                    <polygon points="4 16.5 4 7.5 12 12 12 21" fill="currentColor" fillOpacity="0.4" />
                                    <polygon points="12 21 12 12 20 7.5 20 16.5" fill="currentColor" fillOpacity="0.6" />
                                    <path d="M20 16.5V7.5L12 3 4 7.5v9l8 4.5z" fill="none" stroke={renderMode === 'edges' ? '#ff3333' : '#18181b'} strokeWidth="1.5" strokeLinejoin="round" />
                                    <polyline points="4 7.5 12 12 20 7.5" fill="none" stroke={renderMode === 'edges' ? '#ff3333' : '#18181b'} strokeWidth="1.5" strokeLinejoin="round" />
                                    <line x1="12" y1="21" x2="12" y2="12" stroke={renderMode === 'edges' ? '#ff3333' : '#18181b'} strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </button>
                            <button onClick={() => setRenderMode('solid')} className={`relative flex items-center justify-center p-1.5 w-8 h-8 rounded-md transition-all duration-200 border ${renderMode === 'solid' ? 'bg-[#ff3333]/20 text-[#ff3333] border-[#ff3333]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/70'}`} title="Solid Shaded View">
                                <svg viewBox="0 0 24 24" className="w-full h-full">
                                    <circle cx="12" cy="12" r="9" fill="url(#smooth-grad-sim-tac)" />
                                    <defs>
                                        <radialGradient id="smooth-grad-sim-tac" cx="35%" cy="35%" r="65%">
                                            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
                                        </radialGradient>
                                    </defs>
                                </svg>
                            </button>
                        </div>

                        {/* Lighting Toolbar */}
                        <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm shrink-0">
                            <button onClick={() => setRoomTheme(roomTheme === 'dark' ? 'light' : 'dark')} className="p-1.5 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Toggle Environment">
                               {roomTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <div className="w-px h-5 bg-zinc-700/80 mx-1 rounded"></div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowGrid(!showGrid)} className="p-1.5 outline-none transition-colors border-r border-zinc-700/80 pr-2 mr-1 block" title="Toggle Grid">
                                   <Grid3X3 className={`w-5 h-5 ${showGrid ? 'text-red-500 hover:text-red-400' : 'text-zinc-600 hover:text-zinc-500'}`} />
                                </button>
                                <button onClick={() => setShowLightMeshes(!showLightMeshes)} className="p-1.5 outline-none transition-colors border-r border-zinc-700/80 pr-2 mr-1 block" title="Show/Hide Physical Light Frames">
                                   {showLightMeshes ? <Eye className="w-5 h-5 text-zinc-300 hover:text-white" /> : <EyeOff className="w-5 h-5 text-zinc-600 hover:text-zinc-500" />}
                                </button>
                                <button onClick={() => setGlobalLightsOn(!globalLightsOn)} className="p-1.5 outline-none transition-colors block" title="Toggle All Lights">
                                   {globalLightsOn ? <Lightbulb className="w-5 h-5 text-red-500 hover:text-red-400" /> : <LightbulbOff className="w-5 h-5 text-zinc-600 hover:text-zinc-500" />}
                                </button>
                                <input 
                                  type="range" min="-1000" max="1000" step="1" 
                                  value={globalLightIntensitySlider} 
                                  onChange={e => setGlobalLightIntensitySlider(Number(e.target.value))} 
                                  className="w-24 accent-red-500 outline-none cursor-pointer" 
                                />
                                <span className="text-xs font-mono w-8 text-zinc-300 flex items-center ml-1">{globalLightIntensitySlider > 0 ? `+${globalLightIntensitySlider}` : globalLightIntensitySlider}</span>
                            </div>
                        </div>
                    </div>

                    {/* Transform Tools & Timing */}
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="text-xs font-mono text-zinc-500 bg-black/50 px-3 h-[44px] flex items-center rounded-lg border border-zinc-800 tracking-widest hidden lg:flex">
                            FRAME: <span className="text-red-400 ml-2">0000</span> / 1200
                        </div>
                        <div className="flex items-center gap-1 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-inner h-[44px]">
                            <button className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors" title="Play Simulation">
                                <Play className="w-5 h-5 fill-current" />
                            </button>
                        </div>
                    </div>
                </div>
          </div>

            <div className="flex-1 min-h-0 w-full cursor-crosshair relative bg-[#09090b] overflow-hidden z-0">
                <Canvas shadows camera={{ position: [30, 20, 30], fov: 45 }} gl={{ antialias: true }}>
                    <color attach="background" args={[roomTheme === 'dark' ? '#09090b' : '#808080']} />
                    <fog attach="fog" args={[roomTheme === 'dark' ? '#09090b' : '#808080', 50, 400]} />
                    
                    <StudioLighting modelSize={{x:20, y:20, z:20}} showLightMeshes={showLightMeshes} globalIntensitySlider={globalLightIntensitySlider} globalLightsOn={globalLightsOn} roomTheme={roomTheme} />
                    
                    {showGrid && (
                        <Grid 
                            renderOrder={-1} 
                            position={[0, -0.01, 0]} 
                            infiniteGrid 
                            cellSize={10} 
                            cellThickness={0.5} 
                            sectionSize={50} 
                            sectionThickness={1.5} 
                            cellColor={roomTheme === 'dark' ? '#7f1d1d' : '#fecaca'} 
                            sectionColor={roomTheme === 'dark' ? '#b91c1c' : '#fca5a5'} 
                            fadeDistance={200} 
                        />
                    )}
                    
                    <React.Suspense fallback={null}>
                        <Environment preset="night" />
                        <DroneModel renderMode={renderMode} />
                    </React.Suspense>
                    
                    <CameraPresets mode={viewMode} />
                    <RoomWalls />
                    
                    <MapControls makeDefault enablePan={!isOriginLocked} enableZoom={!isOriginLocked} enableRotate={!isOriginLocked} maxPolarAngle={Math.PI / 2 - 0.05} minDistance={5} maxDistance={200} />
                    
                    <GizmoHelper alignment="top-right" margin={[60, 60]}>
                        <GizmoViewport axisColors={['#ef4444', '#10b981', '#3b82f6']} labelColor="black" />
                    </GizmoHelper>
                </Canvas>

                <SimHUD colorClass="red" />
            </div>
            </ThemePanel>

                        {/* Horizontal Resizer Handle */}
            <div 
              onMouseDown={handleBottomPanelMouseDown}
              className="resize-handle h-1.5 w-full bg-zinc-800 flex-shrink-0 cursor-row-resize hover:bg-blue-500 transition-colors z-30"
            ></div>

            {/* Bottom 25% Atmospheric Diagnostics */}
            <ThemePanel translucent className="shrink-0 flex flex-col overflow-hidden relative z-10 border-blue-500/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]" style={{ height: bottomPanelHeight }}>
                <div className="px-5 py-3 border-b border-zinc-800/80 bg-black/60 shrink-0">
                    <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Radar className="w-3 h-3 text-blue-500" /> Atmospheric Diagnostics</h2>
                </div>
                <div className="flex-1 p-6 flex flex-col items-center justify-center">
                   <span className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest text-center">Flight telemetry bound to {activeProject?.name || 'Null'}</span>
                </div>
            </ThemePanel>
        </div>

        {/* Right Vertical Views Bar */}
        <div className="flex flex-col h-full bg-black/50 backdrop-blur-sm rounded-lg overflow-y-auto overflow-x-hidden border border-zinc-800/80 items-center py-2 space-y-2 relative z-20">
            <div className="text-[8px] text-zinc-500 uppercase font-black rotate-180 tracking-widest mb-2" style={{ writingMode: 'vertical-rl' }}>Views</div>
            <button onClick={() => setIsOriginLocked(!isOriginLocked)} className={`p-1.5 rounded transition-colors group flex flex-col items-center gap-1 mb-1 border ${isOriginLocked ? 'bg-[#00ffcc]/30 border-[#00ffcc]/40 text-[#00ffcc] shadow-inner' : 'bg-transparent border-transparent text-zinc-500 hover:bg-[#00ffcc]/20 hover:text-[#00ffcc]'}`} title={isOriginLocked ? 'Unlock Camera Matrix' : 'Lock Origin Viewport'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span className="text-[7px] font-black uppercase tracking-widest">Lock</span>
            </button>
            <div className="w-6 h-px bg-zinc-800 my-1 rounded-full"></div>
            {[
                { face: '3D', title: 'Default 3D View' },
                { face: 'TOP', title: 'Top Projection' },
                { face: 'BOTTOM', title: 'Bottom Projection' },
                { face: 'FRONT', title: 'Front Projection' },
                { face: 'REAR', title: 'Rear Projection' },
                { face: 'LEFT', title: 'Left Projection' },
                { face: 'RIGHT', title: 'Right Projection' }
            ].map(v => (
                <button key={v.face} onClick={() => setViewMode(v.face as ViewMode)} className={`p-1.5 rounded transition-colors group flex flex-col items-center gap-1 ${viewMode === v.face ? 'bg-[#00ffcc]/20 shadow-inner' : 'hover:bg-[#00ffcc]/10'}`} title={v.title}>
                    <ViewCubeIcon face={v.face} />
                    <span className={`text-[7px] font-black uppercase tracking-widest ${viewMode === v.face ? 'text-[#00ffcc]' : 'text-zinc-600 group-hover:text-[#00ffcc]'}`}>{v.face}</span>
                </button>
            ))}
        </div>
            
            {isAgentOpen && (
                <>
                    {/* Resizer Handle */}
                    <div className="resize-handle w-1.5 h-full bg-zinc-800 flex-shrink-0 cursor-col-resize hover:bg-orange-500 transition-colors z-30"></div>

                    {/* Right AI Agent Sidebar */}
                    <ThemePanel translucent className="h-full overflow-hidden flex flex-col relative z-20 border-orange-500/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] p-0 w-full col-start-5 col-end-6">
                        <AgentSidebar 
                            onSubmit={() => alert("Simulation environments rely on ProStudio for direct constraints.")}
                            isThinking={false}
                            onClose={() => setIsAgentOpen(false)}
                        />
                    </ThemePanel>
                </>
            )}

      </div>
    </div>
  );
};

export default TacticalSimPage;
