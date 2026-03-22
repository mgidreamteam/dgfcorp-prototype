import React from 'react';
import { createPortal } from 'react-dom';
import { X, Save, CloudUpload, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface CloseProjectModalProps {
  isOpen: boolean;
  projectName?: string;
  onCancel: () => void;
  onSaveLocal: () => void;
  onSaveCloud: () => void;
  onCloseWithoutSaving: () => void;
  isCloudSaving?: boolean;
}

const CloseProjectModal: React.FC<CloseProjectModalProps> = ({
  isOpen,
  projectName = 'this project',
  onCancel,
  onSaveLocal,
  onSaveCloud,
  onCloseWithoutSaving,
  isCloudSaving = false
}) => {
  const { dashboardTheme } = useTheme();
  const themeClass = dashboardTheme === 'blueprint' ? 'theme-blueprint' : 'theme-dream-giga';
  const bgClass = dashboardTheme === 'blueprint' ? 'bg-theme-blueprint' : 'bg-theme-dream-giga';

  if (!isOpen) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in text-white ${themeClass}`}>
      <div className={`${bgClass} border border-zinc-800 max-w-sm w-full p-5 shadow-2xl relative`}>
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-amber-500/10 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-body font-medium text-white tracking-tight">Close Project?</h2>
            <p className="text-micro text-zinc-400">"{projectName}"</p>
          </div>
        </div>

        <p className="text-zinc-300 text-body mb-5 leading-relaxed">
          Are you sure you want to close this project? If your recent changes haven't been backed up, you may lose them.
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onSaveCloud}
            disabled={isCloudSaving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 transition-all font-medium disabled:opacity-50"
          >
            {isCloudSaving ? (
              <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 animate-spin"></div> Syncing...</span>
            ) : (
              <><CloudUpload className="w-4 h-4" /> Save Backup to Cloud</>
            )}
          </button>

          <button 
            onClick={onSaveLocal}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 transition-all font-medium"
          >
            <Save className="w-4 h-4" /> Save Offline Copy
          </button>

          <div className="h-px bg-zinc-800 my-2"></div>

          <div className="flex justify-between gap-3">
            <button 
              onClick={onCloseWithoutSaving}
              className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all font-medium text-sm"
            >
              Close Without Saving
            </button>
            <button 
              onClick={onCancel}
              className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CloseProjectModal;
