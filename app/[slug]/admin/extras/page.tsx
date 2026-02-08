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

  useEffect(() => { loadExtras(); }, []);

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
        body: JSON.stringify({ name: newName.trim(), price: parseFloat(newPrice), sortOrder: extras.length }),
      });
      if (res.ok) {
        const extra = await res.json();
        setExtras(prev => [...prev, extra]);
        setNewName(""); setNewPrice("");
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
        body: JSON.stringify({ name: editName.trim(), price: parseFloat(editPrice) }),
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
      const res = await fetch(`/api/admin/extras/${id}`, { method: "DELETE", credentials: "include" });
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>
          Extras
        </h1>
        <p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 6, fontFamily: "var(--font-body)" }}>
          Manage quick-add extras for receipts (Chrome, Cat Eyes, Nail Art, etc.)
        </p>
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

      {/* Add New Extra */}
      <div style={{
        backgroundColor: "var(--white)",
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        border: "1px solid var(--cream-dark)",
        boxShadow: "var(--shadow-sm)"
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginTop: 0, marginBottom: 20, fontFamily: "var(--font-body)" }}>
          Add New Extra
        </h2>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--ink-muted)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Chrome, Cat Eyes"
              style={{ width: "100%", padding: 12, backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, boxSizing: "border-box", color: "var(--ink)", fontFamily: "var(--font-body)" }}
            />
          </div>
          <div style={{ width: 120 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--ink-muted)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Price (£)</label>
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              style={{ width: "100%", padding: 12, backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, boxSizing: "border-box", color: "var(--ink)", fontFamily: "var(--font-body)" }}
            />
          </div>
          <button
            onClick={addExtra}
            disabled={saving || !newName.trim() || !newPrice}
            style={{
              padding: "12px 24px",
              backgroundColor: newName.trim() && newPrice ? "var(--sage)" : "var(--cream-dark)",
              color: newName.trim() && newPrice ? "var(--white)" : "var(--ink-muted)",
              border: "none",
              borderRadius: 50,
              fontSize: 14,
              fontWeight: 600,
              cursor: newName.trim() && newPrice ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
              fontFamily: "var(--font-body)"
            }}
          >
            {saving ? "Adding..." : "Add Extra"}
          </button>
        </div>
      </div>

      {/* Extras List */}
      <div style={{
        backgroundColor: "var(--white)",
        borderRadius: 16,
        border: "1px solid var(--cream-dark)",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)"
      }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--cream-dark)", backgroundColor: "var(--cream)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-body)" }}>
            Your Extras ({extras.length})
          </h2>
        </div>

        {extras.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", backgroundColor: "var(--gold-light)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>✨</div>
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
                  padding: "18px 24px",
                  borderBottom: index < extras.length - 1 ? "1px solid var(--cream-dark)" : "none",
                  backgroundColor: extra.isActive ? "var(--white)" : "var(--cream)",
                  gap: 12,
                  flexWrap: "wrap"
                }}
              >
                {editingId === extra.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ flex: 1, minWidth: 150, padding: 10, backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 10, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)" }}
                    />
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      style={{ width: 80, padding: 10, backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 10, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)" }}
                      min="0"
                      step="0.01"
                    />
                    <button onClick={() => updateExtra(extra.id)} disabled={saving} style={{ padding: "8px 16px", backgroundColor: "var(--sage)", color: "var(--white)", border: "none", borderRadius: 50, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                      Save
                    </button>
                    <button onClick={cancelEdit} style={{ padding: "8px 16px", backgroundColor: "var(--cream)", color: "var(--ink-muted)", border: "1px solid var(--cream-dark)", borderRadius: 50, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: extra.isActive ? "var(--ink)" : "var(--ink-muted)",
                        textDecoration: extra.isActive ? "none" : "line-through",
                        fontFamily: "var(--font-body)"
                      }}>
                        {extra.name}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: extra.isActive ? "var(--sage)" : "var(--ink-muted)",
                      minWidth: 70,
                      textAlign: "right",
                      fontFamily: "var(--font-heading)"
                    }}>
                      £{extra.price.toFixed(2)}
                    </span>
                    <button
                      onClick={() => toggleActive(extra.id, extra.isActive)}
                      style={{
                        padding: "6px 14px",
                        backgroundColor: extra.isActive ? "var(--sage-light)" : "var(--cream-dark)",
                        color: extra.isActive ? "var(--sage)" : "var(--ink-muted)",
                        border: "none",
                        borderRadius: 50,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "var(--font-body)"
                      }}
                    >
                      {extra.isActive ? "Active" : "Inactive"}
                    </button>
                    <button onClick={() => startEdit(extra)} style={{ width: 34, height: 34, border: "none", backgroundColor: "var(--cream)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                      ✏️
                    </button>
                    <button onClick={() => deleteExtra(extra.id)} style={{ width: 34, height: 34, border: "none", backgroundColor: "var(--rose-pale)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                      🗑
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
