import React, { useEffect, useState } from 'react';
import { Cpu, Factory, Hammer, Radar, Globe2, Box } from 'lucide-react';
import GlobalModal from './GlobalModal';

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
  appTheme?: 'prostudio' | 'fabflow' | 'studiosim' | 'tacticalsim' | 'worldsim' | 'studio';
}

const LoadingModal: React.FC<LoadingModalProps> = ({ isOpen, message = 'Loading Data...', appTheme = 'prostudio' }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      return;
    }
    
    // Simulate a snappy progress bar
    setProgress(10);
    const interval = setInterval(() => {
        setProgress(prev => {
            if (prev >= 90) {
                clearInterval(interval);
                return 90;
            }
            return prev + Math.random() * 20;
        });
    }, 150);

    return () => clearInterval(interval);
  }, [isOpen]);

    const themes = {
        prostudio: { bgContainer: 'bg-blue-900/40', border: 'border-blue-500/30', shadowBox: 'shadow-[0_0_30px_rgba(59,130,246,0.2)]', icon: <Cpu className="w-8 h-8 text-blue-400 animate-pulse" />, textPrimary: 'text-blue-500/60', barBg: 'bg-blue-500', barShadow: 'shadow-[0_0_10px_rgba(59,130,246,0.8)]' },
        fabflow: { bgContainer: 'bg-yellow-900/40', border: 'border-yellow-500/30', shadowBox: 'shadow-[0_0_30px_rgba(234,179,8,0.2)]', icon: <Factory className="w-8 h-8 text-yellow-500 animate-pulse" />, textPrimary: 'text-yellow-500/60', barBg: 'bg-yellow-500', barShadow: 'shadow-[0_0_10px_rgba(234,179,8,0.8)]' },
        studiosim: { bgContainer: 'bg-emerald-900/40', border: 'border-emerald-500/30', shadowBox: 'shadow-[0_0_30px_rgba(16,185,129,0.2)]', icon: <Hammer className="w-8 h-8 text-emerald-400 animate-pulse" />, textPrimary: 'text-emerald-500/60', barBg: 'bg-emerald-500', barShadow: 'shadow-[0_0_10px_rgba(16,185,129,0.8)]' },
        tacticalsim: { bgContainer: 'bg-red-900/40', border: 'border-red-500/30', shadowBox: 'shadow-[0_0_30px_rgba(239,68,68,0.2)]', icon: <Radar className="w-8 h-8 text-red-500 animate-pulse" />, textPrimary: 'text-red-500/60', barBg: 'bg-red-500', barShadow: 'shadow-[0_0_10px_rgba(239,68,68,0.8)]' },
        worldsim: { bgContainer: 'bg-indigo-900/40', border: 'border-indigo-500/30', shadowBox: 'shadow-[0_0_30px_rgba(99,102,241,0.2)]', icon: <Globe2 className="w-8 h-8 text-indigo-400 animate-pulse" />, textPrimary: 'text-indigo-500/60', barBg: 'bg-indigo-500', barShadow: 'shadow-[0_0_10px_rgba(99,102,241,0.8)]' },
        studio: { bgContainer: 'bg-purple-900/40', border: 'border-purple-500/30', shadowBox: 'shadow-[0_0_30px_rgba(168,85,247,0.2)]', icon: <Box className="w-8 h-8 text-purple-400 animate-pulse" />, textPrimary: 'text-purple-500/60', barBg: 'bg-purple-500', barShadow: 'shadow-[0_0_10px_rgba(168,85,247,0.8)]' }
    };
    const t = themes[appTheme] || themes.prostudio;

  return (
    <GlobalModal
      isOpen={isOpen}
      maxWidth="24rem"
    >
      <div className="flex flex-col items-center">
        <div className={`w-16 h-16 ${t.bgContainer} flex items-center justify-center mb-6 border ${t.border} ${t.shadowBox}`}>
            {t.icon}
        </div>
        
        <h3 className="text-xl font-medium tracking-tight mb-2 text-[#f4f4f5]">{message}</h3>
        <p className={`text-sm ${t.textPrimary} uppercase tracking-widest font-bold mb-8 animate-pulse text-center`}>
            Establishing Secure Stream
        </p>

        <div className="w-full h-1.5 bg-[#27272a] overflow-hidden mb-2">
            <div 
                className={`h-full ${t.barBg} ${t.barShadow} transition-all ease-out duration-300`}
                style={{ width: `${progress}%` }}
            ></div>
        </div>
        <div className="w-full flex justify-between text-[10px] text-[#71717a] font-mono">
            <span>LOADING</span>
            <span>{Math.floor(progress)}%</span>
        </div>
      </div>
    </GlobalModal>
  );
};

export default LoadingModal;
