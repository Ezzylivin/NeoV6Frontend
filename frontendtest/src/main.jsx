// File: src/main.jsx (Corrected and Final)

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Use a default import (no curly braces)
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

// This file's only job is to render the App component.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
