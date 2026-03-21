import React from 'react';

export const SimHUD = ({ colorClass = 'blue' }: { colorClass?: 'blue' | 'emerald' | 'yellow' | 'red' | 'cyan' }) => {
    const themeColors = {
        blue: { border: 'border-blue-500/30', shadow: 'shadow-[0_0_30px_rgba(59,130,246,0.2)]', text: 'text-blue-400', dot: 'bg-blue-500' },
        emerald: { border: 'border-emerald-500/30', shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.2)]', text: 'text-emerald-400', dot: 'bg-emerald-500' },
        yellow: { border: 'border-yellow-500/30', shadow: 'shadow-[0_0_30px_rgba(234,179,8,0.2)]', text: 'text-yellow-400', dot: 'bg-yellow-500' },
        red: { border: 'border-red-500/30', shadow: 'shadow-[0_0_30px_rgba(239,68,68,0.2)]', text: 'text-red-500', dot: 'bg-red-500' },
        cyan: { border: 'border-cyan-500/30', shadow: 'shadow-[0_0_30px_rgba(6,182,212,0.2)]', text: 'text-cyan-400', dot: 'bg-cyan-500' },
    };
    const t = themeColors[colorClass];
    
    return (
        <div className="absolute bottom-4 inset-x-0 w-full flex justify-center pointer-events-none z-20">
             <div className={`px-6 py-2 bg-black/60 backdrop-blur-md rounded-full border ${t.border} flex items-center gap-6 ${t.shadow}`}>
                 <span className={`text-[10px] font-bold uppercase tracking-widest ${t.text} flex items-center gap-2`}>
                     <span className={`w-2 h-2 rounded-full ${t.dot} animate-pulse`}></span> Kinematics: Active
                 </span>
                 <div className="w-px h-4 bg-zinc-800"></div>
                 <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                     <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="7" ry="7"></rect><path d="M5 9h14"></path><path d="M8 2v7" stroke="#fff" strokeWidth="3"></path></svg> Pan
                 </span>
                 <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                     <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="7" ry="7"></rect><path d="M5 9h14"></path><path d="M16 2v7" stroke="#fff" strokeWidth="3"></path></svg> Orbit
                 </span>
                 <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                     <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2" fill="#fff"></circle><path d="M12 2v4"></path><path d="M12 18v4"></path></svg> Zoom
                 </span>
             </div>
        </div>
    );
};
