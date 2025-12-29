"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/calendar", label: "Calendar", icon: "📅" },
    { href: "/admin/services", label: "Services", icon: "✨" },
    { href: "/admin/staff", label: "Staff", icon: "👤" },
    { href: "/admin/schedule", label: "Schedule", icon: "🗓" },
    { href: "/admin/working-hours", label: "Hours", icon: "🕐" },
    { href: "/admin/settings", label: "Settings", icon: "⚙️" },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div style={styles.container}>
      <aside style={{
        ...styles.sidebar,
        width: collapsed ? 72 : 240,
      }}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>H</div>
          {!collapsed && <span style={styles.logoText}>Hera</span>}
        </div>

        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.navItem,
                ...(isActive(item.href) ? styles.navItemActive : {}),
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <button
          style={styles.collapseBtn}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? "→" : "←"}
        </button>

        <div style={styles.sidebarFooter}>
          <Link href="/booking" target="_blank" style={styles.bookingLink}>
            {collapsed ? "🔗" : "Open Booking Page →"}
          </Link>
        </div>
      </aside>

      <main style={{
        ...styles.main,
        marginLeft: collapsed ? 72 : 240,
      }}>
        {children}
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  sidebar: {
    backgroundColor: "#0f172a",
    display: "flex",
    flexDirection: "column",
    transition: "width 0.2s ease",
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    zIndex: 100,
  },
  logoSection: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "24px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: 18,
  },
  logoText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: "-0.5px",
  },
  nav: {
    flex: 1,
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 8,
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
    transition: "all 0.15s ease",
  },
  navItemActive: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    color: "#fff",
  },
  navIcon: {
    fontSize: 18,
    width: 24,
    textAlign: "center",
  },
  navLabel: {
    whiteSpace: "nowrap",
  },
  collapseBtn: {
    margin: "0 12px 12px",
    padding: "8px",
    backgroundColor: "rgba(255,255,255,0.05)",
    border: "none",
    borderRadius: 6,
    color: "#64748b",
    cursor: "pointer",
    fontSize: 14,
  },
  sidebarFooter: {
    padding: "16px 12px",
    borderTop: "1px solid rgba(255,255,255,0.1)",
  },
  bookingLink: {
    display: "block",
    padding: "12px 14px",
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    borderRadius: 8,
    color: "#a5b4fc",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 500,
    textAlign: "center",
    transition: "all 0.15s ease",
  },
  main: {
    flex: 1,
    padding: "32px 40px",
    transition: "margin-left 0.2s ease",
  },
};
