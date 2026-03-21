import React, { useState } from 'react';
import { Rocket, ShieldAlert, Crosshair, Radar, Globe2 } from 'lucide-react';
import ThemePanel from '../components/ThemePanel';
import { Canvas } from '@react-three/fiber';
import { Box as DreiBox, Cylinder as DreiCylinder, Grid, Sky, Environment, MapControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
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

const WorldSim3DPage: React.FC = () => {
  const [alonPanelWidth, setAlonPanelWidth] = useState(400);
  const [viewMode, setViewMode] = useState<ViewMode>('3D');
  const gridTemplateColumns = `256px minmax(500px, 1fr) 6px ${alonPanelWidth}px`;

  return (
    <div className="h-full flex flex-col gap-2 p-2 relative bg-black/90">
      
      {/* Action Header Menu Bar */}
      <ThemePanel className="w-full shrink-0 h-14 flex items-center justify-between px-6 border-b border-blue-500/20 shadow-[0_4px_30px_rgba(59,130,246,0.05)] bg-[#09090b]/80 backdrop-blur">
        
        {/* Left Side */}
        <div className="flex items-center gap-4">
            <div className="text-sm text-blue-400 font-bold tracking-widest uppercase flex items-center gap-2">
                <Rocket className="w-4 h-4" /> TacticalSim Engine
            </div>
        </div>
        
        {/* Right Side - Dummy Toggles */}
        <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('3D')} className={`px-3 py-1.5 rounded transition-colors text-xs font-bold uppercase tracking-widest ${viewMode === '3D' ? 'bg-blue-900/40 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>3D</button>
            <button onClick={() => setViewMode('FRONT')} className={`px-3 py-1.5 rounded transition-colors text-xs font-bold uppercase tracking-widest ${viewMode === 'FRONT' ? 'bg-blue-900/40 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>FR.</button>
            <button onClick={() => setViewMode('TOP')} className={`px-3 py-1.5 rounded transition-colors text-xs font-bold uppercase tracking-widest ${viewMode === 'TOP' ? 'bg-blue-900/40 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>TOP</button>
            <div className="w-px h-5 bg-zinc-800 mx-2"></div>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Global Satellite Network"><Globe2 className="w-4 h-4" /></button>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Radar Array"><Radar className="w-4 h-4" /></button>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Threat Vector Analyst"><ShieldAlert className="w-4 h-4" /></button>
        </div>
      </ThemePanel>

      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        
        {/* Left Sidebar */}
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] border-blue-500/10">
            <div className="px-5 py-3 border-b border-zinc-800/80 bg-black/60 relative z-10">
                <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Crosshair className="w-3 h-3 text-blue-500" /> Tactical Node Layout</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex items-center justify-center">
                <span className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">Awaiting spatial telemetry...</span>
            </div>
        </ThemePanel>
        
        {/* Central Map / Canvas Area */}
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 p-0 border border-blue-500/10 shadow-[inset_0_0_50px_rgba(59,130,246,0.05)] rounded-lg">
            
            <div className="w-full h-full cursor-crosshair relative bg-[#09090b]">
                <Canvas shadows camera={{ position: [30, 20, 30], fov: 45 }} gl={{ antialias: true }}>
                    <color attach="background" args={['#09090b']} />
                    <fog attach="fog" args={['#09090b', 50, 400]} />
                    <ambientLight intensity={1.2} />
                    <directionalLight castShadow position={[10, 20, 10]} intensity={2.5} />
                    <Environment preset="night" />
                    
                    {/* The 3D Room Grid Floor */}
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
                    
                    {/* Full mouse navigation support */}
                    <MapControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} minDistance={5} maxDistance={200} />
                    
                    <GizmoHelper alignment="top-right" margin={[60, 60]}>
                        <GizmoViewport axisColors={['#ef4444', '#10b981', '#3b82f6']} labelColor="black" />
                    </GizmoHelper>
                </Canvas>

                {/* Overlaid Bottom HUD */}
                <SimHUD colorClass="red" />
            </div>
        </ThemePanel>

        <div className="resize-handle w-1.5 h-full bg-zinc-800/50 flex-shrink-0 rounded-full hover:bg-blue-500/50 transition-colors"></div>
        
        {/* Right Sidebar */}
        <ThemePanel translucent className="h-full overflow-hidden flex flex-col relative z-10 border-blue-500/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
            <div className="px-5 py-3 border-b border-zinc-800/80 bg-black/60 shrink-0">
                <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Radar className="w-3 h-3 text-blue-500" /> Atmospheric Diagnostics</h2>
            </div>
            <div className="flex-1 p-6 flex flex-col items-center justify-center">
               <span className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest text-center">Environmental sensors offline.</span>
            </div>
        </ThemePanel>
        
      </div>
    </div>
  );
};

export default WorldSim3DPage;
