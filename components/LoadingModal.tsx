import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Cpu } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ isOpen, message = 'Loading Data...' }) => {
  const [progress, setProgress] = useState(0);
  const { dashboardTheme } = useTheme();
  const themeClass = dashboardTheme === 'blueprint' ? 'theme-blueprint' : 'theme-dream-giga';
  const bgClass = dashboardTheme === 'blueprint' ? 'bg-theme-blueprint' : 'bg-theme-dream-giga';

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

  if (!isOpen) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in text-white ${themeClass}`}>
      <div className={`${bgClass} border border-blue-900/50 p-8 w-full max-w-sm flex flex-col items-center shadow-2xl`}>
        <div className="w-16 h-16 bg-blue-900/40 flex items-center justify-center mb-6 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
            <Cpu className="w-8 h-8 text-blue-400 animate-pulse" />
        </div>
        
        <h3 className="text-body font-medium tracking-tight mb-2 text-zinc-100">{message}</h3>
        <p className="text-micro text-blue-500/60 uppercase tracking-widest font-bold mb-8 animate-pulse text-center">
            Establishing Secure Stream
        </p>

        <div className="w-full h-1.5 bg-zinc-800 overflow-hidden mb-2">
            <div 
                className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all ease-out duration-300"
                style={{ width: `${progress}%` }}
            ></div>
        </div>
        <div className="w-full flex justify-between text-[10px] text-zinc-500 font-mono">
            <span>LOADING</span>
            <span>{Math.floor(progress)}%</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LoadingModal;
