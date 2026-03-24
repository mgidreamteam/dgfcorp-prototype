import React, { useState } from 'react';
import { Bot, Zap, AlertTriangle, MessageSquare } from 'lucide-react';
import { DesignProject } from '../types';
import GlobalModal from './GlobalModal';

interface RetryDialogProps {
  project: DesignProject;
  onCancel: () => void;
  onSubmit: (guidance: string) => void;
}

const RetryDialog: React.FC<RetryDialogProps> = ({ project, onCancel, onSubmit }) => {
  const [guidance, setGuidance] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (guidance.trim()) {
      onSubmit(guidance);
    }
  };

  const originalPrompt = project.prompt.split('\n\n--- Corrective Guidance ---')[0];

  return (
    <GlobalModal
      isOpen={true}
      title={
        <div>
          <div className="text-sm font-bold uppercase">Generation Failed</div>
          <div className="text-xs text-zinc-400 font-normal">Step <span className="text-red-400">{project.failedStep}</span> encountered an error.</div>
        </div>
      }
      icon={
        <div className="bg-[#ef4444]/10 p-2 rounded-lg border border-[#ef4444]/20 mr-2">
          <AlertTriangle className="w-6 h-6 text-[#f87171]" />
        </div>
      }
      footer={
        <>
          <button type="button" onClick={onCancel} className="text-[#a1a1aa] hover:text-[#fff] text-sm font-medium transition-colors px-4 py-2">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!guidance.trim()}
            className="bg-white hover:bg-[#e4e4e7] text-black px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-white/10 transition-all flex items-center gap-2 disabled:bg-[#3f3f46] disabled:text-[#a1a1aa] disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Zap className="w-4 h-4" />
            Retry with Guidance
          </button>
        </>
      }
      maxWidth="32rem"
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#a1a1aa] uppercase tracking-wider mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Last Input
          </h3>
          <p className="text-sm bg-[#27272a]/50 border border-[#3f3f46] p-3 rounded-lg max-h-24 overflow-y-auto">
            {originalPrompt}
          </p>
        </div>

        <div>
           <label htmlFor="guidance" className="block text-sm font-medium text-[#d4d4d8] mb-2">
             Provide corrective guidance
           </label>
           <textarea
             id="guidance"
             name="guidance"
             rows={4}
             value={guidance}
             onChange={(e) => setGuidance(e.target.value)}
             className="w-full bg-[#27272a] border border-[#3f3f46] text-white rounded-lg p-2 focus:ring-2 focus:ring-white focus:border-transparent outline-none transition-all"
             placeholder="e.g., 'Make the casing metallic silver, not black.' or 'The circuit diagram is missing a power regulator.'"
             autoFocus
           />
        </div>
      </form>
    </GlobalModal>
  );
};

export default RetryDialog;
