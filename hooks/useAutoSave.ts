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
            console.warn(`localStorage quota exceeded for project "${project.name}". Saving a lite version without generated assets.`);
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

      // Notice: Removed the aggressive garbage collection loop here.
      // This ensures that an out-of-sync React component array never deletes
      // valid `localStorage` data. Orphaned keys are cleaned natively on tab close.

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
    // Return empty arrays but DO NOT aggressively wipe storage, 
    // to protect against localized cyclic parsing errors during router transitions.
    return { projects: [], logs: [] };
  }
};