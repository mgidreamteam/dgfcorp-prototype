import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Paperclip, User, Bot, AlertTriangle } from 'lucide-react';
import { AgentLog, DesignProject } from '../types';

interface DesignInputProps {
  onSubmit: (prompt: string) => void;
  isGenerating: boolean;
  agentLogs: AgentLog[];
  activeProject: DesignProject | undefined;
  onUpdateProjectConstraint: (projectId: string, isConstrained: boolean) => void;
}

const DesignInput: React.FC<DesignInputProps> = ({ onSubmit, isGenerating, agentLogs, activeProject, onUpdateProjectConstraint }) => {
  const [prompt, setPrompt] = useState('');
  const isInputDisabled = isGenerating || !activeProject;
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Populate prompt when project changes, but not during generation
    if (activeProject) {
        setPrompt(activeProject.prompt || '');
    } else {
        setPrompt('');
    }
  }, [activeProject?.id]);

  useEffect(() => {
    // Auto-scroll to the top of the logs (where the newest log appears)
    // only if the user is already at the top. This prevents disrupting
    // the user if they have scrolled down to read older logs.
    const container = logsContainerRef.current;
    if (container && container.scrollTop < 50) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [agentLogs]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isInputDisabled) {
      onSubmit(prompt);
      setPrompt(''); // Clear prompt on submit
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setPrompt(prev => prev ? `${prev}\n\n--- From ${file.name} ---\n${text}` : text);
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset file input
    }
  };

  const getLogIcon = (type: AgentLog['type']) => {
    switch (type) {
      case 'input': return <User className="w-4 h-4 text-zinc-400 shrink-0" />;
      case 'output': return <Bot className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />;
      default: return null;
    }
  }

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          rows={7}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={!activeProject ? "Create or select a project to begin..." : "Enter your input... and upload your specs from a text file"}
          className="w-full bg-zinc-900/80 border border-zinc-800 text-white placeholder-zinc-500 rounded-xl p-4 text-body focus:ring-2 focus:ring-white focus:border-transparent outline-none resize-none shadow-inner backdrop-blur-sm transition-all disabled:opacity-50"
          disabled={isInputDisabled}
        />
        <div className="mt-3 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <label htmlFor="file-upload" className={`flex items-center gap-2 text-detail transition-colors ${isInputDisabled ? 'text-zinc-600 cursor-not-allowed' : 'text-zinc-400 hover:text-white cursor-pointer'}`}>
                    <Paperclip className="w-4 h-4" />
                    <span>Upload Specs</span>
                </label>
                <input 
                    id="file-upload" 
                    type="file" 
                    className="hidden" 
                    accept=".txt,.md"
                    onChange={handleFileChange}
                    disabled={isInputDisabled}
                />
                <div className="flex items-center gap-2" title="Constrained mode requires you to specify all parameters. Unconstrained lets Alon assume them.">
                    <input
                        type="checkbox"
                        id="constrained-mode"
                        className="w-4 h-4 bg-zinc-700 border-zinc-600 rounded text-white focus:ring-white disabled:opacity-50"
                        checked={activeProject?.isConstrained ?? false}
                        onChange={e => activeProject && onUpdateProjectConstraint(activeProject.id, e.target.checked)}
                        disabled={isInputDisabled}
                    />
                    <label 
                        htmlFor="constrained-mode" 
                        className={`text-detail select-none transition-colors ${isInputDisabled ? 'text-zinc-600' : 'text-zinc-400 cursor-pointer'}`}
                    >
                        Constrained
                    </label>
                </div>
            </div>

            <button
            type="submit"
            disabled={!prompt.trim() || isInputDisabled}
            className={`p-3 rounded-lg transition-all ${
                !prompt.trim() || isInputDisabled
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10'
            }`}
            >
            {isGenerating ? (
                <Sparkles className="w-5 h-5 animate-spin" />
            ) : (
                <ArrowRight className="w-5 h-5" />
            )}
            </button>
        </div>
      </form>
      
      <div ref={logsContainerRef} className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-3 min-h-0 pt-4">
        {agentLogs.map(log => (
            <div 
                key={log.id} 
                className={`p-3 rounded-lg border text-detail animate-fade-in ${log.type === 'error' ? 'bg-red-900/20 border-red-500/20 text-red-300' : 'bg-zinc-900/50 border-zinc-800 text-zinc-300'} ${log.type === 'input' && 'bg-zinc-800/60 border-zinc-700'}`}
            >
                <div className="flex items-start gap-3">
                    {getLogIcon(log.type)}
                    <div className="flex-1 min-w-0">
                        <p className="whitespace-pre-wrap break-words">{log.content}</p>
                        <p className="text-micro text-zinc-500 mt-2 text-right">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(DesignInput);