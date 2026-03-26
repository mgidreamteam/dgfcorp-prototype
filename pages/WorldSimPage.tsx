/// <reference types="vite/client" />
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgentSidebar from '../components/AgentSidebar';
import ProjectSidebar from '../components/ProjectSidebar';
import FileMenuBar from '../components/MenuBar';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import { CloudProject, DesignProject, DesignStatus, AgentLog } from '../types';
import { generateHardwareSpecs } from '../services/gemini';
import { AlertCircle, Loader2, Map as MapIcon, Globe, Navigation, ZoomIn, ZoomOut, Compass, Wind, Plane, Eye, PlusCircle, Trash2, CloudDownload, XSquare, ArrowDownToLine, Save, UploadCloud, Cuboid, Database, Box as BoxIcon, RefreshCw, ArrowDown, ArrowDownRight, Box, Move, Maximize, Play, Pause, SkipBack, SkipForward, Settings2, CloudUpload, RadioTower, Wifi, Zap, Activity, Signal, LayoutTemplate, Layers, ChevronRight, Share2, FolderOpen } , Aperture, Sparkles } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { auth, db, storage } from '../services/firebase';
import { collection, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, deleteObject, uploadString, getDownloadURL } from 'firebase/storage';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import ThemePanel from '../components/ThemePanel';

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
  const [renderMode, setRenderMode] = useState<'wireframe' | 'edges' | 'solid'>('solid');
  
  const { projects, setProjects, activeProjectId, setActiveProjectId, agentLogs, addLog } = useProject();
  const [error, setError] = useState<string | null>(null);
  const [triggerHierarchyView, setTriggerHierarchyView] = useState<string | null>(null);
  
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(16);
  const [mapHeading, setMapHeading] = useState(0);
  const [mapTilt, setMapTilt] = useState(45);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [isFlyby, setIsFlyby] = useState(false);
  
  const [isOriginLocked, setIsOriginLocked] = useState(false);
  const [cameraView, setCameraView] = useState('3D');

  const handleViewCube = (face: string) => {
      setCameraView(face);
      setIsSpinning(false);
      setIsFlyby(false);
      if (face === '3D') { setMapTilt(45); }
      else if (face === 'TOP') { setMapTilt(0); setMapHeading(0); }
      else if (face === 'BOTTOM') { setMapTilt(0); setMapHeading(180); }
      else if (face === 'FRONT') { setMapTilt(45); setMapHeading(0); }
      else if (face === 'REAR') { setMapTilt(45); setMapHeading(180); }
      else if (face === 'LEFT') { setMapTilt(45); setMapHeading(90); }
      else if (face === 'RIGHT') { setMapTilt(45); setMapHeading(270); }
  };

  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [isCloudSaving, setIsCloudSaving] = useState(false);

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

  useEffect(() => {
    if (projectId && projectId !== activeProjectId) {
      setActiveProjectId(projectId);
    } else if (!projectId && activeProjectId) {
      navigate(`/worldsim/${activeProjectId}`, { replace: true });
    }
  }, [projectId, activeProjectId, navigate, setActiveProjectId]);

  useEffect(() => {
    if (renderMode === 'wireframe') {
        setMapType('roadmap');
    } else if (renderMode === 'edges') {
        setMapType('hybrid');
    } else {
        setMapType('satellite');
    }
  }, [renderMode]);

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
          const ext = cloudProj.appExtension || '.dream';
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}${ext}`);
          const url = await getDownloadURL(fileRef);
          const response = await fetch(url);
          const text = await response.text();
          const projectData = JSON.parse(text) as DesignProject;
          if (projectData.id && projectData.name) {
              setProjects(prev => {
                  const filtered = prev.filter(p => p.id !== projectData.id);
                  return [projectData, ...filtered];
              });
              const routeStr = ext === '.dreampro' ? '/prostudio' : ext === '.fabflow' ? '/fabflow' : ext === '.studiosim' ? '/studiosim' : ext === '.wsim' ? '/worldsim' : ext === '.tsim' ? '/tacticalsim' : '/studio';
              navigate(`${routeStr}/${projectData.id}`);
          }
      } catch (err: any) {
          alert(`Cloud Fetch Failed: ${err.message}`);
      }
  };

  const handleDeleteFromCloud = async (cloudProj: CloudProject) => {
      if (!auth.currentUser || !window.confirm("Permanently delete this cloud asset?")) return;
      try {
          setIsCloudSaving(true);
          const ext = cloudProj.appExtension || '.dream';
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}${ext}`);
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

  const handleDeleteLocalProject = async (id: string) => {
      try {
          setProjects(prev => prev.filter(p => p.id !== id));
          if (activeProjectId === id) setActiveProjectId(null);
      } catch (err) { }
  };

  return (
    <>
      <div className="h-full flex flex-col gap-2 p-2">
        <ThemePanel className="w-full shrink-0">
            <FileMenuBar projectName={activeProject?.name || 'Network Topology'} appType="wsim" onToggleAgent={() => setIsAgentOpen(!isAgentOpen)} isAgentOpen={isAgentOpen} />
        </ThemePanel>
        <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns: isAgentOpen ? `256px minmax(500px, 1fr) 60px 6px ${agentPanelWidth}px` : `256px minmax(500px, 1fr) 60px` }}>
          
          {/* Left Local/Cloud Explorer */}
          <ProjectSidebar 
              projects={projects} 
              activeProjectId={activeProjectId} 
              onNewProject={handleNewProject} 
              onRenameProject={handleRenameProject} 
              triggerHierarchyView={null} 
              onHierarchyViewClosed={() => {}} 
              cloudProjects={cloudProjects}
              onLoadCloudProject={handleDownloadFromCloud}
              onDeleteCloudProject={handleDeleteFromCloud}
              onDeleteLocalProject={handleDeleteLocalProject}
              cloudLoadingAction={null}
              baseRoute="/worldsim"
              hideNewProjectButton
          />
          
          <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 p-0" ref={centerPanelRef}>
            {/* Two-Tier Top Map Toolbar */}
            <div className="px-4 py-2 border-b border-zinc-800/80 shrink-0 bg-transparent flex flex-col items-center bg-black/60 z-30 relative pointer-events-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                
                {/* FIRST ROW: File Menu & Main Views */}
                <div className="flex justify-between items-center w-full gap-4">
                    {/* File Main Actions */}
                    <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm overflow-x-auto no-scrollbar shrink-0">
                        <button onClick={() => setRenderMode('solid')} className={`relative flex items-center justify-center p-1.5 w-8 h-8 rounded-md transition-all duration-200 border ${renderMode === 'solid' ? 'bg-[#00ffcc]/20 text-[#00ffcc] border-[#00ffcc]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/70'}`} title="Solid Shaded View">
                                <svg viewBox="0 0 24 24" className="w-full h-full">
                                    <circle cx="12" cy="12" r="9" fill="url(#smooth-grad-sim)" />
                                    <defs>
                                        <radialGradient id="smooth-grad-sim" cx="35%" cy="35%" r="65%">
                                            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
                                        </radialGradient>
                                    </defs>
                                </svg>
                            </button>

                        <div className="w-px h-4 bg-zinc-700/80 mx-1.5 rounded"></div>

                        <button onClick={() => alert('V-Ray Plugin Not Licensed. Map Render unavailable.')} className="w-7 h-7 mx-0.5 rounded-sm border border-zinc-600/80 hover:border-orange-500 overflow-hidden relative shadow-md group outline-none transition-colors" title="Photorealistic GPU Render (Terrain)">
                            <img src="/crankshaft_render.png" alt="Render" className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700 ease-out" />
                            <div className="absolute inset-0 ring-1 ring-inset ring-black/40 group-hover:ring-orange-500/30 mix-blend-overlay pointer-events-none"></div>
                        </button>
                    </div>
                </div>

                {/* SECOND ROW: App-Specific Controls (Map Navigation) */}
                <div className="flex justify-between items-center w-full gap-4 mt-2">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto">
                        <button onClick={handleHomeLocation} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-inner bg-black/60 text-zinc-300 border border-zinc-700 hover:bg-zinc-800">
                            <Navigation className="w-3 h-3" /> Home (Geolocate)
                        </button>
                        <button onClick={() => setMapHeading(0)} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-inner bg-black/60 text-zinc-300 border border-zinc-700 hover:bg-zinc-800" title="Hotkey: N">
                            <Compass className="w-3 h-3" /> North Up [N]
                        </button>
                        
                        <div className="w-px h-5 bg-zinc-700 mx-1"></div>
                        
                        <button onClick={() => setIsSpinning(s => !s)} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-inner ${isSpinning ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)] border border-yellow-500' : 'bg-black/60 text-zinc-300 border border-zinc-700 hover:bg-zinc-800'}`}>
                            <Globe className="w-3 h-3" /> Spin View [A/D]
                        </button>
                        <button onClick={() => { setMapTilt(45); setMapZoom(18); setIsFlyby(false); }} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-inner bg-black/60 text-zinc-300 border border-zinc-700 hover:bg-zinc-800" title="Hotkey: C">
                            <Plane className="w-3 h-3" /> Chase View [C]
                        </button>
                        <button onClick={() => setIsFlyby(f => !f)} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg transition-all shadow-inner ${isFlyby ? 'bg-red-500 text-black shadow-[0_0_15px_rgba(239,68,68,0.4)] border border-red-500' : 'bg-black/60 text-zinc-300 border border-zinc-700 hover:bg-zinc-800'}`}>
                            <Wind className="w-3 h-3" /> Cinematic Flyby
                        </button>
                    </div>
                </div>
            </div>

            <div className="w-full flex-1 min-h-0 bg-zinc-950 relative z-0">


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

            {/* Horizontal Resizer Handle */}
            <div 
              onMouseDown={handleBottomPanelMouseDown}
              className="resize-handle h-1.5 w-full bg-zinc-800 flex-shrink-0 cursor-row-resize hover:bg-cyan-500 transition-colors z-30 flex items-center justify-center"
            ></div>

            {/* Bottom Panel (Network Telemetry) */}
            <ThemePanel translucent className="shrink-0 flex flex-col overflow-hidden relative z-10 border-cyan-500/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] rounded-xl bg-black/60" style={{ height: bottomPanelHeight }}>
                <div className="px-5 py-3 border-b border-zinc-800/80 bg-black/80 shrink-0">
                    <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Activity className="w-3 h-3 text-cyan-500" /> Network Telemetry Context</h2>
                </div>
                <div className="flex-1 p-6 flex flex-col items-center justify-center">
                    <span className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest text-center">Awaiting satellite interconnect handshakes...</span>
                </div>
            </ThemePanel>
          </ThemePanel>

          {/* Right Vertical Views Bar */}
          <div className="flex flex-col h-full bg-black/50 backdrop-blur-sm rounded-lg overflow-y-auto overflow-x-hidden border border-zinc-800/80 items-center py-2 space-y-2 relative z-20">
              <div className="text-[8px] text-zinc-500 uppercase font-black rotate-180 tracking-widest mb-2" style={{ writingMode: 'vertical-rl' }}>Views</div>
              <button onClick={() => setIsOriginLocked(!isOriginLocked)} className={`p-1.5 rounded transition-colors group flex flex-col items-center gap-1 mb-1 border ${isOriginLocked ? 'bg-[#00ffcc]/30 border-[#00ffcc]/40 text-[#00ffcc] shadow-inner' : 'bg-transparent border-transparent text-zinc-500 hover:bg-[#00ffcc]/20 hover:text-[#00ffcc]'}`} title={isOriginLocked ? 'Unlock Camera Matrix' : 'Lock Origin Viewport'}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  <span className="text-[7px] font-black uppercase tracking-widest">Lock</span>
              </button>
              <div className="w-6 h-px bg-zinc-800 my-1 rounded-full"></div>
              {[
                  { face: '3D', title: 'Default 3D View (45° Tilt)' },
                  { face: 'TOP', title: 'North Up Projection' },
                  { face: 'BOTTOM', title: 'South Projection' },
                  { face: 'FRONT', title: 'North 45° Projection' },
                  { face: 'REAR', title: 'South 45° Projection' },
                  { face: 'LEFT', title: 'East 45° Projection' },
                  { face: 'RIGHT', title: 'West 45° Projection' }
              ].map(v => (
                  <button key={v.face} onClick={() => handleViewCube(v.face)} className={`p-1.5 rounded transition-colors group flex flex-col items-center gap-1 ${cameraView === v.face ? 'bg-[#00ffcc]/20 shadow-inner' : 'hover:bg-[#00ffcc]/10'}`} title={v.title}>
                      <ViewCubeIcon face={v.face} />
                      <span className={`text-[7px] font-black uppercase tracking-widest ${cameraView === v.face ? 'text-[#00ffcc]' : 'text-zinc-600 group-hover:text-[#00ffcc]'}`}>{v.face}</span>
                  </button>
              ))}
          </div>

            {isAgentOpen && (
                <>
                    {/* Resizer Handle */}
                    <div className="resize-handle w-1.5 h-full bg-zinc-800 flex-shrink-0 cursor-col-resize hover:bg-cyan-500 transition-colors z-30"></div>

                    {/* Right AI Agent Sidebar */}
                    <ThemePanel translucent className="h-full overflow-hidden flex flex-col relative z-20 border-cyan-500/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] p-0 w-full col-start-5 col-end-6">
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
    </>
  );
};

export default WorldSimPage;
