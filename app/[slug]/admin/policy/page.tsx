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

  useEffect(() => { loadPolicy(); }, []);

  async function loadPolicy() {
    try {
      const res = await fetch("/api/booking-policy", { credentials: "include" });
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
        credentials: "include",
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

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>
            Booking Policy
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 6, fontFamily: "var(--font-body)" }}>
            Customize the policy customers see before booking
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "12px 28px",
            backgroundColor: "var(--rose)",
            color: "var(--white)",
            border: "none",
            borderRadius: 50,
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "var(--font-body)",
            boxShadow: "var(--shadow-sm)",
            opacity: saving ? 0.7 : 1,
            transition: "all 0.2s ease"
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {message && (
        <div style={{
          padding: 16,
          borderRadius: 12,
          marginBottom: 24,
          backgroundColor: message.type === "success" ? "var(--sage-light)" : "var(--rose-pale)",
          color: message.type === "success" ? "var(--sage)" : "var(--rose)",
          fontSize: 14,
          fontWeight: 500,
          fontFamily: "var(--font-body)"
        }}>
          {message.text}
        </div>
      )}

      {/* Policy Title */}
      <div style={{
        backgroundColor: "var(--white)",
        borderRadius: 16,
        border: "1px solid var(--cream-dark)",
        padding: 24,
        marginBottom: 24,
        boxShadow: "var(--shadow-sm)"
      }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 10, color: "var(--ink)", fontFamily: "var(--font-body)" }}>Policy Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 18px",
            backgroundColor: "var(--cream)",
            border: "1px solid var(--cream-dark)",
            borderRadius: 12,
            fontSize: 16,
            color: "var(--ink)",
            fontFamily: "var(--font-body)",
            boxSizing: "border-box"
          }}
        />
      </div>

      {/* Policy Items */}
      <div style={{
        backgroundColor: "var(--white)",
        borderRadius: 16,
        border: "1px solid var(--cream-dark)",
        padding: 24,
        boxShadow: "var(--shadow-sm)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "var(--ink)", fontFamily: "var(--font-heading)" }}>Policy Items</h2>
          <button
            onClick={addPolicy}
            style={{
              padding: "10px 18px",
              backgroundColor: "var(--cream)",
              border: "1px solid var(--cream-dark)",
              borderRadius: 50,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--ink-light)",
              fontFamily: "var(--font-body)"
            }}
          >
            + Add Policy
          </button>
        </div>

        {policies.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", backgroundColor: "var(--gold-light)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📋</div>
            No policies yet. Click Add Policy to create one.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {policies.map((policy, index) => (
              <div key={index} style={{
                backgroundColor: "var(--cream)",
                borderRadius: 14,
                padding: 18,
                border: "1px solid var(--cream-dark)"
              }}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    backgroundColor: "var(--white)",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    border: "1px solid var(--cream-dark)",
                    flexShrink: 0
                  }}>
                    {policy.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    {editingIndex === index ? (
                      <>
                        <input
                          type="text"
                          value={policy.title}
                          onChange={(e) => updatePolicy(index, "title", e.target.value)}
                          placeholder="Policy title"
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            backgroundColor: "var(--white)",
                            border: "1px solid var(--cream-dark)",
                            borderRadius: 10,
                            marginBottom: 10,
                            fontSize: 14,
                            color: "var(--ink)",
                            fontFamily: "var(--font-body)",
                            boxSizing: "border-box"
                          }}
                        />
                        <textarea
                          value={policy.description}
                          onChange={(e) => updatePolicy(index, "description", e.target.value)}
                          placeholder="Policy description"
                          rows={3}
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            backgroundColor: "var(--white)",
                            border: "1px solid var(--cream-dark)",
                            borderRadius: 10,
                            resize: "vertical",
                            fontSize: 14,
                            color: "var(--ink)",
                            fontFamily: "var(--font-body)",
                            boxSizing: "border-box"
                          }}
                        />
                        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: "var(--ink-muted)", marginRight: 8, fontFamily: "var(--font-body)" }}>Icon:</span>
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => updatePolicy(index, "icon", emoji)}
                              style={{
                                width: 36,
                                height: 36,
                                border: "none",
                                borderRadius: 8,
                                cursor: "pointer",
                                backgroundColor: policy.icon === emoji ? "var(--rose-pale)" : "var(--white)",
                                fontSize: 18
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <strong style={{ display: "block", marginBottom: 4, color: "var(--ink)", fontFamily: "var(--font-body)" }}>{policy.title || "(No title)"}</strong>
                        <p style={{ color: "var(--ink-muted)", margin: 0, fontSize: 13, fontFamily: "var(--font-body)" }}>{policy.description || "(No description)"}</p>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => movePolicy(index, "up")} disabled={index === 0} style={{ width: 32, height: 32, border: "none", backgroundColor: "var(--white)", borderRadius: 8, cursor: index === 0 ? "not-allowed" : "pointer", opacity: index === 0 ? 0.5 : 1 }}>↑</button>
                    <button onClick={() => movePolicy(index, "down")} disabled={index === policies.length - 1} style={{ width: 32, height: 32, border: "none", backgroundColor: "var(--white)", borderRadius: 8, cursor: index === policies.length - 1 ? "not-allowed" : "pointer", opacity: index === policies.length - 1 ? 0.5 : 1 }}>↓</button>
                    <button onClick={() => setEditingIndex(editingIndex === index ? null : index)} style={{ width: 32, height: 32, border: "none", backgroundColor: editingIndex === index ? "var(--sage-light)" : "var(--white)", borderRadius: 8, cursor: "pointer" }}>
                      {editingIndex === index ? "✓" : "✏️"}
                    </button>
                    <button onClick={() => removePolicy(index)} style={{ width: 32, height: 32, border: "none", backgroundColor: "var(--rose-pale)", borderRadius: 8, cursor: "pointer" }}>🗑</button>
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
