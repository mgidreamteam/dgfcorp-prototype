import React, { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import GlobalModal from './GlobalModal';

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ isOpen, message = 'Loading Data...' }) => {
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

  return (
    <GlobalModal
      isOpen={isOpen}
      maxWidth="24rem"
    >
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-[#1e3a8a]/40 flex items-center justify-center mb-6 border border-[#3b82f6]/30 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
            <Cpu className="w-8 h-8 text-[#60a5fa] animate-pulse" />
        </div>
        
        <h3 className="text-xl font-medium tracking-tight mb-2 text-[#f4f4f5]">{message}</h3>
        <p className="text-sm text-[#3b82f6]/60 uppercase tracking-widest font-bold mb-8 animate-pulse text-center">
            Establishing Secure Stream
        </p>

        <div className="w-full h-1.5 bg-[#27272a] overflow-hidden mb-2">
            <div 
                className="h-full bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all ease-out duration-300"
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
