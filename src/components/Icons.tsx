import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 24, p: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...p,
});

export const IconTv = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="3" y="5" width="18" height="13" rx="2.5" />
    <path d="M8 21h8M12 18v3" />
  </svg>
);
export const IconSearch = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 5 5" />
  </svg>
);
export const IconPerson = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21c.6-4 3.6-6 7.5-6s6.9 2 7.5 6" />
  </svg>
);
export const IconCheck = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 2.4, ...p })}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const IconChevronRight = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 2.4, ...p })}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);
export const IconChevronDown = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 2.2, ...p })}>
    <path d="m5 9 7 7 7-7" />
  </svg>
);
export const IconGrid = ({ size, ...p }: P) => (
  <svg width={size ?? 24} height={size ?? 24} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" />
  </svg>
);
export const IconPlus = ({ size, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 2.4, ...p })}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconShare = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 15V4M8 8l4-4 4 4" />
    <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
  </svg>
);
export const IconMore = ({ size, ...p }: P) => (
  <svg width={size ?? 24} height={size ?? 24} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <circle cx="12" cy="5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="19" r="1.8" />
  </svg>
);
export const IconCalendar = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);
export const IconStar = ({ size, ...p }: P) => (
  <svg width={size ?? 24} height={size ?? 24} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />
  </svg>
);
