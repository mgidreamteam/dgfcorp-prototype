import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { DesignProject, AgentLog } from '../types';
import { useAutoSave, loadStateFromStorage } from '../hooks/useAutoSave';

interface ProjectContextType {
  projects: DesignProject[];
  setProjects: React.Dispatch<React.SetStateAction<DesignProject[]>>;
  activeProjectId: string | null;
  setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  agentLogs: AgentLog[];
  setAgentLogs: React.Dispatch<React.SetStateAction<AgentLog[]>>;
  addLog: (log: Omit<AgentLog, 'id' | 'timestamp'>) => void;
  updateProjectField: (projectId: string, fieldPath: string, value: any) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Helper for generating IDs consistently
const generateId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') 
  ? crypto.randomUUID() 
  : Math.random().toString(36).substring(2) + Date.now().toString(36);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [projects, setProjects] = useState<DesignProject[]>([]);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
        const initialState = await loadStateFromStorage();
        setProjects(initialState.projects);
        setAgentLogs(initialState.logs);
        
        const lastActiveId = localStorage.getItem('lastActiveStudioProjectId');
        if (lastActiveId && initialState.projects.some(p => p.id === lastActiveId)) {
            setActiveProjectId(lastActiveId);
        }
        
        setIsLoaded(true);
    };
    init();
  }, []);

  useAutoSave(projects, agentLogs, isLoaded);

  // Sync activeProjectId to localStorage transparently
  useEffect(() => {
    if (!isLoaded) return;
    if (activeProjectId) {
      localStorage.setItem('lastActiveStudioProjectId', activeProjectId);
    } else {
      localStorage.removeItem('lastActiveStudioProjectId');
    }
  }, [activeProjectId, isLoaded]);

  const addLog = useCallback((log: Omit<AgentLog, 'id' | 'timestamp'>) => {
    setAgentLogs(prev => [{ ...log, id: generateId(), timestamp: Date.now() }, ...prev]);
  }, []);

  const updateProjectField = useCallback((projectId: string, fieldPath: string, value: any) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      
      if (fieldPath === 'specs.description' && p.specs) {
          return { ...p, specs: { ...p.specs, description: value } };
      }
      if (fieldPath === 'openScadCode') {
          return { ...p, openScadCode: value };
      }
      return { ...p, [fieldPath]: value };
    }));
  }, []);

  if (!isLoaded) return null; // Avoid flashing empty state

  return (
    <ProjectContext.Provider value={{
      projects,
      setProjects,
      activeProjectId,
      setActiveProjectId,
      agentLogs,
      setAgentLogs,
      addLog,
      updateProjectField
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
