// File: src/layouts/PublicLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';

const PublicLayout = () => {
  return (
    <div>
      {/* You could have a public-facing navbar here if you wanted */}
      <main>
        <Outlet />
      </main>
    </div>
  );
};
export default PublicLayout;
