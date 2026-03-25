const fs = require('fs');

const pages = [
  {
    file: 'pages/FabFlowPage.tsx',
    bottomRegex: /\{\/\* Bottom 30% BOM & Vendor List \*\/\}\s*<ThemePanel translucent className="h-\[30%\] shrink-0 flex flex-col overflow-hidden relative shadow-\[inset_0_0_30px_rgba\(0,0,0,0\.8\)\] border border-yellow-500\/10 rounded-xl">/,
    bottomReplace: `        {/* Horizontal Resizer Handle */}
        <div 
          onMouseDown={handleBottomPanelMouseDown}
          className="resize-handle h-1.5 w-full bg-zinc-800 flex-shrink-0 cursor-row-resize hover:bg-yellow-500 transition-colors z-30"
        ></div>

        {/* Bottom Panel */}
        <ThemePanel translucent className="shrink-0 flex flex-col overflow-hidden relative shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] border border-yellow-500/10 rounded-xl" style={{ height: bottomPanelHeight }}>`,
    color: 'yellow'
  },
  {
    file: 'pages/StudioSimPage.tsx',
    bottomRegex: /\{\/\* Bottom 25% Config & Analysis \*\/\}\s*<ThemePanel translucent className="shrink-0 h-64 flex flex-col overflow-hidden relative border-emerald-500\/10 shadow-\[inset_0_0_30px_rgba\(0,0,0,0\.8\)\] rounded-xl z-20">/,
    bottomReplace: `            {/* Horizontal Resizer Handle */}
            <div 
              onMouseDown={handleBottomPanelMouseDown}
              className="resize-handle h-1.5 w-full bg-zinc-800 flex-shrink-0 cursor-row-resize hover:bg-emerald-500 transition-colors z-30"
            ></div>

            {/* Bottom 25% Config & Analysis */}
            <ThemePanel translucent className="shrink-0 flex flex-col overflow-hidden relative border-emerald-500/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] rounded-xl z-20" style={{ height: bottomPanelHeight }}>`,
    color: 'emerald'
  },
  {
    file: 'pages/WorldSim3DPage.tsx',
    bottomRegex: /\{\/\* Bottom 25% Atmospheric Diagnostics \*\/\}\s*<ThemePanel translucent className="h-\[25%\] shrink-0 flex flex-col overflow-hidden relative z-10 border-blue-500\/10 shadow-\[inset_0_0_30px_rgba\(0,0,0,0\.8\)\]">/,
    bottomReplace: `            {/* Horizontal Resizer Handle */}
            <div 
              onMouseDown={handleBottomPanelMouseDown}
              className="resize-handle h-1.5 w-full bg-zinc-800 flex-shrink-0 cursor-row-resize hover:bg-blue-500 transition-colors z-30"
            ></div>

            {/* Bottom 25% Atmospheric Diagnostics */}
            <ThemePanel translucent className="shrink-0 flex flex-col overflow-hidden relative z-10 border-blue-500/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]" style={{ height: bottomPanelHeight }}>`,
    color: 'blue'
  },
  {
    file: 'pages/WorldSimPage.tsx',
    bottomRegex: /<\/ThemePanel>\s*\{\/\* Right Vertical Views Bar \*\/\}/,
    bottomReplace: `</ThemePanel>

          {/* Horizontal Resizer Handle */}
          <div 
            onMouseDown={handleBottomPanelMouseDown}
            className="resize-handle h-1.5 w-full bg-zinc-800 flex-shrink-0 cursor-row-resize hover:bg-cyan-500 transition-colors z-30"
          ></div>

          {/* Bottom Panel (Network Telemetry) */}
          <ThemePanel translucent className="shrink-0 flex flex-col overflow-hidden relative z-10 border-cyan-500/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] rounded-xl" style={{ height: bottomPanelHeight }}>
              <div className="px-5 py-3 border-b border-zinc-800/80 bg-black/60 shrink-0">
                  <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Activity className="w-3 h-3 text-cyan-500" /> Network Telemetry Context</h2>
              </div>
              <div className="flex-1 p-6 flex flex-col items-center justify-center">
                  <span className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest text-center">Awaiting satellite interconnect handshakes...</span>
              </div>
          </ThemePanel>

          {/* Right Vertical Views Bar */}`,
    color: 'cyan'
  }
];

pages.forEach(p => {
    let text = fs.readFileSync(p.file, 'utf8');

    if (!text.includes('bottomPanelHeight')) {
        // Add height state (default to exactly window.innerHeight / 3 if window is available, but window is undefined in React SSR/initial render typically in Next, though here it's Vite). Better to use 300 statically or useEffect. Let's just use 300.
        // The user asked for "Start wtih the bottom panel to be 1/3 of the height of the center panel." We can just set it to 300 which is approx 1/3 on typical 1080p monitors. Or we can initialize realistically with window.innerHeight / 3.
        const stateInject = `
  const [bottomPanelHeight, setBottomPanelHeight] = useState(typeof window !== 'undefined' ? window.innerHeight / 3 : 300);

  const handleBottomPanelMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleBottomPanelMouseMove);
    document.addEventListener('mouseup', handleBottomPanelMouseUp);
  };

  const handleBottomPanelMouseMove = (e: MouseEvent) => {
    const newHeight = window.innerHeight - e.clientY;
    if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
      setBottomPanelHeight(newHeight);
    }
  };

  const handleBottomPanelMouseUp = () => {
    document.removeEventListener('mousemove', handleBottomPanelMouseMove);
    document.removeEventListener('mouseup', handleBottomPanelMouseUp);
  };
`;
        
        // Find after width hooks
        const hookSearch = new RegExp(`const \\\[agentPanelWidth, setAgentPanelWidth\\\] = useState\\([0-9]+\\);`);
        text = text.replace(hookSearch, `$& \n${stateInject}`);
        
        // Ensure "Activity" icon for WorldSimPage
        if (p.file === 'pages/WorldSimPage.tsx' && !text.includes('Activity,')) {
             text = text.replace(/import \{ ([^\}]+) \} from 'lucide-react';/, "import { $1, Activity } from 'lucide-react';");
        }

        // Now replace the structural bottom panel
        text = text.replace(p.bottomRegex, p.bottomReplace);
    }

    fs.writeFileSync(p.file, text);
});
console.log('Done!');
