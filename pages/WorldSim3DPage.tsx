import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Rocket, Focus, Move } from 'lucide-react';
import ThemePanel from '../components/ThemePanel';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Box as DreiBox, Cylinder as DreiCylinder, Grid, Sky, Environment } from '@react-three/drei';

function FlightCamera() {
    const { camera } = useThree();
    const keys = useRef<Record<string, boolean>>({});

    useEffect(() => {
        camera.position.set(0, 5, 20); // Initial back-set position
        
        const handleKeyDown = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = true;
        const handleKeyUp = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = false;
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
             window.removeEventListener('keydown', handleKeyDown);
             window.removeEventListener('keyup', handleKeyUp);
        }
    }, [camera]);

    useFrame((_, delta) => {
        const speed = 20 * delta;
        const rotSpeed = 1.5 * delta;
        
        // Pitch (W/S)
        if (keys.current['w']) camera.rotation.x += rotSpeed;
        if (keys.current['s']) camera.rotation.x -= rotSpeed;
        
        // Yaw (A/D)
        if (keys.current['a']) camera.rotation.y += rotSpeed;
        if (keys.current['d']) camera.rotation.y -= rotSpeed;

        // Roll (Q/E)
        if (keys.current['q']) camera.rotation.z += rotSpeed;
        if (keys.current['e']) camera.rotation.z -= rotSpeed;

        // Forward Engine (Arrow keys or X/Z)
        if (keys.current['arrowup']) camera.translateZ(-speed);
        if (keys.current['arrowdown']) camera.translateZ(speed);
        
        // Elevation (Shift/Space)
        if (keys.current[' ']) camera.translateY(speed);
        if (keys.current['shift']) camera.translateY(-speed);
    });
    return null;
}

// Procedural Drone/Plane constructed from primitives
function DroneModel() {
    return (
        <group position={[0, 5, 0]}>
            <DreiCylinder args={[0.5, 0.5, 4, 16]} rotation={[Math.PI / 2, 0, 0]}>
                <meshStandardMaterial color="#00ffcc" metalness={0.8} />
            </DreiCylinder>
            <DreiBox args={[6, 0.1, 1]} position={[0, 0.2, 0.5]}>
                <meshStandardMaterial color="#444" />
            </DreiBox>
            <DreiBox args={[2, 0.1, 0.8]} position={[0, 0.2, -1.8]}>
                <meshStandardMaterial color="#444" />
            </DreiBox>
            <DreiBox args={[0.1, 1, 0.5]} position={[0, 0.5, -1.8]}>
                <meshStandardMaterial color="#ef4444" />
            </DreiBox>
        </group>
    );
}

const WorldSim3DPage: React.FC = () => {
  const [alonPanelWidth, setAlonPanelWidth] = useState(400);
  const gridTemplateColumns = `256px minmax(500px, 1fr) 6px ${alonPanelWidth}px`;

  return (
    <div className="h-full flex flex-col gap-2 p-2">
      <ThemePanel className="w-full shrink-0 h-16 flex items-center px-6 border-b border-blue-500/20">
        <h1 className="text-xl font-bold tracking-widest uppercase text-blue-400 opacity-90 flex items-center gap-3">
            <Rocket className="w-5 h-5" />
            WorldSim3D: Advanced OpenGL Aviation
        </h1>
      </ThemePanel>
      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden p-6 pointer-events-none">
            <h2 className="text-subheading font-normal text-zinc-500 uppercase tracking-tighter mb-4">Flight Telemetry</h2>
            <div className="text-sm text-zinc-400 font-mono space-y-3 p-4 bg-black/50 rounded-lg border border-zinc-800">
                <p className="flex justify-between"><span>Pitch:</span> <span className="text-blue-400">W / S</span></p>
                <p className="flex justify-between"><span>Yaw:</span> <span className="text-blue-400">A / D</span></p>
                <p className="flex justify-between"><span>Roll:</span> <span className="text-blue-400">Q / E</span></p>
                <p className="flex justify-between"><span>Thrust:</span> <span className="text-[#00ffcc]">Arrow Keys</span></p>
                <p className="flex justify-between"><span>Elevation:</span> <span className="text-[#00ffcc]">Space / Shift</span></p>
            </div>
            <div className="mt-8 text-xs text-zinc-600 tracking-wider uppercase">
                <Focus className="w-4 h-4 mb-2" />
                Click the WebGL canvas to engage X-Plane kinematics natively bounding flight controls to the active viewport matrix.
            </div>
        </ThemePanel>
        
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 p-0 border border-blue-500/10 shadow-[inset_0_0_50px_rgba(59,130,246,0.05)]">
            <div className="absolute top-4 left-4 z-50 px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-zinc-800 flex items-center gap-3 shadow-xl">
                 <Move className="w-4 h-4 text-[#00ffcc]" />
                 <span className="text-xs font-bold uppercase tracking-widest text-[#00ffcc]">Native Free-Flight Engaged</span>
            </div>
            <div className="w-full h-full cursor-crosshair">
                <Canvas shadows gl={{ antialias: true }}>
                    <Sky sunPosition={[100, 20, 100]} />
                    <ambientLight intensity={0.5} />
                    <directionalLight castShadow position={[10, 20, 10]} intensity={1.5} />
                    <Environment preset="city" />
                    
                    {/* The 3D Room Grid Floor */}
                    <Grid infiniteGrid fadeDistance={100} sectionColor="#00ffcc" cellColor="#444" position={[0, -0.01, 0]} />
                    
                    <DroneModel />
                    <FlightCamera />
                </Canvas>
            </div>
        </ThemePanel>

        <div className="resize-handle w-1.5 h-full bg-zinc-800 flex-shrink-0 rounded-full"></div>
        
        <ThemePanel translucent className="h-full overflow-hidden relative z-10">
            <div className="px-6 py-4 border-b border-zinc-800 shrink-0">
                <h2 className="text-subheading font-normal text-white uppercase tracking-tighter">OpenGL Diagnostics</h2>
            </div>
            <div className="flex-1 p-6 flex flex-col gap-4">
               <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg shadow-inner">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Renderer Status</h3>
                    <p className="text-sm font-mono text-zinc-300">WebGL 2.0</p>
                    <p className="text-sm font-mono text-zinc-300">@react-three/fiber</p>
                    <div className="h-1 w-full bg-zinc-800 mt-2 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-full"></div></div>
               </div>
            </div>
        </ThemePanel>
        
      </div>
    </div>
  );
};

export default WorldSim3DPage;
