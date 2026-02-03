"use client";

import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function SalonAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const [collapsed, setCollapsed] = useState(false);
  const [salonName, setSalonName] = useState("");

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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const basePath = `/${slug}/admin`;
  const menuItems = [
    { href: basePath, label: "Dashboard", icon: "📊" },
    { href: `${basePath}/calendar`, label: "Calendar", icon: "📅" },
    { href: `${basePath}/receipts`, label: "Receipts", icon: "🧾" },
    { href: `${basePath}/discounts`, label: "Discounts", icon: "🏷️" },
    { href: `${basePath}/services`, label: "Services", icon: "✨" },
    { href: `${basePath}/staff`, label: "Staff", icon: "👤" },
    { href: `${basePath}/shop-hours`, label: "Shop Hours", icon: "🏪" },
    { href: `${basePath}/working-hours`, label: "Staff Hours", icon: "🕐" },
    { href: `${basePath}/schedule`, label: "Schedule", icon: "🗓" },
    { href: `${basePath}/policy`, label: "Policy", icon: "📋" },
    { href: `${basePath}/settings`, label: "Settings", icon: "⚙️" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <aside style={{ width: collapsed ? 70 : 220, backgroundColor: "#1e293b", color: "#fff", display: "flex", flexDirection: "column", transition: "width 0.2s" }}>
        <div style={{ padding: collapsed ? "20px 10px" : "24px 20px", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
          {!collapsed && (
            <Link href={basePath} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#fff" }}>
                {salonName.charAt(0).toUpperCase() || "H"}
              </div>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#fff", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{salonName || "Salon"}</span>
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
          <Link href={`/${slug}`} target="_blank" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 12px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", textDecoration: "none", fontSize: 13, marginBottom: 8 }}>{collapsed ? "🔗" : "🔗 Booking Page"}</Link>
          <button onClick={handleLogout} style={{ width: "100%", padding: "10px 12px", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>{collapsed ? "🚪" : "Logout"}</button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, overflow: "auto" }}>{children}</main>
    </div>
  );
}
