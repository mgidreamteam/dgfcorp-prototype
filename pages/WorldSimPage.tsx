/// <reference types="vite/client" />
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectSidebar from '../components/ProjectSidebar';
import DesignInput from '../components/DesignInput';
import FileMenuBar from '../components/MenuBar';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import { CloudProject, DesignProject, DesignStatus, AgentLog } from '../types';
import { generateHardwareSpecs } from '../services/gemini';
import { AlertCircle, CloudDownload, Trash2, Loader2, Map as MapIcon, Globe, Navigation } from 'lucide-react';
import { useAutoSave, loadStateFromStorage } from '../hooks/useAutoSave';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemePanel from '../components/ThemePanel';
import { auth, db, storage } from '../services/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';

const generateId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

const PROHIBITED_KEYWORDS = ['weapon', 'gun', 'firearm', 'missile', 'bomb', 'classified'];
const isPromptProhibited = (prompt: string) => PROHIBITED_KEYWORDS.some(k => prompt.toLowerCase().includes(k));

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 38.8977, lng: -77.0365 };

const WorldSimPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '' });

  const [mapType, setMapType] = useState<google.maps.MapTypeId | 'hybrid' | 'roadmap' | 'satellite'>('satellite');
  
  const [projects, setProjects] = useState<DesignProject[]>(() => loadStateFromStorage().projects);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>(() => loadStateFromStorage().logs);
  const [triggerHierarchyView, setTriggerHierarchyView] = useState<string | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(4);
  
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

  const handleHomeLocation = () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
              setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
              setMapZoom(16);
              setMapType('satellite'); // Enforce Earth view actively when locked on home
              addLog({ content: `Homing sequence engaged to coordinates: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`, type: 'output', projectId: activeProjectId || 'sys' });
          }, (err) => {
              setError(`Geolocation Failed: ${err.message}`);
          });
      } else {
          setError("Geolocation API is fundamentally unsupported by your browser.");
      }
  };

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
            <div className="absolute top-4 left-4 z-50 flex flex-wrap gap-2">
                <button 
                  onClick={handleHomeLocation}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:-translate-y-0.5`}
                >
                  <Navigation className="w-4 h-4" /> Home Location
                </button>
                <button 
                  onClick={() => { setMapType('satellite'); setMapZoom(prev => Math.max(prev, 12)); }} 
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md ${mapType === 'satellite' ? 'bg-[#00ffcc] text-black ring-2 ring-[#00ffcc]/50 shadow-[0_0_15px_rgba(0,255,204,0.4)]' : 'bg-black/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-800'}`}
                >
                  <Globe className="w-4 h-4" /> 3D Earth
                </button>
                <button 
                  onClick={() => { setMapType('roadmap'); setMapZoom(prev => Math.min(prev, 15)); }} 
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md ${mapType === 'roadmap' ? 'bg-[#00ffcc] text-black ring-2 ring-[#00ffcc]/50 shadow-[0_0_15px_rgba(0,255,204,0.4)]' : 'bg-black/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-800'}`}
                >
                  <MapIcon className="w-4 h-4" /> 2D Vector
                </button>
            </div>
            {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={mapZoom}
                  onZoomChanged={() => {}} // Could capture zoom state via ref if natively panned
                  mapTypeId={mapType}
                  options={{ disableDefaultUI: true, tilt: mapType === 'satellite' ? 45 : 0 }}
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-black/50 text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    Initializing WorldSim Framework Array...
                </div>
            )}
            {error && !isGenerating && (
                <div className="absolute top-16 left-4 right-4 z-50 bg-red-900/90 backdrop-blur-md border border-red-500/50 p-4 rounded-lg flex items-start gap-3 text-white shadow-2xl">
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
