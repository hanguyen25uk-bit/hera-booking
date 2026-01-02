export default function BookingLoading() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0f172a",
      display: "flex",
    }}>
      {/* Sidebar Skeleton */}
      <div style={{
        width: 360,
        backgroundColor: "#1e293b",
        padding: 32,
        display: "none",
      }} className="desktop-sidebar">
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 32,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "#334155",
          }} />
          <div style={{
            width: 120,
            height: 20,
            borderRadius: 4,
            background: "#334155",
          }} />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div style={{
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: "24px 0 0 24px",
        padding: "32px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 48,
            height: 48,
            border: "4px solid #e2e8f0",
            borderTopColor: "#6366f1",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px",
          }} />
          <p style={{ color: "#64748b", fontSize: 14 }}>Loading booking...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            @media (min-width: 769px) {
              .desktop-sidebar { display: block !important; }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
