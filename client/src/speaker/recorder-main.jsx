import React from 'react';
import ReactDOM from 'react-dom/client';
import { PhraseRecorder } from './PhraseRecorder.jsx';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <PhraseRecorder />
    </React.StrictMode>
  );
}

