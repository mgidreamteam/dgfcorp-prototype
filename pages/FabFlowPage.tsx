import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Factory, Box, Cpu, Settings2, ShieldCheck, Zap, Server, Globe2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import ThemePanel from '../components/ThemePanel';
import ProjectSidebar from '../components/ProjectSidebar';
import FileMenuBar from '../components/MenuBar';
import { useProject } from '../contexts/ProjectContext';
import { DesignProject, CloudProject } from '../types';
import { auth, db, storage } from '../services/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import CloudLoadModal from '../components/CloudLoadModal';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, Line, Center, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { CameraPresets, ViewMode } from '../components/CameraPresets';
import { RoomWalls } from '../components/RoomWalls';
import { SimHUD } from '../components/SimHUD';
import { runCompetencyMatch } from '../services/vendorDb';
import { Binary, RefreshCw, Hammer, Maximize2, Minimize2, Lightbulb, LightbulbOff, Box as BoxIcon, Droplet, Sparkles, Sun, Moon, Eye, EyeOff, Grid3X3 } from 'lucide-react';
import { generateStlFile } from '../services/gemini';
import { StudioLighting } from '../components/StudioLighting';

const StlModel: React.FC<{ 
    stlData: string;
    isExploded?: boolean;
    isHovered?: boolean;
    isSelected?: boolean;
    materialType?: 'plastic' | 'matte' | 'metallic';
    baseColor?: string;
    onHover?: (state: boolean) => void;
    onClick?: () => void;
    onLoaded?: (s: {x:number,y:number,z:number}) => void;
}> = ({ stlData, isExploded, isHovered, isSelected, materialType = 'metallic', baseColor = "#a1a1aa", onHover, onClick, onLoaded }) => {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const meshRef = React.useRef<THREE.Mesh>(null);
  const targetPos = React.useRef(new THREE.Vector3());
  const currentPos = React.useRef(new THREE.Vector3());
  
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
            geo.computeVertexNormals(); // Crucial phase for high-resolution visual surface mapping
            if (onLoaded) onLoaded({ x: size.x, y: size.y, z: size.z });
        }
        setGeometry(geo);
        URL.revokeObjectURL(url);
    });
    return () => URL.revokeObjectURL(url);
  }, [stlData]);

  useEffect(() => {
    return () => {
      if (geometry) geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
     if (!geometry) return;
     const center = geometry.boundingSphere?.center || new THREE.Vector3();
     const dir = center.clone().normalize();
     if (dir.lengthSq() === 0) dir.set(0, 1, 0); 
     
     if (isExploded) {
       targetPos.current.copy(dir.multiplyScalar(45));
     } else {
       targetPos.current.set(0, 0, 0);
     }
  }, [geometry, isExploded]);

  useFrame(() => {
      if (meshRef.current) {
          currentPos.current.lerp(targetPos.current, 0.1);
          meshRef.current.position.copy(currentPos.current);
      }
  });

  if (!geometry) return null;
  return (
    <mesh 
        ref={meshRef} 
        geometry={geometry} 
        castShadow 
        receiveShadow
        onPointerOver={(e) => { e.stopPropagation(); onHover?.(true); }}
        onPointerOut={(e) => { e.stopPropagation(); onHover?.(false); }}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      <meshPhysicalMaterial 
        color={isSelected ? "#eab308" : isHovered ? "#00ffcc" : baseColor} 
        emissive={isSelected || isHovered ? (isSelected ? "#eab308" : "#00ffcc") : "#000000"}
        emissiveIntensity={isSelected ? 0.4 : isHovered ? 0.2 : 0}
        roughness={materialType === 'matte' ? 0.8 : materialType === 'plastic' ? 0.2 : 0.4} 
        metalness={materialType === 'metallic' ? 0.8 : 0.1}
        clearcoat={materialType === 'plastic' ? 1.0 : 0}
        clearcoatRoughness={0.1}
        side={THREE.DoubleSide} 
      />
    </mesh>
  );
};

interface ExplodedNodeProps {
    comp: any;
    idx: number;
    total: number;
    isHovered: boolean;
    setHovered: React.Dispatch<React.SetStateAction<string | null>>;
}

const ExplodedNode: React.FC<ExplodedNodeProps> = ({ 
    comp, 
    idx, 
    total, 
    isHovered, 
    setHovered 
}) => {
    // Generate an exploded orbit position
    const angle = (idx / total) * Math.PI * 2;
    const radius = 80; // Exploded distance
    const heightOffset = (Math.sin(idx * Math.PI) * 30) + 20;

    const outerPos: [number, number, number] = [
        Math.cos(angle) * radius,
        heightOffset,
        Math.sin(angle) * radius
    ];
    
    // Tether snaps back to central geometry
    const innerPos: [number, number, number] = [
        Math.cos(angle) * 10,
        0,
        Math.sin(angle) * 10
    ];

    return (
        <group>
            {/* The Part Indicator Box */}
            <mesh 
                position={outerPos}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(comp.id); }}
                onPointerOut={(e) => { e.stopPropagation(); setHovered(null); }}
            >
                <boxGeometry args={[6, 6, 6]} />
                <meshStandardMaterial 
                    color={isHovered ? "#00ffcc" : "#eab308"} 
                    emissive={isHovered ? "#00ffcc" : "#000000"}
                    emissiveIntensity={isHovered ? 1.5 : 0}
                    roughness={0.1}
                    metalness={0.9}
                />
            </mesh>
            
            {/* Tether / Callout Line */}
            <Line 
                points={[outerPos, innerPos]} 
                color={isHovered ? "#00ffcc" : "#52525b"} 
                lineWidth={isHovered ? 2 : 1}
                transparent
                opacity={isHovered ? 0.9 : 0.3}
            />
        </group>
    );
};

const FabFlowPage: React.FC = () => {
  const [hiloPanelWidth, setHiloPanelWidth] = useState(300);
  const [viewMode, setViewMode] = useState<ViewMode>('3D');
  const [triggerHierarchyView, setTriggerHierarchyView] = useState<string | null>(null);
  const gridTemplateColumns = `256px minmax(500px, 1fr) 6px ${hiloPanelWidth}px`;
  
  const { projects, setProjects, activeProjectId, setActiveProjectId } = useProject();
  const activeProject = React.useMemo(() => projects.find(p => p.id === activeProjectId) || null, [projects, activeProjectId]);
  const [isGeneratingModel, setIsGeneratingModel] = useState(false);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const [isExploded, setIsExploded] = useState(false);
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

  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (projectId && projectId !== activeProjectId) {
        const projectExists = projects.some(p => p.id === projectId);
        if (projectExists) {
            setActiveProjectId(projectId);
        } else {
            alert("The requested project could not be found locally. It may have been deleted, corrupted, or not synchronized. Opening a blank workspace.");
            navigate('/fabflow', { replace: true });
        }
    } else if (!projectId && activeProjectId) {
        navigate(`/fabflow/${activeProjectId}`, { replace: true });
    }
  }, [projectId, activeProjectId, projects, navigate, setActiveProjectId]);

  const primaryMaterialInfo = React.useMemo(() => {
      let type: 'plastic' | 'matte' | 'metallic' = 'metallic';
      let color = "#a1a1aa";
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

  // Hook vendor matching logic utilizing 4-vector matrix
  const vendorMatches = useMemo(() => {
      if (!activeProject?.specs) return [];
      const partsMap = (activeProject.assemblyParts || []).map(p => ({ id: p.id, name: p.name }));
      const bomMap = (activeProject.specs.bom || []).map((b, i) => ({ id: `bom_${i}`, name: b.component }));
      return runCompetencyMatch(activeProject.specs, partsMap.length > 0 ? partsMap : bomMap);
  }, [activeProject]);

  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [cloudLoadingAction, setCloudLoadingAction] = useState<string | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);

  const fetchCloudProjects = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
        const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/cloudProjects`));
        setCloudProjects(snap.docs.map(d => d.data() as CloudProject));
    } catch (err) { console.error(err); }
  }, []);

  const handleCloudModalOpen = () => {
      fetchCloudProjects();
      setIsCloudModalOpen(true);
  };

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
          setCloudLoadingAction(cloudProj.id);
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
              navigate(`/fabflow/${projectData.id}`);
              setIsCloudModalOpen(false);
          }
      } catch (err: any) {
          alert(`Cloud Fetch Failed: ${err.message}`);
      } finally {
          setCloudLoadingAction(null);
      }
  };

  const handleDeleteFromCloud = async (cloudProj: CloudProject) => {
      if (!auth.currentUser || !window.confirm("Permanently delete this cloud asset?")) return;
      try {
          setCloudLoadingAction(cloudProj.id);
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}.dream`);
          await deleteObject(fileRef);
          await deleteDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, cloudProj.id));
          await fetchCloudProjects();
          window.dispatchEvent(new Event('update-cloud-quota'));
      } catch (err: any) {
          alert(`Cloud Purge Blocked: ${err.message}`);
      } finally {
          setCloudLoadingAction(null);
      }
  };

  const handleDeleteProject = () => {
      if (!activeProject || !window.confirm(`Delete local project "${activeProject.name}"?`)) return;
      setProjects(prev => prev.filter(p => p.id !== activeProject.id));
      navigate('/fabflow');
  };

  const cloudStorageUsed = useMemo(() => cloudProjects.reduce((acc, p) => acc + p.sizeBytes, 0), [cloudProjects]);

  const handleGenerateModel = async () => {
      alert("Manufacturing Simulation requires a valid 3D Assembly. Please generate the hardware logic natively inside the Studio.");
      navigate(`/studio/${activeProject?.id || ''}`);
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

  const handleDownloadProject = () => {
    if (!activeProject) return;
    const dataStr = JSON.stringify(activeProject, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${activeProject.name.replace(/ /g, '_')}.fabFlow`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
                navigate('/fabflow');
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
            extension=".fabFlow"
        />
      </ThemePanel>
      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        
        {/* Left Sidebar: Project Mapping */}
        <ProjectSidebar 
            projects={projects} 
            activeProjectId={activeProject?.id || null} 
            onNewProject={() => navigate('/studio')} 
            onRenameProject={() => {}} 
            triggerHierarchyView={triggerHierarchyView} 
            onHierarchyViewClosed={() => setTriggerHierarchyView(null)} 
            cloudProjects={cloudProjects}
            onLoadCloudProject={handleDownloadFromCloud}
            onDeleteCloudProject={handleDeleteFromCloud}
            cloudLoadingAction={cloudLoadingAction}
            onPrepareForSim={(project, target) => {
                if (target === 'studiosim') navigate(`/studiosim/${project.id}`);
                else if (target === 'fabflow') navigate(`/fabflow/${project.id}`);
            }}
        />
        
        {/* Central Map / Exploded WebGL Canvas */}
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 border border-yellow-500/10 shadow-[inset_0_0_50px_rgba(234,179,8,0.03)] rounded-lg bg-[#09090b]">
            <div className="px-4 py-2 border-b border-zinc-800/80 shrink-0 bg-transparent flex justify-between items-center bg-black/60">
                 <div className="flex items-center gap-2">
                     <div className="flex items-center gap-1 bg-black/60 p-1 rounded border border-yellow-500/20">
                         <button onClick={() => setViewMode('3D')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest ${viewMode === '3D' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>3D</button>
                         <button onClick={() => setViewMode('FRONT')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest ${viewMode === 'FRONT' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>FR.</button>
                         <button onClick={() => setViewMode('TOP')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest ${viewMode === 'TOP' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>TOP</button>
                     </div>
                     
                     <div className="flex items-center gap-3 bg-black/60 px-3 py-1.5 rounded-lg border border-zinc-800/80 shadow-inner">
                         <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Maximize2 className="w-3 h-3 text-zinc-400" /> Mesh Res</span>
                         <input 
                            type="range" min="10" max="150" step="5" 
                            value={openScadRes} 
                            onChange={e => setOpenScadRes(Number(e.target.value))} 
                            onMouseUp={handleResApply} 
                            onTouchEnd={handleResApply} 
                            className="w-24 md:w-32 accent-yellow-500 outline-none cursor-pointer" 
                            disabled={isResizingMesh} 
                         />
                         <div className="w-10 text-right font-mono text-xs text-yellow-500">
                             {isResizingMesh ? <RefreshCw className="w-3 h-3 animate-spin inline-block text-yellow-500" /> : openScadRes}
                         </div>
                     </div>

                     <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-zinc-800/80 shadow-inner">
                         <button onClick={() => setRoomTheme(roomTheme === 'dark' ? 'light' : 'dark')} className="p-1.5 rounded transition-colors text-zinc-500 hover:text-zinc-300" title="Toggle Environment">
                            {roomTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                         </button>
                     </div>

                     <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-zinc-800/80 shadow-inner">
                         <button onClick={() => setMaterialType('matte')} className={`p-1.5 rounded transition-colors ${materialType === 'matte' ? 'bg-yellow-900/40 text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`} title="Matte Finish"><BoxIcon className="w-4 h-4" /></button>
                         <button onClick={() => setMaterialType('plastic')} className={`p-1.5 rounded transition-colors ${materialType === 'plastic' ? 'bg-yellow-900/40 text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`} title="Glossy Plastic"><Droplet className="w-4 h-4" /></button>
                         <button onClick={() => setMaterialType('metallic')} className={`p-1.5 rounded transition-colors ${materialType === 'metallic' ? 'bg-yellow-900/40 text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`} title="Metallic Finish"><Sparkles className="w-4 h-4" /></button>
                     </div>

                     <div className="flex items-center gap-3 bg-black/60 px-3 py-1.5 rounded-lg border border-zinc-800/80 shadow-inner">
                         <button onClick={() => setShowGrid(!showGrid)} className="outline-none transition-colors border-r border-zinc-700 pr-2 mr-1" title="Toggle Grid">
                            <Grid3X3 className={`w-4 h-4 ${showGrid ? 'text-yellow-500 hover:text-yellow-400' : 'text-zinc-600 hover:text-zinc-500'}`} />
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

                     <button 
                        onClick={() => setIsExploded(!isExploded)} 
                        className={`px-3 py-1 flex items-center gap-1.5 rounded transition-colors text-[10px] font-bold uppercase tracking-widest border ${isExploded ? 'bg-red-900/40 text-red-400 border-red-500/30 hover:bg-red-900/60' : 'bg-black/60 text-zinc-400 border-zinc-500/30 hover:text-white hover:border-zinc-400/50'}`}
                     >
                         {isExploded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                         {isExploded ? 'Assemble' : 'Explode'}
                     </button>
                 </div>
                 <div className="flex items-center gap-2">
                     <button className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Global Manufacturing Network"><Globe2 className="w-3 h-3" /></button>
                     <button className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Compute Tiers"><Server className="w-3 h-3" /></button>
                     <button className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Energy Metrics"><Zap className="w-3 h-3" /></button>
                     <button className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Compliance Validation"><ShieldCheck className="w-3 h-3" /></button>
                 </div>
            </div>
            
            <div className="flex-1 w-full h-full bg-[#09090b] relative cursor-move">
                {activeProject?.assetUrls?.stl ? (
                    <div className="absolute inset-0">
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
                                <ContactShadows position={[0, -50, 0]} opacity={0.8} scale={300} blur={2.5} far={100} />
                                
                                <group position={[0, 0, 0]}>
                                    {activeProject.assemblyParts && activeProject.assemblyParts.length > 0 ? (
                                        activeProject.assemblyParts.map((part) => (
                                            part.stlUrl && (
                                                <StlModel 
                                                    key={part.id} 
                                                    stlData={part.stlUrl} 
                                                    isExploded={isExploded}
                                                    isHovered={hoveredComponentId === part.id}
                                                    isSelected={false}
                                                    materialType={materialType}
                                                    baseColor={primaryMaterialInfo.color}
                                                    onHover={(state) => setHoveredComponentId(state ? part.id : null)}
                                                    onClick={() => setHoveredComponentId(part.id)}
                                                    onLoaded={(size) => setModelSize(prev => ({
                                                        x: Math.max(prev.x, size.x),
                                                        y: Math.max(prev.y, size.y),
                                                        z: Math.max(prev.z, size.z)
                                                    }))}
                                                />
                                            )
                                        ))
                                    ) : (
                                        <StlModel stlData={activeProject.assetUrls.stl} materialType={materialType} baseColor={primaryMaterialInfo.color} onLoaded={(size) => setModelSize(size)} />
                                    )}
                                    
                                    {/* Legacy Placeholders omitted if assembly logic is rendering natives */}
                                    {(!activeProject.assemblyParts || activeProject.assemblyParts.length === 0) && vendorMatches.map((comp, idx) => (
                                        <ExplodedNode 
                                            key={comp.partId} 
                                            comp={comp} 
                                            idx={idx} 
                                            total={vendorMatches.length} 
                                            isHovered={hoveredComponentId === comp.partId}
                                            setHovered={setHoveredComponentId}
                                        />
                                    ))}
                                </group>
                            </React.Suspense>
                            
                            <GizmoHelper alignment="top-right" margin={[60, 60]}>
                                <GizmoViewport axisColors={['#ef4444', '#10b981', '#3b82f6']} labelColor="black" />
                            </GizmoHelper>

                            <OrbitControls makeDefault autoRotate={false} minDistance={20} maxDistance={500} />
                        </Canvas>

                    </div>
                ) : !activeProject ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
                        <div className="max-w-md text-center bg-transparent pointer-events-auto bg-black/80 backdrop-blur p-8 rounded-xl border border-zinc-800 shadow-2xl">
                            <Factory className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                            <h3 className="text-xl font-black text-zinc-400 tracking-widest uppercase mb-3">FabFlow Engine</h3>
                            <p className="text-zinc-500 leading-relaxed text-sm mb-6">Select a local project or load a global blueprint from the WorkSpace sidebar to begin manufacturing trace analysis.</p>
                        </div>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
                        <div className="max-w-md text-center bg-transparent pointer-events-auto bg-black/80 backdrop-blur p-8 rounded-xl border border-zinc-800 shadow-2xl">
                            <Binary className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                            <h3 className="text-xl font-black text-zinc-400 tracking-widest uppercase mb-3">FabFlow Simulation Engine</h3>
                            <p className="text-zinc-500 leading-relaxed text-sm mb-6">A solid geometric representation (OpenSCAD / STL) is required to run component manufacturing flow analysis.</p>
                            
                            <button 
                                onClick={handleGenerateModel}
                                disabled={isGeneratingModel}
                                className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold tracking-widest uppercase rounded-lg shadow-[0_0_20px_rgba(202,138,4,0.4)] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGeneratingModel ? (
                                    <><RefreshCw className="w-5 h-5 animate-spin" /> Compiling Solid Flow Volumes...</>
                                ) : (
                                    <><Hammer className="w-5 h-5" /> Import & Resolve Physics</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
                <SimHUD colorClass="yellow" />
            </div>
        </ThemePanel>

        {/* Resizer handle visualizer */}
        <div className="w-full h-full flex flex-col items-center justify-center cursor-col-resize opacity-20 hover:opacity-100 transition-opacity group">
           <div className="h-12 w-1.5 bg-zinc-600 rounded-full group-hover:bg-yellow-500 transition-colors"></div>
        </div>

        {/* Right Sidebar: Vendor/BOM List */}
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] border-yellow-500/10">
            <div className="px-5 py-3 border-b border-zinc-800/80 bg-black/60 relative z-10 flex justify-between items-center shrink-0">
                <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Globe2 className="w-3 h-3 text-yellow-500" /> Vendor Match</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2 relative">
                {vendorMatches.length === 0 && (
                    <div className="text-zinc-600 text-xs text-center py-8 italic">No component matches returned.</div>
                )}
                
                {vendorMatches.map(match => (
                    <div 
                        key={match.partId}
                        onMouseEnter={() => setHoveredComponentId(match.partId)}
                        onMouseLeave={() => setHoveredComponentId(null)}
                        onClick={() => setIsExploded(true)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${hoveredComponentId === match.partId ? 'bg-[#00ffcc]/10 border-[#00ffcc]/40 shadow-[0_0_20px_rgba(0,255,204,0.15)]' : 'bg-black/40 border-zinc-800/80 hover:border-zinc-600 hover:bg-zinc-900/60'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className={`font-bold text-sm tracking-wide ${hoveredComponentId === match.partId ? 'text-white' : 'text-zinc-300'}`}>
                                {activeProject?.assemblyParts?.find(p => p.id === match.partId)?.name || match.partId.replace('bom_', 'BOM ')}
                            </h3>
                            <span className={`text-[10px] font-mono border px-2 py-0.5 rounded uppercase font-bold tracking-widest ${match.status === 'Ordered' ? 'bg-emerald-900/50 text-emerald-400 border-emerald-500/50' : 'text-zinc-500 bg-zinc-900 border-zinc-800'}`}>
                                {match.status}
                            </span>
                        </div>
                        
                        <div className="flex items-center justify-between border-t border-zinc-800/60 pt-2 mt-2">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-zinc-500 tracking-widest font-bold">Recommended Vendor</span>
                                <div className="flex items-center gap-1.5 text-xs text-[#eab308] font-mono mt-0.5">
                                    <Factory className="w-3.5 h-3.5" /> {match.vendorName}
                                </div>
                            </div>
                            <div className="flex flex-col items-end text-right">
                                <span className="text-[10px] uppercase text-zinc-500 tracking-widest font-bold text-right w-full block">Score</span>
                                <div className="flex items-center gap-1.5 text-xs text-white font-mono mt-0.5 font-bold">
                                    <Zap className="w-3.5 h-3.5 text-blue-500" /> {match.score} / 100
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-zinc-800/30">
                            <span className="text-emerald-400 font-mono text-xs">{match.price} / unit</span>
                            <span className="text-zinc-400 font-mono text-xs">{match.leadTime} Lead</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="absolute w-full h-12 bottom-0 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
        </ThemePanel>
        
      </div>

      <CloudLoadModal 
          isOpen={isCloudModalOpen}
          onClose={() => setIsCloudModalOpen(false)}
          projects={cloudProjects}
          onLoad={handleDownloadFromCloud}
          onDelete={handleDeleteFromCloud}
          loadingAction={cloudLoadingAction}
      />
    </div>
  );
};

export default FabFlowPage;
