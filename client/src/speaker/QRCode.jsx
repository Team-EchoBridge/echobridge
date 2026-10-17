import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * QR code component wrapping qrcode.react.
 * @param {string} props.text - The join URL to encode.
 * @param {number} [props.size=180] - Width and height in pixels.
 * @param {string} [props.bgColor='#ffffff'] - Background colour.
 * @param {string} [props.fgColor='#0f172a'] - Module colour.
 */
export function QRCode({ text, size = 180, bgColor = '#ffffff', fgColor = '#0f172a' }) {
  if (!text) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: bgColor,
          color: '#64748b',
          fontSize: '0.8rem',
          borderRadius: '8px',
        }}
      >
        Invalid Link
      </div>
    );
  }

  return (
    <QRCodeSVG
      value={text}
      size={size}
      bgColor={bgColor}
      fgColor={fgColor}
      level="M"
      style={{ display: 'block', borderRadius: '8px' }}
    />
  );
}

export default QRCode;