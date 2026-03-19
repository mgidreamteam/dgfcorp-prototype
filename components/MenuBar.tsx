import React from 'react';
import { PlusCircle, Save, Trash2, FileInput, FileOutput, Box, ImageIcon, XSquare, LogOut } from 'lucide-react';

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
  onLogout: () => void;
  isProjectActive: boolean;
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
    onLogout, 
    isProjectActive 
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
      <button onClick={onLogout} className={buttonClass}>
        <LogOut className="w-4 h-4" /> Logout
      </button>
    </div>
  );
};

export default FileMenuBar;