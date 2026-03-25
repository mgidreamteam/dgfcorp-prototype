const fs = require('fs');

const pages = [
    'pages/FabFlowPage.tsx',
    'pages/StudioSimPage.tsx',
    'pages/WorldSimPage.tsx',
    'pages/WorldSim3DPage.tsx',
    'pages/StudioPage.tsx',
    'pages/ProStudioPage.tsx'
];

const agentStateInjection = `const [isAgentOpen, setIsAgentOpen] = useState(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('dream_agent_open');
        if (saved !== null) {
            try { return JSON.parse(saved); } catch(e){}
        }
    }
    return false;
  });

  React.useEffect(() => {
      localStorage.setItem('dream_agent_open', JSON.stringify(isAgentOpen));
  }, [isAgentOpen]);`;

pages.forEach(file => {
    let text = fs.readFileSync(file, 'utf8');

    // Make sure we only inject once
    if (!text.includes('dream_agent_open')) {
        text = text.replace(/const\s+\[isAgentOpen,\s*setIsAgentOpen\]\s*=\s*useState\(false\);/, agentStateInjection);
    }

    // specific layout fix for fabflow
    if (file === 'pages/FabFlowPage.tsx') {
        const brokenGrid = "const gridTemplateColumns = isAgentOpen ? `280px 1fr ${agentPanelWidth}px` : '280px 1fr';";
        const fixedGrid = "const gridTemplateColumns = isAgentOpen ? `256px minmax(500px, 1fr) 60px 6px ${agentPanelWidth}px` : `256px minmax(500px, 1fr) 60px`;";
        text = text.replace(brokenGrid, fixedGrid);
    }
    
    fs.writeFileSync(file, text);
});

console.log('Successfully injected global Agent Session states across 6 pages!');
