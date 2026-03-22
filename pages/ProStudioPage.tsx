import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectSidebar from '../components/ProjectSidebar';
import FileMenuBar from '../components/MenuBar';
import { CloudProject, DesignProject, AgentLog } from '../types';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import ThemePanel from '../components/ThemePanel';
import { auth, db, storage } from '../services/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, getDownloadURL, deleteObject, uploadString } from 'firebase/storage';
import CloudLoadModal from '../components/CloudLoadModal';
import { Wrench } from 'lucide-react';

const ProStudioPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { projects, setProjects, activeProjectId, setActiveProjectId } = useProject();
  
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [cloudLoadingAction, setCloudLoadingAction] = useState<string | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);

  const [hiloPanelWidth, setHiloPanelWidth] = useState(400);

  useEffect(() => {
    if (projectId && projectId !== activeProjectId) {
        const projectExists = projects.some(p => p.id === projectId);
        if (projectExists) {
            setActiveProjectId(projectId);
        } else {
            alert("The requested project could not be found locally. It may have been deleted, corrupted, or not synchronized. Opening a blank workspace.");
            navigate('/prostudio', { replace: true });
        }
    } else if (!projectId && activeProjectId) {
      navigate(`/prostudio/${activeProjectId}`, { replace: true });
    }
  }, [projectId, activeProjectId, projects, navigate, setActiveProjectId]);

  const fetchCloudProjects = async () => {
    if (!auth.currentUser) return;
    try {
        const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/cloudProjects`));
        setCloudProjects(snap.docs.map(d => d.data() as CloudProject));
    } catch (err) {
        console.error("Failed to sync cloud registry", err);
    }
  };

  const handleCloudModalOpen = () => {
      fetchCloudProjects();
      setIsCloudModalOpen(true);
  };

  useEffect(() => {
    fetchCloudProjects();
  }, []);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const cloudStorageUsed = cloudProjects.reduce((acc, p) => acc + p.sizeBytes, 0);

  const handleSaveToCloud = async () => {
    if (!activeProject || !auth.currentUser) return;
    try {
        setIsCloudSaving(true);
        const dataStr = JSON.stringify(activeProject);
        const sizeBytes = new Blob([dataStr]).size;
        
        const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${activeProject.id}.dream`);
        await uploadString(fileRef, dataStr, 'raw');

        const cloudMeta: CloudProject = {
            id: activeProject.id,
            name: activeProject.name,
            sizeBytes,
            uploadedAt: Date.now()
        };
        await setDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, activeProject.id), cloudMeta);
        
        await fetchCloudProjects();
        window.dispatchEvent(new Event('update-cloud-quota'));
    } catch (err: any) {
        alert(`Cloud Delivery Blocked: ${err.message}`);
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
          const text = await response.text();
          const projectData = JSON.parse(text) as DesignProject;
          
          if (projectData.id && projectData.name) {
              setProjects(prev => {
                  const filtered = prev.filter(p => p.id !== projectData.id);
                  return [projectData, ...filtered];
              });
              navigate(`/prostudio/${projectData.id}`);
              setIsCloudModalOpen(false);
          }
      } catch (err: any) {
          alert(`Cloud Retrieval Failed: ${err.message}`);
      } finally {
          setCloudLoadingAction(null);
      }
  };

  const handleDeleteFromCloud = async (cloudProj: CloudProject) => {
      if (!auth.currentUser) return;
      try {
          if (!window.confirm("Delete cloud asset permanently?")) return;
          setCloudLoadingAction(cloudProj.id);
          const fileRef = ref(storage, `users/${auth.currentUser.uid}/projects/${cloudProj.id}.dream`);
          await deleteObject(fileRef);
          await deleteDoc(doc(db, `users/${auth.currentUser.uid}/cloudProjects`, cloudProj.id));
          await fetchCloudProjects();
          window.dispatchEvent(new Event('update-cloud-quota'));
      } catch (err: any) {
          alert(`Cloud Purge Blocked: ${err.message}`);
      } finally {
          setCloudLoadingAction(null);
      }
  };

  const gridTemplateColumns = `256px minmax(500px, 1fr) 6px ${hiloPanelWidth}px`;
  
  return (
    <div className="h-full flex flex-col gap-2 p-2 relative bg-black/90">
      <ThemePanel className="w-full shrink-0 border border-blue-500/20 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)] text-blue-400">
        <FileMenuBar 
          onNewProject={() => navigate('/prostudio')}
          onSave={() => {}}
          onImport={() => {}}
          onDownload={() => {}}
          onCloseProject={() => navigate('/prostudio')}
          onDeleteProject={() => {
              if(!activeProject || !window.confirm("Delete local project?")) return;
              setProjects(prev => prev.filter(p => p.id !== activeProject.id));
              navigate('/prostudio');
          }}
          onImportStl={() => alert("Import STL native mesh replacement tool launching shortly")}
          onExportStl={() => {}}
          isStlReady={false}
          onExportImages={() => {}}
          areImagesExportable={false}
          isProjectActive={!!activeProject} 
          onSaveToCloud={handleSaveToCloud}
          onLoadFromCloud={handleCloudModalOpen}
          isCloudSaving={isCloudSaving}
          cloudStorageUsed={cloudStorageUsed}
        />
      </ThemePanel>
      <div className="flex-1 grid overflow-hidden gap-2" style={{ gridTemplateColumns }}>
        
        {/* Project Registry Sidebar */}
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-md rounded-lg overflow-hidden border border-zinc-800/80">
            <ProjectSidebar 
                projects={projects} 
                activeProjectId={activeProjectId} 
                onNewProject={() => navigate('/studio')} 
                baseRoute="/prostudio"
                onRenameProject={() => {}} 
                cloudProjects={cloudProjects}
                onLoadFromCloud={handleDownloadFromCloud}
                onDeleteFromCloud={handleDeleteFromCloud}
                onPrepareForSim={(project, target) => {
                    if (target === 'studiosim') navigate(`/studiosim/${project.id}`);
                    else if (target === 'fabflow') navigate(`/fabflow/${project.id}`);
                }}
            />
        </div>

        <ThemePanel translucent className="flex flex-col h-full overflow-hidden relative z-10 border border-blue-500/10 shadow-[inset_0_0_50px_rgba(59,130,246,0.02)]">
          <div className="px-4 py-3 border-b border-zinc-800 shrink-0 bg-black/40">
              <h2 className="text-subheading font-normal text-blue-400 uppercase tracking-tighter flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> FREECAD EDITOR
              </h2>
          </div>
          <div className="flex-1 w-full bg-[#09090b] relative flex items-center justify-center">
               <div className="max-w-lg text-center p-8 border border-blue-900/30 bg-blue-950/10 rounded-2xl shadow-2xl">
                   <div className="w-16 h-16 bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-blue-800/50">
                       <Wrench className="w-8 h-8" />
                   </div>
                   <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">ProStudio Environment</h3>
                   <p className="text-blue-200/60 leading-relaxed text-sm mb-6">
                       FreeCAD python bindings and CAD modeling pipelines are currently under construction. This workspace will serve as the rigorous engineering layer bridging the agentic pipeline with raw topological capabilities.
                   </p>
                   <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900/20 text-blue-400 rounded-lg text-xs font-bold tracking-widest uppercase border border-blue-800/30">
                       <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div> Initialization Pending...
                   </div>
               </div>
          </div>
        </ThemePanel>

        <div className="resize-handle w-1.5 h-full bg-zinc-800 flex-shrink-0 rounded-full"></div>
        
        <ThemePanel translucent className="h-full overflow-hidden relative z-10">
           <div className="flex flex-col h-full overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 shrink-0 bg-transparent text-right">
                  <h2 className="text-subheading font-normal text-zinc-500 uppercase tracking-tighter">PYTHON CONSOLE</h2>
              </div>
              <div className="flex-1 p-4 overflow-y-auto bg-black/80 font-mono text-xs text-zinc-400 space-y-2">
                  <p className="text-blue-400">&gt; Import FreeCAD</p>
                  <p className="text-zinc-500">FreeCAD 0.21.2 loaded gracefully...</p>
                  <p className="text-blue-400">&gt; Import Part</p>
                  <p className="text-zinc-500">Awaiting topology commands...</p>
              </div>
           </div>
        </ThemePanel>

      </div>
    </div>
  );
};

export default ProStudioPage;
