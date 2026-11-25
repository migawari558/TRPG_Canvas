import React from 'react';

export default function ScenarioBrandMark({ className }) {
  return <span className={className} aria-hidden="true">
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round">
      <path d="M16 3 27 9.5v13L16 29 5 22.5v-13Z"/>
      <path d="m16 3 4 10 7-3.5M5 9.5l15 3.5 7 9.5L11 21m-6 1.5 6-1.5 9-8m-9 8 5 8"/>
    </svg>
  </span>;
}
