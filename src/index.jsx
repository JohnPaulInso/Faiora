import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// LABEL: INDEX — Short Summary: Entry point for the React application, mounting the App component to the DOM
const root = ReactDOM.createRoot(document.getElementById('faiora_react_root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
