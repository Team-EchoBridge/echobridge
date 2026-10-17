import React from 'react';
import ReactDOM from 'react-dom/client';
import { SpeakerPage } from './SpeakerPage.jsx';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <SpeakerPage />
    </React.StrictMode>
  );
}

