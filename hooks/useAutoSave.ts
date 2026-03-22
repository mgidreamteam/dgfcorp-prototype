import { useEffect } from 'react';
import { DesignProject, AgentLog, DesignStatus } from '../types';
import { storageEngine } from '../utils/storage';

const PROJECT_IDS_KEY = 'mgi-dream-project-ids';
const PROJECT_KEY_PREFIX = 'mgi-dream-project-';
const LOGS_KEY = 'mgi-dream-logs';

export const useAutoSave = (projects: DesignProject[], agentLogs: AgentLog[], isLoaded: boolean) => {
  useEffect(() => {
    if (!isLoaded) return;

    const saveProjects = async () => {
      try {
        const projectIds = projects.map(p => p.id);
        await storageEngine.setItem(PROJECT_IDS_KEY, projectIds);

        for (const project of projects) {
          try {
            let projectToSave = project;
            if (project.status.startsWith('GENERATING_')) {
              projectToSave = {
                ...project,
                status: DesignStatus.ERROR,
                failedStep: project.status,
              };
            }
            await storageEngine.setItem(`${PROJECT_KEY_PREFIX}${project.id}`, projectToSave);
          } catch (error) {
            if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
              console.warn(`IndexedDB quota exceeded for project "${project.name}". Saving a lite version without generated assets.`);
              try {
                const { assetUrls, ...liteProject } = project;
                let liteProjectToSave = liteProject;

                if (project.status.startsWith('GENERATING_')) {
                    liteProjectToSave = {
                        ...liteProject,
                        status: DesignStatus.ERROR,
                        failedStep: project.status,
                    };
                }
                await storageEngine.setItem(`${PROJECT_KEY_PREFIX}${project.id}`, liteProjectToSave);
              } catch (innerError) {
                console.error(`Failed to save even a lite version of project "${project.name}". It may be lost on refresh.`, innerError);
              }
            } else {
              console.error(`Failed to save project ${project.id} to IndexedDB`, error);
            }
          }
        }
      } catch (error) {
          console.error("An error occurred during the project auto-save process:", error);
      }
    };
    saveProjects();
  }, [projects, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    
    const saveLogs = async () => {
        try {
        await storageEngine.setItem(LOGS_KEY, agentLogs);
        } catch (error) {
        console.error("Failed to save agent logs to IndexedDB", error);
        }
    };
    saveLogs();
  }, [agentLogs, isLoaded]);
};

export const loadStateFromStorage = async (): Promise<{ projects: DesignProject[], logs: AgentLog[] }> => {
  try {
    const logs = await storageEngine.getItem(LOGS_KEY) || [];

    const projectIds = await storageEngine.getItem(PROJECT_IDS_KEY);
    
    // Migration: if IndexedDB doesn't have project IDs, port them smoothly from pure legacy localStorage
    if (!projectIds) {
      const legacyIdJson = localStorage.getItem(PROJECT_IDS_KEY);
      if (legacyIdJson) {
          console.log("Migrating from legacy localStorage to IndexedDB");
          const legacyIds: string[] = JSON.parse(legacyIdJson);
          const migratedProjects: DesignProject[] = [];
          
          for (const id of legacyIds) {
              const projJson = localStorage.getItem(`${PROJECT_KEY_PREFIX}${id}`);
              if (projJson) {
                  const proj = JSON.parse(projJson);
                  migratedProjects.push(proj);
                  await storageEngine.setItem(`${PROJECT_KEY_PREFIX}${id}`, proj);
              }
          }
          await storageEngine.setItem(PROJECT_IDS_KEY, legacyIds);
          
          // DO NOT delete localStorage to keep it available as fallback if user downgrades
          return { projects: migratedProjects, logs };
      }
      return { projects: [], logs };
    }

    const projects: DesignProject[] = [];
    for (const id of projectIds) {
      try {
        const project = await storageEngine.getItem(`${PROJECT_KEY_PREFIX}${id}`);
        if (project) projects.push(project);
      } catch (e) {
        console.error(`Failed to parse project ${id} from IndexedDB`, e);
      }
    }

    return { projects, logs };
  } catch (error) {
    console.error("Failed to load state from IndexedDB", error);
    return { projects: [], logs: [] };
  }
};