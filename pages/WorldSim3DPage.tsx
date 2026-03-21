import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStateFromStorage, useAutoSave } from '../hooks/useAutoSave';
import { DesignProject, CloudProject, AgentLog, DesignStatus } from '../types';
import { auth, db, storage } from '../services/firebase';
import { collection, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, getDownloadURL, deleteObject, uploadString } from 'firebase/storage';
import ProjectSidebar from '../components/ProjectSidebar';
import FileMenuBar from '../components/MenuBar';

import { ShieldAlert, Radar, Globe2, Crosshair } from 'lucide-react';
import ThemePanel from '../components/ThemePanel';
import { Canvas } from '@react-three/fiber';
import { Box as DreiBox, Cylinder as DreiCylinder, Grid, Environment, MapControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { CameraPresets, ViewMode } from '../components/CameraPresets';
import { RoomWalls } from '../components/RoomWalls';
import { SimHUD } from '../components/SimHUD';

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

  const [alonPanelWidth] = useState(400);
  const [viewMode, setViewMode] = useState<ViewMode>('3D');
  const gridTemplateColumns = `256px minmax(500px, 1fr) 6px ${alonPanelWidth}px`;

  const [projects, setProjects] = useState<DesignProject[]>(() => loadStateFromStorage().projects);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [agentLogs] = useState<AgentLog[]>(() => loadStateFromStorage().logs);
  
  useAutoSave(projects, agentLogs);

  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [isCloudSaving, setIsCloudSaving] = useState(false);

  useEffect(() => {
    if (projectId) {
        setActiveProjectId(projectId);
    } else if (projects.length > 0) {
        navigate(`/worldsim3d/${projects[0].id}`, { replace: true });
    }
  }, [projectId, projects, navigate]);

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
      
      {/* Action Header Menu Bar replaced with standard FileMenuBar */}
      <ThemePanel className="w-full shrink-0">
          <FileMenuBar 
            onNewProject={handleNewProject}
            onSave={() => {}}
            onImport={() => {}}
            onDownload={() => {}}
            onCloseProject={() => navigate('/dashboard')}
            onDeleteProject={() => {
                if (!activeProject || !window.confirm("Delete local project?")) return;
                setProjects(prev => prev.filter(p => p.id !== activeProject.id));
                navigate('/worldsim3d');
            }}
            onExportStl={() => {}}
            isStlReady={false}
            onExportImages={() => {}}
            areImagesExportable={false}
            isProjectActive={!!activeProject} 
            onSaveToCloud={handleSaveToCloud}
            onLoadFromCloud={handleDownloadFromCloud}
            isCloudSaving={isCloudSaving}
            cloudStorageUsed={cloudStorageUsed}
            extension=".tacSim"
          />
      </ThemePanel>

      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        
        {/* Left Sidebar replaced with ProjectSidebar */}
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
        />
        
        {/* Central Map / Canvas Area */}
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 p-0 border border-blue-500/10 shadow-[inset_0_0_50px_rgba(59,130,246,0.05)] rounded-lg">
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
                    
                    <MapControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} minDistance={5} maxDistance={200} />
                    
                    <GizmoHelper alignment="top-right" margin={[60, 60]}>
                        <GizmoViewport axisColors={['#ef4444', '#10b981', '#3b82f6']} labelColor="black" />
                    </GizmoHelper>
                </Canvas>

                <SimHUD colorClass="blue" />
            </div>
        </ThemePanel>

        <div className="resize-handle w-1.5 h-full bg-zinc-800 flex-shrink-0 rounded-full"></div>
        
        {/* Right Sidebar Atmospheric Diagnostics */}
        <ThemePanel translucent className="h-full overflow-hidden flex flex-col relative z-10 border-blue-500/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
            <div className="px-5 py-3 border-b border-zinc-800/80 bg-black/60 shrink-0">
                <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Radar className="w-3 h-3 text-blue-500" /> Atmospheric Diagnostics</h2>
            </div>
            <div className="flex-1 p-6 flex flex-col items-center justify-center">
               <span className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest text-center">Flight telemetry bound to {activeProject?.name || 'Null'}</span>
            </div>
        </ThemePanel>
        
      </div>
    </div>
  );
};

export default WorldSim3DPage;
