import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Box, BoxIcon, Move, RefreshCw, Maximize, Play, Pause, SkipBack, SkipForward, MousePointer2, Save, Settings2, CloudUpload, Binary, PlusCircle, Trash2, CloudDownload, XSquare, ArrowDownToLine, UploadCloud, ZoomIn, ZoomOut, Hammer, AlertCircle, Activity, ShieldCheck, Layers, Minimize2, Battery, BatteryCharging, Zap, Cpu, MemoryStick, ChevronDown, Check, FolderOpen, Focus, Sun, Moon, Grid3X3, Eye, EyeOff, Lightbulb, LightbulbOff, Sparkles, Droplet, Aperture } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import AgentSidebar from '../components/AgentSidebar';
import ProjectSidebar from '../components/ProjectSidebar';
import FileMenuBar from '../components/MenuBar';
import { useProject } from '../contexts/ProjectContext';
import { DesignProject, CloudProject, DesignStatus, SimulationBoundaryCondition, AgentLog } from '../types';
import { auth, db, storage } from '../services/firebase';
import { collection, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, getDownloadURL, deleteObject, uploadString } from 'firebase/storage';
import ThemePanel from '../components/ThemePanel';
import { useLocalStorageState } from '../hooks/useLocalStorageState';

import { extractSimulationConstraints } from '../services/gemini';
import CloudLoadModal from '../components/CloudLoadModal';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, Center, GizmoHelper, GizmoViewport, Edges } from '@react-three/drei';
import * as THREE from 'three';
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { CameraPresets, ViewMode } from '../components/CameraPresets';
import { RoomWalls } from '../components/RoomWalls';
import { SimHUD } from '../components/SimHUD';
import { generateOpenScadCode, generateStlFile } from '../services/gemini';
import { StudioLighting } from '../components/StudioLighting';

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

const StlModel = ({ stlData, materialType = 'metallic', baseColor = '#71717a', renderMode = 'solid', onLoaded }: { stlData: string, materialType?: 'plastic' | 'matte' | 'metallic', baseColor?: string, renderMode?: 'wireframe' | 'edges' | 'solid', onLoaded?: (s: {x:number,y:number,z:number}) => void }) => {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  useEffect(() => {
    if (!stlData) return;
    const loader = new STLLoader();
    const blob = new Blob([stlData], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    loader.load(url, (geo) => {
        geo.rotateX(-Math.PI / 2); // Correct OpenSCAD Z-up orientation to ThreeJS Y-up
        geo.center();
        geo.computeBoundingBox();
        if (geo.boundingBox) {
            const size = new THREE.Vector3();
            geo.boundingBox.getSize(size);
            geo.translate(0, size.y / 2, 0);
            geo.computeBoundingBox();
            geo.computeBoundingSphere(); // Important: must be calculated AFTER all rotations/translations so WebGL doesn't aggressively frustum cull the "off-screen" offset
            geo.computeVertexNormals(); // Generates smooth surface normals over facets natively on GPU
            if (onLoaded) onLoaded({ x: size.x, y: size.y, z: size.z });
        }
        setGeometry(geo);
        URL.revokeObjectURL(url);
    });
    return () => URL.revokeObjectURL(url);
  }, [stlData]);

  // Garbage collect raw BufferGeometry off the GPU directly when unmounting or swapping STLs
  useEffect(() => {
    return () => {
      if (geometry) {
        geometry.dispose();
      }
    };
  }, [geometry]);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial 
        color={baseColor} 
        roughness={materialType === 'matte' ? 0.8 : materialType === 'plastic' ? 0.2 : 0.4} 
        metalness={materialType === 'metallic' ? 0.8 : 0.1} 
        clearcoat={materialType === 'plastic' ? 1 : 0} 
        clearcoatRoughness={0.1} 
        side={THREE.DoubleSide} 
        wireframe={renderMode === 'wireframe'}
      />
      {renderMode === 'edges' && <Edges threshold={15} color="#3b82f6" />}
    </mesh>
  );
};

const StudioSimPage: React.FC = () => {
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
  const [cadMode, setCadMode] = useState<'Assembly' | 'Circuit'>('Assembly');
  const [renderMode, setRenderMode] = useLocalStorageState<'wireframe'|'edges'|'solid'>('dream_ui_renderMode', 'solid');
  const [openScadRes, setOpenScadRes] = useState(50);
  const [globalLightIntensitySlider, setGlobalLightIntensitySlider] = useLocalStorageState('dream_ui_luxBase', 0);
  const [globalLightsOn, setGlobalLightsOn] = useLocalStorageState('dream_ui_globalLightsOn', true);
  const [showLightMeshes, setShowLightMeshes] = useLocalStorageState('dream_ui_showLightMeshes', true);
  const [showGrid, setShowGrid] = useLocalStorageState('dream_ui_showGrid', true);
  const [modelSize, setModelSize] = useState({x:20, y:20, z:20});
  const [isResizingMesh, setIsResizingMesh] = useState(false);
  const [materialType, setMaterialType] = useState<'plastic' | 'matte' | 'metallic'>('metallic');
  const [roomTheme, setRoomTheme] = useLocalStorageState<'dark' | 'light'>('dream_ui_roomTheme', 'dark');
  const [isOriginLocked, setIsOriginLocked] = useState(false);
  const [cameraView, setCameraView] = useLocalStorageState<ViewMode>('dream_ui_cameraView', '3D');

  const isInitialMountUI = React.useRef(true);
  useEffect(() => {
      if (isInitialMountUI.current) {
          isInitialMountUI.current = false;
          return;
      }
      setGlobalLightIntensitySlider(roomTheme === 'light' ? 500 : 0);
  }, [roomTheme, setGlobalLightIntensitySlider]);
  const gridTemplateColumns = isAgentOpen ? `256px minmax(500px, 1fr) 60px 6px ${agentPanelWidth}px` : `256px minmax(500px, 1fr) 60px`;

  const { projects, setProjects, agentLogs, addLog, activeProjectId, setActiveProjectId } = useProject();
  const activeProject = projects.find(p => p.id === activeProjectId);
  
  const primaryMaterialInfo = React.useMemo(() => {
      let type: 'plastic' | 'matte' | 'metallic' = 'metallic';
      let color = "#71717a";
      if (!activeProject?.specs?.materials?.length) return { color, type };
      
      const dominant = activeProject.specs.materials.reduce((prev, curr) => (prev.percentage > curr.percentage) ? prev : curr);
      const m = dominant.material.toLowerCase();
      
      if (m.includes('plastic') || m.includes('abs') || m.includes('poly') || m.includes('nylon')) {
          type = 'plastic';
          color = "#e4e4e7"; 
          if (m.includes('black')) color = "#27272a";
          if (m.includes('white')) color = "#f4f4f5";
      } else if (m.includes('alum')) {
          type = 'metallic';
          color = "#d4d4d8"; 
      } else if (m.includes('steel') || m.includes('iron')) {
          type = 'metallic';
          color = "#71717a";
      } else if (m.includes('copper') || m.includes('brass') || m.includes('bronze')) {
          type = 'metallic';
          color = "#b45309";
      } else if (m.includes('wood') || m.includes('carbon')) {
          type = 'matte';
          color = m.includes('wood') ? "#78350f" : "#18181b"; 
      } else if (m.includes('rubber') || m.includes('silicone')) {
          type = 'matte';
          color = "#27272a";
      }
      return { color, type };
  }, [activeProject?.specs?.materials]);

  React.useEffect(() => {
      setMaterialType(primaryMaterialInfo.type);
  }, [primaryMaterialInfo.type]);

  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [cloudLoadingAction, setCloudLoadingAction] = useState<string | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  
  const [isGeneratingNlp, setIsGeneratingNlp] = useState(false);
  const [boundaryConditions, setBoundaryConditions] = useState<SimulationBoundaryCondition[]>([]);
  const [isGeneratingModel, setIsGeneratingModel] = useState(false);
  const [triggerHierarchyView, setTriggerHierarchyView] = useState<string | null>(null);

  const { projectId } = useParams<{ projectId: string }>();

  const fetchCloudProjects = async () => {
    if (!auth.currentUser) return;
    try {
        const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/cloudProjects`));
        setCloudProjects(snap.docs.map(d => d.data() as CloudProject));
    } catch (err) {
        console.error("Failed to sync cloud registry", err);
    }
  };

  const handleCloudModalOpen = () => {
    fetchCloudProjects();
    setIsCloudModalOpen(true);
  };

  const handleDeleteCloudProject = async (p: CloudProject) => {
    if (!auth.currentUser) return;
    try {
        await deleteDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, p.id));
        setCloudProjects(prev => prev.filter(proj => proj.id !== p.id));
    } catch (err) {
        console.error(err);
    }
  };

  useEffect(() => {
    fetchCloudProjects();
  }, []);

  useEffect(() => {
    if (projectId && projectId !== activeProjectId) {
        const projectExists = projects.some(p => p.id === projectId);
        if (projectExists) {
            setActiveProjectId(projectId);
        } else {
            alert("The requested project could not be found locally. It may have been deleted, corrupted, or not synchronized. Opening a blank workspace.");
            navigate('/studiosim', { replace: true });
        }
    } else if (!projectId && activeProjectId) {
        navigate(`/studiosim/${activeProjectId}`, { replace: true });
    }
  }, [projectId, activeProjectId, projects, navigate, setActiveProjectId]);

  const handleGenerateModel = async () => {
      if (!activeProject || !activeProject.specs) {
          alert("Project requires hardware specifications. Please generate a design in the Studio first.");
          return;
      }
      try {
          setIsGeneratingModel(true);
          const scadCode = await generateOpenScadCode(activeProject.specs);
          const stlData = await generateStlFile(activeProject.specs, scadCode);
          
          const updatedProj = { ...activeProject, assetUrls: { ...activeProject.assetUrls, stl: stlData }, openScadCode: scadCode };
          setProjects(projects.map(p => p.id === activeProject.id ? updatedProj : p));
          // Update activeProject reference if it's the one being modified
          if (activeProject.id === updatedProj.id) {
              setActiveProjectId(updatedProj.id); // This will trigger re-render with updated activeProject
          }
      } catch(err) {
          console.error(err);
          alert("Simulation conversion failed. " + (err as any).message);
      } finally {
          setIsGeneratingModel(false);
      }
  };

  const handleResApply = async () => {
      if (!activeProject?.openScadCode || !activeProject.specs) return;
      try {
          setIsResizingMesh(true);
          const modifiedScad = `$fn = ${openScadRes};\n$fs = 0.5;\n$fa = 5;\n\n${activeProject.openScadCode}`;
          const stlData = await generateStlFile(activeProject.specs, modifiedScad);
          
          const updatedProj = { ...activeProject, assetUrls: { ...activeProject.assetUrls, stl: stlData } };
          setProjects(projects.map(p => p.id === activeProject.id ? updatedProj : p));
      } catch(err) {
          console.error(err);
          alert("Resolution generation failed: " + (err as any).message);
      } finally {
          setIsResizingMesh(false);
      }
  };

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

  const handleDeleteProject = () => {
      if (!activeProject || !window.confirm(`Delete local project "${activeProject.name}"?`)) return;
      setProjects(prev => prev.filter(p => p.id !== activeProject.id));
      navigate('/studiosim');
  };

  const cloudStorageUsed = React.useMemo(() => cloudProjects.reduce((acc, p) => acc + p.sizeBytes, 0), [cloudProjects]);

  const handleSaveLocal = async (fileName: string) => {
      const dummyPayload = JSON.stringify({ project: activeProjectId, customConditions: boundaryConditions, exportFormat: 'SIM.0' }, null, 2);
      try {
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

  const handleDownloadProject = () => {
    if (!activeProject) return;
    const dataStr = JSON.stringify(activeProject, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${activeProject.name.replace(/ /g, '_')}.studioSim`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadFromCloud = async (cloudProj: CloudProject) => {
      if (!auth.currentUser) return;
      try {
          setCloudLoadingAction(cloudProj.id);
          const ext = cloudProj.appExtension || '.dream';
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}${ext}`);
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
              const routeStr = ext === '.dreampro' ? '/prostudio' : ext === '.fabflow' ? '/fabflow' : ext === '.studiosim' ? '/studiosim' : ext === '.wsim' ? '/worldsim' : ext === '.tsim' ? '/tacticalsim' : '/studio';
              navigate(`${routeStr}/${projectData.id}`);
              setActiveProjectId(projectData.id);
              localStorage.setItem('lastActiveStudioProjectId', projectData.id);
              setIsCloudModalOpen(false);
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
          const ext = cloudProj.appExtension || '.dream';
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}${ext}`);
          await deleteObject(fileRef);
          await deleteDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, cloudProj.id));
          await fetchCloudProjects();
          window.dispatchEvent(new Event('update-cloud-quota'));
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

  const handleDeleteLocalProject = async (id: string) => {
      try {
          setProjects(prev => prev.filter(p => p.id !== id));
          if (activeProjectId === id) setActiveProjectId(null);
      } catch (err) { }
  };

  return (
    <div className="h-full flex flex-col gap-2 p-2 relative bg-black/90">
      <ThemePanel className="w-full shrink-0">
            <FileMenuBar projectName={activeProject?.name || 'Simulation Scenario'} appType="studiosim" onToggleAgent={() => setIsAgentOpen(!isAgentOpen)} isAgentOpen={isAgentOpen} />
      </ThemePanel>
      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        
        {/* Left Local/Cloud Explorer */}
        <ProjectSidebar 
            projects={projects} 
            activeProjectId={activeProjectId} 
            onNewProject={() => { setActiveProjectId(null); navigate('/studiosim'); }} 
            onRenameProject={(id, name) => setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p))} 
            triggerHierarchyView={triggerHierarchyView} 
            onHierarchyViewClosed={() => setTriggerHierarchyView(null)}
            cloudProjects={cloudProjects}
            onLoadCloudProject={async (proj) => {
                // To fetch cloud project natively
                const { collection, getDocs } = await import('firebase/firestore');
                if (!auth.currentUser) return;
                const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/cloudProjects`));
                setIsCloudModalOpen(true);
            }}
            onDeleteCloudProject={handleDeleteCloudProject}
            onDeleteLocalProject={handleDeleteLocalProject}
            cloudLoadingAction={cloudLoadingAction}
            baseRoute="/studiosim"
            hideNewProjectButton
        />
        
        {/* Central Vertical Stack: Canvas & Boundary Conditions */}
        <div className="flex flex-col h-full gap-2 relative z-10 overflow-hidden min-w-0" ref={centerPanelRef}>
            {/* Top 75% Map / WebGL Canvas */}
            <ThemePanel translucent className="flex-1 flex flex-col overflow-hidden relative border border-[#00ffcc]/10 shadow-[inset_0_0_50px_rgba(0,255,204,0.02)]">
                
                {/* Two-Tier Top Multi-CAD Toolbar */}
            <div className="px-4 py-2 border-b border-zinc-800/80 shrink-0 bg-transparent flex flex-col items-center bg-black/60 z-20 relative">
                
                {/* FIRST ROW: File Menu & Main Views */}
                <div className="flex justify-start items-center w-full gap-1">
                    {/* File Main Actions */}
                    <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm overflow-x-auto no-scrollbar shrink-0">
                        <button onClick={() => navigate('/studio')} className="p-1.5 text-zinc-300 hover:text-emerald-400 hover:bg-emerald-900/40 rounded transition-colors" title="New Project">
                            <PlusCircle className="w-5 h-5 drop-shadow-md" />
                        </button>
                        <button onClick={() => handleDownloadProject()} className="p-1.5 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/40 rounded transition-colors flex items-center justify-center gap-1.5" title="Save File Locally">
                            <Save className="w-5 h-5 drop-shadow-md fill-blue-500/10" />
                            <ArrowDownToLine className="w-3.5 h-3.5 opacity-80" />
                        </button>
                        <div className="w-px h-5 bg-zinc-700/80 mx-0.5 rounded"></div>
                        <button onClick={handleGenerateModel} disabled={isGeneratingModel} className={`p-1 hover:bg-emerald-900/40 rounded transition-colors flex items-center ${isGeneratingModel ? 'opacity-50 cursor-not-allowed' : ''}`} title="Import & Convert Topology">
                            <div className="relative p-1 flex items-center justify-center">
                                {isGeneratingModel ? <RefreshCw className="w-5 h-5 text-emerald-500 drop-shadow-md animate-spin" /> : <Hammer className="w-5 h-5 text-emerald-500 drop-shadow-md" />}
                            </div>
                        </button>
                        <button onClick={handleSaveToCloud} disabled={isCloudSaving} className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/40 rounded transition-colors flex items-center gap-1.5 disabled:opacity-50" title="Commit to Remote Cloud">
                            {isCloudSaving ? <RefreshCw className="w-5 h-5 animate-spin drop-shadow-md" /> : <UploadCloud className="w-5 h-5 drop-shadow-md fill-blue-500/20" />}
                        </button>
                        <div className="w-px h-5 bg-zinc-700/80 mx-0.5 rounded"></div>
                        <button onClick={() => { setActiveProjectId(null); navigate('/studiosim'); }} className="p-1.5 text-zinc-300 hover:text-orange-400 hover:bg-orange-900/40 rounded transition-colors" title="Close Project">
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
                        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-zinc-800/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                            <button onClick={() => setRenderMode('wireframe')} className={`relative flex items-center justify-center p-1.5 w-8 h-8 rounded-md transition-all duration-200 border ${renderMode === 'wireframe' ? 'bg-[#00ffcc]/20 text-[#00ffcc] border-[#00ffcc]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/70'}`} title="Wireframe View">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-full h-full">
                                   <circle cx="12" cy="12" r="9" />
                                   <ellipse cx="12" cy="12" rx="9" ry="3.5" />
                                   <ellipse cx="12" cy="12" rx="4" ry="9" />
                                </svg>
                            </button>
                            <button onClick={() => setRenderMode('edges')} className={`relative flex items-center justify-center p-1.5 w-8 h-8 rounded-md transition-all duration-200 border ${renderMode === 'edges' ? 'bg-[#00ffcc]/20 text-[#00ffcc] border-[#00ffcc]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/70'}`} title="Solid + Edge View">
                                <svg viewBox="0 0 24 24" className="w-full h-full">
                                    <polygon points="12 3 4 7.5 12 12 20 7.5" fill="currentColor" fillOpacity="0.8" />
                                    <polygon points="4 16.5 4 7.5 12 12 12 21" fill="currentColor" fillOpacity="0.4" />
                                    <polygon points="12 21 12 12 20 7.5 20 16.5" fill="currentColor" fillOpacity="0.6" />
                                    <path d="M20 16.5V7.5L12 3 4 7.5v9l8 4.5z" fill="none" stroke={renderMode === 'edges' ? '#00ffcc' : '#18181b'} strokeWidth="1.5" strokeLinejoin="round" />
                                    <polyline points="4 7.5 12 12 20 7.5" fill="none" stroke={renderMode === 'edges' ? '#00ffcc' : '#18181b'} strokeWidth="1.5" strokeLinejoin="round" />
                                    <line x1="12" y1="21" x2="12" y2="12" stroke={renderMode === 'edges' ? '#00ffcc' : '#18181b'} strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </button>
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

                            <button onClick={() => alert('V-Ray Plugin Not Licensed')} className="relative flex items-center justify-center p-1.5 w-[39px] h-[39px] mx-0.5 rounded border border-transparent hover:border-orange-500/50 hover:bg-orange-900/40 text-orange-500 group transition-all duration-300" title="Photorealistic GPU Render">
                                <Aperture className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                                <Sparkles className="w-2.5 h-2.5 absolute top-[6px] right-[6px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-orange-300" />
                            </button>
                        </div>
                        <div className="w-px h-5 bg-zinc-700/80 mx-0.5 rounded"></div>

                        {/* Environment & Materials */}
                        {/* Lighting Toolbar */}
                        <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm shrink-0">
                            <button onClick={() => setRoomTheme(roomTheme === 'dark' ? 'light' : 'dark')} className="p-1.5 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Toggle Environment">
                               {roomTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <div className="w-px h-5 bg-zinc-700/80 mx-1 rounded"></div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowGrid(!showGrid)} className="p-1.5 outline-none transition-colors border-r border-zinc-700/80 pr-2 mr-1 block" title="Toggle Grid">
                                   <Grid3X3 className={`w-5 h-5 ${showGrid ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-600 hover:text-zinc-500'}`} />
                                </button>
                                <button onClick={() => setShowLightMeshes(!showLightMeshes)} className="p-1.5 outline-none transition-colors border-r border-zinc-700/80 pr-2 mr-1 block" title="Show/Hide Physical Light Frames">
                                   {showLightMeshes ? <Eye className="w-5 h-5 text-zinc-300 hover:text-white" /> : <EyeOff className="w-5 h-5 text-zinc-600 hover:text-zinc-500" />}
                                </button>
                                <button onClick={() => setGlobalLightsOn(!globalLightsOn)} className="p-1.5 outline-none transition-colors block" title="Toggle All Lights">
                                   {globalLightsOn ? <Lightbulb className="w-5 h-5 text-emerald-400 hover:text-emerald-300" /> : <LightbulbOff className="w-5 h-5 text-zinc-600 hover:text-zinc-500" />}
                                </button>
                                <input 
                                  type="range" min="-1000" max="1000" step="1" 
                                  value={globalLightIntensitySlider} 
                                  onChange={e => setGlobalLightIntensitySlider(Number(e.target.value))} 
                                  className="w-24 accent-emerald-500 outline-none cursor-pointer" 
                                />
                                <span className="text-xs font-mono w-8 text-zinc-300 flex items-center ml-1">{globalLightIntensitySlider > 0 ? `+${globalLightIntensitySlider}` : globalLightIntensitySlider}</span>
                            </div>
                        </div>
                    </div>

                    {/* Transform Tools & Timing */}
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="text-xs font-mono text-zinc-500 bg-black/50 px-3 h-[44px] flex items-center rounded-lg border border-zinc-800 tracking-widest hidden lg:flex">
                            FRAME: <span className="text-emerald-400 ml-2">0000</span> / 1200
                        </div>
                        <div className="flex items-center gap-1 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-inner h-[44px]">
                            <button className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-900/30 rounded transition-colors" title="Play Simulation">
                                <Play className="w-5 h-5 fill-current" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-1 w-full min-h-0 bg-[#09090b] relative cursor-move rounded-b-lg overflow-hidden z-0">
                <Canvas camera={{ position: [100, 75, 100], fov: 45 }}>
                    <color attach="background" args={[roomTheme === 'dark' ? '#09090b' : '#808080']} />
                    <fog attach="fog" args={[roomTheme === 'dark' ? '#09090b' : '#808080', 50, 400]} />
                    
                    <StudioLighting modelSize={modelSize} showLightMeshes={showLightMeshes} globalIntensitySlider={globalLightIntensitySlider} globalLightsOn={globalLightsOn} roomTheme={roomTheme} />
                    
                    {showGrid && (
                        <Grid 
                           renderOrder={-1} 
                           position={[0, -0.01, 0]} 
                           infiniteGrid 
                           cellSize={10} 
                           cellThickness={0.5} 
                           sectionSize={50} 
                           sectionThickness={1} 
                           cellColor={roomTheme === 'dark' ? '#064e3b' : '#a7f3d0'} 
                           sectionColor={roomTheme === 'dark' ? '#047857' : '#6ee7b7'} 
                           fadeDistance={200} 
                        />
                    )}
                    
                    <CameraPresets mode={cameraView} />
                    <RoomWalls roomTheme={roomTheme} />

                    <React.Suspense fallback={null}>
                        <Environment preset="city" />
                        {activeProject?.assetUrls?.stl && (
                            <>
                                <ContactShadows position={[0, -50, 0]} opacity={0.8} scale={300} blur={2.5} far={100} />
                                <StlModel stlData={activeProject.assetUrls.stl} materialType={materialType} baseColor={primaryMaterialInfo.color} renderMode={renderMode} onLoaded={(size) => setModelSize(size)} />
                            </>
                        )}
                    </React.Suspense>
                    
                    <GizmoHelper alignment="top-right" margin={[60, 60]}>
                        <GizmoViewport axisColors={['#ef4444', '#10b981', '#3b82f6']} labelColor="black" />
                    </GizmoHelper>

                    <OrbitControls makeDefault autoRotate={false} minDistance={10} maxDistance={400} />
                </Canvas>
                
                <SimHUD colorClass="emerald" />
            </div>
        </ThemePanel>

        {/* Bottom 25% Boundary Conditions List */}
        {/* Horizontal Resizer Handle */}
        <div 
          onMouseDown={handleBottomPanelMouseDown}
          className="resize-handle h-1.5 w-full bg-zinc-800 flex-shrink-0 cursor-row-resize hover:bg-emerald-500 transition-colors z-30"
        ></div>

        <ThemePanel translucent className="shrink-0 flex flex-col overflow-hidden relative shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] border-emerald-500/10" style={{ height: bottomPanelHeight }}>
            <div className="px-5 py-2.5 border-b border-zinc-800/80 bg-black/60 relative z-10 flex justify-between items-center shrink-0">
                <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Settings2 className="w-3.5 h-3.5 text-emerald-500" /> Runtime Boundary Conditions</h2>
                <span className="text-[9px] bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded uppercase tracking-widest font-bold border border-emerald-500/20 shadow-inner block">Physics Engine Integration</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/40 flex flex-wrap gap-3">
                {boundaryConditions.length === 0 ? (
                    <div className="text-sm text-zinc-600 italic mt-4 text-center w-full">No structural constraints defined by Engine. Instruct HELO in the Agent panel to set simulation parameters.</div>
                ) : (
                    boundaryConditions.map((cond) => (
                        <div key={cond.id} className="bg-zinc-900/60 border border-zinc-700/50 rounded-lg p-3 flex flex-col gap-2 relative group hover:border-zinc-500 transition-colors flex-1 min-w-[300px] max-w-sm">
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
                <button key={v.face} onClick={() => setCameraView(v.face as ViewMode)} className={`p-1.5 rounded transition-colors group flex flex-col items-center gap-1 ${cameraView === v.face ? 'bg-[#00ffcc]/20 shadow-inner' : 'hover:bg-[#00ffcc]/10'}`} title={v.title}>
                    <ViewCubeIcon face={v.face} />
                    <span className={`text-[7px] font-black uppercase tracking-widest ${cameraView === v.face ? 'text-[#00ffcc]' : 'text-zinc-600 group-hover:text-[#00ffcc]'}`}>{v.face}</span>
                </button>
            ))}
        </div>

            
            {isAgentOpen && (
                <>
                    {/* Resizer Handle */}
                    <div className="resize-handle w-1.5 h-full bg-zinc-800 flex-shrink-0 cursor-col-resize hover:bg-emerald-500 transition-colors z-30"></div>

                    {/* Right AI Agent Sidebar */}
                    <ThemePanel translucent className="h-full overflow-hidden flex flex-col relative z-20 border-emerald-500/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] p-0 w-full col-start-5 col-end-6">
                        <AgentSidebar 
                            onSubmit={() => alert("Simulation environments rely on ProStudio for direct constraints.")}
                            isThinking={false}
                            onClose={() => setIsAgentOpen(false)}
                        />
                    </ThemePanel>
                </>
            )}

        </div>
      
      <CloudLoadModal 
          isOpen={isCloudModalOpen}
          onClose={() => setIsCloudModalOpen(false)}
          projects={cloudProjects}
          onLoad={handleDownloadFromCloud}
          onDelete={handleDeleteCloudProject}
          loadingAction={cloudLoadingAction}
          appTheme="studiosim"
      />
    </div>
  );
};

export default StudioSimPage;
