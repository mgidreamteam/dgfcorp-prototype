import { useEffect } from 'react';
import { DesignProject, AgentLog, DesignStatus } from '../types';

const PROJECT_IDS_KEY = 'mgi-dream-project-ids';
const PROJECT_KEY_PREFIX = 'mgi-dream-project-';
const LOGS_KEY = 'mgi-dream-logs';

export const useAutoSave = (projects: DesignProject[], agentLogs: AgentLog[]) => {
  useEffect(() => {
    try {
      // Save the list of project IDs
      const projectIds = projects.map(p => p.id);
      localStorage.setItem(PROJECT_IDS_KEY, JSON.stringify(projectIds));

      // Save each project individually
      projects.forEach(project => {
        try {
          let projectToSave = project;
          if (project.status.startsWith('GENERATING_')) {
            projectToSave = {
              ...project,
              status: DesignStatus.ERROR,
              failedStep: project.status,
            };
          }
          localStorage.setItem(`${PROJECT_KEY_PREFIX}${project.id}`, JSON.stringify(projectToSave));
        } catch (error) {
          if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
            console.warn(`LocalStorage quota exceeded for project "${project.name}". Saving a lite version without generated assets.`);
            // If the full project save fails, try saving a "lite" version without the large asset data.
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
              localStorage.setItem(`${PROJECT_KEY_PREFIX}${project.id}`, JSON.stringify(liteProjectToSave));
            } catch (innerError) {
              console.error(`Failed to save even a lite version of project "${project.name}". It may be lost on refresh.`, innerError);
            }
          } else {
            console.error(`Failed to save project ${project.id} to localStorage`, error);
          }
        }
      });

      // Cleanup old projects from localStorage that are no longer in the state
      const currentProjectKeys = new Set(projects.map(p => `${PROJECT_KEY_PREFIX}${p.id}`));
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PROJECT_KEY_PREFIX) && !currentProjectKeys.has(key)) {
            keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

    } catch (error) {
        console.error("An error occurred during the project auto-save process:", error);
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(LOGS_KEY, JSON.stringify(agentLogs));
    } catch (error) {
      console.error("Failed to save agent logs to localStorage", error);
    }
  }, [agentLogs]);
};

export const loadStateFromStorage = (): { projects: DesignProject[], logs: AgentLog[] } => {
  try {
    const storedLogs = localStorage.getItem(LOGS_KEY);
    const logs: AgentLog[] = storedLogs ? JSON.parse(storedLogs) : [];

    const projectIdsJson = localStorage.getItem(PROJECT_IDS_KEY);
    // If new key doesn't exist, check for old key to migrate
    if (!projectIdsJson) {
      const oldProjectsData = localStorage.getItem('mgi-dream-projects');
      if (oldProjectsData) {
        console.log("Migrating old project data to new format.");
        const oldProjects: DesignProject[] = JSON.parse(oldProjectsData);
        const projectIds = oldProjects.map(p => p.id);
        localStorage.setItem(PROJECT_IDS_KEY, JSON.stringify(projectIds));
        oldProjects.forEach(p => {
          localStorage.setItem(`${PROJECT_KEY_PREFIX}${p.id}`, JSON.stringify(p));
        });
        localStorage.removeItem('mgi-dream-projects');
        return { projects: oldProjects, logs };
      }
      return { projects: [], logs: [] };
    }

    const projectIds: string[] = JSON.parse(projectIdsJson);
    const projects: DesignProject[] = projectIds.map(id => {
      try {
        const projectJson = localStorage.getItem(`${PROJECT_KEY_PREFIX}${id}`);
        return projectJson ? JSON.parse(projectJson) : null;
      } catch (e) {
        console.error(`Failed to parse project ${id} from localStorage`, e);
        return null;
      }
    }).filter((p): p is DesignProject => p !== null);

    return { projects, logs };
  } catch (error) {
    console.error("Failed to load state from localStorage", error);
    // On error, clear storage to prevent cycles.
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('mgi-dream-')) {
            localStorage.removeItem(key);
        }
    });
    return { projects: [], logs: [] };
  }
};