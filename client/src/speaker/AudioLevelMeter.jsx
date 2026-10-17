import React from 'react';

/**
 * Visual audio meter displaying live microphone input level.
 *
 * @param {Object} props
 * @param {number} props.level - Audio level between 0.0 and 1.0.
 * @param {boolean} props.isActive - Whether recording is currently active.
 */
export function AudioLevelMeter({ level = 0, isActive = false }) {
  // 12 discrete segmented bars for visual clarity
  const segmentCount = 12;
  const activeCount = isActive ? Math.round(level * segmentCount) : 0;

  return (
    <div style={containerStyle} aria-label="Audio Level Meter" role="meter" aria-valuenow={Math.round(level * 100)}>
      <div style={labelStyle}>
        <span>Mic Level</span>
        <span style={percentageStyle}>{isActive ? `${Math.round(level * 100)}%` : 'Idle'}</span>
      </div>

      <div style={barWrapperStyle}>
        {Array.from({ length: segmentCount }).map((_, index) => {
          const isSegmentActive = index < activeCount;
          // Color grading: Green -> Yellow -> Red
          let segmentColor = '#22c55e'; // Green
          if (index >= 9) {
            segmentColor = '#ef4444'; // Red
          } else if (index >= 6) {
            segmentColor = '#eab308'; // Yellow
          }

          return (
            <div
              key={index}
              style={{
                ...segmentStyle,
                backgroundColor: isSegmentActive ? segmentColor : '#334155',
                opacity: isSegmentActive ? 1 : 0.35,
                boxShadow: isSegmentActive ? `0 0 6px ${segmentColor}aa` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

const containerStyle = {
  width: '100%',
  maxWidth: '320px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  userSelect: 'none',
};

const labelStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.85rem',
  color: '#94a3b8',
  fontWeight: 500,
};

const percentageStyle = {
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  color: '#e2e8f0',
};

const barWrapperStyle = {
  display: 'flex',
  gap: '4px',
  height: '14px',
  alignItems: 'center',
  background: '#1e293b',
  padding: '4px',
  borderRadius: '6px',
};

const segmentStyle = {
  flex: 1,
  height: '100%',
  borderRadius: '2px',
  transition: 'background-color 0.08s ease, opacity 0.08s ease, box-shadow 0.08s ease',
};

