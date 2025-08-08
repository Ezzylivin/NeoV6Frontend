// File: src/context/useAuth.js
import { useContext } from 'react';
import ( myAuthContext }  from '../context/AuthProvider';

export const useAuth = () => {
  const context = useContext(myAuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
