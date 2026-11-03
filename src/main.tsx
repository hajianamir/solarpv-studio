import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import 'leaflet/dist/leaflet.css';
import { FeatureFlagProvider } from './engine/core/FeatureFlagContext';
import { ErrorBoundary } from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FeatureFlagProvider>
        <App />
      </FeatureFlagProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
