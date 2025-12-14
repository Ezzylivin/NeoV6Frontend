import React, { createContext, useContext, useState, useEffect } from "react";

const UIModeContext = createContext();

export const UIModeProvider = ({ children }) => {
  // Default to 'desk' (Professional)
  const [mode, setMode] = useState(() => localStorage.getItem("uiMode") || "desk");

  // Persist mode selection
  useEffect(() => {
    localStorage.setItem("uiMode", mode);
    // Apply data attribute to body for global CSS targeting
    document.body.setAttribute("data-ui-mode", mode);
  }, [mode]);

  return (
    <UIModeContext.Provider value={{ mode, setMode }}>
      {children}
    </UIModeContext.Provider>
  );
};

export const useUIMode = () => useContext(UIModeContext);
