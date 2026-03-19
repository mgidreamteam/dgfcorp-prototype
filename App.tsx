import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import GlobalThemeWrapper from './components/GlobalThemeWrapper';
import AppRouter from './routes';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GlobalThemeWrapper>
          <AppRouter />
        </GlobalThemeWrapper>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;