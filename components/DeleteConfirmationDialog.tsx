import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({ projectName, onConfirm, onCancel }) => {
  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 id="delete-dialog-title" className="text-xl font-bold text-white">Delete Project</h2>
              <p className="text-zinc-400 text-sm">Are you sure you want to proceed?</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <p className="text-zinc-300">
            You are about to permanently delete the project <strong className="text-white font-semibold">"{projectName}"</strong>. This action cannot be undone.
          </p>
        </div>
        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex justify-end items-center gap-4">
          <button onClick={onCancel} className="text-zinc-400 hover:text-white text-sm font-medium px-4 py-2 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-red-500/20 transition-all">
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationDialog;