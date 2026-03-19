import React, { useState, useRef } from 'react';
import { Loader2, Factory } from 'lucide-react';
import ThemePanel from '../components/ThemePanel';

const ProductionSimPage: React.FC = () => {
  const [alonPanelWidth, setAlonPanelWidth] = useState(400);
  const gridTemplateColumns = `256px minmax(500px, 1fr) 6px ${alonPanelWidth}px`;

  return (
    <div className="h-full flex flex-col gap-2 p-2">
      <ThemePanel className="w-full shrink-0 h-16 flex items-center px-6 border-b border-yellow-500/20">
        <h1 className="text-xl font-bold tracking-widest uppercase text-yellow-500 opacity-90 flex items-center gap-3">
            <Factory className="w-5 h-5" />
            Production Orchestration Sim
        </h1>
      </ThemePanel>
      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden p-6">
            <h2 className="text-subheading font-normal text-zinc-500 uppercase tracking-tighter mb-4">Vendor Node Topology</h2>
            <div className="text-sm text-zinc-600 italic">Scanning global industrial footprints...</div>
        </ThemePanel>
        
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 border border-yellow-500/10 shadow-[inset_0_0_50px_rgba(234,179,8,0.02)]">
            <div className="px-6 py-4 border-b border-zinc-800 shrink-0 bg-black/40 backdrop-blur-md">
                <h2 className="text-subheading font-normal text-yellow-500 uppercase tracking-tighter flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Visualizing Global Supply Chain Logistics
                </h2>
            </div>
            <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/microbial-mat.png')] bg-repeat opacity-30">
                <div className="max-w-md text-center relative z-20">
                    <h3 className="text-2xl font-black text-white tracking-widest uppercase mb-4">Orchestration Active</h3>
                    <p className="text-zinc-400 leading-relaxed text-sm">Aggregating the production visualization datasets. This canvas will securely lock downstream vendor assemblies rendering physical component routing directly onto the GIS tracking maps.</p>
                </div>
            </div>
        </ThemePanel>

        <div className="resize-handle w-1.5 h-full bg-zinc-800 flex-shrink-0 rounded-full"></div>
        
        <ThemePanel translucent className="h-full overflow-hidden relative z-10">
            <div className="px-6 py-4 border-b border-zinc-800 shrink-0">
                <h2 className="text-subheading font-normal text-white uppercase tracking-tighter">BOM Analytics</h2>
            </div>
            <div className="flex-1 p-6 flex flex-col gap-4 justify-center items-center">
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500/50 w-1/3 animate-pulse"></div>
                </div>
                <div className="text-zinc-600 text-sm font-mono text-center">Calculating production routing...</div>
            </div>
        </ThemePanel>
      </div>
    </div>
  );
};

export default ProductionSimPage;
