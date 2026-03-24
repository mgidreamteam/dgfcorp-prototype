import React from 'react';
import { AlertTriangle } from 'lucide-react';
import GlobalModal from './GlobalModal';

interface DeleteConfirmationDialogProps {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({ projectName, onConfirm, onCancel }) => {
  return (
    <GlobalModal
       isOpen={true}
       title={
         <div>
           <div className="text-sm font-bold uppercase">Delete Project</div>
           <div className="text-xs text-zinc-400 font-normal">Are you sure you want to proceed?</div>
         </div>
       }
       icon={
         <div className="bg-[#ef4444]/10 p-2 rounded-lg border border-[#ef4444]/20 mr-2">
           <AlertTriangle className="w-6 h-6 text-[#f87171]" />
         </div>
       }
       footer={
         <>
           <button onClick={onCancel} className="text-[#a1a1aa] hover:text-[#fff] text-sm font-medium px-4 py-2 transition-colors">
             Cancel
           </button>
           <button onClick={onConfirm} className="bg-[#dc2626] hover:bg-[#b91c1c] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-[#ef4444]/20 transition-all">
             Delete Project
           </button>
         </>
       }
       maxWidth="28rem"
    >
      <p>
        You are about to permanently delete the project <strong className="text-white font-semibold">"{projectName}"</strong>. This action cannot be undone.
      </p>
    </GlobalModal>
  );
};

export default DeleteConfirmationDialog;