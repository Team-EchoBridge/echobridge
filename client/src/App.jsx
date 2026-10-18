import React, { useState, useEffect } from 'react';
import { SpeakerPage } from './speaker/SpeakerPage.jsx';

// Separate Listener component so hooks aren't called conditionally
function ListenerView({ roomId }) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>EchoBridge Listener</h1>
      <p>Room: <strong>{roomId}</strong></p>
      <p>Member 2 listener view mount point (<code>client/src/listener</code>)</p>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setRoute(path);
  };

  // Route matching based on docs/contracts.md:
  // - Speaker page: /speak
  // - Listener link: /join/:roomId
  if (route === '/speak' || route.startsWith('/speak')) {
    return <SpeakerPage />;
  }

  if (route.startsWith('/join/')) {
    const roomId = route.replace('/join/', '').split('/')[0];
    return <ListenerView roomId={roomId} />;
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>EchoBridge</h1>
      <p>Live speech translation (Hindi / Marathi &rarr; English)</p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button
          onClick={() => navigate('/speak')}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}
        >
          Speaker Mode (/speak)
        </button>
        <button
          onClick={() => navigate('/join/demo-room')}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}
        >
          Listener Mode (/join/demo-room)
        </button>
      </div>
    </div>
  );
}

