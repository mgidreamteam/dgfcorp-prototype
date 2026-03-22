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
import { CloudProject, DesignProject, DesignStatus, HardwareSpec, AgentLog } from '../types';
import { analyzeUserIntent, getAnswerFromSpec, generateHardwareSpecs, generateProductRenderImage, generateProductExplodedViewImage, generateCircuitDiagramImage, generatePcbLayoutImage, generateOpenScadCode, generateStlFile, generateSkidlCode, runCircuitSimulation, rerunCircuitSimulation } from '../services/gemini';
import { AlertCircle, Cloud, X, CloudDownload, Trash2, Loader2 } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemePanel from '../components/ThemePanel';
import { auth, db, storage } from '../services/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import ExportStlModal from '../components/ExportStlModal';
import CloudLoadModal from '../components/CloudLoadModal';

// FIX: Correctly check for crypto.randomUUID as a function to prevent runtime errors
// if it's defined but not a function. This could happen in some environments and
// would lead to a "not callable" error on a string.
const generateId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

const PROHIBITED_KEYWORDS = [
  'weapon', 'gun', 'firearm', 'pistol', 'rifle', 'shotgun', 'revolver',
  'missile', 'bomb', 'explosive', 'grenade', 'knife', 'sword',
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
  const { dashboardTheme } = useTheme();

  const { projects, setProjects, activeProjectId, setActiveProjectId, agentLogs, addLog } = useProject();
  const [error, setError] = useState<string | null>(null);
  const [validationState, setValidationState] = useState<{ missingParams: string[]; prompt: string; } | null>(null);
  const [retryState, setRetryState] = useState<DesignProject | null>(null);
  const [triggerHierarchyView, setTriggerHierarchyView] = useState<string | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  
  // Cloud Hooks
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [cloudLoadingAction, setCloudLoadingAction] = useState<string | null>(null);
  const [isExportStlModalOpen, setIsExportStlModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [hiloPanelWidth, setHiloPanelWidth] = useState(400);
  const isResizing = useRef(false);
  const dragStartX = useRef(0);
  const startWidth = useRef(0);
  const hasInitiallyLoaded = useRef(false);

  useEffect(() => {
    if (projectId && projectId !== activeProjectId) {
      setActiveProjectId(projectId);
    } else if (!projectId && activeProjectId) {
      navigate(`/studio/${activeProjectId}`, { replace: true });
    }
  }, [projectId, activeProjectId, navigate, setActiveProjectId]);

  useEffect(() => {
    if (activeProjectId) {
      const project = projects.find(p => p.id === activeProjectId);
      if (project?.specs) {
        setTriggerHierarchyView(activeProjectId);
      }
    }
  }, [activeProjectId, projects]);

  const fetchCloudProjects = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
        const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/cloudProjects`));
        const fetched = snap.docs.map(d => d.data() as CloudProject);
        setCloudProjects(fetched);
    } catch (err) {
        console.error("Failed to sync cloud registry", err);
    }
  }, []);

  useEffect(() => {
    fetchCloudProjects();
  }, [fetchCloudProjects]);

  const cloudStorageUsed = useMemo(() => {
    return cloudProjects.reduce((acc, p) => acc + p.sizeBytes, 0);
  }, [cloudProjects]);

  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);
  const isGenerating = useMemo(() => projects.some(p => p.status.startsWith('GENERATING_')), [projects]);



  useEffect(() => {
    const handleTokens = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (!activeProjectId) return;
        const { totalTokenCount, promptTokenCount, candidatesTokenCount } = customEvent.detail;
        addLog({ 
            content: `Tokens: ${totalTokenCount} Total [${promptTokenCount} in / ${candidatesTokenCount} out]`, 
            type: 'system', 
            projectId: activeProjectId 
        });
    };
    window.addEventListener('gemini_token_usage', handleTokens);
    return () => window.removeEventListener('gemini_token_usage', handleTokens);
  }, [activeProjectId, addLog]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const dx = e.clientX - dragStartX.current;
    const newWidth = startWidth.current - dx;
    const mainPanel = document.querySelector('main');
    const maxWidth = mainPanel ? mainPanel.clientWidth - 100 : 800;
    const clampedWidth = Math.max(300, Math.min(maxWidth, newWidth));
    setHiloPanelWidth(clampedWidth);
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
    startWidth.current = hiloPanelWidth;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [hiloPanelWidth, handleMouseMove, handleMouseUp]);

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
            addLog({ content: `Unconstrained: Hilo will assume values for: ${analysis.missingParams.join(', ')}.`, type: 'output', projectId: activeProjectId });
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

  const handleSaveToCloud = async () => {
    if (!activeProject || !auth.currentUser) return;
    try {
        setIsCloudSaving(true);
        const dataStr = JSON.stringify(activeProject);
        const sizeBytes = new Blob([dataStr]).size;

        const existingProject = cloudProjects.find(p => p.id === activeProject.id);
        const newTotalSize = cloudStorageUsed - (existingProject?.sizeBytes || 0) + sizeBytes;

        const MAX_QUOTA = 50000000;
        if (newTotalSize > MAX_QUOTA) {
            throw new Error(`Storage Quota Exceeded. You have used ${(cloudStorageUsed/1000000).toFixed(2)}MB. This payload requires ${(sizeBytes/1000000).toFixed(2)}MB. Limit: 50MB.`);
        }

        const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${activeProject.id}.dream`);
        await uploadString(fileRef, dataStr, 'raw');

        const cloudMeta: CloudProject = {
            id: activeProject.id,
            name: activeProject.name,
            sizeBytes,
            uploadedAt: Date.now()
        };
        await setDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, activeProject.id), cloudMeta);
        
        addLog({ content: `Project "${activeProject.name}" synchronized with Global Storage Directory.`, type: 'output', projectId: activeProject.id });
        await fetchCloudProjects();
        window.dispatchEvent(new Event('update-cloud-quota'));
    } catch (err: any) {
        const payloadMsg = err.message || "Unknown error";
        setError(`Cloud Delivery Blocked: ${payloadMsg}`);
        addLog({ content: `Cloud Delivery Blocked: ${payloadMsg}`, type: 'error', projectId: activeProject.id });
    } finally {
        setIsCloudSaving(false);
    }
  };

  const handleDownloadFromCloud = async (cloudProj: CloudProject) => {
      if (!auth.currentUser) return;
      try {
          setCloudLoadingAction(cloudProj.id);
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}.dream`);
          const url = await getDownloadURL(fileRef);
          
          const response = await fetch(url);
          if (!response.ok) throw new Error("Failed to pull from Google Storage endpoints.");
          
          const text = await response.text();
          const projectData = JSON.parse(text) as DesignProject;
          
          // Verify struct
          if (projectData.id && projectData.name) {
              // Upsert local
              setProjects(prev => {
                  const filtered = prev.filter(p => p.id !== projectData.id);
                  return [projectData, ...filtered];
              });
              navigate(`/studio/${projectData.id}`);
              addLog({ content: `Recovered global asset "${projectData.name}" via binary stream.`, type: 'output' });
          } else {
              throw new Error("Corrupted asset architecture.");
          }
      } catch (err: any) {
          setError(`Cloud Retrieval Failed: ${err.message}`);
          addLog({ content: `Cloud Fetch Corrupt: ${err.message}`, type: 'error' });
      } finally {
          setCloudLoadingAction(null);
      }
  };

  const handleDeleteFromCloud = async (cloudProj: CloudProject) => {
      if (!auth.currentUser) return;
      try {
          setCloudLoadingAction(cloudProj.id);
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}.dream`);
          await deleteObject(fileRef);
          await deleteDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, cloudProj.id));
          addLog({ content: `Permanently unlinked "${cloudProj.name}" from the global bucket.`, type: 'output' });
          await fetchCloudProjects();
          window.dispatchEvent(new Event('update-cloud-quota'));
      } catch (err: any) {
          setError(`Cloud Purge Blocked: ${err.message}`);
      } finally {
          setCloudLoadingAction(null);
      }
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
    setActiveProjectId(null);
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
    if (!activeProject?.openScadCode) return;
    setIsExportStlModalOpen(true);
  };

  const handleConfirmStlExport = async (filename: string, vertices: number, meshSize: number, fileHandle?: any) => {
    if (!activeProject?.openScadCode || !activeProject?.specs) return;
    
    try {
        addLog({ content: `Rendering high-fidelity STL ($fn=${vertices}, $fs=${meshSize})...`, type: 'output', projectId: activeProject.id });
        
        const modifiedScad = `$fn = ${vertices};\n$fs = ${meshSize};\n\n${activeProject.openScadCode}`;
        const newStlData = await generateStlFile(activeProject.specs, modifiedScad);
        
        const blob = new Blob([newStlData], { type: 'model/stl' });
        const finalFilename = filename.endsWith('.stl') ? filename : `${filename}.stl`;

        if (fileHandle) {
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
        } else {
            // Fallback for browsers that don't support File System Access API
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = finalFilename;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
        
        addLog({ content: `Saved high-fidelity STL model.`, type: 'output', projectId: activeProject.id });
    } catch (err: any) {
        if (err.name !== 'AbortError') {
            addLog({ content: `Failed to save high-fidelity STL: ${err.message}`, type: 'error', projectId: activeProject.id });
            throw err;
        }
    }
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

  const gridTemplateColumns = `256px minmax(500px, 1fr) 6px ${hiloPanelWidth}px`;
  
  return (
    <>
      {validationState && activeProject && <ParameterDialog missingParams={validationState.missingParams} originalPrompt={validationState.prompt} onCancel={() => setValidationState(null)} onSubmit={(p) => { setValidationState(null); handleCreateDesign(p); }} isConstrained={activeProject.isConstrained} />}
      {retryState && <RetryDialog project={retryState} onCancel={() => setRetryState(null)} onSubmit={handleRetryWithGuidance} />}
      {isDeleteModalVisible && activeProject && <DeleteConfirmationDialog projectName={activeProject.name} onConfirm={confirmDeleteProject} onCancel={() => setIsDeleteModalVisible(false)} />}
      <ExportStlModal 
        isOpen={isExportStlModalOpen}
        onClose={() => setIsExportStlModalOpen(false)}
        onExport={handleConfirmStlExport}
        defaultFilename={activeProject ? `${activeProject.name.replace(/ /g, '_')}_model_${new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-')}` : 'model'}
      />
      <CloudLoadModal 
        isOpen={false} 
        onClose={() => {}} 
        projects={[]} 
        onLoad={() => {}} 
        onDelete={() => {}} 
        loadingAction={null} 
      />
      
      <div className="h-full flex flex-col gap-2 p-2">
        <ThemePanel className="w-full shrink-0">
        <FileMenuBar 
          onNewProject={handleNewProject}
          onSave={handleSaveProject}
          onImport={handleImportProject}
          onDownload={handleDownloadProject}
          onCloseProject={handleCloseProject}
          onDeleteProject={handleDeleteProject}
          onImportStl={() => alert("Import STL native mesh replacement tool launching shortly")}
          onExportStl={handleExportStl}
          isStlReady={!!activeProject?.assetUrls?.stl}
          onExportImages={handleExportImages}
          areImagesExportable={!!(activeProject?.assetUrls?.rendered || activeProject?.assetUrls?.exploded)}
          isProjectActive={!!activeProject} 
          onSaveToCloud={handleSaveToCloud}
          isCloudSaving={isCloudSaving}
          cloudStorageUsed={cloudStorageUsed}
        />
        </ThemePanel>
        <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
          <ProjectSidebar 
            projects={projects} 
            activeProjectId={activeProjectId} 
            onNewProject={handleNewProject} 
            onRenameProject={handleRenameProject} 
            triggerHierarchyView={triggerHierarchyView} 
            onHierarchyViewClosed={() => setTriggerHierarchyView(null)} 
            cloudProjects={cloudProjects}
            onLoadCloudProject={handleDownloadFromCloud}
            onDeleteCloudProject={handleDeleteFromCloud}
            cloudLoadingAction={cloudLoadingAction}
            onPrepareForSim={(project, target) => {
                if (target === 'studiosim') navigate(`/studiosim/${project.id}`);
                else if (target === 'fabflow') navigate(`/fabflow/${project.id}`);
                else if (target === 'prostudio') navigate(`/prostudio/${project.id}`);
            }}
          />
          <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10">
            <div className="px-4 py-3 border-b border-zinc-800 shrink-0 bg-transparent">
                <h2 className="text-subheading font-normal text-white uppercase tracking-tighter">CANVAS</h2>
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
          </ThemePanel>
          <div onMouseDown={handleMouseDown} className="resize-handle w-1.5 h-full cursor-col-resize bg-zinc-800 hover:bg-zinc-700 transition-colors flex-shrink-0 rounded-full"></div>
          <ThemePanel translucent className="h-full overflow-hidden relative z-10">
             <div className="flex flex-col h-full overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 shrink-0 bg-transparent">
                    <h2 className="text-subheading font-normal text-white uppercase tracking-tighter">HILO</h2>
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                    <DesignInput onSubmit={handleCreateDesign} isGenerating={isGenerating} agentLogs={agentLogs.filter(log => !log.projectId || log.projectId === activeProjectId)} activeProject={activeProject} onUpdateProjectConstraint={handleUpdateProjectConstraint} />
                </div>
             </div>
          </ThemePanel>
        </div>
      </div>
    </>
  );
};

export default StudioPage;