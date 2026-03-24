import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import GlobalThemeWrapper from './components/GlobalThemeWrapper';
import AppRouter from './routes';
import { ProjectProvider } from './contexts/ProjectContext';
import { AppErrorBoundary } from './components/AppErrorBoundary';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GlobalThemeWrapper>
          <ProjectProvider>
            <AppErrorBoundary>
              <AppRouter />
            </AppErrorBoundary>
          </ProjectProvider>
        </GlobalThemeWrapper>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;