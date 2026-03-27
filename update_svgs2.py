import os
import re

files = ['pages/StudioSimPage.tsx', 'pages/FabFlowPage.tsx', 'pages/WorldSimPage.tsx']

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Step 1: Add Aperture, Sparkles to lucide-react import without breaking it
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'from \'lucide-react\';' in line and 'Aperture' not in line:
            lines[i] = line.replace('}', ', Aperture, Sparkles }')
            break
            
    content = '\n'.join(lines)
        
    # wireframe
    content = re.sub(
        r'<button onClick=\{\(\) => setRenderMode\(\'wireframe\'\)\} className=\{.*?\} title=\"[^\"]*Wireframe View[^\"]*\">\s*<svg.*?</svg>\s*</button>',
        r'''<button onClick={() => setRenderMode('wireframe')} className={`relative flex items-center justify-center p-1.5 w-8 h-8 rounded-md transition-all duration-200 border ${renderMode === 'wireframe' ? 'bg-[#00ffcc]/20 text-[#00ffcc] border-[#00ffcc]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/70'}`} title="Wireframe View">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-full h-full">
                                   <circle cx="12" cy="12" r="9" />
                                   <ellipse cx="12" cy="12" rx="9" ry="3.5" />
                                   <ellipse cx="12" cy="12" rx="4" ry="9" />
                                </svg>
                            </button>''',
        content, flags=re.DOTALL
    )

    # edges
    content = re.sub(
        r'<button onClick=\{\(\) => setRenderMode\(\'edges\'\)\} className=\{.*?\} title=\"[^\"]*Edge View[^\"]*\">\s*<svg.*?</svg>\s*</button>',
        r'''<button onClick={() => setRenderMode('edges')} className={`relative flex items-center justify-center p-1.5 w-8 h-8 rounded-md transition-all duration-200 border ${renderMode === 'edges' ? 'bg-[#00ffcc]/20 text-[#00ffcc] border-[#00ffcc]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/70'}`} title="Solid + Edge View">
                                <svg viewBox="0 0 24 24" className="w-full h-full">
                                    <polygon points="12 3 4 7.5 12 12 20 7.5" fill="currentColor" fillOpacity="0.8" />
                                    <polygon points="4 16.5 4 7.5 12 12 12 21" fill="currentColor" fillOpacity="0.4" />
                                    <polygon points="12 21 12 12 20 7.5 20 16.5" fill="currentColor" fillOpacity="0.6" />
                                    <path d="M20 16.5V7.5L12 3 4 7.5v9l8 4.5z" fill="none" stroke={renderMode === 'edges' ? '#00ffcc' : '#18181b'} strokeWidth="1.5" strokeLinejoin="round" />
                                    <polyline points="4 7.5 12 12 20 7.5" fill="none" stroke={renderMode === 'edges' ? '#00ffcc' : '#18181b'} strokeWidth="1.5" strokeLinejoin="round" />
                                    <line x1="12" y1="21" x2="12" y2="12" stroke={renderMode === 'edges' ? '#00ffcc' : '#18181b'} strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </button>''',
        content, flags=re.DOTALL
    )
    
    # solid
    content = re.sub(
        r'<button onClick=\{\(\) => setRenderMode\(\'solid\'\)\} className=\{.*?\} title=\"[^\"]*Solid View[^\"]*\">\s*<svg.*?</svg>\s*</button>',
        r'''<button onClick={() => setRenderMode('solid')} className={`relative flex items-center justify-center p-1.5 w-8 h-8 rounded-md transition-all duration-200 border ${renderMode === 'solid' ? 'bg-[#00ffcc]/20 text-[#00ffcc] border-[#00ffcc]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/70'}`} title="Solid Shaded View">
                                <svg viewBox="0 0 24 24" className="w-full h-full">
                                    <circle cx="12" cy="12" r="9" fill="url(#smooth-grad-sim)" />
                                    <defs>
                                        <radialGradient id="smooth-grad-sim" cx="35%" cy="35%" r="65%">
                                            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
                                        </radialGradient>
                                    </defs>
                                </svg>
                            </button>''',
        content, flags=re.DOTALL
    )

    # Photoreal
    content = re.sub(
        r'<button[^>]*>\s*<img src=\"/crankshaft_render\.png\".*?</button>',
        r'''<button onClick={() => alert('V-Ray Plugin Not Licensed')} className="relative flex items-center justify-center p-1.5 w-[39px] h-[39px] mx-0.5 rounded border border-transparent hover:border-orange-500/50 hover:bg-orange-900/40 text-orange-500 group transition-all duration-300" title="Photorealistic GPU Render">
                                <Aperture className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                                <Sparkles className="w-2.5 h-2.5 absolute top-[6px] right-[6px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-orange-300" />
                            </button>''',
        content, flags=re.DOTALL
    )

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Successfully updated {file}")
