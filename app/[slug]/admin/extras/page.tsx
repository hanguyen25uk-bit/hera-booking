"use client";

import { useState, useEffect } from "react";

type Extra = {
  id: string;
  name: string;
  price: number;
  sortOrder: number;
  isActive: boolean;
};

export default function ExtrasPage() {
  const [extras, setExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  useEffect(() => {
    loadExtras();
  }, []);

  async function loadExtras() {
    try {
      const res = await fetch("/api/admin/extras", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setExtras(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function addExtra() {
    if (!newName.trim() || !newPrice) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/extras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newName.trim(),
          price: parseFloat(newPrice),
          sortOrder: extras.length,
        }),
      });

      if (res.ok) {
        const extra = await res.json();
        setExtras(prev => [...prev, extra]);
        setNewName("");
        setNewPrice("");
        setMessage({ type: "success", text: "Extra added!" });
      } else {
        setMessage({ type: "error", text: "Failed to add extra" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to add extra" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function updateExtra(id: string) {
    if (!editName.trim() || !editPrice) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/extras/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editName.trim(),
          price: parseFloat(editPrice),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setExtras(prev => prev.map(e => e.id === id ? updated : e));
        setEditingId(null);
        setMessage({ type: "success", text: "Extra updated!" });
      } else {
        setMessage({ type: "error", text: "Failed to update extra" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to update extra" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function deleteExtra(id: string) {
    if (!confirm("Delete this extra?")) return;

    try {
      const res = await fetch(`/api/admin/extras/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setExtras(prev => prev.filter(e => e.id !== id));
        setMessage({ type: "success", text: "Extra deleted!" });
      } else {
        setMessage({ type: "error", text: "Failed to delete extra" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to delete extra" });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/admin/extras/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (res.ok) {
        setExtras(prev => prev.map(e => e.id === id ? { ...e, isActive: !isActive } : e));
      }
    } catch (err) {
      console.error(err);
    }
  }

  function startEdit(extra: Extra) {
    setEditingId(extra.id);
    setEditName(extra.name);
    setEditPrice(extra.price.toString());
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditPrice("");
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: 0 }}>Extras</h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
          Manage quick-add extras for receipts (Chrome, Cat Eyes, Nail Art, etc.)
        </p>
      </div>

      {message && (
        <div style={{
          padding: "12px 16px",
          borderRadius: 8,
          marginBottom: 16,
          backgroundColor: message.type === "success" ? "#D1FAE5" : "#FEE2E2",
          color: message.type === "success" ? "#065F46" : "#991B1B",
        }}>
          {message.text}
        </div>
      )}

      {/* Add New Extra */}
      <div style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginTop: 0, marginBottom: 16 }}>
          Add New Extra
        </h2>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 13, color: "#6B7280", marginBottom: 6 }}>Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Chrome, Cat Eyes"
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ width: 120 }}>
            <label style={{ display: "block", fontSize: 13, color: "#6B7280", marginBottom: 6 }}>Price (£)</label>
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={addExtra}
            disabled={saving || !newName.trim() || !newPrice}
            style={{
              padding: "12px 24px",
              backgroundColor: newName.trim() && newPrice ? "#10B981" : "#E5E7EB",
              color: newName.trim() && newPrice ? "#FFFFFF" : "#9CA3AF",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: newName.trim() && newPrice ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
            }}
          >
            {saving ? "Adding..." : "Add Extra"}
          </button>
        </div>
      </div>

      {/* Extras List */}
      <div style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5E7EB" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: 0 }}>
            Your Extras ({extras.length})
          </h2>
        </div>

        {extras.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6B7280" }}>
            No extras added yet. Add some common extras above.
          </div>
        ) : (
          <div>
            {extras.map((extra, index) => (
              <div
                key={extra.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "16px 20px",
                  borderBottom: index < extras.length - 1 ? "1px solid #F3F4F6" : "none",
                  backgroundColor: extra.isActive ? "#FFFFFF" : "#F9FAFB",
                }}
              >
                {editingId === extra.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{
                        flex: 1,
                        padding: 8,
                        border: "1px solid #E5E7EB",
                        borderRadius: 6,
                        fontSize: 14,
                        marginRight: 12,
                      }}
                    />
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      style={{
                        width: 80,
                        padding: 8,
                        border: "1px solid #E5E7EB",
                        borderRadius: 6,
                        fontSize: 14,
                        marginRight: 12,
                      }}
                      min="0"
                      step="0.01"
                    />
                    <button
                      onClick={() => updateExtra(extra.id)}
                      disabled={saving}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#10B981",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 13,
                        cursor: "pointer",
                        marginRight: 8,
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#F3F4F6",
                        color: "#6B7280",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: extra.isActive ? "#111827" : "#9CA3AF",
                        textDecoration: extra.isActive ? "none" : "line-through",
                      }}>
                        {extra.name}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: extra.isActive ? "#111827" : "#9CA3AF",
                      marginRight: 24,
                      minWidth: 60,
                      textAlign: "right",
                    }}>
                      £{extra.price.toFixed(2)}
                    </div>
                    <button
                      onClick={() => toggleActive(extra.id, extra.isActive)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: extra.isActive ? "#ECFDF5" : "#F3F4F6",
                        color: extra.isActive ? "#059669" : "#6B7280",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 12,
                        cursor: "pointer",
                        marginRight: 8,
                      }}
                    >
                      {extra.isActive ? "Active" : "Inactive"}
                    </button>
                    <button
                      onClick={() => startEdit(extra)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#EEF2FF",
                        color: "#4F46E5",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 12,
                        cursor: "pointer",
                        marginRight: 8,
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteExtra(extra.id)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#FEF2F2",
                        color: "#DC2626",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
