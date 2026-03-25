import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Box, Move, RefreshCw, Maximize, Play, Pause, SkipBack, SkipForward, MousePointer2, Save, Settings2, CloudUpload, Binary, Hammer, PlusCircle, Trash2, CloudDownload, XSquare, ArrowDownToLine, UploadCloud, Cuboid, Database, Cpu, FolderOpen } from 'lucide-react';
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
import { Lightbulb, LightbulbOff, Box as BoxIcon, Droplet, Sparkles, Sun, Moon, Eye, EyeOff, Grid3X3 } from 'lucide-react';

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
  const [renderMode, setRenderMode] = useState<'wireframe'|'edges'|'solid'>('solid');
  const [openScadRes, setOpenScadRes] = useState(50);
  const [globalLightIntensitySlider, setGlobalLightIntensitySlider] = useState(0);
  const [globalLightsOn, setGlobalLightsOn] = useState(true);
  const [showLightMeshes, setShowLightMeshes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [modelSize, setModelSize] = useState({x:20, y:20, z:20});
  const [isResizingMesh, setIsResizingMesh] = useState(false);
  const [materialType, setMaterialType] = useState<'plastic' | 'matte' | 'metallic'>('metallic');
  const [roomTheme, setRoomTheme] = useState<'dark' | 'light'>('dark');
  const [isOriginLocked, setIsOriginLocked] = useState(false);
  const [cameraView, setCameraView] = useState<ViewMode>('3D');

  useEffect(() => {
      setGlobalLightIntensitySlider(roomTheme === 'light' ? 500 : 0);
  }, [roomTheme]);
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
                <div className="flex justify-between items-center w-full gap-4">
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
                        <button onClick={() => alert("Please load local file natively via ProStudio before running Simulation.")} className="p-1 hover:bg-emerald-900/40 rounded transition-colors flex items-center" title="Load Local File">
                            <div className="relative p-1 flex items-center justify-center">
                                <FolderOpen className="w-5 h-5 text-emerald-500 drop-shadow-md" />
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

                    {/* View / CAD Mode */}
                    <div className="flex items-center gap-1 bg-black/60 p-1 rounded border border-blue-500/20 shadow-inner shrink-0">
                        <button onClick={() => setCadMode('Assembly')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest ${cadMode === 'Assembly' ? 'bg-blue-900/40 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>Assembly</button>
                        <button onClick={() => setCadMode('Circuit')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest gap-1 flex items-center ${cadMode === 'Circuit' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}><Cpu className="w-[18px] h-[18px]" /> Circuits</button>
                    </div>
                </div>

                {/* SECOND ROW: App-Specific Workspace Menubars */}
                <div className="flex justify-between items-center w-full gap-4 mt-2">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto">
                        
                        {/* Viewport Render Modes */}
                        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-zinc-800/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                            <button onClick={() => setRenderMode('wireframe')} className={`p-1.5 rounded transition-all duration-200 ${renderMode === 'wireframe' ? 'bg-[#00ffcc]/20 text-[#00ffcc] shadow-inner scale-95' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`} title="Wireframe View">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                            </button>
                            <button onClick={() => setRenderMode('edges')} className={`p-1.5 rounded transition-all duration-200 ${renderMode === 'edges' ? 'bg-[#00ffcc]/20 text-[#00ffcc] shadow-inner scale-95' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`} title="Solid + Edge View">
                                <svg viewBox="0 0 24 24" className="w-6 h-6">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></polyline>
                                    <line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></line>
                                </svg>
                            </button>
                            <button onClick={() => setRenderMode('solid')} className={`p-1.5 rounded transition-all duration-200 ${renderMode === 'solid' ? 'bg-[#00ffcc]/20 text-[#00ffcc] shadow-inner scale-95' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`} title="Solid View">
                                <svg viewBox="0 0 24 24" className="w-6 h-6">
                                    <polygon points="12 2 3 7 12 12 21 7 12 2" fill="currentColor" fillOpacity="0.4"></polygon>
                                    <polygon points="3 16 3 7 12 12 12 22 3 16" fill="currentColor" fillOpacity="0.8"></polygon>
                                    <polygon points="12 22 12 12 21 7 21 16 12 22" fill="currentColor"></polygon>
                                </svg>
                            </button>

                            <div className="w-px h-4 bg-zinc-700/80 mx-1.5 rounded"></div>

                            <button onClick={() => alert('V-Ray Plugin Not Licensed')} className="w-[39px] h-[39px] mx-0.5 rounded-sm border border-zinc-600/80 hover:border-orange-500 overflow-hidden relative shadow-md group outline-none transition-colors" title="Photorealistic GPU Render">
                                <img src="/crankshaft_render.png" alt="Render" className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700 ease-out" />
                                <div className="absolute inset-0 ring-1 ring-inset ring-black/40 group-hover:ring-orange-500/30 mix-blend-overlay pointer-events-none"></div>
                            </button>
                        </div>
                        <div className="w-px h-5 bg-zinc-700/80 mx-0.5 rounded"></div>

                        {/* Mesh Resolution */}
                        <div className="flex items-center gap-3 bg-black/60 px-3 py-1.5 rounded-lg border border-zinc-800/80 shadow-inner opacity-40 hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Maximize className="w-3 h-3 text-zinc-400" /> Mesh Res</span>
                            <input 
                               type="range" min="10" max="150" step="5" 
                               value={openScadRes} 
                               onChange={e => setOpenScadRes(Number(e.target.value))} 
                               onMouseUp={handleResApply} 
                               onTouchEnd={handleResApply} 
                               className="w-24 md:w-32 accent-[#00ffcc] outline-none cursor-pointer" 
                               disabled={isResizingMesh} 
                            />
                            <div className="w-10 text-right font-mono text-xs text-[#00ffcc]">
                                {isResizingMesh ? <RefreshCw className="w-3 h-3 animate-spin inline-block text-[#00ffcc]" /> : openScadRes}
                            </div>
                        </div>

                        {/* Environment & Materials */}
                        <div className="flex items-center gap-1 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm shrink-0">
                            <button onClick={() => setRoomTheme(roomTheme === 'dark' ? 'light' : 'dark')} className="p-1.5 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Toggle Environment">
                               {roomTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </button>
                        </div>

                        <div className="flex items-center gap-1 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm shrink-0">
                            <button onClick={() => setMaterialType('matte')} className={`p-1.5 rounded transition-colors ${materialType === 'matte' ? 'bg-[#00ffcc]/20 text-[#00ffcc]' : 'text-zinc-500 hover:text-zinc-300'}`} title="Matte Finish"><BoxIcon className="w-4 h-4" /></button>
                            <button onClick={() => setMaterialType('plastic')} className={`p-1.5 rounded transition-colors ${materialType === 'plastic' ? 'bg-[#00ffcc]/20 text-[#00ffcc]' : 'text-zinc-500 hover:text-zinc-300'}`} title="Glossy Plastic"><Droplet className="w-4 h-4" /></button>
                            <button onClick={() => setMaterialType('metallic')} className={`p-1.5 rounded transition-colors ${materialType === 'metallic' ? 'bg-[#00ffcc]/20 text-[#00ffcc]' : 'text-zinc-500 hover:text-zinc-300'}`} title="Metallic Finish"><Sparkles className="w-4 h-4" /></button>
                        </div>

                        {/* Lux Controls */}
                        <div className="flex items-center gap-3 bg-black/60 px-3 py-1.5 rounded-lg border border-zinc-800/80 shadow-inner">
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowGrid(!showGrid)} className="outline-none transition-colors border-r border-zinc-700 pr-2 mr-1" title="Toggle Grid">
                                   <Grid3X3 className={`w-4 h-4 ${showGrid ? 'text-[#00ffcc] hover:text-[#00ffcc]/80' : 'text-zinc-600 hover:text-zinc-500'}`} />
                                </button>
                                <button onClick={() => setShowLightMeshes(!showLightMeshes)} className="outline-none transition-colors border-r border-zinc-700 pr-2 mr-1" title="Show/Hide Physical Light Frames">
                                   {showLightMeshes ? <Eye className="w-4 h-4 text-zinc-300 hover:text-white" /> : <EyeOff className="w-4 h-4 text-zinc-600 hover:text-zinc-500" />}
                                </button>
                                <button onClick={() => setGlobalLightsOn(!globalLightsOn)} className="outline-none transition-colors" title="Toggle All Lights">
                                   {globalLightsOn ? <Lightbulb className="w-4 h-4 text-yellow-500 hover:text-yellow-400" /> : <LightbulbOff className="w-4 h-4 text-zinc-600 hover:text-zinc-500" />}
                                </button>
                                <span className="text-xs text-zinc-400 font-bold tracking-wider">LUX BASE</span>
                                <input 
                                  type="range" min="-1000" max="1000" step="1" 
                                  value={globalLightIntensitySlider} 
                                  onChange={e => setGlobalLightIntensitySlider(Number(e.target.value))} 
                                  className="w-24 accent-yellow-500 outline-none cursor-pointer" 
                                />
                                <span className="text-xs font-mono w-8 text-zinc-300">{globalLightIntensitySlider > 0 ? `+${globalLightIntensitySlider}` : globalLightIntensitySlider}</span>
                            </div>
                        </div>
                    </div>

                    {/* Transform Tools & Timing */}
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="text-xs font-mono text-zinc-500 bg-black/50 px-3 py-1.5 rounded border border-zinc-800 tracking-widest hidden lg:block">
                            FRAME: <span className="text-emerald-400">0000</span> / 1200
                        </div>
                        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-zinc-800/80 shadow-inner">
                            <button className="p-2 bg-emerald-600/20 text-emerald-400 rounded cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]" title="Select (Active)">
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
                            <div className="w-px h-4 bg-zinc-700 mx-1"></div>
                            <button className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-900/30 rounded transition-colors" title="Play Simulation">
                                <Play className="w-4 h-4 fill-current" />
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
                           cellColor={roomTheme === 'dark' ? '#27272a' : '#d4d4d8'} 
                           sectionColor={roomTheme === 'dark' ? '#3f3f46' : '#a1a1aa'} 
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
                
                {!activeProject?.assetUrls?.stl && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
                        <div className="max-w-md text-center bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-zinc-800 pointer-events-auto shadow-2xl">
                            <Binary className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                            <h3 className="text-xl font-black text-zinc-400 tracking-widest uppercase mb-3">StudioSim Sandbox</h3>
                            <p className="text-zinc-500 leading-relaxed text-sm mb-6">A solid geometric payload is required for structural simulation traces across the active ecosystem.</p>
                            
                            <button 
                                onClick={handleGenerateModel}
                                disabled={isGeneratingModel}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-widest uppercase rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGeneratingModel ? (
                                    <><RefreshCw className="w-5 h-5 animate-spin" /> Synthesizing Solid STL Core...</>
                                ) : (
                                    <><Hammer className="w-5 h-5" /> Import & Convert Topology</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
                
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
      />
    </div>
  );
};

export default StudioSimPage;
