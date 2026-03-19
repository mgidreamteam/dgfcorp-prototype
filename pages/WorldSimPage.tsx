/// <reference types="vite/client" />
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectSidebar from '../components/ProjectSidebar';
import DesignInput from '../components/DesignInput';
import FileMenuBar from '../components/MenuBar';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import { CloudProject, DesignProject, DesignStatus, AgentLog } from '../types';
import { generateHardwareSpecs } from '../services/gemini';
import { AlertCircle, Loader2, Map as MapIcon, Globe, Navigation, Search, ZoomIn, ZoomOut, Compass, Wind, Plane, Eye } from 'lucide-react';
import { useAutoSave, loadStateFromStorage } from '../hooks/useAutoSave';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { APIProvider } from '@vis.gl/react-google-maps';
import ThemePanel from '../components/ThemePanel';

const generateId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

const PROHIBITED_KEYWORDS = ['weapon', 'gun', 'firearm', 'missile', 'bomb', 'classified'];
const isPromptProhibited = (prompt: string) => PROHIBITED_KEYWORDS.some(k => prompt.toLowerCase().includes(k));

const WorldSimPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<DesignProject[]>(() => loadStateFromStorage().projects);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>(() => loadStateFromStorage().logs);
  const [triggerHierarchyView, setTriggerHierarchyView] = useState<string | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  
  // Camera State Arrays (X-Plane Logic Mechanics)
  const [camera, setCamera] = useState({
      center: { lat: 38.8977, lng: -77.0365, altitude: 0 },
      tilt: 45,
      heading: 0,
      range: 5000000 // 5000km altitude from local ground, heavily zoomed out orbital initialization
  });
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [isFlyby, setIsFlyby] = useState(false);

  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);

  const [alonPanelWidth, setAlonPanelWidth] = useState(400);
  const isResizing = useRef(false);
  const dragStartX = useRef(0);
  const startWidth = useRef(0);
  const hasInitiallyLoaded = useRef(false);

  useAutoSave(projects, agentLogs);

  useEffect(() => {
    if (!hasInitiallyLoaded.current && !projectId && projects.length > 0) {
      const mostRecentProject = [...projects].sort((a, b) => b.createdAt - a.createdAt)[0];
      if (mostRecentProject) {
        navigate(`/worldsim/${mostRecentProject.id}`, { replace: true });
        hasInitiallyLoaded.current = true;
        return;
      }
    }
    hasInitiallyLoaded.current = true;
    setActiveProjectId(projectId || null);
  }, [projectId, projects, navigate]);

  const fetchCloudProjects = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
        const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/cloudProjects`));
        setCloudProjects(snap.docs.map(d => d.data() as CloudProject));
    } catch (err) { }
  }, []);

  useEffect(() => { fetchCloudProjects(); }, [fetchCloudProjects]);

  const cloudStorageUsed = useMemo(() => cloudProjects.reduce((acc, p) => acc + p.sizeBytes, 0), [cloudProjects]);
  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);
  const isGenerating = useMemo(() => projects.some(p => p.status.startsWith('GENERATING_')), [projects]);

  const addLog = useCallback((log: Omit<AgentLog, 'id' | 'timestamp'>) => setAgentLogs(prev => [{ ...log, id: generateId(), timestamp: Date.now() }, ...prev]), []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const dx = e.clientX - dragStartX.current;
    const newWidth = startWidth.current - dx;
    const mainPanel = document.querySelector('main');
    const maxWidth = mainPanel ? mainPanel.clientWidth - 100 : 800;
    setAlonPanelWidth(Math.max(300, Math.min(maxWidth, newWidth)));
  }, []);
  
  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    dragStartX.current = e.clientX;
    startWidth.current = alonPanelWidth;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [alonPanelWidth, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleNewProject = () => {
    const id = generateId();
    setProjects(prev => [{ id, name: `Simulation_${prev.length + 1}`, prompt: "", createdAt: Date.now(), specs: null, assetUrls: null, simulationData: null, openScadCode: null, status: DesignStatus.IDLE, isConstrained: false, circuitComponents: null }, ...prev]);
    navigate(`/worldsim/${id}`);
  };

  const handleRenameProject = (id: string, newName: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const handleCreateDesign = async (prompt: string) => {
    if (!activeProjectId) return;
    addLog({ content: prompt, type: 'input', projectId: activeProjectId });
    setError(null);
    if (isPromptProhibited(prompt)) return setError("Request rejected.");

    try {
        setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, status: DesignStatus.GENERATING_SPECS, prompt } : p));
        const specs = await generateHardwareSpecs(prompt, activeProject?.specs || null, activeProject?.name || '');
        setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, specs, status: DesignStatus.COMPLETED } : p));
        addLog({ content: `Simulation specs analyzed.`, type: 'output', projectId: activeProjectId });
    } catch (err: any) {
        setError(err.message);
        addLog({ content: `Error: ${err.message}`, type: 'error', projectId: activeProjectId });
        setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, status: DesignStatus.ERROR } : p));
    }
  };

  // --- Flight Mechanics Controls ---
  const handleHomeLocation = () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
              setCamera(prev => ({ ...prev, center: { lat: position.coords.latitude, lng: position.coords.longitude, altitude: 0 }, range: 2000, tilt: 45 }));
          }, (err) => setError(`Geolocation Failed: ${err.message}`));
      } else {
          setError("Geolocation API unsupported.");
      }
  };

  const flybyRef = useRef<number | null>(null);
  const spinRef = useRef<number | null>(null);

  useEffect(() => {
    if (isSpinning) {
        const spin = () => { setCamera(c => ({ ...c, heading: (c.heading + 0.5) % 360 })); spinRef.current = requestAnimationFrame(spin); };
        spinRef.current = requestAnimationFrame(spin);
    } else if (spinRef.current) cancelAnimationFrame(spinRef.current);
    return () => { if (spinRef.current) cancelAnimationFrame(spinRef.current); };
  }, [isSpinning]);

  useEffect(() => {
    if (isFlyby) {
        const fly = () => { setCamera(c => ({ ...c, center: { ...c.center, lat: c.center.lat + 0.005 }, heading: (c.heading + 0.1) % 360 })); flybyRef.current = requestAnimationFrame(fly); };
        flybyRef.current = requestAnimationFrame(fly);
    } else if (flybyRef.current) cancelAnimationFrame(flybyRef.current);
    return () => { if (flybyRef.current) cancelAnimationFrame(flybyRef.current); };
  }, [isFlyby]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
          const STEP_TILT = 5;
          const STEP_HEADING = 5;
          const STEP_RANGE_MULT = 0.8; 

          setCamera(c => {
              let newC = { ...c };
              switch(e.key.toLowerCase()) {
                  case 'w': newC.tilt = Math.min(newC.tilt + STEP_TILT, 90); break;
                  case 's': newC.tilt = Math.max(newC.tilt - STEP_TILT, 0); break;
                  case 'a': newC.heading = (newC.heading - STEP_HEADING + 360) % 360; break;
                  case 'd': newC.heading = (newC.heading + STEP_HEADING) % 360; break;
                  case '=': case '+': newC.range = Math.max(newC.range * STEP_RANGE_MULT, 100); break;
                  case '-': case '_': newC.range = Math.min(newC.range / STEP_RANGE_MULT, 20000000); break;
                  case 'n': newC.heading = 0; break;
                  case 'c': newC.tilt = 75; newC.range = 500; break; // Chase View Snap
              }
              return newC;
          });
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <div className="h-full flex flex-col gap-2 p-2">
        <ThemePanel className="w-full shrink-0">
          <FileMenuBar 
            onNewProject={handleNewProject}
            onSave={() => {}}
            onImport={() => {}}
            onDownload={() => {}}
            onCloseProject={() => navigate('/dashboard')}
            onDeleteProject={() => setIsDeleteModalVisible(true)}
            onExportStl={() => {}}
            isStlReady={false}
            onExportImages={() => {}}
            areImagesExportable={false}
            isProjectActive={!!activeProject} 
            onSaveToCloud={async () => {}}
            onLoadFromCloud={() => setIsCloudModalOpen(true)}
            isCloudSaving={isCloudSaving}
            cloudStorageUsed={cloudStorageUsed}
          />
        </ThemePanel>
        <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns: `256px minmax(500px, 1fr) 6px ${alonPanelWidth}px` }}>
          <ProjectSidebar projects={projects} activeProjectId={activeProjectId} onNewProject={handleNewProject} onRenameProject={handleRenameProject} triggerHierarchyView={triggerHierarchyView} onHierarchyViewClosed={() => setTriggerHierarchyView(null)} />
          
          <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 p-0">
            {/* X-Plane Style HUD Controls */}
            <div className="absolute top-4 left-4 right-4 z-50 flex flex-wrap justify-between gap-2 pointer-events-none">
                <div className="flex gap-2 pointer-events-auto">
                    <button onClick={handleHomeLocation} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md bg-white/10 text-white border border-white/20 hover:bg-white/20`}>
                        <Navigation className="w-3 h-3" /> Home (Geolocate)
                    </button>
                    <button onClick={() => setCamera(c => ({...c, heading: 0}))} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md bg-zinc-900/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-800`} title="Hotkey: N">
                        <Compass className="w-3 h-3" /> North Up [N]
                    </button>
                </div>
                <div className="flex gap-2 pointer-events-auto">
                    <button onClick={() => setCamera(c => ({...c, range: c.range * 0.5}))} className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30 hover:bg-[#00ffcc]/20`} title="Hotkey: +">
                        <ZoomIn className="w-3 h-3" />
                    </button>
                    <button onClick={() => setCamera(c => ({...c, range: c.range * 1.5}))} className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30 hover:bg-[#00ffcc]/20`} title="Hotkey: -">
                        <ZoomOut className="w-3 h-3" />
                    </button>
                </div>
            </div>

            <div className="absolute bottom-4 left-4 z-50 flex gap-2 pointer-events-auto">
                <button onClick={() => setCamera(c => ({...c, tilt: c.tilt >= 45 ? 0 : 75}))} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md ${camera.tilt > 0 ? 'bg-[#00ffcc] text-black shadow-[0_0_15px_rgba(0,255,204,0.4)]' : 'bg-zinc-900/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-800'}`} title="Hotkey: W/S">
                    <Eye className="w-3 h-3" /> Perspective [W/S]
                </button>
                <button onClick={() => setIsSpinning(s => !s)} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md ${isSpinning ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-zinc-900/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-800'}`}>
                    <Globe className="w-3 h-3" /> Spin View [A/D]
                </button>
                <button onClick={() => { setCamera(c => ({...c, tilt: 75, range: 400})); setIsFlyby(false); }} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md bg-zinc-900/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-800`} title="Hotkey: C">
                    <Plane className="w-3 h-3" /> Chase View [C]
                </button>
                <button onClick={() => setIsFlyby(f => !f)} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md ${isFlyby ? 'bg-red-500 text-black shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-zinc-900/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-800'}`}>
                    <Wind className="w-3 h-3" /> Cinematic Flyby
                </button>
            </div>

            <div className="w-full h-full bg-black">
                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''} version="alpha">
                    {/* @ts-ignore */}
                    <gmp-map-3d 
                        center={`${camera.center.lat},${camera.center.lng},${camera.center.altitude}`}
                        heading={camera.heading} 
                        tilt={camera.tilt} 
                        range={camera.range} 
                    ></gmp-map-3d>
                </APIProvider>
            </div>

            {error && !isGenerating && (
                <div className="absolute top-16 left-4 right-4 z-50 bg-red-900/90 backdrop-blur-md border border-red-500/50 p-4 rounded-lg flex items-start gap-3 text-white shadow-2xl pointer-events-auto">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div><p className="font-bold tracking-widest uppercase">Simulation Failed</p><p className="text-sm opacity-90">{error}</p></div>
                </div>
            )}
          </ThemePanel>

          <div onMouseDown={handleMouseDown} className="resize-handle w-1.5 h-full cursor-col-resize bg-zinc-800 hover:bg-zinc-700 transition-colors flex-shrink-0 rounded-full"></div>
          
          <ThemePanel translucent className="h-full overflow-hidden relative z-10">
             <div className="flex flex-col h-full overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 shrink-0 bg-transparent">
                    <h2 className="text-subheading font-normal text-white uppercase tracking-tighter">WORLDSIM ORCHESTRATION</h2>
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                    <DesignInput onSubmit={handleCreateDesign} isGenerating={isGenerating} agentLogs={agentLogs.filter(log => !log.projectId || log.projectId === activeProjectId)} activeProject={activeProject} onUpdateProjectConstraint={() => {}} />
                </div>
             </div>
          </ThemePanel>
        </div>
      </div>
    </>
  );
};

export default WorldSimPage;
