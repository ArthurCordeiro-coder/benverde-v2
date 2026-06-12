// Lumii icons — Lucide visual lineage, stroke 1.8, round caps. 24x24 viewBox.
import type { CSSProperties, ReactNode } from "react";

type IconProps = {
  size?: number;
  color?: string;
  sw?: number;
  fill?: string;
  style?: CSSProperties;
};

type IcoProps = IconProps & { children: ReactNode };

const Ico = ({ size = 18, color = "currentColor", children, sw = 1.8, fill = "none", style }: IcoProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    {children}
  </svg>
);

export const IconTag = (p: IconProps) => (
  <Ico {...p}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" style={{ stroke: "rgb(255, 229, 102)" }} />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </Ico>
);
export const IconCompare = (p: IconProps) => (
  <Ico {...p}><path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-5" /></Ico>
);
export const IconTable = (p: IconProps) => (
  <Ico {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></Ico>
);
export const IconSearch = (p: IconProps) => (
  <Ico {...p}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Ico>
);
export const IconFilter = (p: IconProps) => (
  <Ico {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></Ico>
);
export const IconPlus = (p: IconProps) => (
  <Ico {...p} sw={2.2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Ico>
);
export const IconMinus = (p: IconProps) => (
  <Ico {...p} sw={2.2}><line x1="5" y1="12" x2="19" y2="12" /></Ico>
);
export const IconX = (p: IconProps) => (
  <Ico {...p} sw={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Ico>
);
export const IconChevDown = (p: IconProps) => (
  <Ico {...p} sw={2}><polyline points="6 9 12 15 18 9" /></Ico>
);
export const IconChevUp = (p: IconProps) => (
  <Ico {...p} sw={2}><polyline points="18 15 12 9 6 15" /></Ico>
);
export const IconChevRight = (p: IconProps) => (
  <Ico {...p} sw={2}><polyline points="9 18 15 12 9 6" /></Ico>
);
export const IconChevLeft = (p: IconProps) => (
  <Ico {...p} sw={2}><polyline points="15 18 9 12 15 6" /></Ico>
);
export const IconSort = (p: IconProps) => (
  <Ico {...p}><polyline points="7 9 12 4 17 9" /><polyline points="7 15 12 20 17 15" /></Ico>
);
export const IconCart = (p: IconProps) => (
  <Ico {...p}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></Ico>
);
export const IconCalendar = (p: IconProps) => (
  <Ico {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Ico>
);
export const IconSend = (p: IconProps) => (
  <Ico {...p}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Ico>
);
export const IconCheck = (p: IconProps) => (
  <Ico {...p} sw={2.2}><polyline points="20 6 9 17 4 12" /></Ico>
);
export const IconSparkles = (p: IconProps) => (
  <Ico {...p}><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></Ico>
);
export const IconBar = (p: IconProps) => (
  <Ico {...p}><line x1="12" y1="20" x2="12" y2="10" style={{ stroke: "rgb(255, 229, 102)" }} /><line x1="18" y1="20" x2="18" y2="4" style={{ stroke: "rgb(255, 229, 102)" }} /><line x1="6" y1="20" x2="6" y2="16" style={{ stroke: "rgb(255, 229, 102)" }} /></Ico>
);
export const IconLogout = (p: IconProps) => (
  <Ico {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></Ico>
);
export const IconArrowDown = (p: IconProps) => (
  <Ico {...p} sw={2}><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></Ico>
);
export const IconArrowUp = (p: IconProps) => (
  <Ico {...p} sw={2}><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></Ico>
);
export const IconChevsUD = (p: IconProps) => (
  <Ico {...p}><polyline points="7 15 12 20 17 15" /><polyline points="7 9 12 4 17 9" /></Ico>
);
export const IconTrendUp = (p: IconProps) => (
  <Ico {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></Ico>
);
export const IconTrendDown = (p: IconProps) => (
  <Ico {...p}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></Ico>
);
export const IconRefresh = (p: IconProps) => (
  <Ico {...p}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></Ico>
);
export const IconDownload = (p: IconProps) => (
  <Ico {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></Ico>
);
export const IconBookmark = (p: IconProps) => (
  <Ico {...p}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></Ico>
);
export const IconLeaf = (p: IconProps) => (
  <Ico {...p}><path d="M17 8C8 10 5.9 16.17 3.82 19.11a1 1 0 0 0 1.59 1.21C7.13 18 9.37 14.5 12 13c-2 2-2.5 5-2.5 5s4-1 6-5c0 0 2-4 1-5z" /></Ico>
);
export const IconUser = (p: IconProps) => (
  <Ico {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Ico>
);
export const IconLock = (p: IconProps) => (
  <Ico {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Ico>
);
export const IconShield = (p: IconProps) => (
  <Ico {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Ico>
);
export const IconActivity = (p: IconProps) => (
  <Ico {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Ico>
);
export const IconMail = (p: IconProps) => (
  <Ico {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></Ico>
);
export const IconPhone = (p: IconProps) => (
  <Ico {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></Ico>
);
export const IconStore = (p: IconProps) => (
  <Ico {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><line x1="9" y1="22" x2="9" y2="12" /><line x1="15" y1="22" x2="15" y2="12" /></Ico>
);
export const IconInfo = (p: IconProps) => (
  <Ico {...p}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></Ico>
);
export const IconTrash = (p: IconProps) => (
  <Ico {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></Ico>
);
export const IconMic = (p: IconProps) => (
  <Ico {...p}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></Ico>
);
export const IconMenu = (p: IconProps) => (
  <Ico {...p} sw={2}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></Ico>
);
