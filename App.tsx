import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import GlobalThemeWrapper from './components/GlobalThemeWrapper';
import AppRouter from './routes';
import { ProjectProvider } from './contexts/ProjectContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GlobalThemeWrapper>
          <ProjectProvider>
            <AppRouter />
          </ProjectProvider>
        </GlobalThemeWrapper>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;