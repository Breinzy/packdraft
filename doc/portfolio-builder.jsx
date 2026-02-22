import { useState, useEffect } from "react";

const BUDGET = 1000;
const MAX_PICKS = 10;
const CASH_DECAY_RATE = 0.01;

// Mock sealed product data - replace with TCGPlayer API
const PRODUCTS = [
  // Booster Boxes
  { id: 1, name: "Prismatic Evolutions Booster Box", set: "Prismatic Evolutions", type: "Booster Box", price: 289.99, change7d: 12.4, volume: 1240, img: "PE" },
  { id: 2, name: "Surging Sparks Booster Box", set: "Surging Sparks", type: "Booster Box", price: 134.99, change7d: -3.2, volume: 890, img: "SS" },
  { id: 3, name: "Stellar Crown Booster Box", set: "Stellar Crown", type: "Booster Box", price: 89.99, change7d: 1.8, volume: 620, img: "SC" },
  { id: 4, name: "Twilight Masquerade Booster Box", set: "Twilight Masquerade", type: "Booster Box", price: 109.99, change7d: -1.1, volume: 540, img: "TM" },
  { id: 5, name: "Paradox Rift Booster Box", set: "Paradox Rift", type: "Booster Box", price: 119.99, change7d: 5.6, volume: 780, img: "PR" },
  // Elite Trainer Boxes
  { id: 6, name: "Prismatic Evolutions ETB", set: "Prismatic Evolutions", type: "ETB", price: 84.99, change7d: 18.2, volume: 3200, img: "PE" },
  { id: 7, name: "Surging Sparks ETB", set: "Surging Sparks", type: "ETB", price: 44.99, change7d: -2.1, volume: 1800, img: "SS" },
  { id: 8, name: "Stellar Crown ETB", set: "Stellar Crown", type: "ETB", price: 39.99, change7d: 0.5, volume: 1100, img: "SC" },
  { id: 9, name: "Twilight Masquerade ETB", set: "Twilight Masquerade", type: "ETB", price: 49.99, change7d: 3.3, volume: 960, img: "TM" },
  // Premium Collections
  { id: 10, name: "Eevee Heroes Premium Collection", set: "Eevee Heroes", type: "Premium Collection", price: 179.99, change7d: 22.1, volume: 420, img: "EH" },
  { id: 11, name: "Charizard ex Premium Collection", set: "Scarlet & Violet", type: "Premium Collection", price: 64.99, change7d: -4.5, volume: 680, img: "CZ" },
  { id: 12, name: "Pikachu ex Premium Collection", set: "Scarlet & Violet", type: "Premium Collection", price: 54.99, change7d: 1.2, volume: 590, img: "PK" },
  // Booster Bundles
  { id: 13, name: "Prismatic Evolutions Booster Bundle", set: "Prismatic Evolutions", type: "Booster Bundle", price: 34.99, change7d: 9.8, volume: 2100, img: "PE" },
  { id: 14, name: "Surging Sparks Booster Bundle", set: "Surging Sparks", type: "Booster Bundle", price: 24.99, change7d: -1.8, volume: 1400, img: "SS" },
  { id: 15, name: "Stellar Crown Booster Bundle", set: "Stellar Crown", type: "Booster Bundle", price: 22.99, change7d: 0.3, volume: 980, img: "SC" },
  // UPCs
  { id: 16, name: "Prismatic Evolutions UPC", set: "Prismatic Evolutions", type: "UPC", price: 44.99, change7d: 14.6, volume: 1890, img: "PE" },
  { id: 17, name: "Surging Sparks UPC", set: "Surging Sparks", type: "UPC", price: 29.99, change7d: -2.9, volume: 1100, img: "SS" },
  { id: 18, name: "Stellar Crown UPC", set: "Stellar Crown", type: "UPC", price: 27.99, change7d: 1.1, volume: 760, img: "SC" },
  { id: 19, name: "Twilight Masquerade UPC", set: "Twilight Masquerade", type: "UPC", price: 32.99, change7d: 2.7, volume: 830, img: "TM" },
  { id: 20, name: "Paradox Rift UPC", set: "Paradox Rift", type: "UPC", price: 34.99, change7d: 4.1, volume: 910, img: "PR" },
];

const SET_COLORS = {
  "Prismatic Evolutions": "#a78bfa",
  "Surging Sparks": "#fbbf24",
  "Stellar Crown": "#60a5fa",
  "Twilight Masquerade": "#f472b6",
  "Paradox Rift": "#34d399",
  "Eevee Heroes": "#fb923c",
  "Scarlet & Violet": "#f87171",
};

const TYPE_ICONS = {
  "Booster Box": "📦",
  "ETB": "🎁",
  "Premium Collection": "⭐",
  "Booster Bundle": "🗂️",
  "UPC": "🔒",
};

export default function PortfolioBuilder() {
  const [portfolio, setPortfolio] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [sortBy, setSortBy] = useState("volume");
  const [activeTab, setActiveTab] = useState("market");
  const [animatingId, setAnimatingId] = useState(null);

  const types = ["All", ...new Set(PRODUCTS.map(p => p.type))];

  const filtered = PRODUCTS
    .filter(p => filterType === "All" || p.type === filterType)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.set.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "volume") return b.volume - a.volume;
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "change") return b.change7d - a.change7d;
      return 0;
    });

  const portfolioValue = portfolio.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cashRemaining = BUDGET - portfolioValue;
  const projectedCashDecay = cashRemaining * CASH_DECAY_RATE;
  const totalItems = portfolio.reduce((sum, item) => sum + item.qty, 0);
  const budgetPct = (portfolioValue / BUDGET) * 100;

  const addToPortfolio = (product) => {
    if (totalItems >= MAX_PICKS) return;
    if (cashRemaining < product.price) return;
    setAnimatingId(product.id);
    setTimeout(() => setAnimatingId(null), 600);
    setPortfolio(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) return prev.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromPortfolio = (id) => {
    setPortfolio(prev => {
      const existing = prev.find(p => p.id === id);
      if (existing.qty === 1) return prev.filter(p => p.id !== id);
      return prev.map(p => p.id === id ? { ...p, qty: p.qty - 1 } : p);
    });
  };

  const portfolioWeightedChange = portfolio.length > 0
    ? portfolio.reduce((sum, item) => sum + (item.change7d * item.price * item.qty), 0) / portfolioValue
    : 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c14",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      color: "#e2e8f0",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(139,92,246,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(251,191,36,0.06) 0%, transparent 60%)",
      }} />

      {/* Header */}
      <header style={{
        position: "relative", zIndex: 10,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56,
        background: "rgba(8,12,20,0.9)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "linear-gradient(135deg, #7c3aed, #fbbf24)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700,
          }}>⚡</div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.15em", color: "#f8fafc" }}>POKÉFOLIO</span>
          <span style={{
            fontSize: 10, letterSpacing: "0.1em", color: "#7c3aed",
            border: "1px solid rgba(124,58,237,0.4)", borderRadius: 3,
            padding: "1px 6px", marginLeft: 4,
          }}>BETA</span>
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.05em" }}>
            WEEK 1 · <span style={{ color: "#fbbf24" }}>6D 14H 32M</span> REMAINING
          </div>
          <div style={{
            fontSize: 11, padding: "4px 12px", borderRadius: 4,
            background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)",
            color: "#a78bfa", letterSpacing: "0.08em", cursor: "pointer",
          }}>SIGN IN</div>
        </div>
      </header>

      {/* League ticker */}
      <div style={{
        position: "relative", zIndex: 10,
        background: "rgba(124,58,237,0.08)", borderBottom: "1px solid rgba(124,58,237,0.15)",
        padding: "6px 24px", display: "flex", gap: 32, overflowX: "auto",
        fontSize: 10, letterSpacing: "0.08em",
      }}>
        {[
          { label: "YOUR RANK", value: "--", color: "#94a3b8" },
          { label: "LEAGUE", value: "ALPHA-7", color: "#a78bfa" },
          { label: "PLAYERS", value: "18 / 20", color: "#60a5fa" },
          { label: "STARTS", value: "MON 12:00 ET", color: "#fbbf24" },
          { label: "HOT PICK", value: "PE ETB +18.2%", color: "#34d399" },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", gap: 8, whiteSpace: "nowrap", alignItems: "center" }}>
            <span style={{ color: "#475569" }}>{item.label}</span>
            <span style={{ color: item.color, fontWeight: 600 }}>{item.value}</span>
          </div>
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 10, display: "flex", height: "calc(100vh - 96px)" }}>

        {/* Left: Market */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.06)", minWidth: 0 }}>

          {/* Controls */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6, padding: "6px 12px", color: "#e2e8f0", fontSize: 12,
                outline: "none", flex: 1, minWidth: 140,
                fontFamily: "inherit", letterSpacing: "0.03em",
              }}
            />
            <div style={{ display: "flex", gap: 4 }}>
              {types.map(t => (
                <button key={t} onClick={() => setFilterType(t)} style={{
                  padding: "5px 10px", borderRadius: 4, fontSize: 10, fontFamily: "inherit",
                  letterSpacing: "0.06em", cursor: "pointer", border: "1px solid",
                  borderColor: filterType === t ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.06)",
                  background: filterType === t ? "rgba(124,58,237,0.15)" : "transparent",
                  color: filterType === t ? "#a78bfa" : "#64748b",
                  transition: "all 0.15s",
                }}>
                  {t === "All" ? "ALL" : t.toUpperCase().replace(" ", "\u00A0")}
                </button>
              ))}
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6, padding: "6px 10px", color: "#94a3b8", fontSize: 11,
              fontFamily: "inherit", outline: "none", cursor: "pointer",
            }}>
              <option value="volume">SORT: VOLUME</option>
              <option value="change">SORT: 7D CHANGE</option>
              <option value="price_asc">SORT: PRICE ↑</option>
              <option value="price_desc">SORT: PRICE ↓</option>
            </select>
          </div>

          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 80px 80px 70px 44px",
            padding: "6px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)",
            fontSize: 9, color: "#475569", letterSpacing: "0.1em",
          }}>
            <span>PRODUCT</span>
            <span style={{ textAlign: "right" }}>PRICE</span>
            <span style={{ textAlign: "right" }}>7D CHG</span>
            <span style={{ textAlign: "right" }}>VOL</span>
            <span></span>
          </div>

          {/* Product list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.map(product => {
              const inPortfolio = portfolio.find(p => p.id === product.id);
              const canAfford = cashRemaining >= product.price;
              const canAdd = canAfford && totalItems < MAX_PICKS;
              const isAnimating = animatingId === product.id;
              const setColor = SET_COLORS[product.set] || "#94a3b8";

              return (
                <div key={product.id} style={{
                  display: "grid", gridTemplateColumns: "1fr 80px 80px 70px 44px",
                  padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)",
                  alignItems: "center", cursor: canAdd ? "pointer" : "default",
                  transition: "background 0.1s",
                  background: isAnimating ? "rgba(124,58,237,0.1)" : inPortfolio ? "rgba(124,58,237,0.04)" : "transparent",
                }}
                  onMouseEnter={e => { if (canAdd) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isAnimating ? "rgba(124,58,237,0.1)" : inPortfolio ? "rgba(124,58,237,0.04)" : "transparent"; }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                        background: `linear-gradient(135deg, ${setColor}22, ${setColor}44)`,
                        border: `1px solid ${setColor}33`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14,
                      }}>{TYPE_ICONS[product.type]}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {product.name}
                        </div>
                        <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>
                          <span style={{ color: setColor, opacity: 0.8 }}>{product.set}</span>
                          {inPortfolio && <span style={{ color: "#7c3aed", marginLeft: 6 }}>× {inPortfolio.qty} held</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 12, fontWeight: 600, color: "#f8fafc" }}>
                    ${product.price.toFixed(2)}
                  </div>
                  <div style={{
                    textAlign: "right", fontSize: 12, fontWeight: 600,
                    color: product.change7d >= 0 ? "#34d399" : "#f87171",
                  }}>
                    {product.change7d >= 0 ? "+" : ""}{product.change7d.toFixed(1)}%
                  </div>
                  <div style={{ textAlign: "right", fontSize: 10, color: "#475569" }}>
                    {product.volume.toLocaleString()}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button
                      onClick={() => addToPortfolio(product)}
                      disabled={!canAdd}
                      style={{
                        width: 28, height: 28, borderRadius: 4,
                        background: canAdd ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${canAdd ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.06)"}`,
                        color: canAdd ? "#a78bfa" : "#334155",
                        cursor: canAdd ? "pointer" : "not-allowed",
                        fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "inherit", transition: "all 0.15s",
                      }}
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Portfolio panel */}
        <div style={{ width: 320, display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.01)" }}>

          {/* Budget gauge */}
          <div style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em" }}>BUDGET ALLOCATED</span>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>{budgetPct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2, transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
                width: `${Math.min(budgetPct, 100)}%`,
                background: budgetPct > 85 ? "linear-gradient(90deg, #7c3aed, #f87171)" :
                  budgetPct > 50 ? "linear-gradient(90deg, #7c3aed, #fbbf24)" :
                    "linear-gradient(90deg, #7c3aed, #60a5fa)",
              }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
              {[
                { label: "INVESTED", value: `$${portfolioValue.toFixed(2)}`, color: "#a78bfa" },
                { label: "CASH", value: `$${cashRemaining.toFixed(2)}`, color: cashRemaining < 50 ? "#f87171" : "#34d399" },
                { label: "PICKS", value: `${totalItems} / ${MAX_PICKS}`, color: totalItems >= MAX_PICKS ? "#f87171" : "#60a5fa" },
              ].map(stat => (
                <div key={stat.label} style={{
                  background: "rgba(255,255,255,0.03)", borderRadius: 6,
                  padding: "8px 10px", border: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.08em", marginBottom: 3 }}>{stat.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {cashRemaining > 0 && (
              <div style={{
                marginTop: 8, padding: "6px 10px", borderRadius: 4,
                background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)",
                fontSize: 10, color: "#92400e",
              }}>
                ⚠ ${projectedCashDecay.toFixed(2)} cash decay projected over 7 days
              </div>
            )}
          </div>

          {/* Projected return */}
          {portfolio.length > 0 && (
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em", marginBottom: 6 }}>PROJECTED RETURN (7D AVG)</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{
                  fontSize: 24, fontWeight: 700,
                  color: portfolioWeightedChange >= 0 ? "#34d399" : "#f87171",
                }}>
                  {portfolioWeightedChange >= 0 ? "+" : ""}{portfolioWeightedChange.toFixed(2)}%
                </span>
                <span style={{ fontSize: 11, color: "#475569" }}>
                  ≈ ${(portfolioValue * portfolioWeightedChange / 100).toFixed(2)}
                </span>
              </div>
              <div style={{ fontSize: 9, color: "#334155", marginTop: 2 }}>Based on trailing 7d · not a guarantee</div>
            </div>
          )}

          {/* Portfolio items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {portfolio.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.6, letterSpacing: "0.05em" }}>
                  YOUR PORTFOLIO IS EMPTY<br />
                  <span style={{ color: "#475569" }}>Add products from the market</span>
                </div>
              </div>
            ) : (
              portfolio.map(item => {
                const allocationPct = (item.price * item.qty / BUDGET) * 100;
                const setColor = SET_COLORS[item.set] || "#94a3b8";
                return (
                  <div key={item.id} style={{
                    margin: "4px 12px", borderRadius: 6,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    padding: "10px 12px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {TYPE_ICONS[item.type]} {item.name}
                        </div>
                        <div style={{ fontSize: 10, color: setColor, opacity: 0.7, marginTop: 2 }}>{item.set}</div>
                      </div>
                      <button onClick={() => removeFromPortfolio(item.id)} style={{
                        background: "transparent", border: "none", color: "#475569",
                        cursor: "pointer", fontSize: 14, padding: "0 0 0 8px", lineHeight: 1,
                        fontFamily: "inherit",
                      }}>×</button>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>${item.price.toFixed(2)} × {item.qty}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#f8fafc" }}>${(item.price * item.qty).toFixed(2)}</span>
                      </div>
                      <span style={{
                        fontSize: 10, color: item.change7d >= 0 ? "#34d399" : "#f87171",
                      }}>
                        {item.change7d >= 0 ? "+" : ""}{item.change7d.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ marginTop: 6, height: 2, background: "rgba(255,255,255,0.04)", borderRadius: 1 }}>
                      <div style={{
                        height: "100%", borderRadius: 1,
                        width: `${Math.min(allocationPct, 100)}%`,
                        background: setColor + "88",
                        transition: "width 0.3s",
                      }} />
                    </div>
                    <div style={{ fontSize: 9, color: "#334155", marginTop: 3 }}>{allocationPct.toFixed(1)}% of budget</div>
                  </div>
                );
              })
            )}
          </div>

          {/* Submit */}
          <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              disabled={portfolio.length === 0}
              style={{
                width: "100%", padding: "12px", borderRadius: 6,
                background: portfolio.length > 0
                  ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                  : "rgba(255,255,255,0.04)",
                border: portfolio.length > 0 ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.06)",
                color: portfolio.length > 0 ? "#fff" : "#334155",
                fontSize: 12, fontWeight: 700, letterSpacing: "0.12em",
                cursor: portfolio.length > 0 ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                transition: "all 0.2s",
                boxShadow: portfolio.length > 0 ? "0 0 24px rgba(124,58,237,0.3)" : "none",
              }}
            >
              {portfolio.length === 0 ? "BUILD YOUR PORTFOLIO" : `LOCK IN PORTFOLIO · ${totalItems} PICK${totalItems !== 1 ? "S" : ""}`}
            </button>
            <div style={{ fontSize: 9, color: "#334155", textAlign: "center", marginTop: 6, letterSpacing: "0.06em" }}>
              Prices locked at contest start · Mon 12:00 ET
            </div>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
      `}</style>
    </div>
  );
}
