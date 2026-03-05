"use client";

import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

// Sidebar width constants - exported for calendar to use
export const SIDEBAR_WIDTH_COLLAPSED = 56;
export const SIDEBAR_WIDTH_EXPANDED = 240;

export default function SalonAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const [collapsed, setCollapsed] = useState(true); // Default to collapsed
  const [salonName, setSalonName] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if current route is calendar
  const isCalendarRoute = pathname?.includes("/calendar");

  // Get localStorage key for this route type
  const getStorageKey = useCallback(() => {
    if (isCalendarRoute) return `sidebar-collapsed-calendar`;
    return `sidebar-collapsed-default`;
  }, [isCalendarRoute]);

  // Initialize collapsed state from localStorage or auto-collapse for calendar
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storageKey = getStorageKey();
    const savedState = localStorage.getItem(storageKey);

    if (savedState !== null) {
      // Use saved preference
      setCollapsed(savedState === "true");
    } else {
      // Default: calendar auto-collapses, others expand
      setCollapsed(isCalendarRoute);
    }
    setIsInitialized(true);
  }, [isCalendarRoute, getStorageKey]);

  // Save collapsed state to localStorage when changed by user
  const handleToggleCollapsed = useCallback(() => {
    const newState = !collapsed;
    setCollapsed(newState);
    if (typeof window !== "undefined") {
      localStorage.setItem(getStorageKey(), String(newState));
    }
  }, [collapsed, getStorageKey]);

  useEffect(() => {
    async function loadSalonInfo() {
      try {
        const res = await fetch(`/api/${slug}/salon`);
        if (res.ok) {
          const data = await res.json();
          setSalonName(data.name || slug);
        }
      } catch {
        setSalonName(slug);
      }
    }
    loadSalonInfo();
  }, [slug]);

  // Current sidebar width
  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const basePath = `/${slug}/admin`;
  const menuItems = [
    { href: `${basePath}/calendar`, label: "Calendar", icon: "◈" },
    { href: `${basePath}/receipts`, label: "Receipts", icon: "◇" },
    { href: `${basePath}/discounts`, label: "Discounts", icon: "✦" },
    { href: `${basePath}/services`, label: "Services", icon: "◆" },
    { href: `${basePath}/staff`, label: "Staff", icon: "○" },
    { href: `${basePath}/shop-hours`, label: "Shop Hours", icon: "□" },
    { href: `${basePath}/working-hours`, label: "Staff Hours", icon: "◎" },
    { href: `${basePath}/schedule`, label: "Schedule", icon: "▣" },
    { href: `${basePath}/policy`, label: "Policy", icon: "▤" },
    { href: `${basePath}/settings`, label: "Settings", icon: "⚙" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--cream)" }}>
      <aside style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        background: "linear-gradient(180deg, var(--ink) 0%, #2A2520 100%)",
        color: "var(--cream)",
        display: "flex",
        flexDirection: "column",
        transition: isInitialized ? "width 0.3s ease" : "none",
        boxShadow: "var(--shadow-lg)",
        position: "relative",
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? "16px 6px" : "20px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          borderBottom: "1px solid rgba(251,248,244,0.08)"
        }}>
          {!collapsed && (
            <Link href={basePath} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--rose)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--white)",
                fontFamily: "var(--font-heading)"
              }}>
                {salonName.charAt(0).toUpperCase() || "H"}
              </div>
              <span style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--cream)",
                fontFamily: "var(--font-heading)",
                maxWidth: 130,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em"
              }}>{salonName || "Salon"}</span>
            </Link>
          )}
          <button
            onClick={handleToggleCollapsed}
            style={{
              background: "rgba(251,248,244,0.08)",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              color: "var(--cream)",
              opacity: 0.8,
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >{collapsed ? "»" : "«"}</button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: collapsed ? "12px 6px" : "16px 12px", overflowY: "auto" }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: collapsed ? "12px 0" : "12px 14px",
                  marginBottom: 2,
                  borderRadius: 8,
                  textDecoration: "none",
                  backgroundColor: isActive ? "rgba(251,248,244,0.08)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--rose)" : "3px solid transparent",
                  color: isActive ? "var(--cream)" : "rgba(251,248,244,0.6)",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 13,
                  justifyContent: collapsed ? "center" : "flex-start",
                  transition: "all 0.2s ease",
                  minHeight: 40,
                }}
                title={collapsed ? item.label : undefined}
              >
                <span style={{
                  fontSize: 15,
                  color: isActive ? "var(--rose-light)" : "rgba(251,248,244,0.5)",
                  fontWeight: 400,
                  minWidth: 20,
                  textAlign: "center",
                }}>{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div style={{
          padding: collapsed ? "20px 12px" : "20px",
          borderTop: "1px solid rgba(251,248,244,0.08)"
        }}>
          <Link
            href={`/${slug}/booking`}
            target="_blank"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 16px",
              backgroundColor: "var(--rose)",
              borderRadius: 50,
              color: "var(--white)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 12,
              transition: "all 0.2s ease"
            }}
          >{collapsed ? "→" : "View Booking Page →"}</Link>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "12px 16px",
              backgroundColor: "transparent",
              border: "1px solid rgba(251,248,244,0.15)",
              borderRadius: 50,
              color: "rgba(251,248,244,0.6)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >{collapsed ? "←" : "Logout"}</button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: 32,
        overflow: "auto",
        backgroundColor: "var(--cream)"
      }}>{children}</main>
    </div>
  );
}
