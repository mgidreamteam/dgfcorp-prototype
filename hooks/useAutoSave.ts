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
      sessionStorage.setItem(PROJECT_IDS_KEY, JSON.stringify(projectIds));

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
          sessionStorage.setItem(`${PROJECT_KEY_PREFIX}${project.id}`, JSON.stringify(projectToSave));
        } catch (error) {
          if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
            console.warn(`sessionStorage quota exceeded for project "${project.name}". Saving a lite version without generated assets.`);
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
              sessionStorage.setItem(`${PROJECT_KEY_PREFIX}${project.id}`, JSON.stringify(liteProjectToSave));
            } catch (innerError) {
              console.error(`Failed to save even a lite version of project "${project.name}". It may be lost on refresh.`, innerError);
            }
          } else {
            console.error(`Failed to save project ${project.id} to sessionStorage`, error);
          }
        }
      });

      // Cleanup old projects from sessionStorage that are no longer in the state
      const currentProjectKeys = new Set(projects.map(p => `${PROJECT_KEY_PREFIX}${p.id}`));
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(PROJECT_KEY_PREFIX) && !currentProjectKeys.has(key)) {
            keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));

    } catch (error) {
        console.error("An error occurred during the project auto-save process:", error);
    }
  }, [projects]);

  useEffect(() => {
    try {
      sessionStorage.setItem(LOGS_KEY, JSON.stringify(agentLogs));
    } catch (error) {
      console.error("Failed to save agent logs to sessionStorage", error);
    }
  }, [agentLogs]);
};

export const loadStateFromStorage = (): { projects: DesignProject[], logs: AgentLog[] } => {
  try {
    const storedLogs = sessionStorage.getItem(LOGS_KEY);
    const logs: AgentLog[] = storedLogs ? JSON.parse(storedLogs) : [];

    const projectIdsJson = sessionStorage.getItem(PROJECT_IDS_KEY);
    // If new key doesn't exist, check for old key to migrate
    if (!projectIdsJson) {
      const oldProjectsData = sessionStorage.getItem('mgi-dream-projects');
      if (oldProjectsData) {
        console.log("Migrating old project data to new format.");
        const oldProjects: DesignProject[] = JSON.parse(oldProjectsData);
        const projectIds = oldProjects.map(p => p.id);
        sessionStorage.setItem(PROJECT_IDS_KEY, JSON.stringify(projectIds));
        oldProjects.forEach(p => {
          sessionStorage.setItem(`${PROJECT_KEY_PREFIX}${p.id}`, JSON.stringify(p));
        });
        sessionStorage.removeItem('mgi-dream-projects');
        return { projects: oldProjects, logs };
      }
      return { projects: [], logs: [] };
    }

    const projectIds: string[] = JSON.parse(projectIdsJson);
    const projects: DesignProject[] = projectIds.map(id => {
      try {
        const projectJson = sessionStorage.getItem(`${PROJECT_KEY_PREFIX}${id}`);
        return projectJson ? JSON.parse(projectJson) : null;
      } catch (e) {
        console.error(`Failed to parse project ${id} from sessionStorage`, e);
        return null;
      }
    }).filter((p): p is DesignProject => p !== null);

    return { projects, logs };
  } catch (error) {
    console.error("Failed to load state from sessionStorage", error);
    // On error, clear storage to prevent cycles.
    Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('mgi-dream-')) {
            sessionStorage.removeItem(key);
        }
    });
    return { projects: [], logs: [] };
  }
};