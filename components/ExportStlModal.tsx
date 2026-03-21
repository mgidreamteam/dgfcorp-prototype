import React, { useState } from 'react';
import { X, Download, Loader2, FolderOpen } from 'lucide-react';

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

  // Update filename when defaultFilename changes (e.g., project switches)
  React.useEffect(() => {
    setFilename(defaultFilename);
  }, [defaultFilename]);

  if (!isOpen) return null;

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
      setIsExporting(true); // only set spinner after the dialog is complete
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={!isExporting ? onClose : undefined}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-800/50">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><Download className="w-5 h-5 text-zinc-400" /> Export Options (STL)</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors" disabled={isExporting}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">File Name</label>
            <div className="flex">
              <input 
                type="text" 
                value={filename} 
                onChange={e => setFilename(e.target.value)}
                className="w-full bg-zinc-800 border-y border-l border-zinc-700 rounded-l-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors placeholder:text-zinc-600"
                placeholder="project_name"
                disabled={isExporting}
                autoFocus
              />
              <button 
                onClick={handlePickFile} 
                className="bg-zinc-800 border overflow-hidden border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 px-3 py-2 rounded-r-md flex items-center shrink-0 transition-colors"
                title="Select Save Location"
                disabled={isExporting}
              >
                 <FolderOpen className="w-4 h-4 mr-1.5" />
                 <span className="text-zinc-500 text-sm">.stl</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1 flex justify-between items-end">
              <span>Resolution Vertices ($fn)</span>
              <span className="text-xs text-zinc-500 font-normal">Default: 50</span>
            </label>
            <p className="text-xs text-zinc-500 mb-2">Controls the number of fragments to make a full circle. Higher values make curved surfaces smoother.</p>
            <input 
              type="number" 
              value={vertices} 
              onChange={e => setVertices(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors"
              disabled={isExporting}
              min={10}
              max={360}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1 flex justify-between items-end">
              <span>Mesh Size ($fs)</span>
              <span className="text-xs text-zinc-500 font-normal">Default: 2.0</span>
            </label>
            <p className="text-xs text-zinc-500 mb-2">Controls the minimum size of a fragment. Lower values preserve finer details.</p>
            <input 
              type="number" 
              value={meshSize} 
              onChange={e => setMeshSize(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors"
              disabled={isExporting}
              min={0.1}
              step={0.1}
            />
          </div>
        </div>

        <div className="p-4 bg-zinc-800/30 border-t border-zinc-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors font-mono"
            disabled={isExporting}
          >
            CANCEL
          </button>
          <button 
            onClick={handleExport}
            className="px-6 py-2 rounded-lg text-sm font-bold bg-white text-black hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:bg-zinc-600 disabled:text-zinc-400 disabled:cursor-not-allowed uppercase font-mono tracking-widest min-w-[140px]"
            disabled={isExporting || !filename.trim()}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-zinc-400" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'GENERATING...' : 'EXPORT STL'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportStlModal;
