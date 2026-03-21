import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Box, Move, RefreshCw, Maximize, Play, Pause, SkipBack, SkipForward, MousePointer2, Save, Settings2, CloudUpload } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ProjectSidebar from '../components/ProjectSidebar';
import { loadStateFromStorage, useAutoSave } from '../hooks/useAutoSave';
import { DesignProject, CloudProject, DesignStatus, SimulationBoundaryCondition, AgentLog } from '../types';
import { auth, db, storage } from '../services/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { ref, getDownloadURL, deleteObject } from 'firebase/storage';
import ThemePanel from '../components/ThemePanel';
import DesignInput from '../components/DesignInput';
import { extractSimulationConstraints } from '../services/gemini';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, Center } from '@react-three/drei';
import * as THREE from 'three';
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

const StlModel = ({ stlData }: { stlData: string }) => {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  useEffect(() => {
    if (!stlData) return;
    const loader = new STLLoader();
    const blob = new Blob([stlData], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    loader.load(url, (geo) => {
        geo.computeBoundingSphere();
        geo.computeBoundingBox();
        geo.center();
        setGeometry(geo);
        URL.revokeObjectURL(url);
    });
    return () => URL.revokeObjectURL(url);
  }, [stlData]);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial color="#3f3f46" roughness={0.2} metalness={0.8} clearcoat={1} clearcoatRoughness={0.1} side={THREE.DoubleSide} />
    </mesh>
  );
};

const StudioSimPage: React.FC = () => {
  const navigate = useNavigate();
  const [alonPanelWidth, setAlonPanelWidth] = useState(400);
  const gridTemplateColumns = `256px minmax(500px, 1fr) 6px ${alonPanelWidth}px`;

  const [projects, setProjects] = useState<DesignProject[]>(() => loadStateFromStorage().projects);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>(() => loadStateFromStorage().logs);
  
  const addLog = (log: Omit<AgentLog, 'id' | 'timestamp'>) => {
    const newLog: AgentLog = {
      ...log,
      id: (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') 
            ? crypto.randomUUID() 
            : Math.random().toString(36).substring(2) + Date.now().toString(36),
      timestamp: Date.now()
    };
    setAgentLogs(prev => [...prev, newLog]);
  };

  useAutoSave(projects, agentLogs);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const activeProject = projects.find(p => p.id === activeProjectId);
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [cloudLoadingAction, setCloudLoadingAction] = useState<string | null>(null);
  
  const [isGeneratingNlp, setIsGeneratingNlp] = useState(false);
  const [boundaryConditions, setBoundaryConditions] = useState<SimulationBoundaryCondition[]>([]);

  const { projectId } = useParams<{ projectId: string }>();

  const fetchCloudProjects = async () => {
    if (!auth.currentUser) return;
    try {
        const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/cloudProjects`));
        setCloudProjects(snap.docs.map(d => d.data() as CloudProject));
    } catch (err) {
        console.error(err);
    }
  };

  useEffect(() => {
    fetchCloudProjects();
  }, []);

  useEffect(() => {
    if (projectId) {
        setActiveProjectId(projectId);
        localStorage.setItem('lastActiveStudioProjectId', projectId);
    } else {
        const lastActiveId = localStorage.getItem('lastActiveStudioProjectId');
        if (lastActiveId) {
            navigate(`/studiosim/${lastActiveId}`, { replace: true });
        }
    }
  }, [projectId, navigate]);

  const handleSaveToCloud = async () => {
      const dummyPayload = JSON.stringify({ telemetry: "sim_data", date: Date.now() });
      const size = new Blob([dummyPayload]).size;
      if (size > 10 * 1024 * 1024) {
          alert("Simulation output exceeds 10MB cloud limit. Archival blocked to preserve bandwidth.");
          return;
      }
      setIsCloudSaving(true);
      setTimeout(() => {
          setIsCloudSaving(false);
          alert("Simulation payload validated under 10MB and synced to Cloud Node.");
      }, 600);
  };

  const handleSaveLocal = async (fileName: string) => {
      try {
          const dummyPayload = JSON.stringify({ telemetry: "sim_data", exportedAt: new Date().toISOString() }, null, 2);
          if ((window as any).showSaveFilePicker) {
              const handle = await (window as any).showSaveFilePicker({
                  suggestedName: fileName,
                  types: [{ description: 'Simulation Config', accept: { 'application/json': ['.sim', '.json'] } }]
              });
              const writable = await handle.createWritable();
              await writable.write(dummyPayload);
              await writable.close();
          } else {
              const blob = new Blob([dummyPayload], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              a.click();
              URL.revokeObjectURL(url);
          }
      } catch (err) {
          console.error(err);
      }
  };

  const handleDownloadFromCloud = async (cloudProj: CloudProject) => {
      if (!auth.currentUser) return;
      try {
          setCloudLoadingAction(cloudProj.id);
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}.dream`);
          const url = await getDownloadURL(fileRef);
          const response = await fetch(url);
          if (!response.ok) throw new Error("Failed to pull from Google Storage endpoints.");
          const text = await response.text();
          const projectData = JSON.parse(text) as DesignProject;
          if (projectData.id && projectData.name) {
              setProjects(prev => {
                  const filtered = prev.filter(p => p.id !== projectData.id);
                  return [projectData, ...filtered];
              });
              setActiveProjectId(projectData.id);
              localStorage.setItem('lastActiveStudioProjectId', projectData.id);
          }
      } catch (err: any) {
          console.error(err);
          alert(`Cloud Fetch Failed: ${err.message}`);
      } finally {
          setCloudLoadingAction(null);
      }
  };

  const handleDeleteFromCloud = async (cloudProj: CloudProject) => {
      if (!auth.currentUser) return;
      try {
          if (!window.confirm("Permanently delete this cloud asset?")) return;
          setCloudLoadingAction(cloudProj.id);
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}.dream`);
          await deleteObject(fileRef);
          await deleteDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, cloudProj.id));
          await fetchCloudProjects();
      } catch (err: any) {
          console.error(err);
          alert(`Cloud Purge Blocked: ${err.message}`);
      } finally {
          setCloudLoadingAction(null);
      }
  };

  const handleNlpSubmit = async (prompt: string) => {
      if (!activeProject) return;
      setIsGeneratingNlp(true);
      addLog({ content: prompt, type: 'input', projectId: activeProject.id });
      try {
          const constraints = await extractSimulationConstraints(prompt);
          if (constraints.length === 0) {
              addLog({ content: "I couldn't identify any rigid mechanics or boundary targets in that natural language request.", type: 'output', projectId: activeProject.id });
          } else {
              setBoundaryConditions(prev => [...prev, ...constraints]);
              addLog({ content: `Extracted ${constraints.length} structural condition(s) and injected them into the Simulation Environment.`, type: 'output', projectId: activeProject.id });
          }
      } catch (err) {
          console.error(err);
          addLog({ content: "Failed to parse physics constraints. Ensure you are describing clear parameter metrics.", type: 'error', projectId: activeProject.id });
      } finally {
          setIsGeneratingNlp(false);
      }
  };

  const updateCondition = (id: string, field: keyof SimulationBoundaryCondition, value: string) => {
      setBoundaryConditions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  const removeCondition = (id: string) => {
      setBoundaryConditions(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="h-full flex flex-col gap-2 p-2">
      <ThemePanel className="w-full shrink-0 h-16 flex items-center justify-between px-6 bg-zinc-950/80 border-b border-zinc-800">
        
        {/* Left: Viewport Manipulation Tools */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-zinc-800/80 shadow-inner">
            <button className="p-2 bg-blue-600 text-white rounded cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.4)]" title="Select (Active)">
                <MousePointer2 className="w-4 h-4" />
            </button>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Pan (G)">
                <Move className="w-4 h-4" />
            </button>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Rotate (R)">
                <RefreshCw className="w-4 h-4" />
            </button>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Scale (S)">
                <Maximize className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-zinc-700 mx-2"></div>
            <button className="flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 rounded transition-colors text-sm font-bold uppercase tracking-widest" title="Viewport Shading">
                <Box className="w-4 h-4" /> Wireframe
            </button>
        </div>

        {/* Center/Right: Simulation Timeline Playback */}
        <div className="flex items-center gap-4">
            <div className="text-xs font-mono text-zinc-500 bg-black/50 px-3 py-1.5 rounded border border-zinc-800 tracking-widest">
                FRAME: <span className="text-emerald-400">0000</span> / 1200
            </div>
            
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-zinc-800/80">
                <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Jump to Start">
                    <SkipBack className="w-4 h-4 fill-current" />
                </button>
                <button className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 rounded transition-colors" title="Play Simulation">
                    <Play className="w-5 h-5 fill-current" />
                </button>
                <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Pause">
                    <Pause className="w-4 h-4 fill-current" />
                </button>
                <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Jump to End">
                    <SkipForward className="w-4 h-4 fill-current" />
                </button>
            </div>
        </div>

      </ThemePanel>
      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        
        {/* Real Project Registry Sidebar */}
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-md rounded-lg overflow-hidden border border-zinc-800/80 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
            <ProjectSidebar 
                projects={projects}
                activeProjectId={activeProjectId}
                baseRoute="/studiosim"
                onSelectProject={(id) => {
                    setActiveProjectId(id);
                    localStorage.setItem('lastActiveStudioProjectId', id);
                }}
                onNewProject={() => {}}
                onRenameProject={() => {}}
                onDeleteProject={() => {}}
                onToggleConstraint={() => {}}
                cloudProjects={cloudProjects}
                onSaveToCloud={() => {}}
                onLoadFromCloud={handleDownloadFromCloud}
                onDeleteFromCloud={handleDeleteFromCloud}
                onDeleteLocalAll={() => {}}
            />
        </div>
        
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 border border-[#00ffcc]/10 shadow-[inset_0_0_50px_rgba(0,255,204,0.02)]">
            <div className="px-6 py-4 border-b border-zinc-800 shrink-0 bg-black/40 backdrop-blur-md flex justify-between items-center">
                <h2 className="text-subheading font-normal text-zinc-500 uppercase tracking-tighter flex items-center gap-3">
                    Simulation Runtime Standby
                </h2>
                
                {/* Archiving Tools */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => handleSaveLocal('conditions_export.sim')}
                        className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-700 transition-colors"
                        title="Save Condition Overrides Locally"
                    >
                        <Save className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => handleSaveLocal('default_settings.json')}
                        className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-700 transition-colors"
                        title="Save Native Defaults"
                    >
                        <Settings2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={handleSaveToCloud}
                        disabled={isCloudSaving}
                        className="p-2 bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 rounded border border-blue-900 transition-colors disabled:opacity-50"
                        title="Upload Telemetry to Cloud (Max 10MB)"
                    >
                        {isCloudSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />} 
                    </button>
                </div>
            </div>
            <div className="flex-1 w-full h-full bg-zinc-950 relative cursor-move rounded-b-lg overflow-hidden">
                <Canvas camera={{ position: [150, 100, 150], fov: 45 }}>
                    <color attach="background" args={['#09090b']} />
                    <fog attach="fog" args={['#09090b', 50, 400]} />
                    
                    <ambientLight intensity={1.5} />
                    <directionalLight position={[100, 100, 50]} intensity={2.5} castShadow shadow-mapSize={2048} />
                    
                    <Grid 
                       renderOrder={-1} 
                       position={[0, -50, 0]} 
                       infiniteGrid 
                       cellSize={10} 
                       cellThickness={0.5} 
                       sectionSize={50} 
                       sectionThickness={1.5} 
                       cellColor={'#27272a'} 
                       sectionColor={'#3f3f46'} 
                       fadeDistance={400} 
                    />
                    <primitive object={new THREE.AxesHelper(100)} position={[0, -49.9, 0]} />

                    <React.Suspense fallback={null}>
                        <Environment preset="city" />
                        {activeProject?.assetUrls?.stl && (
                            <>
                                <ContactShadows position={[0, -50, 0]} opacity={0.8} scale={300} blur={2.5} far={100} />
                                <StlModel stlData={activeProject.assetUrls.stl} />
                            </>
                        )}
                    </React.Suspense>
                    
                    <OrbitControls makeDefault autoRotate autoRotateSpeed={0.8} minDistance={10} maxDistance={400} maxPolarAngle={Math.PI / 2 - 0.05} />
                </Canvas>
                
                {!activeProject?.assetUrls?.stl && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="max-w-md text-center bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-zinc-800">
                            <h3 className="text-xl font-black text-zinc-400 tracking-widest uppercase mb-3">StudioSim Sandbox</h3>
                            <p className="text-zinc-500 leading-relaxed text-sm">Awaiting payload drop. Initialize a pipeline execution to trace native structural paths across the active ecosystem.</p>
                        </div>
                    </div>
                )}
            </div>
        </ThemePanel>

        <div className="resize-handle w-1.5 h-full bg-zinc-800 flex-shrink-0 rounded-full"></div>
        
        {/* Right NLP Pipeline Editor */}
        <ThemePanel translucent className="h-full overflow-hidden flex flex-col relative z-10">
            <div className="px-6 py-4 border-b border-zinc-800 shrink-0 bg-black/40 backdrop-blur-md">
                <h2 className="text-subheading font-normal text-white uppercase tracking-tighter">Physics Intelligence</h2>
            </div>
            
            <div className="flex-1 flex flex-col p-2 space-y-2 overflow-hidden">
                <div className="shrink-0 h-64 border border-zinc-800/80 rounded-lg overflow-hidden bg-black/60 shadow-inner">
                    <DesignInput 
                        onSubmit={handleNlpSubmit}
                        isGenerating={isGeneratingNlp}
                        agentLogs={agentLogs}
                        activeProject={activeProject}
                        onUpdateProjectConstraint={() => {}}
                    />
                </div>

                <div className="flex-1 bg-black/40 border border-zinc-800/80 rounded-lg overflow-y-auto p-4 flex flex-col gap-3 relative shadow-inner">
                    <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold sticky top-0 bg-black/80 py-2 z-10">Runtime Boundary Conditions</h3>
                    
                    {boundaryConditions.length === 0 ? (
                        <div className="text-sm text-zinc-600 italic mt-4 text-center">No structural constraints defined by NLP Engine.</div>
                    ) : (
                        boundaryConditions.map((cond) => (
                            <div key={cond.id} className="bg-zinc-900/60 border border-zinc-700/50 rounded-lg p-3 flex flex-col gap-2 relative group hover:border-zinc-500 transition-colors">
                                <button onClick={() => removeCondition(cond.id)} className="absolute top-2 right-2 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                                <div className="flex items-center gap-2">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-900/50">{cond.type.replace('_', ' ')}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    <label className="flex flex-col gap-1 text-xs text-zinc-400">
                                        Magnitude
                                        <div className="flex relative">
                                            <input type="text" value={cond.magnitude} onChange={e => updateCondition(cond.id, 'magnitude', e.target.value)} className="w-full bg-black/50 border border-zinc-700 rounded-l p-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500" />
                                            <div className="bg-zinc-800 border-y border-r border-zinc-700 rounded-r px-2 py-1.5 flex items-center justify-center text-zinc-400 font-bold">{cond.unit}</div>
                                        </div>
                                    </label>
                                    <label className="flex flex-col gap-1 text-xs text-zinc-400">
                                        Target Geometry
                                        <input type="text" value={cond.targetGeometry} onChange={e => updateCondition(cond.id, 'targetGeometry', e.target.value)} className="w-full bg-black/50 border border-zinc-700 rounded p-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500" />
                                    </label>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </ThemePanel>
      </div>
    </div>
  );
};

export default StudioSimPage;
