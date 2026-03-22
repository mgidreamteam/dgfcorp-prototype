import fs from 'fs';

const file = 'd:/Codebase/mgi-dream/pages/ProStudioPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add CSG Imports
if (!content.includes('@react-three/csg')) {
    content = content.replace(
        "import { Canvas, useThree } from '@react-three/fiber';",
        "import { Canvas, useThree } from '@react-three/fiber';\nimport { Geometry, Base, Addition, Subtraction } from '@react-three/csg';"
    );
}

// 2. Add Edges import
if (!content.includes('Edges')) {
    content = content.replace(
        "import { OrbitControls, Grid, Environment, ContactShadows, TransformControls, GizmoHelper, GizmoViewport } from '@react-three/drei';",
        "import { OrbitControls, Grid, Environment, ContactShadows, TransformControls, GizmoHelper, GizmoViewport, Edges } from '@react-three/drei';"
    );
}

// 3. Add States
if (!content.includes('const [renderMode, setRenderMode]')) {
    content = content.replace(
        "const [hiloPanelWidth, setHiloPanelWidth] = useState(350);",
        `const [hiloPanelWidth, setHiloPanelWidth] = useState(350);
  const [renderMode, setRenderMode] = useState<'solid'|'wireframe'|'edges'>('solid');
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);
  const [hoverFace, setHoverFace] = useState<string|null>(null);`
    );
}

// 4. Update UI labels
content = content.replace(/Add Parameter/g, "Add Feature");

// 5. Add Render Top Toolbar Buttons
const toolbarTarget = '{/* Motion Constraints Toolbar Group */}';
const newToolbarBlock = `{/* Viewport Render Modes */}
                   <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-zinc-800/80 shadow-inner">
                       <button onClick={() => setRenderMode('solid')} className={\`p-1.5 rounded transition-colors \${renderMode === 'solid' ? 'bg-blue-900/40 text-blue-400' : 'text-zinc-500 hover:text-white'}\`} title="Solid View"><Cuboid className="w-4 h-4" /></button>
                       <button onClick={() => setRenderMode('wireframe')} className={\`p-1.5 rounded transition-colors \${renderMode === 'wireframe' ? 'bg-blue-900/40 text-blue-400' : 'text-zinc-500 hover:text-white'}\`} title="Wireframe View"><Box className="w-4 h-4" /></button>
                       <button onClick={() => setRenderMode('edges')} className={\`p-1.5 rounded transition-colors \${renderMode === 'edges' ? 'bg-blue-900/40 text-blue-400' : 'text-zinc-500 hover:text-white'}\`} title="Edge Highlight"><ViewCubeIcon face="top" /></button>
                   </div>
                   <div className="w-px h-4 bg-zinc-700 mx-1"></div>
                   <button onClick={() => setIsRenderModalOpen(true)} className="px-3 py-1 bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white font-bold rounded flex gap-1.5 items-center transition-colors uppercase tracking-widest text-[9px] shadow-lg">
                       <CircleDot className="w-3.5 h-3.5"/> Photoreal Render
                   </button>
                   <div className="w-px h-4 bg-zinc-700 mx-1"></div>

                   {/* Motion Constraints Toolbar Group */}`;
if (!content.includes('Viewport Render Modes')) {
    content = content.replace(toolbarTarget, newToolbarBlock);
}

// 6. Rewrite the massive CSG <group> map block natively
const groupStart = `                            return (\n                            <group \n                                key={node.id} \n                                position={[posX, posY, posZ]} \n                                rotation={node.rotation} \n                                scale={node.scale}\n                                onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}\n                                onDoubleClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); setCsgMode('Part'); }}\n                            >\n                                {node.type === 'primitive' && node.shape === 'box' && (\n                                    <mesh castShadow receiveShadow>\n                                        <boxGeometry args={node.dimensions || [10,10,10]} />\n                                        <meshStandardMaterial color={selectedNodeId === node.id ? "#3b82f6" : node.color} roughness={0.3} metalness={0.8} />\n                                    </mesh>\n                                )}`;

const exactOriginalMatchStartIndex = content.indexOf('                            return (\n                            <group \n                                key={node.id} \n                                position={[posX, posY, posZ]}');

if (exactOriginalMatchStartIndex !== -1) {
    const groupEndString = `                                    </mesh>\n                                ))}\n                            </group>\n                            );`;
    const exactOriginalMatchEndIndex = content.indexOf(groupEndString, exactOriginalMatchStartIndex) + groupEndString.length;
    
    if (exactOriginalMatchEndIndex > exactOriginalMatchStartIndex && !content.includes('<Geometry>')) { // Avoid double injections
        const originalBlock = content.substring(exactOriginalMatchStartIndex, exactOriginalMatchEndIndex);
        
        const newGroupBlock = `                            return (
                            <group 
                                key={node.id} 
                                position={[posX, posY, posZ]} 
                                rotation={node.rotation} 
                                scale={node.scale}
                            >
                                <mesh 
                                    castShadow 
                                    receiveShadow
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setSelectedNodeId(node.id); 
                                        if (e.face && (csgPendingPlacement || csgEditTarget)) {
                                              const n = e.face.normal;
                                              const tolerance = 0.5;
                                              let faceName = 'top';
                                              if (n.y > tolerance) faceName = 'top';
                                              else if (n.y < -tolerance) faceName = 'bottom';
                                              else if (n.z > tolerance) faceName = 'front';
                                              else if (n.z < -tolerance) faceName = 'rear';
                                              else if (n.x > tolerance) faceName = 'right';
                                              else if (n.x < -tolerance) faceName = 'left';
                                              setCsgDialogParams({...csgDialogParams, axis: faceName as any});
                                        }
                                    }}
                                    onPointerOver={(e) => { e.stopPropagation(); setHoverFace(node.id); }}
                                    onPointerOut={(e) => { setHoverFace(null); }}
                                    onDoubleClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); setCsgMode('Part'); }}
                                >
                                    {(node.type === 'primitive' || node.type === 'imported_circuit' || node.type === 'imported_dxf' || node.type === 'imported_stl') && (
                                        <Geometry>
                                            <Base>
                                                {node.shape === 'box' && <boxGeometry args={node.dimensions || [10,10,10]} />}
                                                {node.shape === 'cylinder' && <cylinderGeometry args={node.dimensions || [5,5,20]} />}
                                                {node.shape === 'screw_thread' && <cylinderGeometry args={node.dimensions || [3,3,15]} />}
                                                {node.type !== 'primitive' && <boxGeometry args={node.type==='imported_circuit' ? [60, 2, 40] : [20, 20, 20]}/>}
                                            </Base>
                                            
                                            {node.csgStack && node.csgStack.map((csg) => {
                                                const pos = csg.params.position || [0,0,0];
                                                const depth = csg.params.depth || (csg.type === 'hole' ? 15 : 5);
                                                const size = csg.params.size || 2;
                                                
                                                const axis = csg.params.axis || 'Y';
                                                let finalRot = [0,0,0] as [number,number,number];
                                                let finalPos = [...pos] as [number,number,number];
                                                
                                                const dim = node.dimensions || [10,10,10];
                                                if (axis === 'right' || axis === 'X') { finalRot = [0, 0, Math.PI/2]; finalPos = [dim[0]/2, 0, 0]; }
                                                else if (axis === 'left') { finalRot = [0, 0, Math.PI/2]; finalPos = [-dim[0]/2, 0, 0]; }
                                                else if (axis === 'front' || axis === 'Z') { finalRot = [Math.PI/2, 0, 0]; finalPos = [0, 0, dim[2]/2]; }
                                                else if (axis === 'rear') { finalRot = [Math.PI/2, 0, 0]; finalPos = [0, 0, -dim[2]/2]; }
                                                else if (axis === 'top' || axis === 'Y') { finalRot = [0, 0, 0]; finalPos = [0, dim[1]/2, 0]; }
                                                else if (axis === 'bottom') { finalRot = [0, 0, 0]; finalPos = [0, -dim[1]/2, 0]; }

                                                return (
                                                    <Subtraction key={csg.id} position={finalPos} rotation={finalRot}>
                                                        {csg.type === 'hole' && <cylinderGeometry args={[size, size, depth, 32]}/>}
                                                        {csg.type === 'chamfer' && <boxGeometry args={[dim[0] + 1, size, dim[2] + 1]}/>}
                                                        {(csg.type === 'taper' || csg.type === 'countersink') && <coneGeometry args={[size, depth]}/>}
                                                    </Subtraction>
                                                );
                                            })}
                                        </Geometry>
                                    )}

                                    <meshStandardMaterial 
                                        color={selectedNodeId === node.id ? "#3b82f6" : hoverFace === node.id ? "#60a5fa" : node.color} 
                                        roughness={node.shape === 'screw_thread' ? 0.6 : 0.3} 
                                        metalness={node.shape === 'screw_thread' || node.type === 'imported_circuit' ? 0.9 : 0.8} 
                                        wireframe={renderMode === 'wireframe'}
                                    />
                                    {renderMode === 'edges' && <Edges threshold={15} color="#3b82f6" />}
                                </mesh>
                            </group>
                            );`;
        
        content = content.replace(originalBlock, newGroupBlock);
    }
} else {
    console.log("Failed to match original exact group bounds");
}

// 7. Inject Photoreal render modal
const modalTarget = '{/* Vendor Catalog Modal */}';
const renderModal = `{/* Photorealistic Render Mock Modal */}
        {isRenderModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
                <div className="bg-[#09090b] border border-orange-500/30 rounded-xl shadow-[0_0_80px_rgba(249,115,22,0.15)] w-[800px] h-[600px] overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                        <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2"><CircleDot className="w-4 h-4 animate-spin-slow"/> DREAM Engine Photorealistic GPU Renderer</h2>
                        <button onClick={() => setIsRenderModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-4 h-4"/></button>
                    </div>
                    <div className="relative flex-1 bg-black flex items-center justify-center p-8 overflow-hidden">
                        {/* Fake raytracing noise overlay */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-screen pointer-events-none animate-pulse"></div>
                        
                        <div className="relative w-full h-full border border-zinc-800 bg-zinc-900/40 rounded flex flex-col items-center justify-center overflow-hidden">
                             <div className="absolute top-4 left-4 text-xs font-mono text-orange-500">
                                 [Local RTX GPU Accelerated]<br/>
                                 Pass: 124 / 2048<br/>
                                 Samples: 4096<br/>
                                 Time Remaining: Est. 12s
                             </div>
                             
                             <div className="w-64 h-64 border border-orange-500/20 rounded-full animate-pulse flex items-center justify-center">
                                 <ViewCubeIcon face="3d" />
                             </div>
                             
                             <div className="absolute bottom-4 right-4 text-xs font-mono text-zinc-500">
                                 ProStudio Advanced Visualizer
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Vendor Catalog Modal */}`;

if (!content.includes('Photorealistic Render Mock Modal')) {
    content = content.replace(modalTarget, renderModal);
}

fs.writeFileSync(file, content, 'utf8');
console.log('SUCCESS');
