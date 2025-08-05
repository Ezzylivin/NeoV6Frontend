import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';

// --- 1. Create the Context ---
// This is the "intercom system" we'll use to broadcast auth state.
const AuthContext = createContext();


const { user, token, login, logout } = useAuth();

// --- 2. Create the AuthProvider Component ---
// This is the "security guard" who manages the auth state and uses the intercom.
export const AuthProvider = ({ children }) => {
  // Read the initial token from localStorage only once when the component first loads.
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // To handle the initial auth status check

  // This effect hook runs whenever the 'token' state changes.
  useEffect(() => {
    if (token) {
      try {
        // Decode the token to read its payload (data)
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000; // Get current time in seconds

        // Check if the token has expired
        if (decodedToken.exp < currentTime) {
          console.log("Token has expired.");
          logout(); // Log out if expired
        } else {
          // If token is valid, set the user state with data from the token
          setUser({
            id: decodedToken.id, // Or _id, sub, etc., depending on your backend
            role: decodedToken.role,
            email: decodedToken.email
          });
        }
      } catch (error) {
        // If the token is malformed or invalid, an error will be thrown
        console.error("Invalid token found:", error);
        logout(); // Log out if the token is bad
      }
    }
    // Set loading to false after the initial check is complete
    setIsLoading(false);
  }, [token]);

  // Function to be called from the Login page
  const login = (newToken) => {
    // Store the token in localStorage to keep the user logged in on page refresh
    localStorage.setItem('token', newToken);
    // Update the token state, which will trigger the useEffect hook
    setToken(newToken);
  };

  // Function to log the user out
  const logout = () => {
    // Remove the token from localStorage
    localStorage.removeItem('token');
    // Nullify the token and user states
    setToken(null);
    setUser(null);
  };

  // The value object contains the auth state and functions to be shared via context
  const contextValue = {
    token,
    user,
    isLoading,
    login,
    logout,
  };

  // The Provider component makes the contextValue available to all its children
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// --- 3. Create the Custom Hook ---
// This is the clean and easy way for components to get the auth state.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // This error is helpful for debugging. It means you forgot to wrap your
    // component tree with the AuthProvider.
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
