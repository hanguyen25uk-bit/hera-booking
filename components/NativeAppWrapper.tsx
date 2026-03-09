"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSavedAuth, isCapacitorNative } from "@/lib/capacitor-auth";

interface NativeAppWrapperProps {
  children: React.ReactNode;
}

export default function NativeAppWrapper({ children }: NativeAppWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(true);
  const [isNative, setIsNative] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function init() {
      // Check if running in native app
      const native = await isCapacitorNative();
      setIsNative(native);

      // Only auto-login for native apps
      if (native) {
        const savedAuth = await getSavedAuth();

        // If we have valid auth and we're on login page, redirect to calendar
        if (savedAuth && (pathname === "/login" || pathname === "/")) {
          // Wait for splash to finish, then redirect
          setTimeout(() => {
            router.push(`/${savedAuth.salonSlug}/admin/calendar`);
          }, 1500);
        }
      }

      setAuthChecked(true);

      // Hide splash after 1.5 seconds
      setTimeout(() => {
        setShowSplash(false);
      }, 1500);
    }

    init();
  }, [pathname, router]);

  // Show splash screen on app launch (native only)
  if (showSplash && isNative) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}

function SplashScreen() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#1a1a2e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        animation: "fadeIn 0.3s ease-out",
      }}
    >
      {/* Hera Logo */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Logo Icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "linear-gradient(135deg, #c9a96e 0%, #b8956a 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 32px rgba(201, 169, 110, 0.3)",
          }}
        >
          <span
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "#1a1a2e",
              fontFamily: "Georgia, serif",
              letterSpacing: "-2px",
            }}
          >
            H
          </span>
        </div>

        {/* Logo Text */}
        <span
          style={{
            fontSize: 32,
            fontWeight: 300,
            color: "#c9a96e",
            letterSpacing: "8px",
            fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            textTransform: "uppercase",
          }}
        >
          HERA
        </span>

        {/* Tagline */}
        <span
          style={{
            fontSize: 12,
            color: "rgba(201, 169, 110, 0.6)",
            letterSpacing: "2px",
            marginTop: 8,
          }}
        >
          BOOKING
        </span>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
