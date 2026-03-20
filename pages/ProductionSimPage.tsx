import React, { useState } from 'react';
import { Factory } from 'lucide-react';
import ThemePanel from '../components/ThemePanel';

const ProductionSimPage: React.FC = () => {
  const [alonPanelWidth, setAlonPanelWidth] = useState(400);
  const gridTemplateColumns = `256px minmax(500px, 1fr) 6px ${alonPanelWidth}px`;

  return (
    <div className="h-full flex flex-col gap-2 p-2">
      <ThemePanel className="w-full shrink-0 h-16 flex items-center px-6 border-b border-yellow-500/20">
        <h1 className="text-xl font-bold tracking-widest uppercase text-yellow-500 opacity-90 flex items-center gap-3">
            <Factory className="w-5 h-5" />
            FabFlow: Production Orchestration
        </h1>
      </ThemePanel>
      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        
        {/* Left Sidebar */}
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden p-6">
            <h2 className="text-subheading font-normal text-zinc-500 uppercase tracking-tighter mb-4">Vendor Node Topology</h2>
        </ThemePanel>
        
        {/* Central Map / Canvas Area */}
        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 border border-yellow-500/10 shadow-[inset_0_0_50px_rgba(234,179,8,0.02)]">
            <div className="px-6 py-4 border-b border-zinc-800 shrink-0 bg-black/40 backdrop-blur-md">
                <h2 className="text-subheading font-normal text-yellow-500 uppercase tracking-tighter">
                    Global Supply Chain Logistics
                </h2>
            </div>
            {/* Blank Canvas for future components */}
            <div className="flex-1 w-full h-full bg-black/20"></div>
        </ThemePanel>

        <div className="resize-handle w-1.5 h-full bg-zinc-800 flex-shrink-0 rounded-full"></div>
        
        {/* Right Sidebar */}
        <ThemePanel translucent className="h-full overflow-hidden relative z-10">
            <div className="px-6 py-4 border-b border-zinc-800 shrink-0">
                <h2 className="text-subheading font-normal text-white uppercase tracking-tighter">BOM Analytics</h2>
            </div>
            {/* Blank Data Area */}
            <div className="flex-1 p-6"></div>
        </ThemePanel>
        
      </div>
    </div>
  );
};

export default ProductionSimPage;
