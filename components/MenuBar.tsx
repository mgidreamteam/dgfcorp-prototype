import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { PlusCircle, Save, Trash2, FileInput, FileOutput, Box, ImageIcon, XSquare, CloudUpload, CloudDownload, Loader2, Moon, Sun } from 'lucide-react';

interface FileMenuBarProps {
  onNewProject: () => void;
  onSave: () => void;
  onImport: () => void;
  onDownload: () => void;
  onCloseProject: () => void;
  onDeleteProject: () => void;
  onExportStl: () => void;
  isStlReady: boolean;
  onExportImages: () => void;
  areImagesExportable: boolean;
  isProjectActive: boolean;
  onSaveToCloud: () => void;
  onLoadFromCloud: () => void;
  isCloudSaving: boolean;
  cloudStorageUsed: number;
}

const FileMenuBar: React.FC<FileMenuBarProps> = ({ 
    onNewProject, 
    onSave,
    onImport,
    onDownload,
    onCloseProject,
    onDeleteProject,
    onExportStl, 
    isStlReady, 
    onExportImages, 
    areImagesExportable, 
    isProjectActive,
    onSaveToCloud,
    onLoadFromCloud,
    isCloudSaving,
    cloudStorageUsed
}) => {
    
  const iconBtnClass = "flex items-center justify-center p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-md transition-colors";
  const disabledIconBtnClass = "flex items-center justify-center p-2 text-zinc-600 cursor-not-allowed";

  const textBtnClass = "flex items-center gap-2 px-3 py-1.5 text-body text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-md transition-colors";
  const disabledTextBtnClass = "flex items-center gap-2 px-3 py-1.5 text-body text-zinc-600 cursor-not-allowed";

  return (
    <div className="w-full px-8 py-2 flex justify-between items-center bg-transparent shrink-0 relative z-10">
      <div className="flex items-center gap-1.5">
        <button onClick={onNewProject} className={iconBtnClass} title="New Project">
          <PlusCircle className="w-5 h-5" />
        </button>
        <button onClick={onSave} disabled={!isProjectActive} className={isProjectActive ? iconBtnClass : disabledIconBtnClass} title="Save Project">
          <Save className="w-5 h-5" />
        </button>
        <button onClick={onDeleteProject} disabled={!isProjectActive} className={isProjectActive ? iconBtnClass.replace('text-zinc-300', 'text-red-400').replace('hover:bg-zinc-800', 'hover:bg-red-900/50') : disabledIconBtnClass} title="Delete Project">
          <Trash2 className="w-5 h-5" />
        </button>
        <div className="h-5 w-px bg-zinc-700 mx-1.5"></div>

        <button onClick={onDownload} disabled={!isProjectActive} className={isProjectActive ? iconBtnClass : disabledIconBtnClass} title="Export to Disk (*.dream)">
          <FileOutput className="w-5 h-5" />
        </button>
        <button onClick={onImport} className={iconBtnClass} title="Import from Disk (*.dream)">
            <FileInput className="w-5 h-5" />
        </button>

        <div className="h-5 w-px bg-zinc-700 mx-1.5"></div>
        <button onClick={onSaveToCloud} disabled={!isProjectActive || isCloudSaving} className={isProjectActive ? iconBtnClass.replace('text-zinc-300', 'text-blue-400').replace('hover:bg-zinc-800', 'hover:bg-blue-900/40') : disabledIconBtnClass} title="Save to Cloud">
            {isCloudSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
        </button>
        <button onClick={onLoadFromCloud} className={iconBtnClass.replace('text-zinc-300', 'text-blue-400').replace('hover:bg-zinc-800', 'hover:bg-blue-900/40')} title="Load from Cloud">
            <CloudDownload className="w-5 h-5" />
        </button>
        <div className="h-5 w-px bg-zinc-700 mx-1.5"></div>
        <button onClick={onExportStl} disabled={!isStlReady} className={isStlReady ? textBtnClass : disabledTextBtnClass} title="Export STL">
          <Box className="w-5 h-5" /> STL
        </button>
        <button onClick={onExportImages} disabled={!areImagesExportable} className={areImagesExportable ? iconBtnClass : disabledIconBtnClass} title="Export Images">
          <ImageIcon className="w-5 h-5" />
        </button>
        <div className="h-5 w-px bg-zinc-700 mx-1.5"></div>

        <button onClick={onCloseProject} disabled={!isProjectActive} className={isProjectActive ? iconBtnClass : disabledIconBtnClass} title="Close Project">
          <XSquare className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-6">

        {/* Global Quota Engine */}
        <div className="flex items-center gap-4 bg-black/40 px-4 py-1.5 rounded-lg border border-zinc-800">
          <div className="text-right">
            <h2 className="text-body font-bold text-zinc-500 uppercase tracking-widest">Global Quota</h2>
            <div className="text-detail text-zinc-300">{(cloudStorageUsed / 1000000).toFixed(2)} / 50.0 MB</div>
        </div>
        <div className="w-32 h-2.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
            <div 
                className={`h-full ${cloudStorageUsed > 40000000 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'} transition-all duration-500 ease-out`}
                style={{ width: `${Math.min(100, (cloudStorageUsed / 50000000) * 100)}%` }}
            />
        </div>
        </div>
      </div>
    </div>
  );
};

export default FileMenuBar;