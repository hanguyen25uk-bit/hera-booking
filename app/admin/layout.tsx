"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [salonName, setSalonName] = useState("Hera Nail Spa");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.salonName) setSalonName(data.salonName);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadSettings();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  const menuItems = [
    { href: "/admin/calendar", label: "Calendar", icon: CalendarIcon, badge: null },
    { href: "/admin/services", label: "Services", icon: ServicesIcon, badge: null },
    { href: "/admin/staff", label: "Staff", icon: StaffIcon, badge: null },
    { href: "/admin/working-hours", label: "Working Hours", icon: ClockIcon, badge: null },
    { href: "/admin/policy", label: "Policy", icon: PolicyIcon, badge: null },
    { href: "/admin/settings", label: "Settings", icon: SettingsIcon, badge: null },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#FAFAFA" }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 72 : 260,
        backgroundColor: "#FFFFFF",
        borderRight: "1px solid #E8E8E8",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease",
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? "20px 12px" : "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid #E8E8E8",
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #D4B896 0%, #C4A77D 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 16,
            color: "#FFFFFF",
            flexShrink: 0,
          }}>
            H
          </div>
          {!collapsed && (
            <span style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#1A1A1A",
              letterSpacing: "-0.3px",
            }}>
              {salonName.toUpperCase()}
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "#666",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "16px 12px" }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: collapsed ? "12px" : "12px 16px",
                  marginBottom: 4,
                  borderRadius: 10,
                  textDecoration: "none",
                  backgroundColor: isActive ? "#F5F5F5" : "transparent",
                  color: isActive ? "#1A1A1A" : "#666666",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 15,
                  justifyContent: collapsed ? "center" : "flex-start",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon active={isActive} />
                {!collapsed && (
                  <span style={{ flex: 1 }}>{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span style={{
                    backgroundColor: "#1A1A1A",
                    color: "#FFFFFF",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 10,
                  }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div style={{ padding: "16px 12px", borderTop: "1px solid #E8E8E8" }}>
          {/* Share Booking Link */}
          <Link
            href="/booking"
            target="_blank"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: collapsed ? "12px" : "12px 16px",
              marginBottom: 8,
              borderRadius: 10,
              textDecoration: "none",
              color: "#666666",
              fontSize: 14,
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <ShareIcon />
            {!collapsed && <span>Share your Booking Page link</span>}
          </Link>

          {/* Help */}
          <button
            onClick={() => {}}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: collapsed ? "12px" : "12px 16px",
              marginBottom: 8,
              borderRadius: 10,
              border: "none",
              backgroundColor: "transparent",
              color: "#666666",
              fontSize: 14,
              cursor: "pointer",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <HelpIcon />
            {!collapsed && <span>Help & Support</span>}
          </button>

          {/* User Profile */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: collapsed ? "12px" : "12px 16px",
            borderRadius: 10,
            backgroundColor: "#F5F5F5",
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #D4B896 0%, #C4A77D 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: 12,
              color: "#FFFFFF",
              flexShrink: 0,
            }}>
              H
            </div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {salonName}
                </div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  color: "#999",
                }}
                title="Logout"
              >
                <LogoutIcon />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        backgroundColor: "#FAFAFA",
        overflow: "auto",
      }}>
        {children}
      </main>
    </div>
  );
}

// Icon Components
function CalendarIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#1A1A1A" : "#666666"} strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function ServicesIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#1A1A1A" : "#666666"} strokeWidth="2">
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
      <line x1="16" y1="8" x2="2" y2="22"/>
      <line x1="17.5" y1="15" x2="9" y2="15"/>
    </svg>
  );
}

function StaffIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#1A1A1A" : "#666666"} strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function ClockIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#1A1A1A" : "#666666"} strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function PolicyIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#1A1A1A" : "#666666"} strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function SettingsIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#1A1A1A" : "#666666"} strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}
