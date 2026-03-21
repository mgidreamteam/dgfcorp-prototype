/// <reference types="vite/client" />
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectSidebar from '../components/ProjectSidebar';
import DesignInput from '../components/DesignInput';
import FileMenuBar from '../components/MenuBar';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import { CloudProject, DesignProject, DesignStatus, AgentLog } from '../types';
import { generateHardwareSpecs } from '../services/gemini';
import { AlertCircle, Loader2, Map as MapIcon, Globe, Navigation, ZoomIn, ZoomOut, Compass, Wind, Plane, Eye } from 'lucide-react';
import { useAutoSave, loadStateFromStorage } from '../hooks/useAutoSave';
import { useAuth } from '../contexts/AuthContext';
import { auth, db, storage } from '../services/firebase';
import { collection, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, deleteObject, uploadString, getDownloadURL } from 'firebase/storage';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import ThemePanel from '../components/ThemePanel';

const generateId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

const PROHIBITED_KEYWORDS = ['weapon', 'gun', 'firearm', 'missile', 'bomb', 'classified'];
const isPromptProhibited = (prompt: string) => PROHIBITED_KEYWORDS.some(k => prompt.toLowerCase().includes(k));

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 35.0, lng: -72.0 }; // Center of Atlantic Coast

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
  const [mapZoom, setMapZoom] = useState(16);
  const [mapHeading, setMapHeading] = useState(0);
  const [mapTilt, setMapTilt] = useState(45);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  
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
      const lastActiveId = localStorage.getItem('lastActiveWorldSimProjectId');
      const targetId = (lastActiveId && projects.some(p => p.id === lastActiveId))
          ? lastActiveId 
          : [...projects].sort((a, b) => b.createdAt - a.createdAt)[0]?.id;
          
      if (targetId) {
        navigate(`/worldsim/${targetId}`, { replace: true });
        hasInitiallyLoaded.current = true;
        return;
      }
    }
    hasInitiallyLoaded.current = true;
    setActiveProjectId(projectId || null);
    if (projectId) {
      localStorage.setItem('lastActiveWorldSimProjectId', projectId);
    }
  }, [projectId, projects, navigate]);

  const fetchCloudProjects = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
        const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/cloudProjects`));
        setCloudProjects(snap.docs.map(d => d.data() as CloudProject));
    } catch (err) { }
  }, []);

  useEffect(() => { fetchCloudProjects(); }, [fetchCloudProjects]);

  const handleSaveToCloud = async () => {
    if (!activeProject || !auth.currentUser) return;
    try {
        setIsCloudSaving(true);
        const dataStr = JSON.stringify(activeProject);
        const sizeBytes = new Blob([dataStr]).size;
        if (sizeBytes > 10 * 1024 * 1024) throw new Error("Payload exceeds limit.");

        const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${activeProject.id}.dream`);
        await uploadString(fileRef, dataStr, 'raw');

        const cloudMeta: CloudProject = { id: activeProject.id, name: activeProject.name, sizeBytes, uploadedAt: Date.now() };
        await setDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, activeProject.id), cloudMeta);
        
        await fetchCloudProjects();
        window.dispatchEvent(new Event('update-cloud-quota'));
    } catch (err: any) {
        alert(`Cloud Delivery Blocked: ${err.message}`);
    } finally {
        setIsCloudSaving(false);
    }
  };

  const handleDownloadFromCloud = async (cloudProj: CloudProject) => {
      if (!auth.currentUser) return;
      try {
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}.dream`);
          const url = await getDownloadURL(fileRef);
          const response = await fetch(url);
          const text = await response.text();
          const projectData = JSON.parse(text) as DesignProject;
          if (projectData.id && projectData.name) {
              setProjects(prev => {
                  const filtered = prev.filter(p => p.id !== projectData.id);
                  return [projectData, ...filtered];
              });
              navigate(`/worldsim/${projectData.id}`);
          }
      } catch (err: any) {
          alert(`Cloud Fetch Failed: ${err.message}`);
      }
  };

  const handleDeleteFromCloud = async (cloudProj: CloudProject) => {
      if (!auth.currentUser || !window.confirm("Permanently delete this cloud asset?")) return;
      try {
          setIsCloudSaving(true);
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}.dream`);
          await deleteObject(fileRef);
          await deleteDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, cloudProj.id));
          addLog({ content: `Permanently unlinked "${cloudProj.name}" from the global bucket.`, type: 'output' });
          await fetchCloudProjects();
          window.dispatchEvent(new Event('update-cloud-quota'));
      } catch (err: any) {
          setError(`Cloud Purge Blocked: ${err.message}`);
      } finally {
          setIsCloudSaving(false);
      }
  };

  const cloudStorageUsed = useMemo(() => cloudProjects.reduce((acc, p) => acc + p.sizeBytes, 0), [cloudProjects]);
  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);
  const isGenerating = useMemo(() => projects.some(p => p.status.startsWith('GENERATING_')), [projects]);

  const addLog = useCallback((log: Omit<AgentLog, 'id' | 'timestamp'>) => setAgentLogs(prev => [{ ...log, id: generateId(), timestamp: Date.now() }, ...prev]), []);

  useEffect(() => {
    const handleTokens = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (!activeProjectId) return;
        const { totalTokenCount, promptTokenCount, candidatesTokenCount } = customEvent.detail;
        addLog({ 
            content: `Tokens: ${totalTokenCount} Total [${promptTokenCount} in / ${candidatesTokenCount} out]`, 
            type: 'system', 
            projectId: activeProjectId 
        });
    };
    window.addEventListener('gemini_token_usage', handleTokens);
    return () => window.removeEventListener('gemini_token_usage', handleTokens);
  }, [activeProjectId, addLog]);

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

  const geocodeLocation = async (query: string, currentProjectId: string) => {
    if (!window.google) return false;
    const geocoder = new window.google.maps.Geocoder();
    try {
      const results = await geocoder.geocode({ address: query });
      if (results.results && results.results.length > 0) {
        const loc = results.results[0].geometry.location;
        setMapCenter({ lat: loc.lat(), lng: loc.lng() });
        setMapZoom(16);
        addLog({ content: `Navigating to: ${results.results[0].formatted_address}`, type: 'output', projectId: currentProjectId });
        return true;
      }
    } catch (e) {
      // Not a location, fallback to generation
    }
    return false;
  };

  const handleCreateDesign = async (prompt: string) => {
    if (!activeProjectId) return;
    addLog({ content: prompt, type: 'input', projectId: activeProjectId });
    setError(null);
    if (isPromptProhibited(prompt)) return setError("Request rejected.");

    const isLocation = await geocodeLocation(prompt, activeProjectId);
    if (isLocation) return;

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

  const handleDownloadProject = () => {
    if (!activeProject) return;
    const dataStr = JSON.stringify(activeProject, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${activeProject.name.replace(/ /g, '_')}.tSim`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- Flight Mechanics Controls ---
  const handleHomeLocation = () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
              setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
              setMapZoom(16);
              setMapTilt(45);
          }, (err) => setError(`Geolocation Failed: ${err.message}`));
      } else {
          setError("Geolocation API unsupported.");
      }
  };

  const spinRef = useRef<number | null>(null);
  const flybyRef = useRef<number | null>(null);

  useEffect(() => {
    if (isSpinning) {
        let currentHeading = mapHeading;
        const spin = () => { 
            currentHeading = (currentHeading + 1) % 360;
            setMapHeading(currentHeading);
            spinRef.current = requestAnimationFrame(spin); 
        };
        spinRef.current = requestAnimationFrame(spin);
    } else if (spinRef.current) cancelAnimationFrame(spinRef.current);
    return () => { if (spinRef.current) cancelAnimationFrame(spinRef.current); };
  }, [isSpinning]);

  useEffect(() => {
    if (isFlyby) {
        let currentHeading = mapHeading;
        let lat = mapCenter.lat;
        let lng = mapCenter.lng;
        const fly = () => { 
            currentHeading = (currentHeading + 0.2) % 360;
            lat += 0.0001; 
            lng += 0.0001;
            setMapHeading(currentHeading);
            setMapCenter({lat, lng});
            flybyRef.current = requestAnimationFrame(fly); 
        };
        flybyRef.current = requestAnimationFrame(fly);
    } else if (flybyRef.current) cancelAnimationFrame(flybyRef.current);
    return () => { if (flybyRef.current) cancelAnimationFrame(flybyRef.current); };
  }, [isFlyby, mapCenter.lat, mapCenter.lng]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
          const STEP = 5;

          switch(e.key.toLowerCase()) {
              case 'a': setMapHeading(h => (h - STEP + 360) % 360); break;
              case 'd': setMapHeading(h => (h + STEP) % 360); break;
              case '=': case '+': setMapZoom(z => Math.min(z + 1, 22)); break;
              case '-': case '_': setMapZoom(z => Math.max(z - 1, 0)); break;
              case 'n': setMapHeading(0); break;
              case 'c': setMapTilt(45); setMapZoom(18); break; 
          }
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
            onDownload={handleDownloadProject}
            onCloseProject={() => navigate('/dashboard')}
            onDeleteProject={() => setIsDeleteModalVisible(true)}
            onExportStl={() => {}}
            isStlReady={false}
            onExportImages={() => {}}
            areImagesExportable={false}
            isProjectActive={!!activeProject} 
            onSaveToCloud={handleSaveToCloud}
            onLoadFromCloud={handleDownloadFromCloud}
            isCloudSaving={isCloudSaving}
            cloudStorageUsed={cloudStorageUsed}
            extension=".tSim"
          />
        </ThemePanel>
        <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns: `256px minmax(500px, 1fr) 6px ${alonPanelWidth}px` }}>
          <ProjectSidebar 
            projects={projects} 
            activeProjectId={activeProjectId} 
            onNewProject={handleNewProject} 
            onRenameProject={handleRenameProject} 
            triggerHierarchyView={triggerHierarchyView} 
            onHierarchyViewClosed={() => setTriggerHierarchyView(null)} 
            cloudProjects={cloudProjects}
            onLoadCloudProject={handleDownloadFromCloud}
            onDeleteCloudProject={handleDeleteFromCloud}
          />
          
          <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 p-0">
            {/* 2D Vector Stabilized HUD Controls */}
            <div className="absolute top-4 left-4 right-4 z-50 flex flex-wrap justify-between gap-2 pointer-events-none">
                <div className="flex gap-2 pointer-events-auto">
                    <button onClick={handleHomeLocation} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md bg-zinc-900/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-800`}>
                        <Navigation className="w-3 h-3" /> Home (Geolocate)
                    </button>
                    <button onClick={() => setMapHeading(0)} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md bg-zinc-900/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-800`} title="Hotkey: N">
                        <Compass className="w-3 h-3" /> North Up [N]
                    </button>
                </div>
                <div className="flex gap-2 pointer-events-auto">
                    <button onClick={() => setMapZoom(z => Math.min(z + 1, 22))} className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30 hover:bg-[#00ffcc]/20`} title="Hotkey: +">
                        <ZoomIn className="w-3 h-3" />
                    </button>
                    <button onClick={() => setMapZoom(z => Math.max(z - 1, 0))} className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30 hover:bg-[#00ffcc]/20`} title="Hotkey: -">
                        <ZoomOut className="w-3 h-3" />
                    </button>
                </div>
            </div>

            <div className="absolute bottom-4 left-4 z-50 flex gap-2 pointer-events-auto">
                <button onClick={() => setIsSpinning(s => !s)} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md ${isSpinning ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-zinc-900/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-800'}`}>
                    <Globe className="w-3 h-3" /> Spin View [A/D]
                </button>
                <button onClick={() => { setMapTilt(45); setMapZoom(18); setIsFlyby(false); }} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md bg-zinc-900/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-800`} title="Hotkey: C">
                    <Plane className="w-3 h-3" /> Chase View [C]
                </button>
                <button onClick={() => setIsFlyby(f => !f)} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-lg backdrop-blur-md ${isFlyby ? 'bg-red-500 text-black shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-zinc-900/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-800'}`}>
                    <Wind className="w-3 h-3" /> Cinematic Flyby
                </button>
            </div>

            <div className="w-full h-full bg-zinc-950">
                {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={mapCenter}
                        zoom={mapZoom}
                        heading={mapHeading}
                        tilt={mapTilt}
                        mapTypeId={mapType}
                        options={{ disableDefaultUI: true }}
                        onLoad={map => { mapRef.current = map; }}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-4" />
                        Initializing 2D Vector Matrices...
                    </div>
                )}
            </div>
          </ThemePanel>

          <div onMouseDown={handleMouseDown} className="resize-handle w-1.5 h-full cursor-col-resize bg-zinc-800 hover:bg-zinc-700 transition-colors flex-shrink-0 rounded-full"></div>
          
          <ThemePanel translucent className="h-full overflow-hidden relative z-10">
             <div className="flex flex-col h-full overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 shrink-0 bg-transparent">
                    <h2 className="text-subheading font-normal text-white uppercase tracking-tighter">WORLDSIM DOMAIN</h2>
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
