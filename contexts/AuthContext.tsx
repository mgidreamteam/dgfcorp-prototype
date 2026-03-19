import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from sessionStorage to persist login across refreshes
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
      try {
        return sessionStorage.getItem('isAuthenticated') === 'true';
      } catch {
        return false;
      }
  });

  const [username, setUsername] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('username');
    } catch {
      return null;
    }
  });


  useEffect(() => {
    // Update sessionStorage whenever auth state changes
    try {
        sessionStorage.setItem('isAuthenticated', String(isAuthenticated));
        if (isAuthenticated && username) {
            sessionStorage.setItem('username', username);
        } else {
            sessionStorage.removeItem('username');
        }
    } catch (error) {
        console.error("Could not write to sessionStorage", error);
    }
  }, [isAuthenticated, username]);

  const login = (username: string, password: string): boolean => {
    const userMatch = username.match(/^dreamer([1-6])$/);
    if (userMatch) {
      const userNumber = userMatch[1];
      if (password === `dreamer${userNumber}`) {
        setIsAuthenticated(true);
        setUsername(username);
        return true;
      }
    }
    if (username === 'dev' && password === 'dev') {
        setIsAuthenticated(true);
        setUsername(username);
        return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};