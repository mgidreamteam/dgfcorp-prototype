const fs = require('fs');

function fixFabFlow() {
    let text = fs.readFileSync('pages/FabFlowPage.tsx', 'utf8');
    
    // Add centerPanelRef if not present
    if (!text.includes('centerPanelRef = React.useRef')) {
        text = text.replace(/const \[bottomPanelHeight, setBottomPanelHeight\] = useState[^;]+;/,
`const centerPanelRef = React.useRef<HTMLDivElement>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(300);

  React.useEffect(() => {
    if (centerPanelRef.current) {
        setBottomPanelHeight(Math.max(150, centerPanelRef.current.clientHeight / 3));
    }
  }, []);`);
    }

    // Add ref to the Central element
    text = text.replace(/<div className="flex flex-col h-full gap-2 relative z-10 overflow-hidden min-w-0">/, `<div className="flex flex-col h-full gap-2 relative z-10 overflow-hidden min-w-0" ref={centerPanelRef}>`);
    
    // Add missing agent resizer handle
    if (!text.includes('cursor-col-resize bg-zinc-800 hover:bg-yellow-500 transition-colors flex-shrink-0 z-30')) {
        text = text.replace(/<ThemePanel translucent className="h-full overflow-hidden relative z-10" style=\{\{ width: agentPanelWidth \}\}>/, 
`<div onMouseDown={() => {}} className="resize-handle w-1.5 h-full cursor-col-resize bg-zinc-800 hover:bg-yellow-500 transition-colors flex-shrink-0 z-30"></div>
                <ThemePanel translucent className="h-full overflow-hidden relative z-10" style={{ width: agentPanelWidth }}>`);
    }

    fs.writeFileSync('pages/FabFlowPage.tsx', text);
}

function fixStudioSim() {
    let text = fs.readFileSync('pages/StudioSimPage.tsx', 'utf8');
    
    if (!text.includes('bottomPanelHeight')) {
        const stateInject = `
  const centerPanelRef = React.useRef<HTMLDivElement>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250);

  React.useEffect(() => {
    if (centerPanelRef.current) {
        setBottomPanelHeight(Math.max(150, centerPanelRef.current.clientHeight / 3));
    }
  }, []);

  const handleBottomPanelMouseDown = (e) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleBottomPanelMouseMove);
    document.addEventListener('mouseup', handleBottomPanelMouseUp);
  };

  const handleBottomPanelMouseMove = (e) => {
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
        text = text.replace(/const \[isAgentOpen, setIsAgentOpen\] = useState\(false\);/, `const [isAgentOpen, setIsAgentOpen] = useState(false);\n${stateInject}`);
    }

    // Add ref
    text = text.replace(/<div className="flex flex-col h-full gap-2 relative z-10 overflow-hidden min-w-0">/, `<div className="flex flex-col h-full gap-2 relative z-10 overflow-hidden min-w-0" ref={centerPanelRef}>`);
    
    // Inject resizer and style into bottom panel
    if (!text.includes('handleBottomPanelMouseDown')) {
        text = text.replace(/\{\/\* Bottom 25% Boundary Conditions List \*\/\}\s*<ThemePanel translucent className="h-\[25%\] shrink-0 flex flex-col overflow-hidden relative shadow-\[inset_0_0_30px_rgba\(0,0,0,0\.8\)\] border-emerald-500\/10">/, 
`{/* Horizontal Resizer Handle */}
        <div 
          onMouseDown={handleBottomPanelMouseDown}
          className="resize-handle h-1.5 w-full bg-zinc-800 flex-shrink-0 cursor-row-resize hover:bg-emerald-500 transition-colors z-30"
        ></div>

        {/* Bottom Panel */}
        <ThemePanel translucent className="shrink-0 flex flex-col overflow-hidden relative shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] border border-emerald-500/10 rounded-xl" style={{ height: bottomPanelHeight }}>`);
    }
    
    fs.writeFileSync('pages/StudioSimPage.tsx', text);
}

function fixWorldSim3D() {
    let text = fs.readFileSync('pages/WorldSim3DPage.tsx', 'utf8');
    
    if (!text.includes('centerPanelRef = React.useRef')) {
        text = text.replace(/const \[bottomPanelHeight, setBottomPanelHeight\] = useState[^;]+;/,
`const centerPanelRef = React.useRef<HTMLDivElement>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250);

  React.useEffect(() => {
    if (centerPanelRef.current) {
        setBottomPanelHeight(Math.max(150, centerPanelRef.current.clientHeight / 3));
    }
  }, []);`);
    }

    text = text.replace(/<div className="flex flex-col h-full gap-2 relative z-10 overflow-hidden min-w-0">/, `<div className="flex flex-col h-full gap-2 relative z-10 overflow-hidden min-w-0" ref={centerPanelRef}>`);
    
    fs.writeFileSync('pages/WorldSim3DPage.tsx', text);
}

function fixWorldSim() {
    let text = fs.readFileSync('pages/WorldSimPage.tsx', 'utf8');

    // Remove the bad placement of the panel outside the central div
    const badPlacementRegex = /<\/ThemePanel>\s*\{\/\* Horizontal Resizer Handle \*\/\}([\s\S]*?)<\/ThemePanel>/;
    const match = text.match(badPlacementRegex);
    
    if (match) {
        // Strip out the incorrectly placed block entirely
        text = text.replace(match[0], '</ThemePanel>');
        // Re-inject it correctly BEFORE the closing </div> of the inner Canvas wrapper 
        // In WorldSimPage, the container closes right after the map with </div>\n          </ThemePanel>... Wait, in my previous patch...
        // The structure of the center in WorldSim is:
        // <ThemePanel translucent className="flex-1 ...">
        //   <div className="w-full h-full bg-zinc-950 relative z-0">
        //     <GoogleMap .../>
        //   </div>
        // </ThemePanel>
        
        let properInjection = `
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
`;
        text = text.replace(/(<\/ThemePanel>)\s*(\{\/\* Right Vertical Views Bar \*\/\})/, `$1\n${properInjection}\n          $2`);
        // We inject it as a sibling to the ThemePanel! But wait, if we inject it after `</ThemePanel>`, it's a sibling inside WHAT?
        // Inside `<div className="flex-1 grid overflow-hidden gap-2"`! Wait, we need it to be inside the center div! 
        // Wait! In WorldSimPage, the "center" is just defined as the grid column!
        // Is there a `<div className="flex flex-col h-full gap-2 relative z-10 overflow-hidden min-w-0">` ? NO! Wait, let's look at WorldSimPage.
    }
    
    fs.writeFileSync('pages/WorldSimPage.tsx', text);
}

fixFabFlow();
fixStudioSim();
fixWorldSim3D();
fixWorldSim();

console.log('All fixed!');
