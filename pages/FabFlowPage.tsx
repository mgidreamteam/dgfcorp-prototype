import React, { useState, useEffect, useMemo } from 'react';
import { Factory, Box, Cpu, Settings2, ShieldCheck, Zap, Server, Globe2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import ThemePanel from '../components/ThemePanel';
import ProjectSidebar from '../components/ProjectSidebar';
import FileMenuBar from '../components/MenuBar';
import { loadStateFromStorage } from '../hooks/useAutoSave';
import { DesignProject } from '../types';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, Line, Center, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { CameraPresets, ViewMode } from '../components/CameraPresets';
import { RoomWalls } from '../components/RoomWalls';
import { SimHUD } from '../components/SimHUD';
import { generateOpenScadCode, generateStlFile } from '../services/gemini';
import { Binary, RefreshCw, Hammer } from 'lucide-react';

const BOM_VENDORS = ["Foxconn", "TSMC", "Samsung", "Texas Instruments", "Bosch", "Panasonic", "Intel", "NXP", "Qualcomm", "Murata"];

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
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial 
        color="#52525b" 
        roughness={0.25} 
        metalness={0.7} 
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
  const [alonPanelWidth, setAlonPanelWidth] = useState(300);
  const [viewMode, setViewMode] = useState<ViewMode>('3D');
  const [triggerHierarchyView, setTriggerHierarchyView] = useState<string | null>(null);
  const gridTemplateColumns = `256px minmax(500px, 1fr) 6px ${alonPanelWidth}px`;
  
  const [projects, setProjects] = useState<DesignProject[]>(() => loadStateFromStorage().projects);
  const [activeProject, setActiveProject] = useState<DesignProject | null>(null);
  const [isGeneratingModel, setIsGeneratingModel] = useState(false);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);

  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (projectId) {
        setActiveProject(projects.find(p => p.id === projectId) || null);
        localStorage.setItem('lastActiveStudioProjectId', projectId);
    } else {
        setActiveProject(null);
    }
  }, [projectId, projects]);

  // Construct stable BOM with mock vendors
  const componentsList = useMemo(() => {
      const comps = activeProject?.specs?.components || [];
      return comps.map((c, i) => ({
          ...c,
          id: `comp_${i}`,
          vendor: BOM_VENDORS[i % BOM_VENDORS.length]
      }));
  }, [activeProject]);

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
          setActiveProject(updatedProj);
      } catch(err) {
          console.error(err);
          alert("Simulation conversion failed. " + (err as any).message);
      } finally {
          setIsGeneratingModel(false);
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
    <div className="h-full flex flex-col p-2 relative bg-black/90">
      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        
        {/* Left Sidebar: Project Mapping */}
        <ProjectSidebar 
            projects={projects} 
            activeProjectId={activeProject?.id || null} 
            onNewProject={() => {}} 
            onRenameProject={() => {}} 
            triggerHierarchyView={triggerHierarchyView} 
            onHierarchyViewClosed={() => setTriggerHierarchyView(null)} 
            cloudProjects={projects.filter(p => false)}
            onPrepareForSim={(project, target) => {
                if (target === 'studiosim') navigate(`/studiosim/${project.id}`);
                else if (target === 'fabflow') navigate(`/fabflow/${project.id}`);
            }}
        />
        
        {/* Central Map / Exploded WebGL Canvas */}
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 border border-yellow-500/10 shadow-[inset_0_0_50px_rgba(234,179,8,0.03)] rounded-lg bg-[#09090b]">
            <div className="border-b border-zinc-800 bg-black/40">
                <FileMenuBar
                    onNewProject={() => {}}
                    onSave={() => {}}
                    onImport={() => {}}
                    onDownload={handleDownloadProject}
                    onCloseProject={() => navigate('/fabflow')}
                    onDeleteProject={() => {}}
                    onExportStl={() => {}}
                    isStlReady={!!activeProject?.assetUrls?.stl}
                    onExportImages={() => {}}
                    areImagesExportable={false}
                    isProjectActive={!!activeProject}
                    onSaveToCloud={() => {}}
                    onLoadFromCloud={() => {}}
                    isCloudSaving={false}
                    cloudStorageUsed={0}
                    extension=".fabFlow"
                />
            </div>
            <div className="px-4 py-2 border-b border-zinc-800/80 shrink-0 bg-transparent flex justify-between items-center bg-black/60">
                 <div className="flex items-center gap-1 bg-black/60 p-1 rounded border border-yellow-500/20">
                     <button onClick={() => setViewMode('3D')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest ${viewMode === '3D' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>3D</button>
                     <button onClick={() => setViewMode('FRONT')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest ${viewMode === 'FRONT' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>FR.</button>
                     <button onClick={() => setViewMode('TOP')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest ${viewMode === 'TOP' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>TOP</button>
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
                        <Canvas camera={{ position: [150, 100, 150], fov: 45 }}>
                            <color attach="background" args={['#09090b']} />
                            <fog attach="fog" args={['#09090b', 100, 500]} />
                            
                            <ambientLight intensity={1.5} />
                            <directionalLight position={[100, 100, 50]} intensity={2.5} castShadow />
                            <directionalLight position={[-100, -100, -50]} intensity={0.5} />
                            
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

                               <CameraPresets mode={viewMode} />
                               <RoomWalls />

                            <React.Suspense fallback={null}>
                                <Environment preset="city" />
                                <ContactShadows position={[0, -50, 0]} opacity={0.8} scale={300} blur={2.5} far={100} />
                                
                                <group position={[0, 0, 0]}>
                                    <StlModel stlData={activeProject.assetUrls.stl} />
                                    
                                    {/* Render Exploded Sub-assembly Nodes */}
                                    {componentsList.map((comp, idx) => (
                                        <ExplodedNode 
                                            key={comp.id} 
                                            comp={comp} 
                                            idx={idx} 
                                            total={componentsList.length} 
                                            isHovered={hoveredComponentId === comp.id}
                                            setHovered={setHoveredComponentId}
                                        />
                                    ))}
                                </group>
                            </React.Suspense>
                            
                            <GizmoHelper alignment="top-right" margin={[60, 60]}>
                                <GizmoViewport axisColors={['#ef4444', '#10b981', '#3b82f6']} labelColor="black" />
                            </GizmoHelper>

                            <OrbitControls makeDefault autoRotate={false} minDistance={20} maxDistance={500} maxPolarAngle={Math.PI / 2 - 0.05} />
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
                {componentsList.length === 0 && (
                    <div className="text-zinc-600 text-xs text-center py-8 italic">No components designated.</div>
                )}
                
                {componentsList.map(comp => (
                    <div 
                        key={`bom_${comp.id}`}
                        onMouseEnter={() => setHoveredComponentId(comp.id)}
                        onMouseLeave={() => setHoveredComponentId(null)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${hoveredComponentId === comp.id ? 'bg-[#00ffcc]/10 border-[#00ffcc]/40 shadow-[0_0_20px_rgba(0,255,204,0.15)]' : 'bg-black/40 border-zinc-800/80 hover:border-zinc-600 hover:bg-zinc-900/60'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className={`font-bold text-sm tracking-wide ${hoveredComponentId === comp.id ? 'text-white' : 'text-zinc-300'}`}>{comp.name}</h3>
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded uppercase font-bold tracking-widest">
                                QTY: {comp.quantity}
                            </span>
                        </div>
                        <p className={`text-xs mb-3 leading-relaxed ${hoveredComponentId === comp.id ? 'text-zinc-300' : 'text-zinc-500'}`}>{comp.description}</p>
                        
                        <div className="flex items-center justify-between border-t border-zinc-800/60 pt-2">
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#00ffcc] font-mono">
                                <Cpu className="w-3 h-3" /> {comp.vendor}
                            </div>
                            {comp.specifications && (
                                <div className="text-[9px] text-zinc-600 font-mono tracking-wider max-w-[120px] truncate" title={comp.specifications}>
                                    {comp.specifications}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="absolute w-full h-12 bottom-0 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
        </ThemePanel>
        
      </div>
    </div>
  );
};

export default FabFlowPage;
