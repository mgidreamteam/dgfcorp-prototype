import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import ThemePanel from './ThemePanel';
import { useTheme } from '../contexts/ThemeContext';

export interface GlobalModalProps {
   isOpen: boolean;
   onClose?: () => void;
   title?: React.ReactNode;
   icon?: React.ReactNode;
   children: React.ReactNode;
   footer?: React.ReactNode;
   maxWidth?: string;
}

const GlobalModal: React.FC<GlobalModalProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    icon, 
    children, 
    footer, 
    maxWidth = '28rem' 
}) => {
   const { dashboardTheme } = useTheme();
   const themeClass = dashboardTheme === 'blueprint' ? 'theme-blueprint' : 'theme-dream-giga';

   useEffect(() => {
     if (!isOpen || !onClose) return;
     const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
     window.addEventListener('keydown', handleEsc);
     return () => window.removeEventListener('keydown', handleEsc);
   }, [isOpen, onClose]);

   if (!isOpen) return null;

   return createPortal(
      <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-sm ${themeClass}`} onClick={onClose}>
         <ThemePanel 
           className="flex flex-col w-full shadow-2xl relative" 
           style={{ maxWidth, borderRadius: 0 }} 
         >
           <div onClick={(e) => e.stopPropagation()} className="w-full h-full flex flex-col">
            {title && (
              <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
                 <div className="flex items-center gap-3 font-bold text-white uppercase tracking-wider shrink-0">
                    {icon && <div className="shrink-0">{icon}</div>}
                    <div className="flex-1">{title}</div>
                 </div>
                 {onClose && (
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1" aria-label="Close Modal">
                       <X className="w-5 h-5" />
                    </button>
                 )}
              </div>
            )}
            <div className={`p-6 text-zinc-300 overflow-y-auto max-h-[70vh] ${!title ? 'pt-6' : ''}`}>
               {children}
            </div>
            {footer && (
               <div className="p-4 bg-black/40 border-t border-zinc-800/50 flex justify-end items-center gap-4">
                  {footer}
               </div>
            )}
           </div>
         </ThemePanel>
      </div>,
      document.body
   );
};

export default GlobalModal;
