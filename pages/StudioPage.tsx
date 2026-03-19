import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectSidebar from '../components/ProjectSidebar';
import DesignInput from '../components/DesignInput';
import ParameterDialog from '../components/ParameterDialog';
import RetryDialog from '../components/RetryDialog';
import LandingPage from '../components/LandingPage';
import FileMenuBar from '../components/MenuBar';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import ProjectView from '../components/ProjectView';
import { DesignProject, DesignStatus, HardwareSpec, AgentLog } from '../types';
import { analyzeUserIntent, getAnswerFromSpec, generateHardwareSpecs, generateProductRenderImage, generateProductExplodedViewImage, generateCircuitDiagramImage, generatePcbLayoutImage, generateOpenScadCode, generateStlFile, generateSkidlCode, runCircuitSimulation, rerunCircuitSimulation } from '../services/gemini';
import { AlertCircle } from 'lucide-react';
import { useAutoSave, loadStateFromStorage } from '../hooks/useAutoSave';
import { useAuth } from '../contexts/AuthContext';

// FIX: Correctly check for crypto.randomUUID as a function to prevent runtime errors
// if it's defined but not a function. This could happen in some environments and
// would lead to a "not callable" error on a string.
const generateId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

const PROHIBITED_KEYWORDS = [
  'weapon', 'gun', 'firearm', 'pistol', 'rifle', 'shotgun', 'revolver',
  'missile', 'bomb', 'explosive', 'grenade', 'knife', 'blade', 'sword',
  'dagger', 'munition', 'ammunition', 'cartridge', 'bullet', 'ordnance',
  'military-grade', 'itar', 'export controlled', 'classified'
];

const isPromptProhibited = (prompt: string): boolean => {
  const lowerCasePrompt = prompt.toLowerCase();
  return PROHIBITED_KEYWORDS.some(keyword => lowerCasePrompt.includes(keyword));
};

const StudioPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [projects, setProjects] = useState<DesignProject[]>(() => loadStateFromStorage().projects);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>(() => loadStateFromStorage().logs);
  const [validationState, setValidationState] = useState<{ missingParams: string[]; prompt: string; } | null>(null);
  const [retryState, setRetryState] = useState<DesignProject | null>(null);
  const [triggerHierarchyView, setTriggerHierarchyView] = useState<string | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [alonPanelWidth, setAlonPanelWidth] = useState(400);
  const isResizing = useRef(false);
  const dragStartX = useRef(0);
  const startWidth = useRef(0);
  const hasInitiallyLoaded = useRef(false);

  useAutoSave(projects, agentLogs);

  useEffect(() => {
    if (!hasInitiallyLoaded.current && !projectId && projects.length > 0) {
      const mostRecentProject = [...projects].sort((a, b) => b.createdAt - a.createdAt)[0];
      if (mostRecentProject) {
        navigate(`/studio/${mostRecentProject.id}`, { replace: true });
        hasInitiallyLoaded.current = true;
        return;
      }
    }
    hasInitiallyLoaded.current = true;

    setActiveProjectId(projectId || null);
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project?.specs) {
        setTriggerHierarchyView(projectId);
      }
    }
  }, [projectId, projects, navigate]);

  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);
  const isGenerating = useMemo(() => projects.some(p => p.status.startsWith('GENERATING_')), [projects]);

  const addLog = useCallback((log: Omit<AgentLog, 'id' | 'timestamp'>) => {
    setAgentLogs(prev => [{ ...log, id: generateId(), timestamp: Date.now() }, ...prev]);
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const dx = e.clientX - dragStartX.current;
    const newWidth = startWidth.current - dx;
    const mainPanel = document.querySelector('main');
    const maxWidth = mainPanel ? mainPanel.clientWidth - 100 : 800;
    const clampedWidth = Math.max(300, Math.min(maxWidth, newWidth));
    setAlonPanelWidth(clampedWidth);
  }, []);
  
  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    dragStartX.current = e.clientX;
    startWidth.current = alonPanelWidth;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [alonPanelWidth, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleNewProject = () => {
    const newProjectId = generateId();
    const newProject: DesignProject = {
      id: newProjectId,
      name: `Project_${projects.length + 1}`,
      prompt: "",
      createdAt: Date.now(),
      specs: null,
      assetUrls: null,
      simulationData: null,
      openScadCode: null,
      status: DesignStatus.IDLE,
      isConstrained: false,
      circuitComponents: null,
    };
    setProjects(prev => [newProject, ...prev]);
    navigate(`/studio/${newProjectId}`);
  };

  const handleRenameProject = (id: string, newName: string) => {
    let oldName = '';
    setProjects(prevProjects => prevProjects.map(p => {
      if (p.id === id) {
        oldName = p.name;
        return { ...p, name: newName };
      }
      return p;
    }));
    addLog({ content: `Project renamed from "${oldName}" to "${newName}"`, type: 'output', projectId: id });
  };

  const handleUpdateProjectConstraint = (projectId: string, isConstrained: boolean) => {
    setProjects(prevProjects => prevProjects.map(p => {
      if (p.id === projectId) {
        return { ...p, isConstrained };
      }
      return p;
    }));
    addLog({ content: `Design mode set to: ${isConstrained ? 'Constrained' : 'Unconstrained'}`, type: 'output', projectId });
  };
  
  const runFullGenerationFlow = useCallback(async (prompt: string, projectId: string, startStep: DesignStatus = DesignStatus.GENERATING_SPECS, previousSpecs: HardwareSpec | null = null) => {
    let currentStep = startStep;
    if (startStep === DesignStatus.GENERATING_SPECS) {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assetUrls: null, simulationData: null, openScadCode: null, circuitComponents: null, failedStep: null } : p));
    }
    setError(null);
    try {
      let specs = previousSpecs;
      let openScadCode = projects.find(p => p.id === projectId)?.openScadCode || null;
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        throw new Error("Project not found during generation flow.");
      }

      if (currentStep === DesignStatus.GENERATING_SPECS) {
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: DesignStatus.GENERATING_SPECS, prompt } : p));
        specs = await generateHardwareSpecs(prompt, previousSpecs, project.name);
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, specs } : p));
        addLog({ content: `Successfully generated specs for: ${specs.productName}`, type: 'output', projectId });
        currentStep = DesignStatus.GENERATING_RENDER;
      }
      if (!specs) throw new Error("Specifications are missing.");
      const hasElectronics = specs.bom.some(item => item.type.toLowerCase() === 'electronic');
      
      const pipeline: DesignStatus[] = [
        DesignStatus.GENERATING_RENDER, 
        DesignStatus.GENERATING_EXPLODED_VIEW, 
        ...(hasElectronics ? [
            DesignStatus.GENERATING_CIRCUIT, 
            DesignStatus.GENERATING_PCB,
            DesignStatus.GENERATING_SIMULATION
        ] : []), 
        DesignStatus.GENERATING_OPENSCAD,
        DesignStatus.GENERATING_STL
      ];
      
      const startIndex = pipeline.indexOf(currentStep);

      for (let i = startIndex; i < pipeline.length; i++) {
        currentStep = pipeline[i];
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: currentStep } : p));
        
        let asset: string | null = null;
        let assetKey: keyof NonNullable<DesignProject['assetUrls']> | null = null;

        switch (currentStep) {
          case DesignStatus.GENERATING_RENDER: asset = await generateProductRenderImage(prompt, specs); assetKey = 'rendered'; break;
          case DesignStatus.GENERATING_EXPLODED_VIEW: asset = await generateProductExplodedViewImage(prompt, specs); assetKey = 'exploded'; break;
          case DesignStatus.GENERATING_CIRCUIT: 
                const circuitData = await generateCircuitDiagramImage(specs);
                setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assetUrls: { ...(p.assetUrls || { rendered: null, exploded: null, circuit: null, pcb: null, stl: null }), circuit: circuitData.svgDataUrl }, circuitComponents: circuitData.components } : p));
                break;
          case DesignStatus.GENERATING_PCB: asset = await generatePcbLayoutImage(prompt, specs); assetKey = 'pcb'; break;
          case DesignStatus.GENERATING_SIMULATION:
                const skidlCode = await generateSkidlCode(specs);
                const simulationResult = await runCircuitSimulation(skidlCode, specs);
                if (simulationResult) {
                    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, simulationData: simulationResult } : p));
                }
                break;
          case DesignStatus.GENERATING_OPENSCAD:
                openScadCode = await generateOpenScadCode(specs);
                setProjects(prev => prev.map(p => p.id === projectId ? { ...p, openScadCode } : p));
                break;
          case DesignStatus.GENERATING_STL: 
                if (!openScadCode) throw new Error("OpenSCAD code not generated yet.");
                asset = await generateStlFile(specs, openScadCode); 
                assetKey = 'stl'; 
                break;
        }

        if (assetKey && asset) {
          setProjects(prev => prev.map(p => p.id === projectId ? { ...p, assetUrls: { ...(p.assetUrls || { rendered: null, exploded: null, circuit: null, pcb: null, stl: null }), [assetKey]: asset } } : p));
        }
      }

      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: DesignStatus.COMPLETED } : p));
      setTriggerHierarchyView(projectId);
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred.";
      setError(msg);
      addLog({ content: `Error: ${msg}`, type: 'error', projectId });
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: DesignStatus.ERROR, failedStep: currentStep } : p));
    }
  }, [addLog, projects]);

  const handleCreateDesign = useCallback(async (prompt: string) => {
    if (!activeProjectId) return;
    const project = projects.find(p => p.id === activeProjectId);
    if (!project) return;
    addLog({ content: prompt, type: 'input', projectId: activeProjectId });
    setError(null);

    if (isPromptProhibited(prompt)) {
      const errorMessage = "Design request rejected. The design of weapons or hardware that may require a license is prohibited. Please focus on electromechanical components, electronic circuits, or robotic hardware.";
      setError(errorMessage);
      addLog({ content: errorMessage, type: 'error', projectId: activeProjectId });
      setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, status: DesignStatus.ERROR } : p));
      return;
    }
    
    try {
      const analysis = await analyzeUserIntent(prompt, project.specs);
      switch (analysis.intent) {
        case 'QUESTION':
          if (!project.specs) {
            addLog({ content: "I can't answer until a design is generated.", type: 'output', projectId: activeProjectId });
            return;
          }
          const answer = await getAnswerFromSpec(prompt, project.specs);
          addLog({ content: answer, type: 'output', projectId: activeProjectId });
          break;
        case 'MODIFICATION':
        case 'NEW_DESIGN':
          setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, prompt } : p));
          if (analysis.isTooBroad) {
            const reason = `Prompt rejected: Too broad. Reason: ${analysis.reason}`;
            setError(reason); addLog({ content: reason, type: 'error', projectId: activeProjectId });
            return;
          }
          if (!analysis.isSufficient && analysis.missingParams?.length) {
            if (project.isConstrained) {
              setValidationState({ missingParams: analysis.missingParams, prompt });
              return;
            }
            addLog({ content: `Unconstrained: Alon will assume values for: ${analysis.missingParams.join(', ')}.`, type: 'output', projectId: activeProjectId });
          }
          await runFullGenerationFlow(prompt, activeProjectId, DesignStatus.GENERATING_SPECS, project.specs);
          break;
      }
    } catch (err: any) {
      const msg = err.message || "An error occurred during analysis.";
      setError(msg);
      addLog({ content: `Error: ${msg}`, type: 'error', projectId: activeProjectId });
      setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, status: DesignStatus.ERROR } : p));
    }
  }, [activeProjectId, projects, addLog, runFullGenerationFlow]);

  const handleRerunSimulation = useCallback(async (modification: string) => {
    if (!activeProjectId || !activeProject?.simulationData?.skidlCode || !activeProject.specs) return;
    
    addLog({ content: `Testing circuit modification: ${modification}`, type: 'input', projectId: activeProjectId });

    try {
      const newSimData = await rerunCircuitSimulation(
        activeProject.simulationData.skidlCode,
        activeProject.specs,
        modification
      );
      setProjects(prev => prev.map(p => 
        p.id === activeProjectId 
          ? { ...p, simulationData: { ...(p.simulationData!), analysis: newSimData.analysis, plotData: newSimData.plotData } }
          : p
      ));
      addLog({ content: `Re-simulation successful. New analysis generated.`, type: 'output', projectId: activeProjectId });
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred during re-simulation.";
      setError(msg);
      addLog({ content: `Error: ${msg}`, type: 'error', projectId: activeProjectId });
      // Re-throw to allow the component to handle its loading state
      throw err;
    }
  }, [activeProjectId, activeProject, addLog]);


  const handleRetryWithGuidance = (guidance: string) => {
    if (!retryState?.failedStep) return;
    const newPrompt = `${retryState.prompt.split('\n\n--- Corrective Guidance ---')[0]}\n\n--- Corrective Guidance ---\n${guidance}`;
    addLog({ content: `User guidance: ${guidance}`, type: 'input', projectId: retryState.id });
    setProjects(prev => prev.map(p => p.id === retryState.id ? { ...p, prompt: newPrompt } : p));
    runFullGenerationFlow(newPrompt, retryState.id, retryState.failedStep, retryState.specs);
    setRetryState(null);
  };

  const handleDownloadProject = () => {
    if (!activeProject) return;
    const dataStr = JSON.stringify(activeProject, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${activeProject.name.replace(/ /g, '_')}.dream`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addLog({ content: `Project "${activeProject.name}" downloaded to file.`, type: 'output', projectId: activeProject.id });
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const projectData = JSON.parse(text) as DesignProject;
        if (projectData.id && projectData.name && projectData.createdAt) {
          const newProject: DesignProject = { ...projectData, id: generateId(), name: `${projectData.name} (imported)` };
          setProjects(prev => [newProject, ...prev]);
          navigate(`/studio/${newProject.id}`);
          addLog({ content: `Imported project "${newProject.name}"`, type: 'output' });
        } else {
          throw new Error("Invalid project file format.");
        }
      } catch (err: any) {
        setError(`Failed to open file: ${err.message}`);
        addLog({ content: `Error opening file: ${err.message}`, type: 'error' });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleImportProject = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteProject = () => {
      if (activeProject) {
          setIsDeleteModalVisible(true);
      }
  };

  const confirmDeleteProject = () => {
      if (!activeProjectId || !activeProject) return;
      addLog({ content: `Project "${activeProject.name}" deleted.`, type: 'output' });
      setProjects(prev => prev.filter(p => p.id !== activeProjectId));
      setIsDeleteModalVisible(false);
      navigate('/studio');
  };
  
  const handleCloseProject = () => {
    if(!activeProjectId) return;
    addLog({ content: `Closed project "${activeProject?.name}"`, type: 'output', projectId: activeProjectId });
    navigate('/studio');
  };

  const handleSaveProject = () => {
    if (!activeProject) return;
    // Autosave is always on, so this action primarily provides user feedback
    // that their work is safe.
    addLog({
      content: `Project "${activeProject.name}" state saved. (Autosave is enabled)`,
      type: 'output',
      projectId: activeProject.id
    });
  };

  const handleExportStl = () => {
    if (!activeProject?.assetUrls?.stl) return;
    const blob = new Blob([activeProject.assetUrls.stl], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
    link.download = `${activeProject.name.replace(/ /g, '_')}_model_${timestamp}.stl`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addLog({ content: `Exported STL model for "${activeProject.name}".`, type: 'output', projectId: activeProject.id });
  };
  
  const handleExportImages = () => {
    if (!activeProject?.assetUrls) return;
    const assetsToExport = [{ type: 'rendered', url: activeProject.assetUrls.rendered }, { type: 'exploded', url: activeProject.assetUrls.exploded }, { type: 'circuit', url: activeProject.assetUrls.circuit }, { type: 'pcb', url: activeProject.assetUrls.pcb }];
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
    const projectName = activeProject.name.replace(/ /g, '_');
    assetsToExport.forEach(asset => {
        if (asset.url) {
            const link = document.createElement('a');
            link.href = asset.url;
            link.download = `${projectName}-${asset.type}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });
    addLog({ content: `Exported all generated images for "${activeProject.name}".`, type: 'output', projectId: activeProject.id });
  };

  const gridTemplateColumns = `256px minmax(500px, 1fr) 6px ${alonPanelWidth}px`;
  
  return (
    <>
      {validationState && activeProject && <ParameterDialog missingParams={validationState.missingParams} originalPrompt={validationState.prompt} onCancel={() => setValidationState(null)} onSubmit={(p) => { setValidationState(null); handleCreateDesign(p); }} isConstrained={activeProject.isConstrained} />}
      {retryState && <RetryDialog project={retryState} onCancel={() => setRetryState(null)} onSubmit={handleRetryWithGuidance} />}
      {isDeleteModalVisible && activeProject && <DeleteConfirmationDialog projectName={activeProject.name} onConfirm={confirmDeleteProject} onCancel={() => setIsDeleteModalVisible(false)} />}
      <div className="h-full flex flex-col">
        <FileMenuBar 
          onNewProject={handleNewProject}
          onSave={handleSaveProject}
          onImport={handleImportProject}
          onDownload={handleDownloadProject}
          onCloseProject={handleCloseProject}
          onDeleteProject={handleDeleteProject}
          onExportStl={handleExportStl}
          isStlReady={!!activeProject?.assetUrls?.stl}
          onExportImages={handleExportImages}
          areImagesExportable={!!(activeProject?.assetUrls?.rendered || activeProject?.assetUrls?.exploded)}
          onLogout={logout} 
          isProjectActive={!!activeProject} 
        />
        <div className="flex-1 grid overflow-hidden p-2 gap-2" style={{ gridTemplateColumns }}>
          <ProjectSidebar projects={projects} activeProjectId={activeProjectId} onNewProject={handleNewProject} onRenameProject={handleRenameProject} triggerHierarchyView={triggerHierarchyView} onHierarchyViewClosed={() => setTriggerHierarchyView(null)} />
          <main className="flex flex-col h-full overflow-hidden rounded-lg border border-zinc-800">
            <div className="px-4 py-2 border-b border-zinc-800 shrink-0">
                <h2 className="text-sm font-semibold text-zinc-400 font-kido tracking-wider">CANVAS</h2>
            </div>
            <div className="flex-1 w-full overflow-y-auto printable-area">
              <div className="print-only">
                <h1 className="text-xl font-bold">Project: {activeProject?.name}</h1>
                <p className="text-sm">Generated on: {new Date().toLocaleString()}</p>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".dream" className="hidden" />
              <div className="max-w-7xl mx-auto px-8 py-6">
                {error && !isGenerating && <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-start gap-3 text-red-400"><AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /><div><p className="font-bold">An Error Occurred</p><p>{error}</p></div></div>}
                {!activeProject ? <LandingPage onNewProject={handleNewProject} /> : (
                  <ProjectView 
                    // FIX: Changed 'project' to 'activeProject' to pass the correct project object.
                    project={activeProject} 
                    isGenerating={isGenerating} 
                    onRetry={setRetryState} 
                    onStartOver={handleCreateDesign} 
                    onRerunSimulation={handleRerunSimulation}
                  />
                )}
              </div>
            </div>
          </main>
          <div onMouseDown={handleMouseDown} className="resize-handle w-1.5 h-full cursor-col-resize bg-zinc-800 hover:bg-zinc-700 transition-colors flex-shrink-0"></div>
          <aside className="h-full overflow-hidden font-kido">
             <div className="flex flex-col h-full bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-zinc-800 shrink-0">
                    <h2 className="text-sm font-semibold text-zinc-400 tracking-wider">ALON</h2>
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                    <DesignInput onSubmit={handleCreateDesign} isGenerating={isGenerating} agentLogs={agentLogs.filter(log => !log.projectId || log.projectId === activeProjectId)} activeProject={activeProject} onUpdateProjectConstraint={handleUpdateProjectConstraint} />
                </div>
             </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default StudioPage;