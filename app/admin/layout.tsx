"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [salonName, setSalonName] = useState("Hera Nail Spa");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  // Close menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  const menuItems = [
    { href: "/admin/calendar", label: "Calendar", icon: CalendarIcon },
    { href: "/admin/receipts", label: "Receipts", icon: ReceiptIcon },
    { href: "/admin/discounts", label: "Discounts", icon: DiscountIcon },
    { href: "/admin/services", label: "Services", icon: ServicesIcon },
    { href: "/admin/staff", label: "Staff", icon: StaffIcon },
    { href: "/admin/working-hours", label: "Hours", icon: ClockIcon },
    { href: "/admin/policy", label: "Policy", icon: PolicyIcon },
    { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
  ];

  // Bottom nav shows first 4 items + More
  const bottomNavItems = menuItems.slice(0, 4);
  const moreMenuItems = menuItems.slice(4);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#FAFAFA" }}>
      {/* Mobile Header */}
      <header
        className="mobile-header"
        style={{
          display: isMobile ? "flex" : "none",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E8E8E8",
          alignItems: "center",
          padding: "0 16px",
          zIndex: 100,
          gap: 12,
        }}
      >
        <button
          onClick={() => setMobileMenuOpen(true)}
          style={{
            background: "none",
            border: "none",
            padding: 8,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MenuIcon />
        </button>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #D4B896 0%, #C4A77D 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 14,
              color: "#FFFFFF",
            }}
          >
            {salonName.charAt(0)}
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}>
            {salonName}
          </span>
        </div>
      </header>

      {/* Mobile Slide-out Menu Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 200,
          }}
        />
      )}

      {/* Mobile Slide-out Menu */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 280,
          backgroundColor: "#FFFFFF",
          transform: mobileMenuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
          zIndex: 300,
          display: "flex",
          flexDirection: "column",
          boxShadow: mobileMenuOpen ? "4px 0 20px rgba(0,0,0,0.1)" : "none",
        }}
      >
        {/* Menu Header */}
        <div
          style={{
            padding: "20px 16px",
            borderBottom: "1px solid #E8E8E8",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
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
              }}
            >
              {salonName.charAt(0)}
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}>
              {salonName}
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{
              background: "none",
              border: "none",
              padding: 8,
              cursor: "pointer",
            }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Menu Items */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
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
                  padding: "14px 16px",
                  marginBottom: 4,
                  borderRadius: 10,
                  textDecoration: "none",
                  backgroundColor: isActive ? "#F5F5F5" : "transparent",
                  color: isActive ? "#1A1A1A" : "#666666",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 15,
                }}
              >
                <Icon active={isActive} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Menu Footer */}
        <div style={{ padding: "16px 12px", borderTop: "1px solid #E8E8E8" }}>
          <Link
            href="/booking"
            target="_blank"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              marginBottom: 8,
              borderRadius: 10,
              textDecoration: "none",
              color: "#666666",
              fontSize: 14,
            }}
          >
            <ShareIcon />
            <span>Share Booking Link</span>
          </Link>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              backgroundColor: "#FEF2F2",
              color: "#DC2626",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <LogoutIcon color="#DC2626" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className="desktop-sidebar"
        style={{
          width: 260,
          backgroundColor: "#FFFFFF",
          borderRight: "1px solid #E8E8E8",
          display: isMobile ? "none" : "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: "1px solid #E8E8E8",
          }}
        >
          <div
            style={{
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
            }}
          >
            {salonName.charAt(0)}
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#1A1A1A",
              letterSpacing: "-0.3px",
            }}
          >
            {salonName.toUpperCase()}
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
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
                  padding: "12px 16px",
                  marginBottom: 4,
                  borderRadius: 10,
                  textDecoration: "none",
                  backgroundColor: isActive ? "#F5F5F5" : "transparent",
                  color: isActive ? "#1A1A1A" : "#666666",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 15,
                  transition: "all 0.15s ease",
                }}
              >
                <Icon active={isActive} />
                <span style={{ flex: 1 }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div style={{ padding: "16px 12px", borderTop: "1px solid #E8E8E8" }}>
          <Link
            href="/booking"
            target="_blank"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              marginBottom: 8,
              borderRadius: 10,
              textDecoration: "none",
              color: "#666666",
              fontSize: 14,
            }}
          >
            <ShareIcon />
            <span>Share your Booking Page link</span>
          </Link>

          <button
            onClick={() => {}}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "12px 16px",
              marginBottom: 8,
              borderRadius: 10,
              border: "none",
              backgroundColor: "transparent",
              color: "#666666",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <HelpIcon />
            <span>Help & Support</span>
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 10,
              backgroundColor: "#F5F5F5",
            }}
          >
            <div
              style={{
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
              }}
            >
              {salonName.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#1A1A1A",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {salonName}
              </div>
            </div>
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
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : 260,
          marginTop: isMobile ? 56 : 0,
          marginBottom: isMobile ? 70 : 0,
          backgroundColor: "#FAFAFA",
          minHeight: isMobile ? "calc(100vh - 126px)" : "100vh",
          overflow: "auto",
        }}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 70,
            backgroundColor: "#FFFFFF",
            borderTop: "1px solid #E8E8E8",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            padding: "0 8px",
            paddingBottom: "env(safe-area-inset-bottom)",
            zIndex: 100,
          }}
        >
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "8px 12px",
                  textDecoration: "none",
                  color: isActive ? "#6366f1" : "#666666",
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 400,
                  minWidth: 60,
                }}
              >
                <Icon active={isActive} color={isActive ? "#6366f1" : "#666666"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "8px 12px",
              background: "none",
              border: "none",
              color: "#666666",
              fontSize: 11,
              cursor: "pointer",
              minWidth: 60,
            }}
          >
            <MoreIcon />
            <span>More</span>
          </button>
        </nav>
      )}
    </div>
  );
}

// Icon Components
function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function CalendarIcon({ active, color }: { active?: boolean; color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || (active ? "#1A1A1A" : "#666666")} strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ReceiptIcon({ active, color }: { active?: boolean; color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || (active ? "#1A1A1A" : "#666666")} strokeWidth="2">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="12" y2="14" />
    </svg>
  );
}

function DiscountIcon({ active, color }: { active?: boolean; color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || (active ? "#1A1A1A" : "#666666")} strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function ServicesIcon({ active, color }: { active?: boolean; color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || (active ? "#1A1A1A" : "#666666")} strokeWidth="2">
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <line x1="16" y1="8" x2="2" y2="22" />
      <line x1="17.5" y1="15" x2="9" y2="15" />
    </svg>
  );
}

function StaffIcon({ active, color }: { active?: boolean; color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || (active ? "#1A1A1A" : "#666666")} strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ClockIcon({ active, color }: { active?: boolean; color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || (active ? "#1A1A1A" : "#666666")} strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PolicyIcon({ active, color }: { active?: boolean; color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || (active ? "#1A1A1A" : "#666666")} strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function SettingsIcon({ active, color }: { active?: boolean; color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || (active ? "#1A1A1A" : "#666666")} strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function LogoutIcon({ color = "currentColor" }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
