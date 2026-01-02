export default function AdminLoading() {
  return (
    <div style={{
      padding: 40,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 400,
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40,
          height: 40,
          border: "3px solid #e2e8f0",
          borderTopColor: "#6366f1",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 12px",
        }} />
        <p style={{ color: "#64748b", fontSize: 14 }}>Loading...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
