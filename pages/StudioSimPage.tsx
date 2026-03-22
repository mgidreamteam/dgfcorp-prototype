import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Box, Move, RefreshCw, Maximize, Play, Pause, SkipBack, SkipForward, MousePointer2, Save, Settings2, CloudUpload, Binary, Hammer } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ProjectSidebar from '../components/ProjectSidebar';
import FileMenuBar from '../components/MenuBar';
import { useProject } from '../contexts/ProjectContext';
import { DesignProject, CloudProject, DesignStatus, SimulationBoundaryCondition, AgentLog } from '../types';
import { auth, db, storage } from '../services/firebase';
import { collection, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, getDownloadURL, deleteObject, uploadString } from 'firebase/storage';
import ThemePanel from '../components/ThemePanel';
import DesignInput from '../components/DesignInput';
import { extractSimulationConstraints } from '../services/gemini';
import CloudLoadModal from '../components/CloudLoadModal';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, Center, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { CameraPresets, ViewMode } from '../components/CameraPresets';
import { RoomWalls } from '../components/RoomWalls';
import { SimHUD } from '../components/SimHUD';
import { generateOpenScadCode, generateStlFile } from '../services/gemini';
import { StudioLighting } from '../components/StudioLighting';
import { Lightbulb, LightbulbOff, Box as BoxIcon, Droplet, Sparkles, Sun, Moon, Eye, EyeOff, Grid3X3 } from 'lucide-react';

const StlModel = ({ stlData, materialType = 'metallic', baseColor = '#71717a', onLoaded }: { stlData: string, materialType?: 'plastic' | 'matte' | 'metallic', baseColor?: string, onLoaded?: (s: {x:number,y:number,z:number}) => void }) => {
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
      />
    </mesh>
  );
};

const StudioSimPage: React.FC = () => {
  const navigate = useNavigate();
  const [hiloPanelWidth, setHiloPanelWidth] = useState(400);
  const [viewMode, setViewMode] = useState<ViewMode>('3D');
  const [openScadRes, setOpenScadRes] = useState(50);
  const [globalLightIntensitySlider, setGlobalLightIntensitySlider] = useState(0);
  const [globalLightsOn, setGlobalLightsOn] = useState(true);
  const [showLightMeshes, setShowLightMeshes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [modelSize, setModelSize] = useState({x:20, y:20, z:20});
  const [isResizingMesh, setIsResizingMesh] = useState(false);
  const [materialType, setMaterialType] = useState<'plastic' | 'matte' | 'metallic'>('metallic');
  const [roomTheme, setRoomTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
      setGlobalLightIntensitySlider(roomTheme === 'light' ? 500 : 0);
  }, [roomTheme]);
  const gridTemplateColumns = `256px minmax(500px, 1fr) 6px ${hiloPanelWidth}px`;

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

  return (
    <div className="h-full flex flex-col gap-2 p-2 relative bg-black/90">
      <ThemePanel className="w-full shrink-0">
        <FileMenuBar
            onNewProject={() => navigate('/studio')}
            onSave={() => {}}
            onImport={() => {}}
            onDownload={handleDownloadProject}
            onCloseProject={() => {
                setActiveProjectId(null);
                navigate('/studiosim');
            }}
            onDeleteProject={handleDeleteProject}
            onImportStl={() => alert("Import STL native mesh replacement tool launching shortly")}
            onExportStl={() => {}}
            isStlReady={!!activeProject?.assetUrls?.stl}
            onExportImages={() => {}}
            areImagesExportable={false}
            isProjectActive={!!activeProject}
            onSaveToCloud={handleSaveToCloud}
            onLoadFromCloud={handleCloudModalOpen}
            isCloudSaving={isCloudSaving}
            cloudStorageUsed={cloudStorageUsed}
            extension=".studioSim"
        />
      </ThemePanel>
      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        
        {/* Real Project Registry Sidebar */}
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-md rounded-lg overflow-hidden border border-zinc-800/80 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] z-20">
            <ProjectSidebar 
                projects={projects}
                activeProjectId={activeProjectId}
                baseRoute="/studiosim"
                onNewProject={() => navigate('/studio')}
                onRenameProject={() => {}} 
                triggerHierarchyView={triggerHierarchyView} 
                onHierarchyViewClosed={() => setTriggerHierarchyView(null)} 
                cloudProjects={cloudProjects} 
                onPrepareForSim={(project, target) => {
                    if (target === 'studiosim') navigate(`/studiosim/${project.id}`);
                    else if (target === 'fabflow') navigate(`/fabflow/${project.id}`);
                }}
                onLoadCloudProject={handleDownloadFromCloud}
                onDeleteCloudProject={handleDeleteFromCloud}
            />
        </div>
        
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 border border-[#00ffcc]/10 shadow-[inset_0_0_50px_rgba(0,255,204,0.02)]">
            <div className="px-4 py-2 border-b border-zinc-800/80 shrink-0 bg-transparent flex justify-between items-center bg-black/60 relative z-20">
                 <div className="flex items-center gap-1 bg-black/60 p-1 rounded border border-[#00ffcc]/20 shadow-inner">
                     <button onClick={() => setViewMode('3D')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest ${viewMode === '3D' ? 'bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30' : 'text-zinc-500 hover:text-zinc-300'}`}>3D</button>
                     <button onClick={() => setViewMode('FRONT')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest ${viewMode === 'FRONT' ? 'bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30' : 'text-zinc-500 hover:text-zinc-300'}`}>FR.</button>
                     <button onClick={() => setViewMode('TOP')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest ${viewMode === 'TOP' ? 'bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30' : 'text-zinc-500 hover:text-zinc-300'}`}>TOP</button>
                 </div>
                 
                 <div className="flex items-center gap-3 ml-4 bg-black/60 px-3 py-1.5 rounded-lg border border-zinc-800/80 shadow-inner">
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

                 <div className="flex items-center gap-1 ml-4 bg-black/60 p-1 rounded-lg border border-zinc-800/80 shadow-inner">
                     <button onClick={() => setRoomTheme(roomTheme === 'dark' ? 'light' : 'dark')} className="p-1.5 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Toggle Environment">
                        {roomTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                     </button>
                 </div>

                 <div className="flex items-center gap-1 ml-4 bg-black/60 p-1 rounded-lg border border-zinc-800/80 shadow-inner">
                     <button onClick={() => setMaterialType('matte')} className={`p-1.5 rounded transition-colors ${materialType === 'matte' ? 'bg-[#00ffcc]/20 text-[#00ffcc]' : 'text-zinc-500 hover:text-zinc-300'}`} title="Matte Finish"><BoxIcon className="w-4 h-4" /></button>
                     <button onClick={() => setMaterialType('plastic')} className={`p-1.5 rounded transition-colors ${materialType === 'plastic' ? 'bg-[#00ffcc]/20 text-[#00ffcc]' : 'text-zinc-500 hover:text-zinc-300'}`} title="Glossy Plastic"><Droplet className="w-4 h-4" /></button>
                     <button onClick={() => setMaterialType('metallic')} className={`p-1.5 rounded transition-colors ${materialType === 'metallic' ? 'bg-[#00ffcc]/20 text-[#00ffcc]' : 'text-zinc-500 hover:text-zinc-300'}`} title="Metallic Finish"><Sparkles className="w-4 h-4" /></button>
                 </div>

                 <div className="flex items-center gap-3 ml-4 bg-black/60 px-3 py-1.5 rounded-lg border border-zinc-800/80 shadow-inner">
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

                 <div className="flex-1"></div>
                 
                 <div className="flex items-center gap-4">
                     <div className="text-xs font-mono text-zinc-500 bg-black/50 px-3 py-1.5 rounded border border-zinc-800 tracking-widest">
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
            <div className="flex-1 w-full h-full bg-[#09090b] relative cursor-move rounded-b-lg overflow-hidden z-0">
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
                    
                    <CameraPresets mode={viewMode} />
                    <RoomWalls roomTheme={roomTheme} />

                    <React.Suspense fallback={null}>
                        <Environment preset="city" />
                        {activeProject?.assetUrls?.stl && (
                            <>
                                <ContactShadows position={[0, -50, 0]} opacity={0.8} scale={300} blur={2.5} far={100} />
                                <StlModel stlData={activeProject.assetUrls.stl} materialType={materialType} baseColor={primaryMaterialInfo.color} onLoaded={(size) => setModelSize(size)} />
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
