import React from 'react';
import { Save, CloudUpload, AlertCircle } from 'lucide-react';
import GlobalModal from './GlobalModal';

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
  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onCancel}
      title={
        <div>
          <div className="text-sm font-bold uppercase">Close Project?</div>
          <div className="text-xs text-zinc-400 font-normal">"{projectName}"</div>
        </div>
      }
      icon={
        <div className="bg-[#f59e0b]/10 p-2 rounded-lg border border-[#f59e0b]/20 mr-2 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-[#f59e0b]" />
        </div>
      }
      maxWidth="28rem"
    >
      <p className="mb-5 leading-relaxed">
        Are you sure you want to close this project? If your recent changes haven't been backed up, you may lose them.
      </p>

      <div className="flex flex-col gap-3">
        <button 
          onClick={onSaveCloud}
          disabled={isCloudSaving}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2563eb]/20 hover:bg-[#2563eb]/30 text-[#60a5fa] hover:text-[#93c5fd] border border-[#3b82f6]/30 transition-all font-medium disabled:opacity-50"
        >
          {isCloudSaving ? (
            <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-[#60a5fa]/30 border-t-[#60a5fa] animate-spin"></div> Syncing...</span>
          ) : (
            <><CloudUpload className="w-4 h-4" /> Save Backup to Cloud</>
          )}
        </button>

        <button 
          onClick={onSaveLocal}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#059669]/10 hover:bg-[#059669]/20 text-[#34d399] hover:text-[#6ee7b7] border border-[#10b981]/20 transition-all font-medium"
        >
          <Save className="w-4 h-4" /> Save Offline Copy
        </button>

        <div className="h-px bg-[#27272a] my-2"></div>

        <div className="flex justify-between gap-3">
          <button 
            onClick={onCloseWithoutSaving}
            className="flex-1 py-2.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/20 transition-all font-medium text-sm"
          >
            Close Without Saving
          </button>
          <button 
            onClick={onCancel}
            className="flex-1 py-2.5 bg-[#27272a] hover:bg-[#3f3f46] text-[#d4d4d8] border border-[#3f3f46] transition-all font-medium text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </GlobalModal>
  );
};

export default CloseProjectModal;
