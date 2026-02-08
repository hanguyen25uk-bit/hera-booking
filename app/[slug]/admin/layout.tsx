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
    { href: basePath, label: "Dashboard", icon: "◉" },
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
        width: collapsed ? 70 : 240,
        background: "linear-gradient(180deg, var(--ink) 0%, #2A2520 100%)",
        color: "var(--cream)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.3s ease",
        boxShadow: "var(--shadow-lg)"
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? "24px 10px" : "28px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          borderBottom: "1px solid rgba(251,248,244,0.08)"
        }}>
          {!collapsed && (
            <Link href={basePath} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "var(--rose)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 18,
                color: "var(--white)",
                fontFamily: "var(--font-heading)"
              }}>
                {salonName.charAt(0).toUpperCase() || "H"}
              </div>
              <span style={{
                fontSize: 18,
                fontWeight: 600,
                color: "var(--cream)",
                fontFamily: "var(--font-heading)",
                maxWidth: 140,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em"
              }}>{salonName || "Salon"}</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: "rgba(251,248,244,0.05)",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              color: "var(--cream)",
              opacity: 0.6,
              width: 28,
              height: 28,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "opacity 0.2s ease"
            }}
          >{collapsed ? "»" : "«"}</button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "16px 12px" }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: collapsed ? "14px" : "14px 18px",
                  marginBottom: 4,
                  borderRadius: 10,
                  textDecoration: "none",
                  backgroundColor: isActive ? "rgba(251,248,244,0.08)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--rose)" : "3px solid transparent",
                  color: isActive ? "var(--cream)" : "rgba(251,248,244,0.6)",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 14,
                  justifyContent: collapsed ? "center" : "flex-start",
                  transition: "all 0.2s ease"
                }}
              >
                <span style={{
                  fontSize: 16,
                  color: isActive ? "var(--rose-light)" : "rgba(251,248,244,0.5)",
                  fontWeight: 400
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
