import React, { useState } from 'react';
import { Download, Loader2, FolderOpen } from 'lucide-react';
import GlobalModal from './GlobalModal';

interface ExportStlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (filename: string, vertices: number, meshSize: number, fileHandle: any) => Promise<void>;
  defaultFilename: string;
}

const ExportStlModal: React.FC<ExportStlModalProps> = ({ isOpen, onClose, onExport, defaultFilename }) => {
  const [filename, setFilename] = useState(defaultFilename);
  const [vertices, setVertices] = useState<number>(50);
  const [meshSize, setMeshSize] = useState<number>(2.0);
  const [isExporting, setIsExporting] = useState(false);

  const [fileHandle, setFileHandle] = useState<any>(null);

  React.useEffect(() => {
    setFilename(defaultFilename);
  }, [defaultFilename]);

  const handlePickFile = async () => {
     try {
         // @ts-ignore
         const handle = await window.showSaveFilePicker({
             suggestedName: filename.endsWith('.stl') ? filename : `${filename}.stl`,
             types: [{ description: 'STL 3D Model', accept: { 'model/stl': ['.stl'] } }],
         });
         setFileHandle(handle);
         setFilename(handle.name);
     } catch (e: any) {
         if (e.name !== 'AbortError') console.error(e);
     }
  };

  const handleExport = async () => {
    let handleToUse = fileHandle;
    try {
      if (!handleToUse && 'showSaveFilePicker' in window) {
         // @ts-ignore
         handleToUse = await window.showSaveFilePicker({
             suggestedName: filename.endsWith('.stl') ? filename : `${filename}.stl`,
             types: [{ description: 'STL 3D Model', accept: { 'model/stl': ['.stl'] } }],
         });
      }
      setIsExporting(true);
      await onExport(handleToUse?.name || filename || defaultFilename, vertices, meshSize, handleToUse);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
          console.error(e);
      }
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={!isExporting ? onClose : undefined}
      title={<div className="text-sm font-bold uppercase text-white flex items-center gap-2">Export Options (STL)</div>}
      icon={<Download className="w-5 h-5 text-[#a1a1aa]" />}
      footer={
        <>
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[#d4d4d8] hover:text-white transition-colors font-mono"
            disabled={isExporting}
          >
            CANCEL
          </button>
          <button 
            onClick={handleExport}
            className="px-6 py-2 rounded-lg text-sm font-bold bg-white text-black hover:bg-[#e4e4e7] transition-colors flex items-center justify-center gap-2 disabled:bg-[#52525b] disabled:text-[#a1a1aa] disabled:cursor-not-allowed uppercase font-mono tracking-widest min-w-[140px]"
            disabled={isExporting || !filename.trim()}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-[#a1a1aa]" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'GENERATING...' : 'EXPORT STL'}
          </button>
        </>
      }
      maxWidth="28rem"
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[#d4d4d8] mb-2">File Name</label>
          <div className="flex">
            <input 
              type="text" 
              value={filename} 
              onChange={e => setFilename(e.target.value)}
              className="w-full bg-[#27272a] border-y border-l border-[#3f3f46] rounded-l-md px-3 py-2 text-white outline-none transition-colors placeholder:text-[#52525b]"
              placeholder="project_name"
              disabled={isExporting}
              autoFocus
            />
            <button 
              onClick={handlePickFile} 
              className="bg-[#27272a] border overflow-hidden border-[#3f3f46] text-[#a1a1aa] hover:text-white hover:bg-[#27272a] px-3 py-2 rounded-r-md flex items-center shrink-0 transition-colors"
              title="Select Save Location"
              disabled={isExporting}
            >
               <FolderOpen className="w-4 h-4 mr-1.5" />
               <span className="text-[#71717a] text-sm">.stl</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#d4d4d8] mb-1 flex justify-between items-end">
            <span>Resolution Vertices ($fn)</span>
            <span className="text-xs text-[#71717a] font-normal">Default: 50</span>
          </label>
          <p className="text-xs text-[#71717a] mb-2">Controls the number of fragments to make a full circle. Higher values make curved surfaces smoother.</p>
          <input 
            type="number" 
            value={vertices} 
            onChange={e => setVertices(Number(e.target.value))}
            className="w-full bg-[#27272a] border border-[#3f3f46] rounded-md px-3 py-2 text-white outline-none transition-colors"
            disabled={isExporting}
            min={10}
            max={360}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#d4d4d8] mb-1 flex justify-between items-end">
            <span>Mesh Size ($fs)</span>
            <span className="text-xs text-[#71717a] font-normal">Default: 2.0</span>
          </label>
          <p className="text-xs text-[#71717a] mb-2">Controls the minimum size of a fragment. Lower values preserve finer details.</p>
          <input 
            type="number" 
            value={meshSize} 
            onChange={e => setMeshSize(Number(e.target.value))}
            className="w-full bg-[#27272a] border border-[#3f3f46] rounded-md px-3 py-2 text-white outline-none transition-colors"
            disabled={isExporting}
            min={0.1}
            step={0.1}
          />
        </div>
      </div>
    </GlobalModal>
  );
};

export default ExportStlModal;
