"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";

const Icons = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  services: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  clock: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  link: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  collapse: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="11 17 6 12 11 7" />
      <polyline points="18 17 13 12 18 7" />
    </svg>
  ),
  expand: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="13 17 18 12 13 7" />
      <polyline points="6 17 11 12 6 7" />
    </svg>
  ),
};

const menuItems = [
  { href: "/admin", label: "Dashboard", icon: Icons.home, exact: true },
  { href: "/admin/calendar", label: "Calendar", icon: Icons.calendar },
  { href: "/admin/services", label: "Services", icon: Icons.services },
  { href: "/admin/staff", label: "Staff", icon: Icons.users },
  { href: "/admin/working-hours", label: "Working Hours", icon: Icons.clock },
];

const bottomMenuItems = [
  { href: "/admin/settings", label: "Settings", icon: Icons.settings },
  { href: "/booking", label: "Booking Page", icon: Icons.link, external: true },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div style={styles.container}>
      <aside style={{ ...styles.sidebar, width: collapsed ? 72 : 240 }}>
        <div style={styles.logoContainer}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>💅</span>
            {!collapsed && <span style={styles.logoText}>HERA NAIL SPA</span>}
          </div>
          <button
            style={styles.collapseBtn}
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? Icons.expand : Icons.collapse}
          </button>
        </div>

        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.navItem,
                ...(isActive(item.href, item.exact) ? styles.navItemActive : {}),
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "12px" : "12px 16px",
              }}
              title={collapsed ? item.label : undefined}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <nav style={styles.bottomNav}>
          {bottomMenuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              style={{
                ...styles.navItem,
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "12px" : "12px 16px",
              }}
              title={collapsed ? item.label : undefined}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {!collapsed && (
          <div style={styles.shareSection}>
            <button
              style={styles.shareBtn}
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin + "/booking");
                alert("Booking link copied!");
              }}
            >
              📤 Share your Booking Page link
            </button>
          </div>
        )}
      </aside>

      <main style={{ ...styles.main, marginLeft: collapsed ? 72 : 240 }}>
        {children}
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { minHeight: "100vh", backgroundColor: "#F9FAFB" },
  sidebar: {
    position: "fixed", top: 0, left: 0, height: "100vh", backgroundColor: "#FFFFFF",
    borderRight: "1px solid #E5E7EB", display: "flex", flexDirection: "column",
    transition: "width 0.2s ease", zIndex: 100, overflow: "hidden",
  },
  logoContainer: {
    padding: "16px", display: "flex", alignItems: "center",
    justifyContent: "space-between", borderBottom: "1px solid #E5E7EB", minHeight: 64,
  },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoIcon: { fontSize: 24 },
  logoText: { fontSize: 14, fontWeight: 700, color: "#111827", whiteSpace: "nowrap" },
  collapseBtn: {
    background: "none", border: "none", cursor: "pointer", padding: 4,
    color: "#6B7280", display: "flex", alignItems: "center", justifyContent: "center",
  },
  nav: { padding: "16px 8px", display: "flex", flexDirection: "column", gap: 4 },
  navItem: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
    borderRadius: 8, color: "#374151", textDecoration: "none", fontSize: 14,
    fontWeight: 500, transition: "all 0.15s ease", whiteSpace: "nowrap",
  },
  navItemActive: { backgroundColor: "#FEF2F2", color: "#DC2626" },
  navIcon: { display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  navLabel: { overflow: "hidden", textOverflow: "ellipsis" },
  bottomNav: {
    padding: "8px", borderTop: "1px solid #E5E7EB",
    display: "flex", flexDirection: "column", gap: 4,
  },
  shareSection: { padding: "16px", borderTop: "1px solid #E5E7EB" },
  shareBtn: {
    width: "100%", padding: "10px 12px", backgroundColor: "#F3F4F6",
    border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12,
    fontWeight: 500, color: "#374151", display: "flex",
    alignItems: "center", justifyContent: "center", gap: 6,
  },
  main: { minHeight: "100vh", transition: "margin-left 0.2s ease" },
};
