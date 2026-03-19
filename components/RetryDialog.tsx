import React, { useState } from 'react';
import { Bot, Zap, AlertTriangle, MessageSquare } from 'lucide-react';
import { DesignProject } from '../types';

interface RetryDialogProps {
  project: DesignProject;
  onCancel: () => void;
  onSubmit: (guidance: string) => void;
}

const RetryDialog: React.FC<RetryDialogProps> = ({ project, onCancel, onSubmit }) => {
  const [guidance, setGuidance] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guidance.trim()) {
      onSubmit(guidance);
    }
  };

  const originalPrompt = project.prompt.split('\n\n--- Corrective Guidance ---')[0];

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in"
      aria-labelledby="dialog-title"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 id="dialog-title" className="text-xl font-bold text-white">Generation Failed</h2>
              <p className="text-zinc-400 text-sm">Step <span className="font-kido text-red-400">{project.failedStep}</span> encountered an error.</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Last Input
              </h3>
              <p className="text-zinc-300 text-sm bg-zinc-800/50 border border-zinc-700 p-3 rounded-lg max-h-24 overflow-y-auto font-kido">
                {originalPrompt}
              </p>
            </div>

            <div>
              <label htmlFor="guidance" className="block text-sm font-medium text-zinc-300 mb-2">
                Provide corrective guidance
              </label>
              <textarea
                id="guidance"
                name="guidance"
                rows={4}
                value={guidance}
                onChange={(e) => setGuidance(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-white focus:border-transparent outline-none transition-all font-kido"
                placeholder="e.g., 'Make the casing metallic silver, not black.' or 'The circuit diagram is missing a power regulator.'"
                autoFocus
              />
            </div>
          </div>

          <div className="p-6 bg-zinc-900/50 border-t border-zinc-800 flex justify-end items-center gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="text-zinc-400 hover:text-white text-sm font-medium transition-colors px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!guidance.trim()}
              className="bg-white hover:bg-zinc-200 text-black px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-white/10 transition-all flex items-center gap-2 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Zap className="w-4 h-4" />
              Retry with Guidance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RetryDialog;
