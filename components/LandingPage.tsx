import React from 'react';
import { ArrowRight, DraftingCompass } from 'lucide-react';

interface LandingPageProps {
  onNewProject: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNewProject }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in-up p-8">
        <div className="inline-flex p-4 bg-white/5 rounded-full mb-6 ring-1 ring-white/10">
            <DraftingCompass className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-panel-title font-bold text-white tracking-tight">Studio is Empty</h2>
        <p className="mt-4 text-body text-zinc-400 max-w-xl mx-auto">
          Select a project from the sidebar to view its details, or create a new project to start designing with HELO.
        </p>
        <button 
            onClick={onNewProject} 
            className="mt-8 inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-bold text-body shadow-lg shadow-white/10 hover:bg-zinc-200 transition-all"
        >
            Create New Project
            <ArrowRight className="w-4 h-4" />
        </button>
    </div>
  );
};

export default LandingPage;