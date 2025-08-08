// File: src/context/useAuth.js
import { useContext } from 'react';
import { AuthCon } from '../context/AuthProvider';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
