import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, roles = [] }) => {


  if (!user) return <Navigate to="/login" replace />;

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;
