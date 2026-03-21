import React, { useState, useEffect, useMemo } from 'react';
import { Factory, Box, Cpu, Settings2, ShieldCheck, Zap, Server, Globe2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import ThemePanel from '../components/ThemePanel';
import { loadStateFromStorage } from '../hooks/useAutoSave';
import { DesignProject } from '../types';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, Line, Center, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

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

const ProductionSimPage: React.FC = () => {
  const [alonPanelWidth, setAlonPanelWidth] = useState(400);
  const gridTemplateColumns = `280px minmax(500px, 1fr) 6px ${alonPanelWidth}px`;
  
  const [projects] = useState<DesignProject[]>(() => loadStateFromStorage().projects);
  const [activeProject, setActiveProject] = useState<DesignProject | null>(null);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);

  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (projectId) {
        setActiveProject(projects.find(p => p.id === projectId) || null);
        localStorage.setItem('lastActiveStudioProjectId', projectId);
    } else {
        const lastActiveId = localStorage.getItem('lastActiveStudioProjectId');
        if (lastActiveId) {
            navigate(`/productionsim/${lastActiveId}`, { replace: true });
        } else if (projects.length > 0) {
            const firstProj = [...projects].sort((a, b) => b.createdAt - a.createdAt)[0];
            navigate(`/productionsim/${firstProj.id}`, { replace: true });
        }
    }
  }, [projectId, projects, navigate]);

  // Construct stable BOM with mock vendors
  const componentsList = useMemo(() => {
      const comps = activeProject?.specs?.components || [];
      return comps.map((c, i) => ({
          ...c,
          id: `comp_${i}`,
          vendor: BOM_VENDORS[i % BOM_VENDORS.length]
      }));
  }, [activeProject]);

  return (
    <div className="h-full flex flex-col gap-2 p-2 relative bg-black/90">
      
      {/* Action Header Menu Bar */}
      <ThemePanel className="w-full shrink-0 h-14 flex items-center justify-between px-6 border-b border-yellow-500/20 shadow-[0_4px_30px_rgba(234,179,8,0.05)] bg-[#09090b]/80 backdrop-blur">
        
        {/* Left Side - Project Name */}
        <div className="flex items-center gap-4">
            {activeProject?.name ? (
                <div className="text-sm text-yellow-500 font-bold tracking-widest uppercase flex items-center gap-2">
                    <Box className="w-4 h-4" /> {activeProject.name}
                </div>
            ) : (
                <div className="text-sm text-zinc-500 font-bold tracking-widest uppercase">
                    NO ACTIVE PAYLOAD
                </div>
            )}
        </div>
        
        {/* Right Side - Dummy Toggles */}
        <div className="flex items-center gap-2">
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Global Manufacturing Network"><Globe2 className="w-4 h-4" /></button>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Compute Tiers"><Server className="w-4 h-4" /></button>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Energy Metrics"><Zap className="w-4 h-4" /></button>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Compliance Validation"><ShieldCheck className="w-4 h-4" /></button>
        </div>
      </ThemePanel>

      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        
        {/* Left Sidebar: Vendor Mapping */}
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] border-yellow-500/10">
            <div className="px-5 py-3 border-b border-zinc-800/80 bg-black/60 relative z-10">
                <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Globe2 className="w-3 h-3 text-yellow-500" /> Vendor Topology</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {componentsList.map((comp) => (
                    <div 
                        key={`vendor_${comp.id}`} 
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${hoveredComponentId === comp.id ? 'bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.15)]' : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-800/60'}`}
                        onMouseEnter={() => setHoveredComponentId(comp.id)}
                        onMouseLeave={() => setHoveredComponentId(null)}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded bg-black border ${hoveredComponentId === comp.id ? 'border-yellow-500/50 text-yellow-400' : 'border-zinc-700 text-zinc-500'}`}>
                                <Box className="w-3 h-3" />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-bold text-zinc-300 truncate uppercase tracking-wider">{comp.name}</span>
                                <span className={`text-[10px] uppercase font-mono tracking-widest ${hoveredComponentId === comp.id ? 'text-emerald-400' : 'text-zinc-500'}`}>NODE /// {comp.vendor}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Cinematic Gradient Bottom */}
            <div className="absolute w-full h-12 bottom-0 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
        </ThemePanel>
        
        {/* Central Map / Exploded WebGL Canvas */}
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 border border-yellow-500/10 shadow-[inset_0_0_50px_rgba(234,179,8,0.03)] rounded-lg">
            
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

                            <primitive object={new THREE.AxesHelper(100)} position={[0, -49.9, 0]} />

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
                            
                            <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
                                <GizmoViewport axisColors={['#ef4444', '#10b981', '#3b82f6']} labelColor="black" />
                            </GizmoHelper>

                            <OrbitControls makeDefault autoRotate={false} minDistance={20} maxDistance={500} maxPolarAngle={Math.PI / 2 - 0.05} />
                        </Canvas>

                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-zinc-600 font-mono text-xs border border-zinc-800/50 bg-black/40 p-6 rounded-xl uppercase tracking-widest text-center shadow-2xl">
                            Fabrication network idle. <br/> Awaiting project physical payload (STL).
                        </div>
                    </div>
                )}
            </div>
        </ThemePanel>

        <div className="resize-handle w-1.5 h-full bg-zinc-800/50 flex-shrink-0 rounded-full hover:bg-yellow-500/50 transition-colors"></div>
        
        {/* Right Sidebar: BOM Analytics */}
        <ThemePanel translucent className="h-full overflow-hidden flex flex-col relative z-10 border-yellow-500/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
            <div className="px-5 py-3 border-b border-zinc-800/80 bg-black/60 shrink-0">
                <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Settings2 className="w-3 h-3 text-yellow-500" /> BOM Analytics</h2>
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

export default ProductionSimPage;
