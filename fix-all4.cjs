const fs = require('fs');

function fixFabFlow() {
    let text = fs.readFileSync('pages/FabFlowPage.tsx', 'utf8');
    
    if (!text.includes('centerPanelRef = React.useRef')) {
        text = text.replace(/const \[bottomPanelHeight, setBottomPanelHeight\] = useState[^;]+;/,
`const centerPanelRef = React.useRef<HTMLDivElement>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = React.useState(250);

  React.useEffect(() => {
    if (centerPanelRef.current) {
        setBottomPanelHeight(Math.max(150, centerPanelRef.current.clientHeight / 3));
    }
  }, []);`);
    }

    text = text.replace(/<div className="flex flex-col h-full gap-2 relative z-10 overflow-hidden min-w-0">/, `<div className="flex flex-col h-full gap-2 relative z-10 overflow-hidden min-w-0" ref={centerPanelRef}>`);
    
    if (!text.includes('hover:bg-yellow-500 transition-colors flex-shrink-0 z-30 flex items-center justify-center')) {
        text = text.replace(/<ThemePanel translucent className="h-full overflow-hidden relative z-10" style=\{\{ width: agentPanelWidth \}\}>/, 
`<div onMouseDown={() => {}} className="resize-handle w-1.5 h-full cursor-col-resize bg-zinc-800 hover:bg-yellow-500 transition-colors flex-shrink-0 z-30 flex items-center justify-center"></div>
                <ThemePanel translucent className="h-full overflow-hidden relative z-10" style={{ width: agentPanelWidth }}>`);
    }
    fs.writeFileSync('pages/FabFlowPage.tsx', text);
}

function fixStudioSim() {
    let text = fs.readFileSync('pages/StudioSimPage.tsx', 'utf8');
    
    if (!text.includes('bottomPanelHeight')) {
        const stateInject = `
  const centerPanelRef = React.useRef<HTMLDivElement>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = React.useState(250);

  React.useEffect(() => {
    if (centerPanelRef.current) {
        setBottomPanelHeight(Math.max(150, centerPanelRef.current.clientHeight / 3));
    }
  }, []);

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
        text = text.replace(/const \[isAgentOpen, setIsAgentOpen\] = useState\(false\);/, `const [isAgentOpen, setIsAgentOpen] = React.useState(false);\n${stateInject}`);
    } else if (!text.includes('centerPanelRef = React.useRef')) {
        text = text.replace(/const \[bottomPanelHeight, setBottomPanelHeight\] = useState[^;]+;/,
`const centerPanelRef = React.useRef<HTMLDivElement>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = React.useState(250);

  React.useEffect(() => {
    if (centerPanelRef.current) {
        setBottomPanelHeight(Math.max(150, centerPanelRef.current.clientHeight / 3));
    }
  }, []);`);
    }

    text = text.replace(/<div className="flex flex-col h-full gap-2 relative z-10 overflow-hidden min-w-0">/, `<div className="flex flex-col h-full gap-2 relative z-10 overflow-hidden min-w-0" ref={centerPanelRef}>`);
    
    if (!text.includes('handleBottomPanelMouseDown')) {
        const bottomRegex = /\{\/\* Bottom 25% Boundary Conditions List \*\/\}\s*<ThemePanel translucent className="h-\[25%\] shrink-0 flex flex-col overflow-hidden relative shadow-\[inset_0_0_30px_rgba\(0,0,0,0\.8\)\] border-emerald-500\/10">/;
        if (bottomRegex.test(text)) {
            text = text.replace(bottomRegex, 
`{/* Horizontal Resizer Handle */}
        <div 
          onMouseDown={handleBottomPanelMouseDown}
          className="resize-handle h-1.5 w-full bg-zinc-800 flex-shrink-0 cursor-row-resize hover:bg-emerald-500 transition-colors z-30 flex items-center justify-center"></div>

        {/* Bottom Panel */}
        <ThemePanel translucent className="shrink-0 flex flex-col overflow-hidden relative shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] border-emerald-500/10 rounded-xl" style={{ height: bottomPanelHeight }}>`);
        }
    }
    fs.writeFileSync('pages/StudioSimPage.tsx', text);
}

function fixWorldSim3D() {
    let text = fs.readFileSync('pages/WorldSim3DPage.tsx', 'utf8');
    
    if (!text.includes('centerPanelRef = React.useRef')) {
        text = text.replace(/const \[bottomPanelHeight, setBottomPanelHeight\] = useState[^;]+;/,
`const centerPanelRef = React.useRef<HTMLDivElement>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = React.useState(250);

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

    if (!text.includes('Activity,')) {
        text = text.replace(/import \{ ([^\}]+) \} from 'lucide-react';/, "import { $1, Activity } from 'lucide-react';");
    }

    if (!text.includes('centerPanelRef = React.useRef')) {
        text = text.replace(/const \[bottomPanelHeight, setBottomPanelHeight\] = useState[^;]+;/,
`const centerPanelRef = React.useRef<HTMLDivElement>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = React.useState(250);

  React.useEffect(() => {
    if (centerPanelRef.current) {
        setBottomPanelHeight(Math.max(150, centerPanelRef.current.clientHeight / 3));
    }
  }, []);`);
    }

    // Move bottom panel logic
    const resizerPattern = /\{\/\* Horizontal Resizer Handle \*\/\}([\s\S]*?)<\/ThemePanel>/;
    const matchOld = text.match(resizerPattern);
    if (matchOld) {
        text = text.replace(resizerPattern, ''); 
    }

    text = text.replace(/<div className="w-full h-full bg-zinc-950 relative z-0">/, `<div className="w-full flex-1 min-h-0 bg-zinc-950 relative z-0">`);
    text = text.replace(/<ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 p-0"/, `<ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 p-0" ref={centerPanelRef}`);

    if (!text.includes('handleBottomPanelMouseDown')) {
        const bottomInsert = `            {/* Horizontal Resizer Handle */}
            <div 
              onMouseDown={handleBottomPanelMouseDown}
              className="resize-handle h-1.5 w-full bg-zinc-800 flex-shrink-0 cursor-row-resize hover:bg-cyan-500 transition-colors z-30 flex items-center justify-center"
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
          </ThemePanel>`;

        text = text.replace(/Initializing 2D Vector Matrices\.\.\.\s*<\/div>\s*\)\}\s*<\/div>\s*<\/ThemePanel>/, `Initializing 2D Vector Matrices...
                    </div>
                )}
            </div>
${bottomInsert}`);
    }

    fs.writeFileSync('pages/WorldSimPage.tsx', text);
}

try { fixFabFlow(); } catch (e) { console.error('FabFlow error:', e); }
try { fixStudioSim(); } catch (e) { console.error('StudioSim error:', e); }
try { fixWorldSim3D(); } catch (e) { console.error('WorldSim3D error:', e); }
try { fixWorldSim(); } catch (e) { console.error('WorldSim error:', e); }

console.log('All patches ran!');
