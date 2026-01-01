"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAuth = document.cookie.includes("admin_auth=authenticated");
    if (!isAuth && pathname !== "/login") {
      router.push("/login");
    } else {
      setLoading(false);
    }
  }, [pathname, router]);

  const handleLogout = () => {
    document.cookie = "admin_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;
  }

  const menuItems = [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/calendar", label: "Calendar", icon: "📅" },
    { href: "/admin/services", label: "Services", icon: "✨" },
    { href: "/admin/staff", label: "Staff", icon: "👤" },
    { href: "/admin/schedule", label: "Schedule", icon: "🗓" },
    { href: "/admin/working-hours", label: "Hours", icon: "🕐" },
    { href: "/admin/policy", label: "Policy", icon: "📋" },
    { href: "/admin/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        backgroundColor: "#1e293b",
        color: "#fff",
        padding: "24px 0",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
      }}>
        <div style={{ padding: "0 20px", marginBottom: 32 }}>
          <Link href="/admin" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 16,
              color: "#fff",
            }}>
              H
            </div>
            <span style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>Hera</span>
          </Link>
        </div>

        <nav style={{ flex: 1 }}>
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
                  padding: "12px 20px",
                  color: isActive ? "#fff" : "#94a3b8",
                  backgroundColor: isActive ? "rgba(99, 102, 241, 0.2)" : "transparent",
                  borderLeft: isActive ? "3px solid #6366f1" : "3px solid transparent",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "0 20px" }}>
          <Link
            href="/booking"
            target="_blank"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "#fff",
              textDecoration: "none",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            🔗 View Booking Page
          </Link>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "10px 16px",
              backgroundColor: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8,
              color: "#94a3b8",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: 220, padding: 32 }}>
        {children}
      </main>
    </div>
  );
}
