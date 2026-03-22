import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { PlusCircle, Save, Trash2, FileInput, FileOutput, Box, ImageIcon, XSquare, CloudUpload, CloudDownload, Loader2, Moon, Sun, Cpu, Upload, Download, ArrowUp, ArrowDown } from 'lucide-react';
import CloseProjectModal from './CloseProjectModal';

interface FileMenuBarProps {
  onNewProject: () => void;
  onSave: () => void;
  onImport: () => void;
  onDownload: () => void;
  onCloseProject: () => void;
  onDeleteProject: () => void;
  onImportStl?: () => void;
  onExportStl: () => void;
  isStlReady: boolean;
  onExportImages: () => void;
  areImagesExportable: boolean;
  isProjectActive: boolean;
  onSaveToCloud: () => void;
  onLoadFromCloud: () => void;
  isCloudSaving: boolean;
  cloudStorageUsed: number;
  extension?: string;
  projectName?: string;
}

const FileMenuBar: React.FC<FileMenuBarProps> = ({ 
    onNewProject, 
    onSave,
    onImport,
    onDownload,
    onCloseProject,
    onDeleteProject,
    onImportStl,
    onExportStl, 
    isStlReady, 
    onExportImages, 
    areImagesExportable, 
    isProjectActive,
    onSaveToCloud,
    onLoadFromCloud,
    isCloudSaving,
    cloudStorageUsed,
    extension = '.dream',
    projectName
}) => {
    
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const iconBtnClass = "flex items-center justify-center p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-md transition-colors";
  const disabledIconBtnClass = "flex items-center justify-center p-2 text-zinc-600 cursor-not-allowed";

  const textBtnClass = "flex items-center gap-2 px-3 py-1.5 text-body text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-md transition-colors";
  const disabledTextBtnClass = "flex items-center gap-2 px-3 py-1.5 text-body text-zinc-600 cursor-not-allowed";

  return (
    <>
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

        <button onClick={onDownload} disabled={!isProjectActive} className={isProjectActive ? iconBtnClass : disabledIconBtnClass} title={`Export to Disk (*${extension})`}>
          <FileOutput className="w-5 h-5" />
        </button>
        <button onClick={onImport} className={iconBtnClass} title={`Import from Disk (*${extension})`}>
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
        {onImportStl && (
          <button onClick={onImportStl} className={iconBtnClass} title="Import STL (*.stl)">
            <div className="relative">
              <Box className="w-5 h-5 flex-shrink-0" />
              <ArrowDown className="w-3.5 h-3.5 absolute -bottom-2 -left-2 text-emerald-400 stroke-[3] drop-shadow-md" />
            </div>
          </button>
        )}
        <button onClick={onExportStl} disabled={!isStlReady} className={isStlReady ? iconBtnClass : disabledIconBtnClass} title="Export STL">
          <div className="relative">
            <Box className="w-5 h-5 flex-shrink-0" />
            <ArrowUp className="w-3.5 h-3.5 absolute -top-2 -right-2 text-blue-400 stroke-[3] drop-shadow-md" />
          </div>
        </button>
        <button onClick={onExportImages} disabled={!areImagesExportable} className={areImagesExportable ? iconBtnClass : disabledIconBtnClass} title="Export Images">
          <div className="relative">
            <ImageIcon className="w-5 h-5 flex-shrink-0" />
            <ArrowUp className="w-3.5 h-3.5 absolute -top-2 -right-2 text-blue-400 stroke-[3] drop-shadow-md" />
          </div>
        </button>
        <div className="h-5 w-px bg-zinc-700 mx-1.5"></div>

        <button onClick={() => setIsCloseModalOpen(true)} disabled={!isProjectActive} className={isProjectActive ? iconBtnClass : disabledIconBtnClass} title="Close Project">
          <XSquare className="w-5 h-5" />
        </button>
      </div>
    </div>

    <CloseProjectModal 
      isOpen={isCloseModalOpen}
      projectName={projectName}
      onCancel={() => setIsCloseModalOpen(false)}
      onSaveLocal={() => { onDownload(); setIsCloseModalOpen(false); onCloseProject(); }}
      onSaveCloud={() => { onSaveToCloud(); setIsCloseModalOpen(false); onCloseProject(); }}
      onCloseWithoutSaving={() => { setIsCloseModalOpen(false); onCloseProject(); }}
      isCloudSaving={isCloudSaving}
    />
    </>
  );
};

export default FileMenuBar;