"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { href: "/admin", label: "Dashboard", icon: "🏠" },
    { href: "/admin/calendar", label: "Calendar", icon: "📅" },
    { href: "/admin/services", label: "Services", icon: "≡" },
    { href: "/admin/working-hours", label: "Working Hours", icon: "⏰" },
    { href: "/admin/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F9FAFB" }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 70 : 250,
        backgroundColor: "#FFFFFF",
        borderRight: "1px solid #E5E7EB",
        transition: "width 0.3s",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? "20px 10px" : "20px",
          borderBottom: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
        }}>
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>💅</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#EC4899" }}>HERA NAIL SPA</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              color: "#6B7280",
            }}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {/* Menu */}
        <nav style={{ flex: 1, padding: "16px 8px" }}>
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
                  padding: collapsed ? "12px" : "12px 16px",
                  marginBottom: 4,
                  borderRadius: 8,
                  textDecoration: "none",
                  backgroundColor: isActive ? "#FCE7F3" : "transparent",
                  color: isActive ? "#EC4899" : "#374151",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Booking Link */}
        <div style={{ padding: 16, borderTop: "1px solid #E5E7EB" }}>
          <Link
            href="/booking"
            target="_blank"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px",
              backgroundColor: "#EC4899",
              color: "#FFFFFF",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {collapsed ? "🔗" : "📤 Booking Page"}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
