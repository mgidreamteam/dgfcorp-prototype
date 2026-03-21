import React, { useState, useEffect } from 'react';
import { Factory } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import ThemePanel from '../components/ThemePanel';
import { loadStateFromStorage } from '../hooks/useAutoSave';
import { DesignProject } from '../types';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
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
        setGeometry(geo);
        URL.revokeObjectURL(url);
    });
    return () => URL.revokeObjectURL(url);
  }, [stlData]);

  if (!geometry) return null;
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#71717a" roughness={0.4} metalness={0.6} />
    </mesh>
  );
};

const ProductionSimPage: React.FC = () => {
  const [alonPanelWidth, setAlonPanelWidth] = useState(400);
  const gridTemplateColumns = `256px minmax(500px, 1fr) 6px ${alonPanelWidth}px`;
  
  const [projects] = useState<DesignProject[]>(() => loadStateFromStorage().projects);
  const [activeProject, setActiveProject] = useState<DesignProject | null>(null);

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

  return (
    <div className="h-full flex flex-col gap-2 p-2">
      <ThemePanel className="w-full shrink-0 h-16 flex items-center px-6 border-b border-yellow-500/20">
        <h1 className="text-xl font-bold tracking-widest uppercase text-yellow-500 opacity-90 flex items-center gap-3">
            <Factory className="w-5 h-5" />
            FabFlow: Production Orchestration
        </h1>
      </ThemePanel>
      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        
        {/* Left Sidebar */}
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden p-6">
            <h2 className="text-subheading font-normal text-zinc-500 uppercase tracking-tighter mb-4">Vendor Node Topology</h2>
        </ThemePanel>
        
        {/* Central Map / Canvas Area */}
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 border border-yellow-500/10 shadow-[inset_0_0_50px_rgba(234,179,8,0.02)]">
            <div className="px-6 py-4 border-b border-zinc-800 shrink-0 bg-black/40 backdrop-blur-md flex justify-between items-center">
                <h2 className="text-subheading font-normal text-yellow-500 uppercase tracking-tighter">
                    Global Supply Chain Logistics
                </h2>
                {activeProject?.name && (
                    <div className="text-xs text-zinc-500 font-mono tracking-widest uppercase border border-zinc-800 px-3 py-1 bg-zinc-900 rounded-full">
                        ASSET: {activeProject.name}
                    </div>
                )}
            </div>
            {/* 3D Canvas area */}
            <div className="flex-1 w-full h-full bg-black/20 flex flex-col items-center justify-center relative cursor-move">
                {activeProject?.assetUrls?.stl ? (
                    <div className="absolute inset-0">
                        <Canvas camera={{ position: [100, 100, 100], fov: 45 }}>
                            <ambientLight intensity={0.4} />
                            <directionalLight position={[10, 10, 10]} intensity={1.5} />
                            <React.Suspense fallback={null}>
                                <Stage environment="city" intensity={0.5} adjustCamera>
                                    <StlModel stlData={activeProject.assetUrls.stl} />
                                </Stage>
                            </React.Suspense>
                            <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
                        </Canvas>
                        <div className="absolute bottom-4 left-4 text-[10px] font-mono text-zinc-500 uppercase flex flex-col gap-1 pointer-events-none">
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Physical Node Render: Online</div>
                            <div>Polygonal Proxy Interlinked</div>
                        </div>
                    </div>
                ) : (
                    <div className="text-zinc-600 font-mono text-sm uppercase tracking-widest text-center px-4">
                        Fabrication network idle. <br/> Awaiting project physical payload (STL).
                    </div>
                )}
            </div>
        </ThemePanel>

        <div className="resize-handle w-1.5 h-full bg-zinc-800 flex-shrink-0 rounded-full"></div>
        
        {/* Right Sidebar */}
        <ThemePanel translucent className="h-full overflow-hidden relative z-10">
            <div className="px-6 py-4 border-b border-zinc-800 shrink-0">
                <h2 className="text-subheading font-normal text-white uppercase tracking-tighter">BOM Analytics</h2>
            </div>
            {/* Blank Data Area */}
            <div className="flex-1 p-6"></div>
        </ThemePanel>
        
      </div>
    </div>
  );
};

export default ProductionSimPage;
