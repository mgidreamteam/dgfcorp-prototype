import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const TopProgressBar: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let animationFrame: number;
    let targetProgress = 15;
    let currentProgress = 0;

    const animate = () => {
      // Simulate slow network or heavy JS parsing
      currentProgress += (targetProgress - currentProgress) * 0.1;
      setProgress(currentProgress);
      
      if (targetProgress < 90) {
          targetProgress += 0.5; // Slowly creep up
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-black/90 flex flex-col items-center justify-center">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full h-1 pointer-events-none">
        <div 
          className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
        {/* Glow head */}
        <div 
          className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent to-white opacity-50 shadow-[0_0_10px_#fff] transition-all duration-200 ease-out"
          style={{ left: `calc(${progress}% - 20px)` }}
        />
      </div>

      {/* Center Spinner */}
      <div className="flex flex-col items-center gap-4 text-emerald-500">
          <Loader2 className="w-12 h-12 animate-spin drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          <div className="text-xs font-bold uppercase tracking-[0.3em] opacity-80">
            Initializing Module...
          </div>
          <div className="text-[10px] font-mono opacity-50">
            {Math.round(progress)}% ALLOCATED
          </div>
      </div>
    </div>
  );
};

export default TopProgressBar;
