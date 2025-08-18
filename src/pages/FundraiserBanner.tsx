import React from 'react';
import { useDarkMode } from '../DarkModeContext';

export default function FundraiserBanner() {
  const { darkMode } = useDarkMode();
  const today = new Date();
  const endDate = new Date('2025-10-01');

  if (today > endDate) return null; // Hide after Oct 1

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        backgroundColor: '#4B0082', // deep purple
        color: '#fff',
        textAlign: 'center',
        padding: '1rem',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      🏃‍♀️ I’m running to fight Alzheimer’s!{' '}
      <a
        href="https://act.alz.org/goto/claire_runs_chicago"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          marginLeft: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#FFD700', // gold button
          color: '#000',
          borderRadius: '6px',
          fontWeight: 'bold',
          textDecoration: 'none',
          animation: 'pulse 1.5s infinite',
        }}
      >
        💜 Donate Now
      </a>

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}
      </style>
    </div>
  );
}
