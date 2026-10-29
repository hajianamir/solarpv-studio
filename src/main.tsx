import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { FeatureFlagProvider } from './engine/core/FeatureFlagContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <FeatureFlagProvider>
      <App />
    </FeatureFlagProvider>
  </React.StrictMode>
);

