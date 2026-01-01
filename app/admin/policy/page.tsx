"use client";

import { useEffect, useState } from "react";

type PolicyItem = {
  icon: string;
  title: string;
  description: string;
};

const EMOJI_OPTIONS = ["💵", "🚫", "⏰", "📍", "✅", "❌", "📞", "💳", "🎁", "⚠️", "📋", "🔔"];

export default function PolicyPage() {
  const [title, setTitle] = useState("Our Booking Policy");
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    loadPolicy();
  }, []);

  async function loadPolicy() {
    try {
      const res = await fetch("/api/booking-policy");
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title);
        setPolicies(data.policies);
      }
    } catch (err) {
      console.error("Failed to load policy:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/booking-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, policies }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Policy saved!" });
      } else {
        setMessage({ type: "error", text: "Failed to save" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  function addPolicy() {
    setPolicies([...policies, { icon: "✅", title: "", description: "" }]);
    setEditingIndex(policies.length);
  }

  function updatePolicy(index: number, field: keyof PolicyItem, value: string) {
    const updated = [...policies];
    updated[index] = { ...updated[index], [field]: value };
    setPolicies(updated);
  }

  function removePolicy(index: number) {
    if (confirm("Delete this policy?")) {
      setPolicies(policies.filter((_, i) => i !== index));
      setEditingIndex(null);
    }
  }

  function movePolicy(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= policies.length) return;
    const updated = [...policies];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setPolicies(updated);
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", margin: 0 }}>Booking Policy</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0" }}>Customize the policy customers see before booking</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ padding: "12px 24px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {message && (
        <div style={{ padding: 12, borderRadius: 8, marginBottom: 24, backgroundColor: message.type === "success" ? "#d1fae5" : "#fee2e2", color: message.type === "success" ? "#065f46" : "#991b1b" }}>
          {message.text}
        </div>
      )}

      <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Policy Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 16 }} />
      </div>

      <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Policy Items</h2>
          <button onClick={addPolicy} style={{ padding: "8px 16px", backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>+ Add Policy</button>
        </div>

        {policies.length === 0 ? (
          <p style={{ color: "#64748b", textAlign: "center", padding: 20 }}>No policies yet. Click "Add Policy" to create one.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {policies.map((policy, index) => (
              <div key={index} style={{ backgroundColor: "#f8fafc", borderRadius: 10, padding: 16, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ width: 44, height: 44, backgroundColor: "#fff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: "1px solid #e2e8f0" }}>{policy.icon}</div>
                  <div style={{ flex: 1 }}>
                    {editingIndex === index ? (
                      <>
                        <input type="text" value={policy.title} onChange={(e) => updatePolicy(index, "title", e.target.value)} placeholder="Policy title" style={{ width: "100%", padding: 8, border: "1px solid #e2e8f0", borderRadius: 6, marginBottom: 8 }} />
                        <textarea value={policy.description} onChange={(e) => updatePolicy(index, "description", e.target.value)} placeholder="Policy description" rows={3} style={{ width: "100%", padding: 8, border: "1px solid #e2e8f0", borderRadius: 6, resize: "vertical" }} />
                        <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#64748b", marginRight: 8 }}>Icon:</span>
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button key={emoji} onClick={() => updatePolicy(index, "icon", emoji)} style={{ width: 32, height: 32, border: "none", borderRadius: 6, cursor: "pointer", backgroundColor: policy.icon === emoji ? "#e0e7ff" : "transparent" }}>{emoji}</button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <strong style={{ display: "block", marginBottom: 4 }}>{policy.title || "(No title)"}</strong>
                        <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>{policy.description || "(No description)"}</p>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => movePolicy(index, "up")} disabled={index === 0} style={{ width: 32, height: 32, border: "none", backgroundColor: "#fff", borderRadius: 6, cursor: "pointer" }}>↑</button>
                    <button onClick={() => movePolicy(index, "down")} disabled={index === policies.length - 1} style={{ width: 32, height: 32, border: "none", backgroundColor: "#fff", borderRadius: 6, cursor: "pointer" }}>↓</button>
                    <button onClick={() => setEditingIndex(editingIndex === index ? null : index)} style={{ width: 32, height: 32, border: "none", backgroundColor: "#fff", borderRadius: 6, cursor: "pointer" }}>{editingIndex === index ? "✓" : "✏️"}</button>
                    <button onClick={() => removePolicy(index)} style={{ width: 32, height: 32, border: "none", backgroundColor: "#fff", borderRadius: 6, cursor: "pointer", color: "#dc2626" }}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
