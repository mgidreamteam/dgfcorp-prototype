const fs = require('fs');

const pages = [
  { file: 'pages/StudioPage.tsx', widthVar: 'hiloPanelWidth', appType: 'studio', origWidth: '400', gridBase: '256px 200px minmax(500px, 1fr) 6px ${hiloPanelWidth}px', gridBaseClosed: '256px 200px minmax(500px, 1fr)', header: 'HELO', hasBorderB: true },
  { file: 'pages/ProStudioPage.tsx', widthVar: 'agentPanelWidth', appType: 'prostudio', origWidth: '300', gridBase: '256px 220px 50px minmax(400px, 1fr) 50px 6px ${agentPanelWidth}px', gridBaseClosed: '256px 220px 50px minmax(400px, 1fr) 50px', header: null, hasBorderB: false },
  { file: 'pages/FabFlowPage.tsx', widthVar: 'agentPanelWidth', appType: 'fabflow', origWidth: '300', gridBase: '256px minmax(500px, 1fr) 60px 6px ${agentPanelWidth}px', gridBaseClosed: '256px minmax(500px, 1fr) 60px', header: null, hasBorderB: false },
  { file: 'pages/StudioSimPage.tsx', widthVar: 'agentPanelWidth', appType: 'studiosim', origWidth: '400', gridBase: '256px minmax(500px, 1fr) 60px 6px ${agentPanelWidth}px', gridBaseClosed: '256px minmax(500px, 1fr) 60px', header: null, hasBorderB: false },
  { file: 'pages/WorldSimPage.tsx', widthVar: 'agentPanelWidth', appType: 'wsim', origWidth: '400', gridBase: '256px minmax(500px, 1fr) 60px 6px ${agentPanelWidth}px', gridBaseClosed: '256px minmax(500px, 1fr) 60px', header: null, hasBorderB: false },
  { file: 'pages/WorldSim3DPage.tsx', widthVar: 'agentPanelWidth', appType: 'tsim', origWidth: '400', gridBase: '256px minmax(500px, 1fr) 60px 6px ${agentPanelWidth}px', gridBaseClosed: '256px minmax(500px, 1fr) 60px', header: null, hasBorderB: false }
];

pages.forEach(p => {
    let text = fs.readFileSync(p.file, 'utf8');

    // 1. Rename "Import 3D Model" title
    text = text.replaceAll('title="Import 3D Model"', 'title="Load Local File"');
    text = text.replaceAll('title="Import 3D model"', 'title="Load Local File"');
    
    // Replace the MeshedCubeIcon button contents with FolderOpen in all pages where it applies
    text = text.replaceAll(/<div className="relative p-1 group flex items-center justify-center">[\s\S]*?<MeshedCubeIcon \/>[\s\S]*?<ArrowDown[^>]*>[\s\S]*?<\/div>/g, '<div className="relative p-1 flex items-center justify-center"><FolderOpen className="w-5 h-5 text-emerald-500 drop-shadow-md" /></div>');

    // 2. Add isAgentOpen state
    if (!text.includes('isAgentOpen')) {
        const stateRegex = new RegExp(`const \\\[${p.widthVar}, set${p.widthVar[0].toUpperCase() + p.widthVar.slice(1)}\\\] = useState\\(${p.origWidth}\\);`);
        text = text.replace(stateRegex, `$& \n  const [isAgentOpen, setIsAgentOpen] = useState(true);`);
        
        let targetGridStr = `\`${p.gridBase.replace(/\$\{/g, '\\${')}\``;
        if (p.file === 'pages/StudioPage.tsx') {
            text = text.replace(/const gridTemplateColumns = `256px 200px minmax\(500px, 1fr\) 6px \$\{hiloPanelWidth\}px`;/, 'const gridTemplateColumns = isAgentOpen ? `256px 200px minmax(500px, 1fr) 6px ${hiloPanelWidth}px` : `256px 200px minmax(500px, 1fr)`;');
        } else {
            text = text.replace(
                new RegExp(`const gridTemplateColumns = \`${p.gridBase.replace(/\$\{/g, '\\${').replace(/\(/g, '\\(').replace(/\)/g, '\\)')}\`;`),
                `const gridTemplateColumns = isAgentOpen ? \`${p.gridBase}\` : \`${p.gridBaseClosed}\`;`
            );
        }

        // 3. FileMenuBar wrapper
        const menuRegex = new RegExp(`<FileMenuBar projectName=\{([^}]+)\} appType=\"${p.appType}\"( \\/)?>`);
        text = text.replace(menuRegex, `<FileMenuBar projectName={$1} appType="${p.appType}" onToggleAgent={() => setIsAgentOpen(!isAgentOpen)} isAgentOpen={isAgentOpen} />`);
        
        // Ensure "isAgentPanelOpen" in ProStudioPage maps to isAgentOpen
        if (p.file === 'pages/ProStudioPage.tsx') {
            // Prostudio already uses isAgentPanelOpen... Wait, wait let me check if it does.
        }
        
        let closeBtn = `<button onClick={() => setIsAgentOpen(false)} className="text-zinc-500 hover:text-white transition-colors" title="Close HELO Agent"><X className="w-4 h-4"/></button>`;
        
        if (p.file === 'pages/StudioPage.tsx') {
            text = text.replace(/<div className="px-4 py-3 border-b border-zinc-800 shrink-0 bg-transparent">/, `<div className="px-4 py-3 border-b border-zinc-800 shrink-0 bg-transparent flex justify-between items-center">`);
            text = text.replace(/<h2 className="text-subheading font-normal text-white uppercase tracking-tighter">HELO<\/h2>/, `<h2 className="text-subheading font-normal text-white uppercase tracking-tighter">HELO</h2>${closeBtn}`);
        } else {
            // In ProStudio and the rest, it uses `AgentSidebar` which is imported.
            // We need to pass `onClose={() => setIsAgentOpen(false)}` down to `AgentSidebar`. Let's do that later.
            // But we must conditionally render the resize-handle and agent panel.
            text = text.replace(/<div \s*onMouseDown=\{handleMouseDown\}\s*className="resize-handle/g, '{isAgentOpen && <div onMouseDown={handleMouseDown} className="resize-handle');
            
            // For StudioPage:
            if (p.file === 'pages/StudioPage.tsx') {
               text = text.replace(/<DesignInput/g, '<DesignInput');
               // actually, I'll close it right after the ThemePanel
               text = text.replace(/<\/ThemePanel>\s*<\/div>\s*<\/div>\s*<\/>/, '</ThemePanel>}\n        </div>\n      </div>\n    </>');
            } else {
                // Find <AgentSidebar ... /> and the enclosing ThemePanel
                // Oh I actually see {isAgentPanelOpen && ...} in ProStudioPage maybe? No, grep showed no hits.
                text = text.replace(/<ThemePanel( translucent)? className="h-full overflow-hidden relative z-10"( style=\{\{ width: agentPanelWidth \}\})?>\s*<AgentSidebar[\s\S]*?<\/ThemePanel>/g, `$<ThemePanel$1 className="h-full overflow-hidden relative z-10"$2>\n$<AgentSidebar$3</ThemePanel>\n}`);
                // Since I added `{isAgentOpen && ` before `<div onMouseDown...>`, I need to close the brace after the ThemePanel.
                text = text.replace(/(<AgentSidebar[\s\S]*?<\/ThemePanel>)\s*/, `$1\n}\n`);
            }
        }
    }

    fs.writeFileSync(p.file, text);
});
