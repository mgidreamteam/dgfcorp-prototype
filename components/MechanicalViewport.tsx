import React, { useState, useEffect } from 'react';
import { Maximize, ZoomIn, ZoomOut, Box, RefreshCw, MousePointer2, Scissors, Expand, ChevronDown, ChevronRight, Layers, AlertTriangle, Settings, Globe, Circle, Aperture, Grid3X3 } from 'lucide-react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Center, ContactShadows, Bounds, useBounds, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';

import { DesignProject } from '../types';

// Native raw compiler access
import { createOpenSCAD } from 'openscad-wasm-prebuilt';
// @ts-ignore - ESM dynamic import for robust browser zipping
import JSZip from 'https://esm.sh/jszip@3.10.1';

interface MechanicalViewportProps {
  project: DesignProject;
  onCompileError?: (err: Error) => void;
}

function CameraController({ trigger, geometry }: { trigger: {type: 'in'|'out'|'extents', timestamp: number} | null, geometry: THREE.BufferGeometry }) {
    const { camera, controls } = useThree();
    const bounds = useBounds();
    const targetPos = React.useRef<THREE.Vector3 | null>(null);

    // Auto-fit on new geometry load natively, establishing correct initial OrbitControls targets
    useEffect(() => {
        if (geometry) {
            // Slight delay ensures geometry bounding boxes are fully initialized in the graph
            setTimeout(() => bounds.refresh().fit(), 50); 
        }
    }, [geometry, bounds]);

    useEffect(() => {
        if (!trigger) return;
        if (trigger.type === 'extents') {
            targetPos.current = null; // Yield to bounds.fit()
            bounds.refresh().fit();
        } else if (trigger.type === 'in' || trigger.type === 'out') {
            if (controls && (controls as any).target) {
                const target = (controls as any).target;
                const startPos = targetPos.current || camera.position;
                const vec = new THREE.Vector3().subVectors(startPos, target);
                // Adjust vector magnitude to animate smoothly toward the new radius
                vec.multiplyScalar(trigger.type === 'in' ? 0.6 : 1.4);
                targetPos.current = new THREE.Vector3().copy(target).add(vec);
            }
        }
    }, [trigger, camera, bounds, controls]);

    useFrame((state, delta) => {
        if (targetPos.current) {
            // Cap delta to prevent overshoot on lag spikes
            camera.position.lerp(targetPos.current, Math.min(1, 10 * delta));
            if (controls && (controls as any).update) (controls as any).update();
            
            // Cleanup state when destination threshold reached
            if (camera.position.distanceTo(targetPos.current) < 0.1) {
                targetPos.current = null;
            }
        }
    });

    return null;
}

const MechanicalViewport: React.FC<MechanicalViewportProps> = ({ project, onCompileError }) => {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [actualCode, setActualCode] = useState<string | null>(project.openScadCode);

  const [renderMode, setRenderMode] = useState<'wireframe' | 'solid' | 'solid-edges'>('solid');
  const [showGrid, setShowGrid] = useState(true);
  const [zoomTrigger, setZoomTrigger] = useState<{type: 'in'|'out'|'extents', timestamp: number} | null>(null);

  useEffect(() => {
      if (!project.openScadCode) {
          fetch('/Turbine-Single Blade.scad')
            .then(res => res.text())
            .then(text => {
                if (text.includes('BOSL2')) setActualCode(text);
            })
            .catch(err => console.error("Failed to load test asset", err));
      } else {
          setActualCode(project.openScadCode);
      }
  }, [project.openScadCode]);

  useEffect(() => {
    let active = true;

    const compileModel = async () => {
      if (!actualCode) {
        setGeometry(null);
        return;
      }

      setProgress(10);
      setError(null);

      try {
        const openscad = await createOpenSCAD({ noInitialRun: true });
        const instance = openscad.getInstance();

        setProgress(30);
        
        // Dynamically detect used libraries from the code via regex
        // E.g. include <BOSL2/std.scad> or use <MCAD/boxes.scad>
        const libRegex = /(?:include|use)\s*<([^>/]+)[^>]*>/g;
        const requiredLibs = new Set<string>();
        let match;
        while ((match = libRegex.exec(actualCode)) !== null) {
            requiredLibs.add(match[1]);
        }
        
        // Also support absolute/root file cases if they map to a zip (like UB.scad)
        if (actualCode.includes('UB.scad')) requiredLibs.add('UB.scad');

        setProgress(40);
        let currentProgress = 40;
        const progressIncr = 30 / (requiredLibs.size || 1);

        for (const libName of requiredLibs) {
            try {
                // Fetch the ZIP associated with the root folder name
                const res = await fetch(`/${libName}.zip`);
                if (!res.ok) {
                    console.warn(`Library ZIP not found for ${libName} at /${libName}.zip`);
                    continue;
                }
                const buffer = await res.arrayBuffer();
                const zip = await JSZip.loadAsync(buffer);
                
                try { instance.FS.mkdir(`/${libName}`); } catch(e) {}

                for (const [filename, fileObj] of Object.entries(zip.files) as [string, any][]) {
                    const isDir = fileObj.dir;
                    const parts = filename.split('/').filter(Boolean);
                    if (parts.length === 0) continue;
                    
                    // If the ZIP already contains the root folder (e.g. BOSL2/...), use root.
                    // Otherwise, prefix it with the library name.
                    const hasRoot = parts[0] === libName;
                    let curr = hasRoot ? '' : `/${libName}`;
                    
                    for (let i = 0; i < (isDir ? parts.length : parts.length - 1); i++) {
                        curr += '/' + parts[i];
                        try { instance.FS.mkdir(curr); } catch(e) {}
                    }
                    if (!isDir) {
                        const content = await fileObj.async('uint8array');
                        instance.FS.writeFile(curr + '/' + parts[parts.length - 1], content);
                    }
                }
                currentProgress += progressIncr;
                setProgress(currentProgress);
            } catch (err) {
                console.error(`Failed to inject library ${libName}:`, err);
            }
        }

        setProgress(70);
        instance.FS.writeFile('/main.scad', actualCode);

        // Run OpenSCAD synchronously in the main thread (acceptable for demo)
        const exitCode = instance.callMain(['/main.scad', '--enable=manifold', '-o', '/output.stl']);
        
        if (!active) return;

        if (exitCode !== 0) {
            throw new Error(`OpenSCAD Compilation Failed with exit code ${exitCode}`);
        }

        setProgress(90);
        // Read raw binary from Emscripten FS to prevent UTF-8 string corruption on binary STLs
        const stlData = instance.FS.readFile('/output.stl') as Uint8Array;
        if (!stlData || stlData.byteLength === 0) {
             throw new Error("No STL output generated by compiler");
        }

        const len = stlData.byteLength;
        const loader = new STLLoader();
        
        // STLLoader safely parses the ArrayBuffer natively
        const parsedGeometry = loader.parse(stlData.buffer as ArrayBuffer);
        
        parsedGeometry.computeVertexNormals();
        setGeometry(parsedGeometry);
        setProgress(100);
        
        // Hide progress bar shortly after completion
        setTimeout(() => { if (active) setProgress(0); }, 1500);

      } catch (err: any) {
        if (active) {
            console.error("OpenSCAD Compilation Error:", err);
            setError(err.message || "Failed to compile OpenSCAD model. Ensure logic is manifold.");
            setGeometry(null);
            setProgress(0);
            if (onCompileError) {
                // Surface error up to LLM auto-healer
                onCompileError(err);
            }
        }
      }
    };

    compileModel();

    return () => { active = false; };
  }, [actualCode]);

  return (
    <div className="flex flex-col h-full bg-black rounded-xl border border-zinc-800 overflow-hidden relative">
      {/* Toolbars */}
      <div className="flex flex-col border-b border-zinc-800 bg-zinc-900/50 relative z-40">
        {/* Row 1: View Settings */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/50">
           <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5" /> 
                Mechanical Canvas
                {progress > 0 && progress < 100 && <RefreshCw className="w-3 h-3 text-cyan-500 animate-spin ml-1" />}
             </span>
           </div>
           
           {/* ProStudio: Zoom Toolbar */}
           <div className="flex items-center gap-1 bg-black/40 rounded p-1 border border-zinc-800/80">
             <button className="p-1 px-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Zoom In"><ZoomIn className="w-3.5 h-3.5" /></button>
             <button className="p-1 px-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Zoom Out"><ZoomOut className="w-3.5 h-3.5" /></button>
             <button className="p-1 px-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Zoom Extents"><Maximize className="w-3.5 h-3.5" /></button>
           </div>
        </div>
        
        {/* Row 2: Mechanical Actions (Mirrored from Screenshot) */}
        <div className="flex items-center gap-3 px-3 py-1.5 h-10">
            {/* View/Render Mode Group */}
            <div className="flex items-center gap-2">
                <button onClick={() => setRenderMode('wireframe')} className={`p-1.5 w-8 h-8 flex items-center justify-center transition-all rounded-lg border ${renderMode === 'wireframe' ? 'bg-[#131b31] border-[#2e528e] text-[#60a5fa] shadow-[inset_0_0_10px_rgba(46,82,142,0.2)]' : 'border-transparent text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'}`} title="Wireframe View"><Globe className="w-4 h-4" /></button>
                <button onClick={() => setRenderMode('solid-edges')} className={`p-1.5 w-8 h-8 flex items-center justify-center transition-all rounded-lg border ${renderMode === 'solid-edges' ? 'bg-[#131b31] border-[#2e528e] text-[#60a5fa] shadow-[inset_0_0_10px_rgba(46,82,142,0.2)]' : 'border-transparent text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'}`} title="Solid with Edges"><Box className="w-4 h-4 stroke-[1.5]" /></button>
                <button onClick={() => setRenderMode('solid')} className={`p-1.5 w-8 h-8 flex items-center justify-center transition-all rounded-lg border ${renderMode === 'solid' ? 'bg-[#131b31] border-[#2e528e] shadow-[inset_0_0_10px_rgba(46,82,142,0.2)]' : 'border-transparent hover:bg-zinc-800/50'}`} title="Shaded View">
                    <div className={`w-4 h-4 rounded-full ${renderMode === 'solid' ? 'bg-[radial-gradient(circle_at_35%_35%,#93c5fd,#2563eb)]' : 'bg-zinc-500'} shadow-[inset_-1px_-1px_3px_rgba(0,0,0,0.3)]`}></div>
                </button>
            </div>
            
            <div className="w-px h-5 mx-2 bg-zinc-800"></div>
            
            {/* Zoom Group (Replacing Lights per user request) */}
            <div className="flex items-center gap-1">
                <button onClick={() => setZoomTrigger({ type: 'in', timestamp: Date.now() })} className="p-1.5 text-blue-400 hover:bg-blue-900/20 rounded transition-colors" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
                <button onClick={() => setZoomTrigger({ type: 'out', timestamp: Date.now() })} className="p-1.5 text-blue-400 hover:bg-blue-900/20 rounded transition-colors" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
                <button onClick={() => setZoomTrigger({ type: 'extents', timestamp: Date.now() })} className="p-1.5 text-blue-400 hover:bg-blue-900/20 rounded transition-colors" title="Zoom Extents"><Maximize className="w-4 h-4" /></button>
            </div>
            
            <div className="w-px h-5 mx-2 bg-zinc-800"></div>
            
            {/* Context/Layout Tools */}
            <div className="flex items-center">
                <button onClick={() => setShowGrid(!showGrid)} className={`p-1.5 transition-colors border border-transparent rounded ${showGrid ? 'text-blue-400 bg-blue-900/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`} title="Layout Tile / 3D Grid"><Grid3X3 className="w-4 h-4" /></button>
            </div>
        </div>
      </div>

      {/* Render Viewport */}
      <div className="flex-1 relative bg-zinc-950 overflow-hidden flex">
        
        {/* Left Hand: ProStudio Assembly Hierarchy Tree */}
        <div className="h-full w-48 border-r border-zinc-800/80 bg-zinc-900/20 backdrop-blur-md flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
            <div className="px-3 py-2 border-b border-zinc-800/80 shrink-0 bg-black/40 flex justify-between items-center">
                <h2 className="text-[9px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2"><Layers className="w-3 h-3" /> Assembly Tree</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                <div className="px-2 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider border-b border-zinc-800/50 mb-1 flex items-center gap-2 bg-zinc-800/50 rounded">
                    <Box className="w-3.5 h-3.5 text-orange-500" />
                    <span className="truncate flex-1">{project.name || 'Master Assembly'}</span>
                </div>
                
                {project.specs?.bom && project.specs.bom.length > 0 ? (
                    <div className="pl-1">
                        {project.specs.bom.map((bomItem, idx) => (
                            <div key={idx} className="flex items-center w-full group py-0.5 cursor-default hover:bg-zinc-800/50 rounded transition-colors px-1 border-l-2 border-transparent hover:border-blue-500/50">
                                <ChevronRight className="w-3 h-3 text-zinc-600 mr-1 opacity-0 group-hover:opacity-100" />
                                <div className="flex flex-col gap-0.5 truncate flex-1 leading-tight">
                                    <span className="text-[10px] font-bold text-zinc-300 truncate tracking-wider">{bomItem.component}</span>
                                    <span className={`text-[8px] font-mono tracking-widest ${bomItem.type.toLowerCase().includes('electronic') ? 'text-emerald-500' : 'text-zinc-500'}`}>{bomItem.type}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-zinc-600 italic text-[10px] mt-4 px-2">No semantic components mapped to this assembly yet.</div>
                )}
            </div>

            {/* Bottom 25% Settings (Mirrored from ProStudio) */}
            <div className="h-1/4 min-h-[140px] shrink-0 border-t border-zinc-800/80 bg-black/60 flex flex-col">
                <div className="px-3 py-2 border-b border-zinc-800/80 shrink-0 bg-transparent flex justify-between items-center">
                    <h2 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><Settings className="w-3 h-3" /> Global Assembly Settings</h2>
                </div>
                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    <label className="block text-[10px] text-zinc-500 font-mono">
                        Base Environment System
                        <select className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-white focus:border-purple-500 text-[10px] outline-none">
                            <option value="mm">Metric (mm) - Preferred</option>
                            <option value="in">Imperial (inch)</option>
                            <option value="m">Metric (Meters)</option>
                        </select>
                    </label>
                    <label className="block text-[10px] text-zinc-500 font-mono">
                        Assembly Tolerance Constraints
                        <input type="text" defaultValue="±0.05 mm" className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-white focus:border-purple-500 text-[10px] outline-none" />
                    </label>
                </div>
            </div>
        </div>

        {/* 3D Canvas Context */}
        <div className="flex-1 relative">
            {!actualCode ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 background-grid pattern-dots z-10 pointer-events-none">
                  <Box className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Awaiting OpenSCAD Generation...</p>
               </div>
            ) : error ? (
               <div className="absolute inset-x-8 top-8 z-30 flex flex-col items-start text-red-100 bg-red-950/80 border border-red-500 p-4 rounded-xl shadow-2xl backdrop-blur max-h-64 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-2 font-bold text-red-400">
                      <AlertTriangle className="w-5 h-5" /> Compilation Error
                  </div>
                  <pre className="text-xs text-red-200/80 font-mono whitespace-pre-wrap">{error}</pre>
               </div>
            ) : null}

            <div className="absolute inset-0" style={{ mixBlendMode: 'screen' }}>
            <Canvas camera={{ position: [50, 50, 50], fov: 45 }}>
                <color attach="background" args={['#09090b']} />
                
                <ambientLight intensity={0.8} />
                <directionalLight position={[10, 20, 10]} intensity={2.0} />
                <directionalLight position={[-10, -20, -10]} intensity={1.0} />

                {showGrid && (
                    <Grid 
                        renderOrder={-1} 
                        position={[0, -0.01, 0]} 
                        infiniteGrid 
                        fadeDistance={200} 
                        fadeStrength={5} 
                        cellSize={10} 
                        sectionSize={50}
                        cellColor="#52525b" 
                        sectionColor="#71717a" 
                    />
                )}

                {geometry && (
                    <Bounds margin={1.2}>
                        <CameraController trigger={zoomTrigger} geometry={geometry} />
                        <mesh geometry={geometry}>
                            <meshStandardMaterial 
                                color="#e4e4e7" 
                                roughness={0.3} 
                                metalness={0.7}
                                wireframe={renderMode === 'wireframe'}
                            />
                            {renderMode === 'solid-edges' && (
                                <lineSegments>
                                    <edgesGeometry args={[geometry]} />
                                    <lineBasicMaterial color="#000000" />
                                </lineSegments>
                            )}
                        </mesh>
                    </Bounds>
                )}

                <GizmoHelper alignment="top-right" margin={[80, 80]}>
                    <GizmoViewport 
                        axisColors={['#ef4444', '#10b981', '#3b82f6']} 
                        labelColor="white" 
                    />
                </GizmoHelper>

                <OrbitControls makeDefault />
            </Canvas>
        </div>
        </div>
      </div>
      
      {/* Dynamic Progress Bar */}
      {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-900 z-50 pointer-events-none">
              <div 
                  className="h-full bg-purple-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                  style={{ width: `${progress}%` }} 
              />
          </div>
      )}
    </div>
  );
};

export default MechanicalViewport;

