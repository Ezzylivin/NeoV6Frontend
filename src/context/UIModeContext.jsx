import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

const UIModeContext = createContext();

export const UIModeProvider = ({ children }) => {
  // 1. Theme Mode: 'desk' (Professional) vs other themes
  const [mode, setMode] = useState(() => localStorage.getItem("uiMode") || "desk");

  // 2. Dashboard State: 'setup' (Configuring) vs 'neural' (Bot Running)
  const [activeTab, setActiveTab] = useState('setup');

  // 3. UI Toggles: Sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Persist theme mode selection and apply to DOM for CSS
  useEffect(() => {
    localStorage.setItem("uiMode", mode);
    document.body.setAttribute("data-ui-mode", mode);
  }, [mode]);

  // Memoize values to prevent unnecessary re-renders of the entire app
  const value = useMemo(() => ({ 
    mode, 
    setMode, 
    activeTab, 
    setActiveTab, 
    sidebarOpen, 
    setSidebarOpen 
  }), [mode, activeTab, sidebarOpen]);

  return (
    <UIModeContext.Provider value={value}>
      {children}
    </UIModeContext.Provider>
  );
};

export const useUIMode = () => {
  const context = useContext(UIModeContext);
  if (!context) {
    throw new Error("useUIMode must be used within a UIModeProvider");
  }
  return context;
};
