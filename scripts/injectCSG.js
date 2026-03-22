import fs from 'fs';
const file = 'd:/Codebase/mgi-dream/pages/ProStudioPage.tsx';
let content = fs.readFileSync(file, 'utf8');
const target = '<Canvas camera={{ position: [50, 40, 50], fov: 45 }}>';
const newModal = `                {/* Side-Peeking Parameter Dialog */}
                {(csgPendingPlacement || csgEditTarget) && (
                    <div className="absolute left-6 top-6 z-50 bg-[#09090b]/95 backdrop-blur-md border border-blue-500/30 rounded-lg shadow-[10px_10px_30px_rgba(0,0,0,0.5)] shadow-blue-900/10 w-[240px] flex flex-col overflow-hidden animate-in slide-in-from-left-4 fade-in duration-200">
                        <div className="px-3 py-2 border-b border-zinc-800 bg-blue-900/10 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5"><Sliders className="w-3 h-3"/> {csgEditTarget ? 'Edit Feature' : \`Add Parameter\`}</span>
                            <button onClick={() => { setCsgPendingPlacement(null); setCsgEditTarget(null); }} className="text-zinc-500 hover:text-white"><X className="w-3 h-3"/></button>
                        </div>
                        <div className="p-3 space-y-3">
                            <div className="bg-black/50 border border-zinc-800/80 p-2 rounded flex flex-col gap-1">
                                 <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-widest">Target Shape</span>
                                 <span className="text-[10px] font-bold text-blue-300 truncate">{selectedNodeId ? nodes.find(n => n.id === selectedNodeId)?.name || 'Unknown Shape' : 'None Selected'}</span>
                            </div>
                            <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                                Target Facet / Edge
                                <select className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none">
                                    <option value="top">Top Face (+Y)</option>
                                    <option value="bottom">Bottom Face (-Y)</option>
                                    <option value="front">Front Face (+Z)</option>
                                    <option value="rear">Rear Face (-Z)</option>
                                    <option value="right">Right Face (+X)</option>
                                    <option value="left">Left Face (-X)</option>
                                    <option value="edge1">Outer Edge Ring</option>
                                </select>
                            </label>
                            <div className="w-full h-px bg-zinc-800/50 my-1"></div>
                            
                            {(() => {
                                const activeCsgType = csgPendingPlacement || (csgEditTarget ? nodes.find(n => n.id === csgEditTarget.nodeId)?.csgStack?.find(c => c.id === csgEditTarget.csgId)?.type : null);
                                return (
                                    <>
                                        {(activeCsgType === 'hole' || activeCsgType === 'chamfer' || activeCsgType === 'countersink' || activeCsgType === 'taper') && (
                                            <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                                                {activeCsgType === 'hole' ? 'Hole Diameter' : activeCsgType === 'chamfer' ? 'Chamfer Radius' : activeCsgType === 'countersink' ? 'Countersink Width' : 'Taper Width'}
                                                <input type="number" step="0.1" value={csgDialogParams.size} onChange={e => setCsgDialogParams({...csgDialogParams, size: parseFloat(e.target.value)})} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                            </label>
                                        )}
                                        {activeCsgType === 'taper' && (
                                            <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                                                Taper Angle (Deg)
                                                <input type="number" step="1" value={csgDialogParams.angle || 45} onChange={e => setCsgDialogParams({...csgDialogParams, angle: parseFloat(e.target.value)})} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                            </label>
                                        )}
                                        {(activeCsgType === 'hole' || activeCsgType === 'countersink') && (
                                            <label className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                                                Penetration Depth
                                                <input type="number" step="0.1" value={csgDialogParams.depth || 10} onChange={e => setCsgDialogParams({...csgDialogParams, depth: parseFloat(e.target.value)})} className="mt-1 w-full bg-black/60 border border-zinc-700/80 rounded px-2 py-1.5 text-white font-mono text-[10px] focus:border-blue-500 focus:outline-none" />
                                            </label>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                        <div className="px-3 py-2 border-t border-zinc-800 flex justify-end gap-2 bg-black/40">
                            <button onClick={() => { setCsgPendingPlacement(null); setCsgEditTarget(null); }} className="px-2 py-1 text-[9px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest rounded transition-colors">Cancel</button>
                            <button onClick={commitCSG} className="px-3 py-1 text-[9px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded shadow text-shadow-sm uppercase tracking-widest transition-colors">Apply Feature</button>
                        </div>
                    </div>
                )}

                <Canvas camera={{ position: [50, 40, 50], fov: 45 }}>`;

if (content.includes(target)) {
    if (!content.includes('Side-Peeking Parameter Dialog')) {
        content = content.replace(target, newModal);
        fs.writeFileSync(file, content, 'utf8');
        console.log('SUCCESS');
    } else {
        console.log('ALREADY INJECTED');
    }
} else {
    console.log('FAILED - Target Not Found');
}
