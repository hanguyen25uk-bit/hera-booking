type PolicyItem = { icon: string; title: string; description: string };

type Props = {
  title: string;
  items: PolicyItem[];
  compact?: boolean;
};

export default function PolicySection({ title, items, compact = false }: Props) {
  return (
    <div style={{ 
      background: compact ? "#f8fafc" : "rgba(255,255,255,0.05)", 
      borderRadius: 12, 
      padding: compact ? 16 : 20, 
      border: compact ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)" 
    }}>
      <h3 style={{ 
        color: compact ? "#0f172a" : "#fff", 
        fontSize: 14, 
        fontWeight: 600, 
        marginBottom: 16, 
        display: "flex", 
        alignItems: "center", 
        gap: 8 
      }}>
        📋 {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 12 : 16 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 12 }}>
            <div style={{ 
              width: compact ? 28 : 32, 
              height: compact ? 28 : 32, 
              background: compact ? "#e2e8f0" : "rgba(255,255,255,0.1)", 
              borderRadius: 8, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontSize: compact ? 14 : 16, 
              flexShrink: 0 
            }}>
              {item.icon}
            </div>
            <div>
              <div style={{ 
                color: compact ? "#0f172a" : "#fff", 
                fontSize: compact ? 12 : 13, 
                fontWeight: 600, 
                marginBottom: 2 
              }}>
                {item.title}
              </div>
              <div style={{ 
                color: compact ? "#64748b" : "#94a3b8", 
                fontSize: compact ? 11 : 12, 
                lineHeight: 1.4 
              }}>
                {item.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
