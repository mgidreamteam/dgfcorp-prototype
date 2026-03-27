import React from 'react';
import { Maximize, ZoomIn, ZoomOut, Cpu, Download, Play, CheckCircle } from 'lucide-react';
import { RunFrame } from '@tscircuit/runframe/runner';

interface ElectronicsViewportProps {
  tscircuitCode: string | null;
  skidlCode: string | null;
  status: string;
}

const ElectronicsViewport: React.FC<ElectronicsViewportProps> = ({ tscircuitCode, skidlCode, status }) => {

  const ensureTemplate = (code: string) => {
      if (code.includes('export default')) return code;
      // Wrap bare tsx into an executable anonymous default export module if raw
      return `
import React from 'react';
import { board } from "@tscircuit/core";

export default () => (
    ${code}
);
      `;
  };

  const fsMap = tscircuitCode ? {
      "main.tsx": ensureTemplate(tscircuitCode)
  } : null;

  return (
    <div className="flex flex-col h-full bg-black rounded-xl border border-zinc-800 overflow-hidden">
      {/* Toolbars */}
      <div className="flex flex-col border-b border-zinc-800 bg-zinc-900/50">
        {/* Row 1: View Settings */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/50">
           <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> Electronics Canvas</span>
           </div>
           <div className="flex items-center gap-1">
             <button className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
             <button className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
             <button className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Zoom Extents"><Maximize className="w-4 h-4" /></button>
           </div>
        </div>
        {/* Row 2: Electronics Actions */}
        <div className="flex items-center justify-between px-3 py-1.5">
           <div className="flex items-center gap-2">
                <span className="text-[11px] px-2 py-1 rounded border bg-emerald-900/60 text-emerald-300 border-emerald-500/50 uppercase tracking-wider font-medium">3D PCB Engine</span>
           </div>
           <div className="flex items-center gap-2">
               <button className="text-[10px] px-2 py-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors flex items-center gap-1.5"><Play className="w-3 h-3"/> Sim (ngspice)</button>
               <button className="text-[10px] px-2 py-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors flex items-center gap-1.5"><CheckCircle className="w-3 h-3"/> DRC Check</button>
               <button className="text-[10px] px-2 py-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors flex items-center gap-1.5"><Download className="w-3 h-3"/> Gerber</button>
           </div>
        </div>
      </div>

      {/* Render Viewport */}
      <div className="flex-1 relative bg-zinc-950 overflow-hidden">
        {!fsMap ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 pattern-isometric">
              <Cpu className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Awaiting TSCircuit Assembly...</p>
           </div>
        ) : (
            <div className="w-full h-full relative" style={{ filter: 'invert(0.9) hue-rotate(180deg)', mixBlendMode: 'screen' }}>
                <RunFrame 
                    fsMap={fsMap} 
                    entrypoint="main.tsx" 
                />
            </div>
        )}
      </div>
    </div>
  );
};

export default ElectronicsViewport;
