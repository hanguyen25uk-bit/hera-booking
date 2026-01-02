import { useState, useMemo } from "react";

type ServiceCategory = {
  id: string;
  name: string;
  description: string | null;
};

type Service = { 
  id: string; 
  name: string; 
  description: string | null;
  durationMinutes: number; 
  price: number; 
  category?: string | null;
  categoryId?: string | null;
  serviceCategory?: ServiceCategory | null;
};

type Props = {
  services: Service[];
  categories: ServiceCategory[];
  selectedServiceId: string;
  onSelectService: (id: string) => void;
  onContinue: () => void;
  onShowPolicy: () => void;
};

export default function ServiceStep({ 
  services, 
  categories,
  selectedServiceId, 
  onSelectService, 
  onContinue,
  onShowPolicy 
}: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Group services by category
  const groupedServices = useMemo(() => {
    const grouped: Record<string, Service[]> = { uncategorized: [] };
    
    categories.forEach(cat => {
      grouped[cat.id] = [];
    });

    services.forEach(service => {
      if (service.categoryId && grouped[service.categoryId]) {
        grouped[service.categoryId].push(service);
      } else {
        grouped.uncategorized.push(service);
      }
    });

    return grouped;
  }, [services, categories]);

  // Filter services based on active category
  const filteredServices = useMemo(() => {
    if (activeCategory === "all") return services;
    if (activeCategory === "uncategorized") return groupedServices.uncategorized;
    return groupedServices[activeCategory] || [];
  }, [activeCategory, services, groupedServices]);

  // Only show categories that have services
  const visibleCategories = categories.filter(cat => 
    groupedServices[cat.id] && groupedServices[cat.id].length > 0
  );

  return (
    <>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Select a Service</h1>
      <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14 }}>Choose the treatment you'd like to book</p>
      
      {/* Mobile Policy Button */}
      <button 
        className="mobile-policy" 
        onClick={onShowPolicy} 
        style={{ 
          display: "none", 
          width: "100%", 
          padding: 12, 
          background: "#f8fafc", 
          border: "1px solid #e2e8f0", 
          borderRadius: 10, 
          marginBottom: 20, 
          fontSize: 14, 
          color: "#6366f1", 
          fontWeight: 500, 
          cursor: "pointer" 
        }}
      >
        📋 View Booking Policy
      </button>

      {/* Category Tabs */}
      {visibleCategories.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ 
            display: "flex", 
            gap: 8, 
            overflowX: "auto",
            paddingBottom: 8,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}>
            <style>{`.category-tabs::-webkit-scrollbar { display: none; }`}</style>
            <button
              onClick={() => setActiveCategory("all")}
              style={{
                padding: "10px 18px",
                borderRadius: 20,
                border: "none",
                background: activeCategory === "all" ? "#1e293b" : "#f1f5f9",
                color: activeCategory === "all" ? "#fff" : "#64748b",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
            >
              All Services
            </button>
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 20,
                  border: "none",
                  background: activeCategory === cat.id ? "#1e293b" : "#f1f5f9",
                  color: activeCategory === cat.id ? "#fff" : "#64748b",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Services List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredServices.length === 0 ? (
          <div style={{ 
            padding: 40, 
            textAlign: "center", 
            color: "#64748b",
            background: "#f8fafc",
            borderRadius: 12 
          }}>
            No services in this category
          </div>
        ) : (
          filteredServices.map((s) => (
            <div 
              key={s.id} 
              onClick={() => onSelectService(s.id)} 
              style={{ 
                padding: 16, 
                borderRadius: 12, 
                border: `2px solid ${selectedServiceId === s.id ? "#6366f1" : "#e2e8f0"}`, 
                background: selectedServiceId === s.id ? "#f5f3ff" : "#fff", 
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{s.name}</h3>
                  {s.description && (
                    <p style={{ 
                      fontSize: 13, 
                      color: "#64748b", 
                      margin: "6px 0 0",
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>
                      {s.description}
                    </p>
                  )}
                </div>
                {selectedServiceId === s.id && (
                  <span style={{ 
                    width: 22, 
                    height: 22, 
                    borderRadius: 6, 
                    background: "#6366f1", 
                    color: "#fff", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    fontSize: 12,
                    marginLeft: 12,
                    flexShrink: 0,
                  }}>
                    ✓
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 14, marginTop: 8 }}>
                <span style={{ color: "#64748b" }}>{s.durationMinutes} min</span>
                <span style={{ fontWeight: 700, color: "#059669" }}>£{s.price}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <button 
          onClick={onContinue} 
          style={{ 
            width: "100%", 
            padding: 16, 
            background: selectedServiceId ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#e2e8f0", 
            color: selectedServiceId ? "#fff" : "#94a3b8", 
            border: "none", 
            borderRadius: 10, 
            fontSize: 16, 
            fontWeight: 600, 
            cursor: selectedServiceId ? "pointer" : "not-allowed" 
          }}
        >
          Continue
        </button>
      </div>
    </>
  );
}
