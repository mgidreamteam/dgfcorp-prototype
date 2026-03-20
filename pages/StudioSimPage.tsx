import React, { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import ThemePanel from '../components/ThemePanel';

const StudioSimPage: React.FC = () => {
  const [alonPanelWidth, setAlonPanelWidth] = useState(400);
  const gridTemplateColumns = `256px minmax(500px, 1fr) 6px ${alonPanelWidth}px`;

  return (
    <div className="h-full flex flex-col gap-2 p-2">
      <ThemePanel className="w-full shrink-0 h-16 flex items-center px-6">
        <h1 className="text-xl font-bold tracking-widest uppercase text-white opacity-80">StudioSim Control Plane</h1>
      </ThemePanel>
      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden p-6">
            <h2 className="text-subheading font-normal text-zinc-500 uppercase tracking-tighter mb-4">Project Registry</h2>
            <div className="text-sm text-zinc-600 italic">No active environments synthesized.</div>
        </ThemePanel>
        
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 border border-[#00ffcc]/10 shadow-[inset_0_0_50px_rgba(0,255,204,0.02)]">
            <div className="px-6 py-4 border-b border-zinc-800 shrink-0 bg-black/40 backdrop-blur-md">
                <h2 className="text-subheading font-normal text-zinc-500 uppercase tracking-tighter flex items-center gap-3">
                    Simulation Runtime Standby
                </h2>
            </div>
            <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat opacity-40">
                <div className="max-w-md text-center">
                    <h3 className="text-2xl font-black text-zinc-600 tracking-widest uppercase mb-4">StudioSim Sandbox</h3>
                    <p className="text-zinc-500 leading-relaxed text-sm">Awaiting payload drop. The multi-physics capability engines are locked into standby mode. Initialize a pipeline execution to trace native structural paths across the active ecosystem.</p>
                </div>
            </div>
        </ThemePanel>

        <div className="resize-handle w-1.5 h-full bg-zinc-800 flex-shrink-0 rounded-full"></div>
        
        <ThemePanel translucent className="h-full overflow-hidden relative z-10">
            <div className="px-6 py-4 border-b border-zinc-800 shrink-0">
                <h2 className="text-subheading font-normal text-white uppercase tracking-tighter">Terminal Array</h2>
            </div>
            <div className="flex-1 p-6 flex items-center justify-center">
                <div className="text-zinc-600 text-sm font-mono text-center">Awaiting telemetry streams...</div>
            </div>
        </ThemePanel>
      </div>
    </div>
  );
};

export default StudioSimPage;
