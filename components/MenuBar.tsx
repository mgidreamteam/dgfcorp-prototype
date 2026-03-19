import React from 'react';
import { PlusCircle, Save, Trash2, FileInput, FileOutput, Box, ImageIcon, XSquare, CloudUpload, CloudDownload, Loader2 } from 'lucide-react';

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
    
  const buttonClass = "flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-md transition-colors";
  const disabledButtonClass = "flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 cursor-not-allowed";

  return (
    <div className="w-full px-8 py-2 flex justify-between items-center bg-zinc-900 border-b border-zinc-800 shrink-0 z-10">
      <div className="flex items-center gap-2">
        <button onClick={onNewProject} className={buttonClass}>
          <PlusCircle className="w-4 h-4" /> New
        </button>
        <button onClick={onSave} disabled={!isProjectActive} className={isProjectActive ? buttonClass : disabledButtonClass}>
          <Save className="w-4 h-4" /> Save
        </button>
        <button onClick={onDeleteProject} disabled={!isProjectActive} className={isProjectActive ? buttonClass.replace('text-zinc-300', 'text-red-400').replace('hover:bg-zinc-800', 'hover:bg-red-900/50') : disabledButtonClass}>
          <Trash2 className="w-4 h-4" /> Delete
        </button>
        <div className="h-5 w-px bg-zinc-700 mx-1"></div>

        <button onClick={onDownload} disabled={!isProjectActive} className={isProjectActive ? buttonClass : disabledButtonClass}>
          <FileOutput className="w-4 h-4" /> Export to Disk (*.dream)
        </button>
        <button onClick={onImport} className={buttonClass}>
            <FileInput className="w-4 h-4" /> Import from Disk (*.dream)
        </button>

        <div className="h-5 w-px bg-zinc-700 mx-1"></div>
        <button onClick={onSaveToCloud} disabled={!isProjectActive || isCloudSaving} className={isProjectActive ? buttonClass.replace('text-zinc-300', 'text-blue-400').replace('hover:bg-zinc-800', 'hover:bg-blue-900/40') : disabledButtonClass}>
            {isCloudSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
            Save to Cloud
        </button>
        <button onClick={onLoadFromCloud} className={buttonClass.replace('text-zinc-300', 'text-blue-400').replace('hover:bg-zinc-800', 'hover:bg-blue-900/40')}>
            <CloudDownload className="w-4 h-4" /> Load from Cloud
        </button>
        <div className="h-5 w-px bg-zinc-700 mx-1"></div>
        <button onClick={onExportStl} disabled={!isStlReady} className={isStlReady ? buttonClass : disabledButtonClass}>
          <Box className="w-4 h-4" /> Export STL
        </button>
        <button onClick={onExportImages} disabled={!areImagesExportable} className={areImagesExportable ? buttonClass : disabledButtonClass}>
          <ImageIcon className="w-4 h-4" /> Export Images
        </button>
        <div className="h-5 w-px bg-zinc-700 mx-1"></div>

        <button onClick={onCloseProject} disabled={!isProjectActive} className={isProjectActive ? buttonClass : disabledButtonClass}>
          <XSquare className="w-4 h-4" /> Close
        </button>
      </div>

      <div className="flex items-center gap-4 bg-black/40 px-4 py-1.5 rounded-lg border border-zinc-800">
        <div className="text-right">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Global Quota</div>
            <div className="font-mono text-xs text-zinc-300">{(cloudStorageUsed / 1000000).toFixed(2)} / 50.0 MB</div>
        </div>
        <div className="w-32 h-2.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
            <div 
                className={`h-full ${cloudStorageUsed > 40000000 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'} transition-all duration-500 ease-out`}
                style={{ width: `${Math.min(100, (cloudStorageUsed / 50000000) * 100)}%` }}
            />
        </div>
      </div>
    </div>
  );
};

export default FileMenuBar;