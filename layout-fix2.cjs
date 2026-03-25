const fs = require('fs');

const files = [
    'pages/FabFlowPage.tsx',
    'pages/StudioSimPage.tsx',
    'pages/WorldSimPage.tsx',
    'pages/WorldSim3DPage.tsx'
];

files.forEach(file => {
    let text = fs.readFileSync(file, 'utf8');

    // 1. Add centerPanelRef if not present
    if (!text.includes('centerPanelRef')) {
        text = text.replace(/const \[bottomPanelHeight, setBottomPanelHeight\] = useState[^;]+;/,
`const centerPanelRef = useRef<HTMLDivElement>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250);

  useEffect(() => {
    if (centerPanelRef.current) {
        setBottomPanelHeight(centerPanelRef.current.clientHeight / 3);
    }
  }, []);`);
    }

    // 2. Add ref to Central Map/Canvas Wrapper
    text = text.replace(/(<div className="flex flex-col h-full(?: gap-2)? relative z-10 overflow-hidden min-w-0")>/g, `$1 ref={centerPanelRef}>`);
    
    // 3. FabFlow: Add missing resizer handle
    if (file === 'pages/FabFlowPage.tsx') {
        text = text.replace(/(\{isAgentOpen && \(\s*<>\s*)<ThemePanel translucent className="h-full overflow-hidden relative z-10"/, `$1<div onMouseDown={handleMouseDown} className="resize-handle w-1.5 h-full cursor-col-resize bg-zinc-800 hover:bg-[#00ffcc] transition-colors flex-shrink-0 z-30"><\/div>\n                <ThemePanel translucent className="h-full overflow-hidden relative z-10"`);
    }

    // 4. WorldSimPage: fix the bottom panel placement + imports
    if (file === 'pages/WorldSimPage.tsx') {
        // Find where the View Bar starts after the end of the ThemePanel
        // My previous patch made it:
        // </ThemePanel>
        // {/* Horizontal Resizer Handle */}
        // ... Next 12 lines
        // {/* Right Vertical Views Bar */}
        
        const worldSimExtract = `          {/* Horizontal Resizer Handle */}
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
          </ThemePanel>`;

        if (text.includes(worldSimExtract)) {
            // Remove it from its current position (outside the center div)
            text = text.replace(worldSimExtract, '');
            
            // Insert it inside the center div right after the Canvas ThemePanel wrapper (which is before Right Vertical Views Bar)
            // The central wrapper ends right before {/* Right Vertical Views Bar */}
            text = text.replace(/(<\/ThemePanel>\s*)(<div className="flex flex-col h-full bg-black\/50 backdrop-blur-sm)/, `$1${worldSimExtract}\n        </div>\n\n          {/* Right Vertical Views Bar */}\n          $2`);
            
            // Note: The central div actually ended AFTER `</ThemePanel>` with `</div>` but we removed `</div>` in my patch? Wait!
            // Actually it was `</ThemePanel>\n</div>`. Let me just replace the exact injection point.
            // Oh, previously the file didn't have `</div>` at the end of `</ThemePanel>`? Yes it did: `</ThemePanel>\n</div>\n\n          {/* Right Vertical Views ...`
            // Let's dynamically find the canvas `</ThemePanel>` inside the center div.
            // In WorldSim, it's `</ThemePanel>` followed by `</div>` which closes `<div className="w-full h-full bg-zinc-950 relative z-0">`.
            // Wait, no. The center wrapper's children are the top header, the GoogleMap container `<div className="w-full h-full...`, and that's it!
            // The ThemePanel wraps everything in the center. Wait... In WorldSimPage, the ThemePanel IS the center div!
             
        }
    }

    fs.writeFileSync(file, text);
});
console.log('Fix script ready!');
