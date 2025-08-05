import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
  if (token) {
    try {
      // Decode the token to get the payload
      const decodedToken = jwtDecode(token);

      // OPTIONAL: Check if the token has expired
      const currentTime = Date.now() / 1000; // Convert to seconds
      if (decodedToken.exp < currentTime) {
        // Token is expired, so log the user out
        logout(); // Assuming logout clears the token and user state
      } else {
        // Token is valid, set the user from the decoded payload
        // The properties (like name, role, _id) depend on what your backend puts in the token
        setUser({
          role: decodedToken.role,
          _id: decodedToken._id,
          // Add any other user data you have in the token payload
          // email: decodedToken.email,
        });
      }
    } catch (error) {
      // If the token is invalid or malformed, it will throw an error
      console.error("Invalid token:", error);
      logout(); // Log the user out if the token is bad
    }
  } else {
    // No token, so ensure user is null
    setUser(null);
  }
}, [token]); // This effect re-runs whenever the token changes
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
