import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { DesignProject, CloudProject, AgentLog, DesignStatus } from '../types';
import { auth, db, storage } from '../services/firebase';
import { collection, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, getDownloadURL, deleteObject, uploadString } from 'firebase/storage';
import AgentSidebar from '../components/AgentSidebar';
import ProjectSidebar from '../components/ProjectSidebar';

import { ShieldAlert, Radar, Globe2, Crosshair, PlusCircle, RefreshCw, UploadCloud, XSquare } from 'lucide-react';
import ThemePanel from '../components/ThemePanel';
import { Canvas } from '@react-three/fiber';
import { Box as DreiBox, Cylinder as DreiCylinder, Grid, Environment, MapControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { CameraPresets, ViewMode } from '../components/CameraPresets';
import { RoomWalls } from '../components/RoomWalls';
import { SimHUD } from '../components/SimHUD';

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

// Procedural Drone/Plane constructed from primitives
function DroneModel() {
    return (
        <group position={[0, 5, 0]}>
            <DreiCylinder args={[0.5, 0.5, 4, 16]} rotation={[Math.PI / 2, 0, 0]}>
                <meshStandardMaterial color="#3b82f6" metalness={0.8} roughness={0.2} />
            </DreiCylinder>
            <DreiBox args={[6, 0.1, 1]} position={[0, 0.2, 0.5]}>
                <meshStandardMaterial color="#1e293b" />
            </DreiBox>
            <DreiBox args={[2, 0.1, 0.8]} position={[0, 0.2, -1.8]}>
                <meshStandardMaterial color="#1e293b" />
            </DreiBox>
            <DreiBox args={[0.1, 1, 0.5]} position={[0, 0.5, -1.8]}>
                <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
            </DreiBox>
        </group>
    );
}

const generateId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

const WorldSim3DPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [agentPanelWidth, setAgentPanelWidth] = useState(400);
  const [viewMode, setViewMode] = useState<ViewMode>('3D');
  const [isOriginLocked, setIsOriginLocked] = useState(false);
  const gridTemplateColumns = `256px minmax(500px, 1fr) 60px 6px ${agentPanelWidth}px`;

  const { projects, setProjects, activeProjectId, setActiveProjectId } = useProject();

  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [isCloudSaving, setIsCloudSaving] = useState(false);

  useEffect(() => {
    if (projectId && projectId !== activeProjectId) {
        setActiveProjectId(projectId);
    } else if (!projectId && activeProjectId) {
        navigate(`/worldsim3d/${activeProjectId}`, { replace: true });
    }
  }, [projectId, activeProjectId, navigate, setActiveProjectId]);

  const fetchCloudProjects = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
        const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/cloudProjects`));
        setCloudProjects(snap.docs.map(d => d.data() as CloudProject));
    } catch (err) { }
  }, []);

  useEffect(() => { fetchCloudProjects(); }, [fetchCloudProjects]);

  const handleSaveToCloud = async () => {
    const activeProject = projects.find(p => p.id === activeProjectId);
    if (!activeProject || !auth.currentUser) return;
    try {
        setIsCloudSaving(true);
        const dataStr = JSON.stringify(activeProject);
        const sizeBytes = new Blob([dataStr]).size;
        
        const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${activeProject.id}.dream`);
        await uploadString(fileRef, dataStr, 'raw');

        const cloudMeta = { id: activeProject.id, name: activeProject.name, sizeBytes, uploadedAt: Date.now() };
        await setDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, activeProject.id), cloudMeta);
        
        await fetchCloudProjects();
        window.dispatchEvent(new Event('update-cloud-quota'));
    } catch (err: any) {
        alert(err.message);
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
          if (projectData.id) {
              setProjects(prev => {
                  const filtered = prev.filter(p => p.id !== projectData.id);
                  return [projectData, ...filtered];
              });
              navigate(`/worldsim3d/${projectData.id}`);
          }
      } catch (err: any) { alert(err.message); }
  };

  const handleDeleteFromCloud = async (cloudProj: CloudProject) => {
      if (!auth.currentUser || !window.confirm("Permanently delete this cloud asset?")) return;
      try {
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}.dream`);
          await deleteObject(fileRef);
          await deleteDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, cloudProj.id));
          await fetchCloudProjects();
          window.dispatchEvent(new Event('update-cloud-quota'));
      } catch (err: any) { alert(err.message); }
  };

  const handleNewProject = () => {
    const id = generateId();
    setProjects(prev => [{ id, name: `Tactical_${prev.length + 1}`, prompt: "", createdAt: Date.now(), specs: null, assetUrls: null, simulationData: null, openScadCode: null, status: DesignStatus.IDLE, isConstrained: false, circuitComponents: null }, ...prev]);
    navigate(`/worldsim3d/${id}`);
  };

  const activeProject = projects.find(p => p.id === activeProjectId);
  const cloudStorageUsed = cloudProjects.reduce((acc, p) => acc + p.sizeBytes, 0);

  return (
    <div className="h-full flex flex-col gap-2 p-2 relative bg-black/90">
      
      {/* Two-Tier Top Multi-CAD Toolbar */}
      <ThemePanel className="w-full shrink-0">
          <div className="px-4 py-2 shrink-0 bg-transparent flex flex-col items-center bg-black/60 z-20 relative">
              
              {/* FIRST ROW: File Menu & Main Views */}
              <div className="flex justify-between items-center w-full gap-4">
                  {/* File Main Actions */}
                  <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-lg border border-zinc-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm overflow-x-auto no-scrollbar shrink-0">
                      <button onClick={handleNewProject} className="p-1.5 text-zinc-300 hover:text-emerald-400 hover:bg-emerald-900/40 rounded transition-colors" title="New Project">
                          <PlusCircle className="w-5 h-5 drop-shadow-md" />
                      </button>
                      <div className="w-px h-5 bg-zinc-700/80 mx-0.5 rounded"></div>
                      <button onClick={handleSaveToCloud} disabled={isCloudSaving} className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/40 rounded transition-colors flex items-center gap-1.5 disabled:opacity-50" title="Commit to Remote Cloud">
                          {isCloudSaving ? <RefreshCw className="w-5 h-5 animate-spin drop-shadow-md" /> : <UploadCloud className="w-5 h-5 drop-shadow-md fill-blue-500/20" />}
                      </button>
                      <div className="w-px h-5 bg-zinc-700/80 mx-0.5 rounded"></div>
                      <button onClick={() => { setActiveProjectId(null); navigate('/worldsim3d'); }} className="p-1.5 text-zinc-300 hover:text-orange-400 hover:bg-orange-900/40 rounded transition-colors" title="Close Project">
                          <XSquare className="w-5 h-5 drop-shadow-md" />
                      </button>
                  </div>
              </div>
          </div>
      </ThemePanel>

      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        
        {/* Left Local/Cloud Explorer */}
        <ProjectSidebar 
            projects={projects} 
            activeProjectId={activeProjectId} 
            onNewProject={handleNewProject} 
            onRenameProject={(id, name) => setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p))} 
            triggerHierarchyView={null} 
            onHierarchyViewClosed={() => {}} 
            cloudProjects={cloudProjects}
            onLoadCloudProject={handleDownloadFromCloud}
            onDeleteCloudProject={handleDeleteFromCloud}
            onDeleteLocalProject={async (id) => {
                setProjects(prev => prev.filter(p => p.id !== id));
                if (activeProjectId === id) setActiveProjectId(null);
            }}
            cloudLoadingAction={null}
            baseRoute="/worldsim3d"
            hideNewProjectButton
        />
        
        {/* Central Map / Canvas Area with Split */}
        <div className="flex flex-col h-full gap-2 relative z-10 overflow-hidden min-w-0">
            <ThemePanel translucent className="flex-1 flex flex-col overflow-hidden relative z-10 p-0 border border-blue-500/10 shadow-[inset_0_0_50px_rgba(59,130,246,0.05)] rounded-lg">
            {/* View Mode Context Header */}
            <div className="px-4 py-2 border-b border-zinc-800/80 shrink-0 bg-transparent flex justify-between items-center bg-black/60 relative z-20">
                <div className="flex items-center gap-1 bg-black/60 p-1 rounded border border-blue-500/20 shadow-inner">
                    <button onClick={() => setViewMode('3D')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest ${viewMode === '3D' ? 'bg-blue-900/40 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>3D</button>
                    <button onClick={() => setViewMode('FRONT')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest ${viewMode === 'FRONT' ? 'bg-blue-900/40 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>FR.</button>
                    <button onClick={() => setViewMode('TOP')} className={`px-3 py-1 rounded transition-colors text-[10px] font-bold uppercase tracking-widest ${viewMode === 'TOP' ? 'bg-blue-900/40 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>TOP</button>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Global Satellite Network"><Globe2 className="w-4 h-4" /></button>
                    <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Radar Array"><Radar className="w-4 h-4" /></button>
                    <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Threat Vector Analyst"><ShieldAlert className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="w-full h-full cursor-crosshair relative bg-[#09090b]">
                <Canvas shadows camera={{ position: [30, 20, 30], fov: 45 }} gl={{ antialias: true }}>
                    <color attach="background" args={['#09090b']} />
                    <fog attach="fog" args={['#09090b', 50, 400]} />
                    <ambientLight intensity={1.2} />
                    <directionalLight castShadow position={[10, 20, 10]} intensity={2.5} />
                    <Environment preset="night" />
                    
                    <Grid 
                        renderOrder={-1} 
                        position={[0, -0.01, 0]} 
                        infiniteGrid 
                        cellSize={10} 
                        cellThickness={0.5} 
                        sectionSize={50} 
                        sectionThickness={1.5} 
                        cellColor={'#1e3a8a'} 
                        sectionColor={'#1d4ed8'} 
                        fadeDistance={200} 
                    />
                    
                    <DroneModel />
                    
                    <CameraPresets mode={viewMode} />
                    <RoomWalls />
                    
                    <MapControls makeDefault enablePan={!isOriginLocked} enableZoom={!isOriginLocked} enableRotate={!isOriginLocked} maxPolarAngle={Math.PI / 2 - 0.05} minDistance={5} maxDistance={200} />
                    
                    <GizmoHelper alignment="top-right" margin={[60, 60]}>
                        <GizmoViewport axisColors={['#ef4444', '#10b981', '#3b82f6']} labelColor="black" />
                    </GizmoHelper>
                </Canvas>

                <SimHUD colorClass="blue" />
            </div>
            </ThemePanel>

            {/* Bottom 25% Atmospheric Diagnostics */}
            <ThemePanel translucent className="h-[25%] shrink-0 flex flex-col overflow-hidden relative z-10 border-blue-500/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
                <div className="px-5 py-3 border-b border-zinc-800/80 bg-black/60 shrink-0">
                    <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Radar className="w-3 h-3 text-blue-500" /> Atmospheric Diagnostics</h2>
                </div>
                <div className="flex-1 p-6 flex flex-col items-center justify-center">
                   <span className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest text-center">Flight telemetry bound to {activeProject?.name || 'Null'}</span>
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
                <button key={v.face} onClick={() => setViewMode(v.face as ViewMode)} className={`p-1.5 rounded transition-colors group flex flex-col items-center gap-1 ${viewMode === v.face ? 'bg-[#00ffcc]/20 shadow-inner' : 'hover:bg-[#00ffcc]/10'}`} title={v.title}>
                    <ViewCubeIcon face={v.face} />
                    <span className={`text-[7px] font-black uppercase tracking-widest ${viewMode === v.face ? 'text-[#00ffcc]' : 'text-zinc-600 group-hover:text-[#00ffcc]'}`}>{v.face}</span>
                </button>
            ))}
        </div>

        {/* Resizer Handle */}
        <div className="resize-handle w-1.5 h-full bg-zinc-800 flex-shrink-0 cursor-col-resize hover:bg-[#00ffcc] transition-colors z-30"></div>

        {/* Right AI Agent Sidebar */}
        <ThemePanel translucent className="h-full overflow-hidden flex flex-col relative z-20 border-[#00ffcc]/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] p-0 w-full col-start-5 col-end-6">
            <AgentSidebar 
                onSubmit={(p) => alert("Agent instructions received. Tactical Simulator executing flight pattern: " + p)}
                isThinking={false}
            />
        </ThemePanel>
        
      </div>
    </div>
  );
};

export default WorldSim3DPage;
