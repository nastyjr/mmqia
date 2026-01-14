import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // MOCK USER FOR DEVELOPMENT/BYPASS
  const MOCK_USER: User = {
    email: 'admin@sistema.cl',
    name: 'Administrador',
    token: 'mock-token-123'
  };

  // Always return the mock user and not loading
  const user = MOCK_USER;
  const loading = false;

  const logout = async () => {
    // No-op or reload page to simulate logout if needed, but for now we just stay logged in
    console.log("Logout disabled in bypass mode");
    // window.location.reload(); 
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
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
