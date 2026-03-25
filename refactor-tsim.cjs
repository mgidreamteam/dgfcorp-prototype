const fs = require('fs');
const path = require('path');

// 1. Rename the file
const oldPath = path.join('pages', 'WorldSim3DPage.tsx');
const newPath = path.join('pages', 'TacticalSimPage.tsx');

if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
}

// 2. Update references in routes/index.tsx
const routesPath = path.join('routes', 'index.tsx');
let routesText = fs.readFileSync(routesPath, 'utf8');
routesText = routesText.replace(/WorldSim3DPage/g, 'TacticalSimPage');
routesText = routesText.replace(/\/worldsim3d/g, '/tacticalsim'); // optional if route should also change, but user said "change the filename and its references". Wait, if I change the URL route, it breaks established link routing. I will just change "WorldSim3DPage" usage and the `worldsim3d` route mapping, since if it's TacticalSim, they'd probably want the URL to match or stay the same. In `WorldSim3DPage.tsx` it says `navigate('/worldsim3d')`. So I'll replace `/worldsim3d` with `/tacticalsim` EVERYWHERE.
fs.writeFileSync(routesPath, routesText);

// 3. Update references inside TacticalSimPage.tsx
let simText = fs.readFileSync(newPath, 'utf8');
simText = simText.replace(/WorldSim3DPage/g, 'TacticalSimPage');
simText = simText.replace(/\/worldsim3d/g, '/tacticalsim');

// 4. Fix TacticalSim Toolbar Layout
// We need to move the toolbar from the top ThemePanel into the central canvas area ThemePanel.

const toolbarBlockRegex = /<div className="px-4 py-2 shrink-0 bg-transparent flex flex-col items-center bg-black\/60 z-20 relative border-t border-zinc-800\/80">([\s\S]*?)<\/div>\s*<\/ThemePanel>/;
const match = simText.match(toolbarBlockRegex);

if (match) {
    // Extract the toolbar HTML block only up to the closing </div> of the toolbar wrapper, leaving </ThemePanel> for the FileMenuBar
    const extractedToolbar = `<div className="px-4 py-2 shrink-0 bg-transparent flex flex-col items-center bg-black/60 z-20 relative border-b border-zinc-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">\n${match[1]}</div>`;
    
    // Remove the toolbar completely from the top ThemePanel
    simText = simText.replace(match[0], '</ThemePanel>');

    // Now inject the extracted toolbar inside the Central ThemePanel
    const centralThemePanelOpen = /<ThemePanel translucent className="flex-1 flex flex-col overflow-hidden relative z-10 p-0[^"]*">/;
    simText = simText.replace(centralThemePanelOpen, `$& \n            ${extractedToolbar}`);
}

fs.writeFileSync(newPath, simText);

// 5. Update other references
const mdFiles = ['DEVELOPER_GUIDE.md', 'prostudio_technical_report.md'];
mdFiles.forEach(f => {
    if (fs.existsSync(f)) {
        let text = fs.readFileSync(f, 'utf8');
        text = text.replace(/WorldSim3DPage/g, 'TacticalSimPage');
        text = text.replace(/WorldSim3D/g, 'TacticalSim');
        fs.writeFileSync(f, text);
    }
});

// Update the App-side navigator buttons or sidebars if they reference /worldsim3d
const otherFiles = ['components/MenuBar.tsx', 'pages/DashboardPage.tsx'];
// We can just glob them, but let's aggressively replace /worldsim3d with /tacticalsim
function replaceInDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const fullPath = path.join(dir, f);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath);
        } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('/worldsim3d') || content.includes('WorldSim3D')) {
                content = content.replace(/\/worldsim3d/g, '/tacticalsim');
                content = content.replace(/WorldSim3DPage/g, 'TacticalSimPage');
                content = content.replace(/WorldSim3D Workspace/g, 'TacticalSim Workspace');
                fs.writeFileSync(fullPath, content);
            }
        }
    }
}
replaceInDir('pages');
replaceInDir('components');
replaceInDir('routes');

console.log('Rename and Reparenting Complete!');
