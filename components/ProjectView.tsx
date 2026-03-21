import React from 'react';
import { DesignProject, DesignStatus } from '../types';
import AssetViewer from './AssetViewer';
import SpecViewer from './SpecViewer';
import { vendors } from '../data/vendors';
import { Loader2, RefreshCw, Eye, EyeOff, XCircle } from 'lucide-react';
import { Factory } from 'lucide-react';

interface ProjectViewProps {
  project: DesignProject;
  isGenerating: boolean;
  onRetry: (project: DesignProject) => void;
  onStartOver: (prompt: string) => void;
  onRerunSimulation: (modification: string) => Promise<void>;
}

const ProjectView: React.FC<ProjectViewProps> = ({ project, isGenerating, onRetry, onStartOver, onRerunSimulation }) => {
  const hasSpecs = !!project.specs;
  const hasElectronics = hasSpecs ? project.specs!.bom.some(i => i.type.toLowerCase().includes('electronic')) : true;
  const hasMechanical = hasSpecs ? project.specs!.bom.some(i => !i.type.toLowerCase().includes('electronic')) : true;

  const [toggles, setToggles] = React.useState({
    rendered: true,
    exploded: true,
    circuit: true,
    pcb: true
  });

  React.useEffect(() => {
    if (hasSpecs) {
      setToggles({
        rendered: hasMechanical,
        exploded: hasMechanical,
        circuit: hasElectronics,
        pcb: hasElectronics
      });
    }
  }, [hasSpecs, hasElectronics, hasMechanical]);

  const toggleView = (key: keyof typeof toggles, isApplicable: boolean) => {
    if (!isApplicable) return;
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const ToggleButton = ({ label, visibilityKey, isApplicable }: { label: string, visibilityKey: keyof typeof toggles, isApplicable: boolean }) => (
    <button 
        onClick={() => toggleView(visibilityKey, isApplicable)}
        disabled={!isApplicable}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-detail font-medium transition-all border ${
            !isApplicable 
            ? 'opacity-50 cursor-not-allowed border-zinc-800 bg-zinc-900/50 text-zinc-500' 
            : toggles[visibilityKey] 
                ? 'border-white/20 bg-white/10 text-white' 
                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
        }`}
    >
        {!isApplicable ? <XCircle className="w-3.5 h-3.5" /> : toggles[visibilityKey] ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        {label} {!isApplicable && '(N/A)'}
    </button>
  );

  return (
    <div className="flex flex-col gap-8 pb-24">
      <div className="flex flex-wrap items-center gap-3 mb-[-1rem] bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/60 no-print">
         <span className="text-detail font-bold text-zinc-500 uppercase tracking-wider mr-2">Viewport Toggles:</span>
         <ToggleButton label="Rendered CAD" visibilityKey="rendered" isApplicable={hasMechanical} />
         <ToggleButton label="Exploded CAD" visibilityKey="exploded" isApplicable={hasMechanical} />
         <ToggleButton label="Circuit Diagram" visibilityKey="circuit" isApplicable={hasElectronics} />
         <ToggleButton label="PCB Layout" visibilityKey="pcb" isApplicable={hasElectronics} />
      </div>

      <div className="asset-viewer-grid no-print">
        <AssetViewer 
          assetUrls={project.assetUrls} 
          status={project.status} 
          productName={project.specs?.productName || "Product"} 
          hasElectronics={hasElectronics}
          hasMechanical={hasMechanical}
          visibleToggles={toggles}
          circuitComponents={project.circuitComponents}
        />
      </div>

      {isGenerating && (
        <div className="mt-8 bg-zinc-900 border border-white/20 rounded-xl p-4 flex items-center gap-3 animate-pulse no-print">
          <Loader2 className="w-5 h-5 animate-spin text-white" />
          <span className="text-sm text-zinc-300">{project.status.replace(/_/g, ' ')}...</span>
        </div>
      )}

      {project.status === DesignStatus.ERROR && (
        <div className="mt-8 bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-center justify-between no-print">
          <div className="text-red-300">
            <p className="font-bold">Generation Failed</p>
            <p className="text-detail">Step: <span>{project.failedStep}</span></p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onStartOver(project.prompt.split('\n\n--- Corrective Guidance ---')[0])} 
              className="text-sm text-zinc-300 hover:text-white"
            >
              Start Over
            </button>
            <button 
              onClick={() => onRetry(project)} 
              className="bg-white/90 text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-white flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry with Guidance
            </button>
          </div>
        </div>
      )}

      {project.specs ? (
        <>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-heading font-normal text-white uppercase tracking-tighter mb-1">{project.specs.productName}</h2>
                <p className="text-zinc-500 font-normal uppercase tracking-widest text-subheading mt-1">{project.specs.tagline}</p>
              </div>
              <div className="bg-white/10 text-zinc-300 px-3 py-1 rounded-full text-micro border border-white/20">v1.0-draft</div>
            </div>
            <p className="text-body text-zinc-300 mt-4 leading-relaxed">{project.specs.description}</p>
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <h4 className="text-detail font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Factory className="w-4 h-4" />
                Manufacturing Process
              </h4>
              <p className="text-body text-zinc-300">{project.specs.manufacturingProcess}</p>
            </div>
          </div>
          <SpecViewer 
            specs={project.specs} 
            vendors={vendors} 
            simulationData={project.simulationData} 
            openScadCode={project.openScadCode}
            onRerunSimulation={onRerunSimulation}
            hasElectronics={hasElectronics}
          />
        </>
      ) : (!isGenerating && project.status !== DesignStatus.ERROR && (
        <div className="h-full flex items-center justify-center p-12 text-zinc-600 border border-dashed border-zinc-800 rounded-xl">
          <span>Waiting for specifications...</span>
        </div>
      ))}
    </div>
  );
};

export default React.memo(ProjectView);