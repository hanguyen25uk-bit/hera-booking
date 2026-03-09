"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomTabBarProps {
  salonSlug: string;
}

const HERA_GOLD = "#c9a96e";
const INACTIVE_COLOR = "#8E8E93";

export default function BottomTabBar({ salonSlug }: BottomTabBarProps) {
  const pathname = usePathname();
  const basePath = `/${salonSlug}/admin`;

  const tabs = [
    {
      href: `${basePath}/calendar`,
      label: "Calendar",
      icon: CalendarIcon,
      match: "/calendar",
    },
    {
      href: `${basePath}/receipts`,
      label: "Clients",
      icon: ClientsIcon,
      match: "/receipts",
    },
    {
      href: `${basePath}/services`,
      label: "Sales",
      icon: SalesIcon,
      match: "/services",
    },
    {
      href: `${basePath}/staff`,
      label: "Team",
      icon: TeamIcon,
      match: "/staff",
    },
    {
      href: `${basePath}/settings`,
      label: "More",
      icon: MoreIcon,
      match: "/settings",
    },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        backgroundColor: "#FFFFFF",
        borderTop: "1px solid rgba(0,0,0,0.08)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "flex-start",
        paddingTop: 8,
        zIndex: 1000,
        boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname?.includes(tab.match);
        const IconComponent = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              textDecoration: "none",
              minWidth: 64,
              padding: "0 8px",
            }}
          >
            <IconComponent
              color={isActive ? HERA_GOLD : INACTIVE_COLOR}
              size={24}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? HERA_GOLD : INACTIVE_COLOR,
                letterSpacing: "-0.2px",
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// Icons
function CalendarIcon({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke={color}
        strokeWidth="2"
      />
      <path d="M3 10H21" stroke={color} strokeWidth="2" />
      <path d="M8 2V6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M16 2V6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <rect x="7" y="14" width="3" height="3" rx="0.5" fill={color} />
    </svg>
  );
}

function ClientsIcon({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
      <path
        d="M4 20C4 16.6863 7.13401 14 11 14H13C16.866 14 20 16.6863 20 20"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SalesIcon({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2V22"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M17 5H9.5C7.567 5 6 6.567 6 8.5C6 10.433 7.567 12 9.5 12H14.5C16.433 12 18 13.567 18 15.5C18 17.433 16.433 19 14.5 19H6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TeamIcon({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3" stroke={color} strokeWidth="2" />
      <circle cx="17" cy="7" r="3" stroke={color} strokeWidth="2" />
      <path
        d="M2 20C2 17.2386 4.23858 15 7 15H11C13.7614 15 16 17.2386 16 20"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 15C18.7614 15 21 17.2386 21 20"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoreIcon({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="2" fill={color} />
      <circle cx="12" cy="12" r="2" fill={color} />
      <circle cx="12" cy="19" r="2" fill={color} />
    </svg>
  );
}
