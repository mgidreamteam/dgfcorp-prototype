import React, { useState, useRef, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { Lightbulb, LightbulbOff, X } from 'lucide-react';

export interface StudioLightingProps {
  globalIntensitySlider: number;
  globalLightsOn?: boolean;
  showLightMeshes?: boolean;
  modelSize?: {x: number, y: number, z: number};
  roomTheme?: 'dark' | 'light';
}

interface LightNodeProps {
  position: [number, number, number];
  globalIntensitySlider: number;
  globalLightsOn?: boolean;
  showLightMeshes?: boolean;
  modelSize?: {x: number, y: number, z: number};
  label: string;
  type?: 'sphere' | 'ring';
  roomTheme?: 'dark' | 'light';
}

const mapSliderToExp = (val: number) => 2.2 + ((val + 1000) / 2000) * 3.8;

const LightNode: React.FC<LightNodeProps> = ({ position, globalIntensitySlider, globalLightsOn = true, showLightMeshes = true, modelSize = {x:20, y:20, z:20}, label, type = 'sphere', roomTheme = 'dark' }) => {
  const [isOn, setIsOn] = useState(true);
  const [isSynced, setIsSynced] = useState(true);
  const [localSlider, setLocalSlider] = useState(globalIntensitySlider);
  const [showPopup, setShowPopup] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const activeSlider = isSynced ? globalIntensitySlider : localSlider;
  const activeExp = mapSliderToExp(activeSlider);
  const isPhysicallyOn = isOn && globalLightsOn;

  const handlePointerEnter = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
  const handlePointerLeave = () => {
      timeoutRef.current = setTimeout(() => setShowPopup(false), 2500);
  };

  useEffect(() => {
      return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }
  }, []);

  return (
    <group position={position}>
       {/* Visual Bulb Mesh */}
       {showLightMeshes && (
          <group onUpdate={type === 'sphere' ? (self) => self.lookAt(0,0,0) : undefined}>
            <mesh 
              rotation={type === 'ring' ? [Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, 0]}
              onClick={(e) => { e.stopPropagation(); setShowPopup(!showPopup); }}
              onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
              onPointerOut={(e) => { document.body.style.cursor = 'auto'; }}
            >
               {type === 'ring' ? <torusGeometry args={[15, 1.5, 16, 64]} /> : <cylinderGeometry args={[4, 1.5, 8, 16]} />}
               <meshStandardMaterial 
                 color={isOn ? "#fef08a" : "#52525b"} 
                 emissive={isOn ? "#fef08a" : "#000000"} 
                 emissiveIntensity={isOn ? 2 : 0} 
                 metalness={0.1}
                 roughness={0.9}
               />
            </mesh>
          </group>
       )}
       
       {/* Physical Computation Light */}
       {isPhysicallyOn && type === 'sphere' && (
         <spotLight 
            intensity={Math.pow(10, activeExp)} 
            distance={modelSize.y * 20} 
            angle={Math.PI / 3} // Broad 60-degree precision flood targeting the center
            penumbra={0.6} // Smooth realistic shadow falloff gradient
            decay={2} 
            color="#ffffff" 
            castShadow 
            shadow-bias={-0.001}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
         />
       )}
       {isPhysicallyOn && type === 'ring' && (
         <pointLight 
            intensity={Math.pow(10, activeExp)} 
            distance={modelSize.y * 30} 
            decay={2} 
            color="#ffffff" 
            castShadow 
            shadow-bias={-0.001}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
         />
       )}

       {/* Interactive Overlay HUD */}
       {showPopup && (
         <Html position={[0, -10, 0]} center zIndexRange={[100, 0]}>
            <div 
                className="bg-black/90 backdrop-blur-md border border-zinc-700/80 p-3 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col gap-2 w-48 text-white select-none pointer-events-auto"
                onPointerDown={(e) => e.stopPropagation()} 
                onPointerUp={(e) => e.stopPropagation()} 
                onPointerMove={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
                onMouseEnter={handlePointerEnter}
                onMouseLeave={handlePointerLeave}
            >
               <div className="flex justify-between items-center border-b border-zinc-700/50 pb-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
                  <div className="flex items-center gap-1">
                      <button onClick={() => setIsOn(!isOn)} className="p-1 hover:bg-zinc-800 rounded transition-colors text-yellow-500">
                         {isOn ? <Lightbulb className="w-4 h-4" /> : <LightbulbOff className="w-4 h-4 text-zinc-600" />}
                      </button>
                      <button onClick={() => setShowPopup(false)} className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-red-400">
                         <X className="w-4 h-4" />
                      </button>
                  </div>
               </div>
               <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase text-zinc-500 font-bold flex justify-between items-center">
                     Power <span className="font-mono text-zinc-300 text-xs">{activeSlider > 0 ? `+${activeSlider}` : activeSlider}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range" 
                      min="-1000" max="1000" step="1" 
                      value={activeSlider} 
                      onChange={e => {
                         setIsSynced(false);
                         setLocalSlider(Number(e.target.value));
                      }} 
                      onPointerDown={(e) => e.stopPropagation()} 
                      className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none outline-none accent-yellow-500"
                    />
                    <button 
                       onClick={() => setIsSynced(true)}
                       className={`text-[8px] px-1.5 py-0.5 rounded transition-colors ${isSynced ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'}`}
                       title="Sync with global Lux Base"
                    >
                       SYNC
                    </button>
                  </div>
               </div>
            </div>
         </Html>
       )}
    </group>
  );
};

export const StudioLighting: React.FC<StudioLightingProps> = ({ globalIntensitySlider, globalLightsOn = true, showLightMeshes = true, modelSize = {x: 20, y: 20, z: 20}, roomTheme = 'dark' }) => {
  const h = Math.max(modelSize.y, 5); // Ensure baseline minimum to prevent 0 clipping
  const lightY = (h / 2) + h; // Center + strictly 1X mathematical height parameter 
  const lightXZ = h * 1.5; // Spread horizontally proportional to height 

  return (
    <group>
       <ambientLight intensity={(roomTheme === 'light' ? 0.8 : 2.5)} />
       <LightNode position={[lightXZ, lightY, lightXZ]} modelSize={modelSize} showLightMeshes={showLightMeshes} globalIntensitySlider={globalIntensitySlider} globalLightsOn={globalLightsOn} label="Front Right" roomTheme={roomTheme} />
       <LightNode position={[-lightXZ, lightY, lightXZ]} modelSize={modelSize} showLightMeshes={showLightMeshes} globalIntensitySlider={globalIntensitySlider} globalLightsOn={globalLightsOn} label="Front Left" roomTheme={roomTheme} />
       <LightNode position={[lightXZ, lightY, -lightXZ]} modelSize={modelSize} showLightMeshes={showLightMeshes} globalIntensitySlider={globalIntensitySlider} globalLightsOn={globalLightsOn} label="Back Right" roomTheme={roomTheme} />
       <LightNode position={[-lightXZ, lightY, -lightXZ]} modelSize={modelSize} showLightMeshes={showLightMeshes} globalIntensitySlider={globalIntensitySlider} globalLightsOn={globalLightsOn} label="Back Left" roomTheme={roomTheme} />
       <LightNode position={[0, lightY + (h * 0.5), 0]} modelSize={modelSize} showLightMeshes={showLightMeshes} globalIntensitySlider={globalIntensitySlider} globalLightsOn={globalLightsOn} label="Overhead Ring" type="ring" roomTheme={roomTheme} />
    </group>
  );
};
