"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  const menuItems = [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/calendar", label: "Calendar", icon: "📅" },
    { href: "/admin/services", label: "Services", icon: "✨" },
    { href: "/admin/staff", label: "Staff", icon: "👤" },
    { href: "/admin/schedule", label: "Schedule", icon: "🗓" },
    { href: "/admin/working-hours", label: "Hours", icon: "🕐" },
    { href: "/admin/policy", label: "Policy", icon: "��" },
    { href: "/admin/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <aside style={{ width: collapsed ? 70 : 220, backgroundColor: "#1e293b", color: "#fff", display: "flex", flexDirection: "column", transition: "width 0.2s" }}>
        <div style={{ padding: collapsed ? "20px 10px" : "24px 20px", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
          {!collapsed && (
            <Link href="/admin" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#fff" }}>H</div>
              <span style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>Hera</span>
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#94a3b8" }}>{collapsed ? "»" : "«"}</button>
        </div>
        <nav style={{ flex: 1, padding: "8px" }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: 12, padding: collapsed ? "12px" : "12px 16px", marginBottom: 4, borderRadius: 8, textDecoration: "none", backgroundColor: isActive ? "rgba(99,102,241,0.2)" : "transparent", borderLeft: isActive ? "3px solid #6366f1" : "3px solid transparent", color: isActive ? "#fff" : "#94a3b8", fontWeight: isActive ? 600 : 400, fontSize: 14, justifyContent: collapsed ? "center" : "flex-start" }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: collapsed ? "16px 8px" : "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <Link href="/booking" target="_blank" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 12px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", textDecoration: "none", fontSize: 13, marginBottom: 8 }}>{collapsed ? "🔗" : "🔗 Booking Page"}</Link>
          <button onClick={handleLogout} style={{ width: "100%", padding: "10px 12px", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>{collapsed ? "🚪" : "Logout"}</button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, overflow: "auto" }}>{children}</main>
    </div>
  );
}
