/**
 * Nano-Banana SVG Icon Components
 *
 * Every icon is drawn with playful, rounded banana-inspired curves.
 * All icons use `currentColor` so they inherit the parent text color.
 * Default size is 1em so they sit inline with text naturally.
 */

import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const defaults = (props: IconProps): React.SVGProps<SVGSVGElement> => {
  const { size = '1em', ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    ...rest,
  };
};

/* ─── Gamepad / Logo ─── */
export function GamepadIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Banana-shaped controller body */}
      <path
        d="M4 10c0-2 1.5-4 4-4h8c2.5 0 4 2 4 4v2c0 3-2 6-5 6h-6c-3 0-5-3-5-6v-2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* D-pad */}
      <path d="M8 10v3M6.5 11.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Buttons */}
      <circle cx="15" cy="10" r="1" fill="currentColor" />
      <circle cx="17" cy="12" r="1" fill="currentColor" />
      {/* Banana accent curve */}
      <path d="M10 7c1-1 3-1 4 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Microscope / Analyze ─── */
export function MicroscopeIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Banana-curved lens tube */}
      <path
        d="M14 4c-1 0-2 .5-2 1.5v6c0 1.5-1 3-3 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Eyepiece */}
      <circle cx="14" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
      {/* Stage */}
      <path d="M7 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Base */}
      <path d="M9 17v3h6v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Banana accent */}
      <path d="M11 8c-1 .5-2 2-2 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/* ─── Simulate / Sync ─── */
export function SimulateIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Two banana-curved arrows forming a cycle */}
      <path
        d="M17 3c2.5 2 3.5 5.5 2 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M19 12l-1.5-2.5L15 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 21c-2.5-2-3.5-5.5-2-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M5 12l1.5 2.5L9 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Scales / Compare ─── */
export function ScalesIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Center post */}
      <path d="M12 4v16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Banana-curved beam */}
      <path d="M5 8c2-1 5-1.5 7-1 2-.5 5 0 7 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Left pan */}
      <path d="M4 8c0 3 1.5 4 3.5 4S11 11 11 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      {/* Right pan */}
      <path d="M13 8c0 3 1.5 4 3.5 4S20 11 20 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      {/* Base */}
      <path d="M9 20h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Folder ─── */
export function FolderIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <path
        d="M3 7c0-1.1.9-2 2-2h4l2 2h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Banana accent curve */}
      <path d="M7 12c2-1 5-1 8 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/* ─── Players / People ─── */
export function PlayersIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Person 1 */}
      <circle cx="9" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 19c0-3 2.2-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Person 2 (offset) */}
      <circle cx="16" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M13 19c0-2.5 1.5-4 3-4s3 1.5 3 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Chart / Stats ─── */
export function ChartIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Banana-curved bars */}
      <path d="M6 20v-6c0-1 .5-1.5 1-1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 20V9c0-1 .5-1.5 1-1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 20v-8c0-1 .5-1.5 1-1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Baseline */}
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Brain / Strategy ─── */
export function BrainIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Left hemisphere (banana-curved lobes) */}
      <path
        d="M12 4c-2 0-4 1-5 3s-1 4 0 6c.5 1 1 2 1.5 2.5L10 20h4l1.5-4.5c.5-.5 1-1.5 1.5-2.5 1-2 1-4 0-6s-3-3-5-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Brain folds */}
      <path d="M12 5v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9 8c1 1 2 1 3 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 9c1 1 2 1 3 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9 12c1 .8 2 .8 3 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/* ─── Key / Sign In ─── */
export function KeyIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Banana-shaped key body */}
      <circle cx="8" cy="10" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11.5 7.5L18 4l2 2-2 2-1.5-.5-1.5 1.5-1.5-.5L12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Key hole */}
      <circle cx="8" cy="10" r="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

/* ─── Sparkles / Sign Up ─── */
export function SparklesIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Main banana-star */}
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Small sparkles */}
      <path d="M19 15l.5 1.5L21 17l-1.5.5L19 19l-.5-1.5L17 17l1.5-.5L19 15z" fill="currentColor" opacity="0.6" />
      <path d="M5 16l.5 1L7 17.5l-1.5.5L5 19.5l-.5-1.5L3 17.5l1.5-.5L5 16z" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/* ─── Shield / Low Risk ─── */
export function ShieldIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <path
        d="M12 3L4 7v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V7l-8-4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Banana check mark */}
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Lightning / Medium Risk ─── */
export function LightningIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Banana-curved lightning bolt */}
      <path
        d="M13 2L5 13h5.5l-1 9L18 11h-5.5L13 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.15"
      />
    </svg>
  );
}

/* ─── Fire / High Risk ─── */
export function FireIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Banana-curved flame */}
      <path
        d="M12 22c4 0 7-3 7-7 0-3-2-5-3.5-7C14 6 13 4 13 2c0 0-1.5 2-2 4-.5 2-2 3-3 5-1.5 2-3 4-3 6 0 3 3 5 7 5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Inner flame */}
      <path
        d="M12 22c2 0 3.5-1.5 3.5-3.5 0-1.5-1-2.5-1.5-3.5-.5-1-1-2-1-3 0 0-1 1.5-1.5 2.5S10 16 10 17c0 2.5 1 5 2 5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </svg>
  );
}

/* ─── Book / Real-World ─── */
export function BookIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Book body with banana spine */}
      <path
        d="M4 4.5c0-1 .9-1.5 2-1.5h3c1.5 0 2 .5 3 1.5 1-1 1.5-1.5 3-1.5h3c1.1 0 2 .5 2 1.5v13c0 1-.9 1.5-2 1.5h-3c-1.5 0-2 .5-3 1.5-1-1-1.5-1.5-3-1.5H6c-1.1 0-2-.5-2-1.5v-13z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Center spine */}
      <path d="M12 4.5v16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* Page lines */}
      <path d="M7 8h3M7 11h3M14 8h3M14 11h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/* ─── Target / Pareto / Outcomes ─── */
export function TargetIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Concentric banana-curved rings */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      {/* Banana accent */}
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

/* ─── Scroll / Rules ─── */
export function ScrollIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Banana-curved scroll */}
      <path
        d="M8 3c-2 0-3.5 1-3.5 2.5S6 8 8 8h10c1 0 2 .5 2 1.5v8c0 1.5-1.5 2.5-3 2.5H7c-2 0-3.5-1-3.5-2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M8 3h10c1 0 2 .5 2 1.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Text lines */}
      <path d="M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/* ─── Trophy / Best Outcome ─── */
export function TrophyIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Cup body */}
      <path
        d="M7 4h10v5c0 3-2 5-5 5s-5-2-5-5V4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Handles – banana curves */}
      <path d="M7 6c-2 0-3 1-3 3s1 3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M17 6c2 0 3 1 3 3s-1 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      {/* Stem & base */}
      <path d="M12 14v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 19h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Skull / Worst Outcome ─── */
export function SkullIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Banana-rounded skull */}
      <path
        d="M12 3C7.5 3 5 6 5 9.5c0 2.5 1 4 2.5 5.5V17h9v-2c1.5-1.5 2.5-3 2.5-5.5C19 6 16.5 3 12 3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Eyes */}
      <circle cx="9.5" cy="9.5" r="1.5" fill="currentColor" />
      <circle cx="14.5" cy="9.5" r="1.5" fill="currentColor" />
      {/* Banana smile */}
      <path d="M9 13c1 1 2 1.5 3 1.5s2-.5 3-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* Teeth */}
      <path d="M10 17v2M12 17v2M14 17v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Open Folder ─── */
export function OpenFolderIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <path
        d="M3 7c0-1.1.9-2 2-2h4l2 2h8c1.1 0 2 .9 2 2v1H9.5c-1 0-1.8.5-2.2 1.3L4 17V7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Open flap – banana curve */}
      <path
        d="M4 17l3.3-6.7c.4-.8 1.2-1.3 2.2-1.3H22l-3.3 6.7c-.4.8-1.2 1.3-2.2 1.3H4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Lock ─── */
export function LockIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Lock body */}
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      {/* Shackle with banana curve */}
      <path d="M8 11V7c0-2.2 1.8-4 4-4s4 1.8 4 4v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Keyhole */}
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

/* ─── Empty Box / Mailbox ─── */
export function EmptyBoxIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Mailbox body */}
      <path
        d="M4 8h16v10c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Banana-curved lid */}
      <path d="M4 8l8-4 8 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Empty indicator – small banana */}
      <path d="M10 14c.5-1 1.5-1.5 2.5-1 1 .5 1 1.5.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

/* ─── Trash / Delete ─── */
export function TrashIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      {/* Lid */}
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Can body – banana taper */}
      <path
        d="M6 7l1 12c.1 1.1 1 2 2 2h6c1 0 1.9-.9 2-2l1-12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Lines */}
      <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/* ─── Save / Floppy ─── */
export function SaveIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <path
        d="M5 3h11l4 4v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Label area */}
      <path d="M7 3v5h8V3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Banana disk */}
      <circle cx="12" cy="15" r="3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M11 14c.5-.5 1.5-.5 2 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
